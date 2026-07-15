-- ☕ 커피라이크 AI 타로: [마스터] 모든 권한 및 구문 오류 최종 해결 스크립트 v6.1 (v9.3)
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions; 

-- 1. 기존 테이블/기능 초기화 (O2O 관련)
DROP TABLE IF EXISTS public.tb_exchange_request CASCADE;
DROP TABLE IF EXISTS public.tb_delivery_qr CASCADE;
DROP TABLE IF EXISTS public.tb_customer CASCADE;

-- 2. 핵심 테이블 재생성 (UUID & phone_number 통일)
CREATE TABLE public.tb_customer (
    cust_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number TEXT UNIQUE NOT NULL,
    tarot_coin_balance INT DEFAULT 0,
    point_balance INT DEFAULT 0,
    visit_count INT DEFAULT 1, -- 방문 횟수 추적
    last_visit_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- 마지막 방문 일시
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.tb_delivery_qr (
    qr_serial TEXT PRIMARY KEY,
    status INT DEFAULT 0, 
    used_by UUID REFERENCES public.tb_customer(cust_id),
    used_at TIMESTAMP WITH TIME ZONE, -- QR 사용 시점 기록
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.tb_exchange_request (
    req_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cust_id UUID REFERENCES public.tb_customer(cust_id),
    req_points INT NOT NULL,
    dynamic_token TEXT NOT NULL,
    status INT DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE, -- [v9.6] 환전 처리 완료 시각 기록
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 권한 및 RLS 정책 (데이터 실종 사건의 범인 검거!)
-- 신규 O2O 테이블들
ALTER TABLE public.tb_customer ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tb_delivery_qr ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tb_exchange_request ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public all" ON public.tb_customer FOR ALL USING (true);
CREATE POLICY "Allow public all" ON public.tb_delivery_qr FOR ALL USING (true);
CREATE POLICY "Allow public all" ON public.tb_exchange_request FOR ALL USING (true);

-- ★ [대중요] 기존 타로 요청 테이블(tb_tarot_request) 권한 해제 및 컬럼 추가
-- 406 (Not Acceptable) 오류는 대부분 조회 권한이 없을 때 발생함다.
ALTER TABLE IF EXISTS public.tb_tarot_request ADD COLUMN IF NOT EXISTS qr_serial TEXT;
ALTER TABLE IF EXISTS public.tb_tarot_request ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access policy" ON public.tb_tarot_request;
CREATE POLICY "Public access policy" ON public.tb_tarot_request FOR ALL USING (true);

-- 4. RPC: process_deep_tarot_request_v2 (완성형)
CREATE OR REPLACE FUNCTION public.process_deep_tarot_request_v2(
    p_phone_number text,
    p_tarot_card1_name text,
    p_tarot_card2_name text,
    p_ip_address text,
    p_question text,
    p_qr_serial text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _wait_number text; 
    _req_id uuid;
    _cust_id uuid;
    _final_question text;
    _coin_earned int := 0;
    _current_balance int;
    _status int := 0; -- 기본값: 대기(0)
BEGIN
    _final_question := COALESCE(NULLIF(TRIM(p_question), ''), '오늘의 운세 알려줘');
    _req_id := gen_random_uuid();
    _wait_number := LPAD(floor(random() * 999 + 1)::TEXT, 3, '0');

    -- 1. 고객 정보 업데이트 (phone_number 사용)
    INSERT INTO tb_customer (phone_number)
    VALUES (p_phone_number)
    ON CONFLICT (phone_number) DO UPDATE SET phone_number = EXCLUDED.phone_number
    RETURNING cust_id INTO _cust_id;

    -- 2. 배달 QR 인식 체크 (검증만 수행, 실제 처리는 트리거에서!)
    IF p_qr_serial IS NOT NULL THEN
        -- 2-1. 이미 진행 중인 요청이 있는지 체크 (중복 사용 방지)
        -- [프리패스 예외 처리]: 'CFLK-FREE-PASS'는 중복 대기 검증을 패스함다!
        IF p_qr_serial != 'CFLK-FREE-PASS' AND EXISTS (
            SELECT 1 FROM tb_tarot_request 
            WHERE qr_serial = p_qr_serial 
            AND status = 1 -- 승인됨
            AND ai_tarot_result IS NULL -- 아직 결과 안 나옴
        ) THEN
            RAISE EXCEPTION '이미 이 쿠폰으로 상담이 진행 중임다! 결과가 나올 때까지 기다려 주십쇼.';
        END IF;

        -- [프리패스 예외 처리]: 'CFLK-FREE-PASS'는 코인 적립을 하지 않고 바로 승인으로 통과함다!
        IF p_qr_serial = 'CFLK-FREE-PASS' THEN
            _coin_earned := 0; -- 무제한 무료 프리패스는 포인트 복제 어뷰징 방지를 위해 적립 0원!
            _status := 1; 
        ELSIF EXISTS (SELECT 1 FROM tb_delivery_qr WHERE qr_serial = p_qr_serial AND status = 0) THEN
            -- [중요] 여기서 직접 업데이트하지 않고, 상태만 승인(1)으로 바꿈다.
            -- 실제 쿠폰 소모와 포인트 적립은 ai_tarot_result가 들어올 때 트리거가 처리함다!
            _coin_earned := 1000; 
            _status := 1; 
        ELSE
            RAISE EXCEPTION '유효하지 않거나 이미 사용된 쿠폰임다, 큰형님!';
        END IF;
    END IF;

    -- 3. 기존 타로 요청 테이블에 데이터 삽입 (qr_serial 포함!)
    -- [버그 수정] Webhook은 UPDATE(status 0->1)에서만 트리거되므로 
    -- 무조건 status=0으로 INSERT 후 UPDATE를 해야 AI 에이전트가 호출됨다!
    INSERT INTO tb_tarot_request (
        req_id, phone_number, tarot_card_name, tarot_card2_name, 
        ip_address, question, wait_number, status, approved_at, qr_serial, created_at
    ) VALUES (
        _req_id::text, p_phone_number, p_tarot_card1_name, p_tarot_card2_name, 
        p_ip_address, _final_question, _wait_number, 0, 
        NULL, 
        p_qr_serial,
        NOW()
    );

    IF _status = 1 THEN
        UPDATE tb_tarot_request 
        SET status = 1, approved_at = NOW() 
        WHERE req_id::text = _req_id::text;
    END IF;

    -- 4. 현재 코인 잔액 조회
    _current_balance := (SELECT tarot_coin_balance FROM tb_customer WHERE cust_id = _cust_id LIMIT 1);

    RETURN json_build_object(
        'req_id', _req_id,
        'wait_number', _wait_number,
        'question', _final_question,
        'coin_earned', _coin_earned,
        'current_balance', _current_balance,
        'status', _status
    );
END;
$$;

-- 5. RPC: generate_exchange_request
CREATE OR REPLACE FUNCTION public.generate_exchange_request(
    p_phone_number text,
    p_req_points int
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _target_cust_id uuid;
    _token text;
    _balance int;
BEGIN
    _target_cust_id := (SELECT cust_id FROM tb_customer WHERE phone_number = p_phone_number LIMIT 1);
    _balance := (SELECT tarot_coin_balance FROM tb_customer WHERE cust_id = _target_cust_id LIMIT 1);

    IF _target_cust_id IS NULL OR _balance < p_req_points THEN
        RAISE EXCEPTION '잔액이 부족함다, 큰형님!';
    END IF;

    _token := encode(extensions.gen_random_bytes(16), 'hex');

    INSERT INTO tb_exchange_request (cust_id, req_points, dynamic_token, expires_at)
    VALUES (_target_cust_id, p_req_points, _token, NOW() + INTERVAL '3 minutes');

    RETURN json_build_object('dynamic_token', _token);
END;
$$;

-- 6. RPC: generate_bulk_qr_coupons (어드민용 - v8 고해상도 무결점 버전)
CREATE OR REPLACE FUNCTION public.generate_bulk_qr_coupons(p_count int)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _serial text;
    _generated_count int := 0;
    _success boolean;
BEGIN
    IF p_count > 500 THEN RAISE EXCEPTION '한 번에 최대 500개까지만 가능함다!'; END IF;

    FOR i IN 1..p_count LOOP
        _success := false;
        -- 개별 시리얼 하나를 성공할 때까지 무한정(은 아니지만 충분히) 생성 시도
        WHILE NOT _success LOOP
            -- 보안 등급이 높은 gen_random_bytes 사용 (8자리 16진수)
            _serial := 'CFLK-' || upper(encode(extensions.gen_random_bytes(4), 'hex'));
            -- 가독성을 위해 중간에 더 하이픈 추가 (CFLK-XXXX-XXXX)
            _serial := substr(_serial, 1, 9) || '-' || substr(_serial, 10, 4);
            
            BEGIN
                INSERT INTO tb_delivery_qr (qr_serial, status, created_at) VALUES (_serial, 0, NOW());
                _success := true;
                _generated_count := _generated_count + 1;
            EXCEPTION WHEN unique_violation THEN
                -- 중복 발생 시 다음 루프에서 다시 생성
                _success := false;
            END;
        END LOOP;
    END LOOP;

    RETURN json_build_object('success', true, 'count', _generated_count, 'message', _generated_count || '개 무결점 생성 완료!');
END;
$$;

-- 7. RPC: complete_exchange_request (환전 최종 완료 처리 - v9.5)
CREATE OR REPLACE FUNCTION public.complete_exchange_request(p_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _req_id uuid;
    _cust_id uuid;
    _points int;
    _status int;
    _expires_at timestamptz;
BEGIN
    -- 1. 요청 찾기
    SELECT req_id, cust_id, req_points, status, expires_at 
    INTO _req_id, _cust_id, _points, _status, _expires_at
    FROM tb_exchange_request 
    WHERE dynamic_token = p_token;

    -- 2. 검증 (존재 여부, 상태, 만료)
    IF _req_id IS NULL THEN
        RAISE EXCEPTION '유효하지 않은 토큰임다, 큰형님!';
    END IF;
    
    IF _status != 0 THEN
        RAISE EXCEPTION '이미 처리되었거나 만료된 요청임다!';
    END IF;

    IF _expires_at < NOW() THEN
        UPDATE tb_exchange_request SET status = 2 WHERE req_id = _req_id; -- 만료 처리
        RAISE EXCEPTION '시간이 초과되어 만료되었슴다! 다시 생성해 주십쇼.';
    END IF;

    -- 3. 포인트 실제 차감 및 요청 완료
    UPDATE tb_customer 
    SET tarot_coin_balance = tarot_coin_balance - _points 
    WHERE cust_id = _cust_id;

    UPDATE tb_exchange_request 
    SET status = 1, processed_at = NOW() 
    WHERE req_id = _req_id;

    RETURN json_build_object(
        'success', true, 
        'points', _points,
        'processed_at', NOW()
    );
END;
$$;

-- 8. TRIGGER: AI 해설 완료 시 쿠폰/포인트 최종 처리 (트랜잭션 안전 장치)
CREATE OR REPLACE FUNCTION public.fn_finalize_tarot_transaction()
RETURNS TRIGGER AS $$
DECLARE
    _cust_id uuid;
BEGIN
    -- ai_tarot_result가 NULL에서 내용이 있는 상태로 업데이트될 때만 실행
    IF (OLD.ai_tarot_result IS NULL AND NEW.ai_tarot_result IS NOT NULL) THEN
        
        -- 쿠폰 정보가 있는 경우 처리
        IF NEW.qr_serial IS NOT NULL THEN
            -- 1. 고객 ID 조회
            SELECT cust_id INTO _cust_id FROM tb_customer WHERE phone_number = NEW.phone_number LIMIT 1;

            -- 2. 프리패스 QR인 경우 상태 변경 및 코인 적립 우회
            IF NEW.qr_serial = 'CFLK-FREE-PASS' THEN
                -- 아무것도 하지 않고 스킵 (무제한 사용 유지)
                RAISE NOTICE '프리패스 쿠폰(%)은 무제한 상태를 유지하며 코인 적립을 하지 않슴다.', NEW.qr_serial;
            -- 3. 일반 쿠폰인 경우 유효성 재확인 (상태 0)
            ELSIF EXISTS (SELECT 1 FROM tb_delivery_qr WHERE qr_serial = NEW.qr_serial AND status = 0) THEN
                
                -- 4. 쿠폰 사용 완료 처리
                UPDATE tb_delivery_qr 
                SET status = 1, 
                    used_by = _cust_id, 
                    used_at = NOW(),
                    updated_at = NOW()
                WHERE qr_serial = NEW.qr_serial;

                -- 5. 포인트 실제 적립 (1000P)
                UPDATE tb_customer 
                SET tarot_coin_balance = tarot_coin_balance + 1000 
                WHERE cust_id = _cust_id;
                
                RAISE NOTICE '쿠폰(%) 사용 및 포인트 적립 완료! (고객: %)', NEW.qr_serial, NEW.phone_number;
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_finalize_tarot_transaction ON public.tb_tarot_request;
CREATE TRIGGER trg_finalize_tarot_transaction
AFTER UPDATE ON public.tb_tarot_request
FOR EACH ROW
EXECUTE FUNCTION public.fn_finalize_tarot_transaction();
