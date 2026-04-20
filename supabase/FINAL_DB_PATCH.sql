-- ☕ 커피라이크 AI 타로: [마스터] 모든 권한 및 구문 오류 최종 해결 스크립트 v5
-- 406 오류(조회 권한 없음)와 404/42P01(구문/함수 오류)을 모두 담가버리는 마스터 패치임다!

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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.tb_delivery_qr (
    qr_serial TEXT PRIMARY KEY,
    status INT DEFAULT 0, 
    used_by UUID REFERENCES public.tb_customer(cust_id),
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

-- ★ [대중요] 기존 타로 요청 테이블(tb_tarot_request) 권한 해제!
-- 406 (Not Acceptable) 오류는 대부분 조회 권한이 없을 때 발생함다.
ALTER TABLE IF EXISTS public.tb_tarot_request ENABLE ROW LEVEL SECURITY; -- 일단 활성화
DROP POLICY IF EXISTS "Public access policy" ON public.tb_tarot_request; -- 기존 정책 있을 수 있으니 제거
CREATE POLICY "Public access policy" ON public.tb_tarot_request FOR ALL USING (true); -- 전체 공개 (개발단계)

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
BEGIN
    _final_question := COALESCE(NULLIF(TRIM(p_question), ''), '오늘의 운세 알려줘');
    _req_id := gen_random_uuid();
    _wait_number := LPAD(floor(random() * 999 + 1)::TEXT, 3, '0');

    -- 1. 고객 정보 업데이트 (phone_number 사용)
    INSERT INTO tb_customer (phone_number)
    VALUES (p_phone_number)
    ON CONFLICT (phone_number) DO UPDATE SET phone_number = EXCLUDED.phone_number
    RETURNING cust_id INTO _cust_id;

    -- 2. 배달 QR 인식 및 코인 적립
    IF p_qr_serial IS NOT NULL THEN
        IF EXISTS (SELECT 1 FROM tb_delivery_qr WHERE qr_serial = p_qr_serial AND status = 0) THEN
            UPDATE tb_delivery_qr SET status = 1, used_by = _cust_id, updated_at = NOW() WHERE qr_serial = p_qr_serial;
            UPDATE tb_customer SET tarot_coin_balance = tarot_coin_balance + 1000 WHERE cust_id = _cust_id;
            _coin_earned := 1000;
        END IF;
    END IF;

    -- 3. 기존 타로 요청 테이블에 데이터 삽입
    INSERT INTO tb_tarot_request (
        req_id, phone_number, tarot_card_name, tarot_card2_name, 
        ip_address, question, wait_number, status, created_at
    ) VALUES (
        _req_id, p_phone_number, p_tarot_card1_name, p_tarot_card2_name, 
        p_ip_address, _final_question, _wait_number, 0, NOW()
    );

    -- 4. 현재 코인 잔액 조회
    _current_balance := (SELECT tarot_coin_balance FROM tb_customer WHERE cust_id = _cust_id LIMIT 1);

    RETURN json_build_object(
        'req_id', _req_id,
        'wait_number', _wait_number,
        'question', _final_question,
        'coin_earned', _coin_earned,
        'current_balance', _current_balance
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

    _token := encode(gen_random_bytes(16), 'hex');

    INSERT INTO tb_exchange_request (cust_id, req_points, dynamic_token, expires_at)
    VALUES (_target_cust_id, p_req_points, _token, NOW() + INTERVAL '3 minutes');

    RETURN json_build_object('dynamic_token', _token);
END;
$$;

-- 6. RPC: generate_bulk_qr_coupons (어드민용)
CREATE OR REPLACE FUNCTION public.generate_bulk_qr_coupons(p_count int)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _serial text;
    _generated_count int := 0;
    _retry_count int := 0;
    _max_retries int := 10;
BEGIN
    IF p_count > 500 THEN RAISE EXCEPTION '한 번에 최대 500개까지만 가능함다!'; END IF;

    WHILE _generated_count < p_count LOOP
        _serial := 'CFLK-' || upper(substr(md5(random()::text), 1, 4)) || '-' || upper(substr(md5(random()::text), 5, 4));
        BEGIN
            INSERT INTO tb_delivery_qr (qr_serial, status, created_at) VALUES (_serial, 0, NOW());
            _generated_count := _generated_count + 1;
        EXCEPTION WHEN unique_violation THEN
            _retry_count := _retry_count + 1;
            IF _retry_count >= _max_retries THEN EXIT; END IF;
            CONTINUE;
        END;
    END LOOP;

    RETURN json_build_object('success', true, 'count', _generated_count, 'message', _generated_count || '개 생성 완료!');
END;
$$;
