-- ☕ 커피라이크 AI 타로: O2O 마케팅 및 가상 지갑 시스템 DB 스키마 업데이트

-- 1. 고객 및 가상 지갑 테이블 (TB_Customer)
CREATE TABLE IF NOT EXISTS public.tb_customer (
    cust_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_num TEXT UNIQUE NOT NULL,
    tarot_coin_balance INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 배달 1회용 QR 쿠폰 관리 테이블 (TB_Delivery_QR)
CREATE TABLE IF NOT EXISTS public.tb_delivery_qr (
    qr_serial TEXT PRIMARY KEY,
    status INT DEFAULT 0, -- 0: 미사용, 1: 사용완료
    used_by UUID REFERENCES public.tb_customer(cust_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 오프라인 환전 요청 테이블 (TB_Exchange_Request)
CREATE TABLE IF NOT EXISTS public.tb_exchange_request (
    req_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cust_id UUID REFERENCES public.tb_customer(cust_id),
    req_points INT NOT NULL,
    dynamic_token TEXT NOT NULL,
    status INT DEFAULT 0, -- 0: 대기중, 1: 승인완료
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- [v3.1] 기존 타로 요청 함수 고도화 (QR 시리얼 처리 추가)
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
AS $$
DECLARE
    v_wait_number text; 
    v_req_id uuid;
    v_cust_id uuid;
    v_final_question text;
    v_coin_earned int := 0;
BEGIN
    v_final_question := COALESCE(NULLIF(TRIM(p_question), ''), '오늘의 운세 알려줘');
    v_req_id := gen_random_uuid();
    v_wait_number := LPAD(floor(random() * 999 + 1)::TEXT, 3, '0');

    -- 1. 고객 정보 확인 또는 생성
    INSERT INTO tb_customer (phone_num)
    VALUES (p_phone_number)
    ON CONFLICT (phone_num) DO UPDATE SET phone_num = EXCLUDED.phone_num
    RETURNING cust_id INTO v_cust_id;

    -- 2. QR 시리얼 번호가 넘어온 경우 검증 및 적립
    IF p_qr_serial IS NOT NULL THEN
        IF EXISTS (SELECT 1 FROM tb_delivery_qr WHERE qr_serial = p_qr_serial AND status = 0) THEN
            -- QR 만료 처리
            UPDATE tb_delivery_qr 
            SET status = 1, used_by = v_cust_id, updated_at = NOW() 
            WHERE qr_serial = p_qr_serial;

            -- 코인 적립 (1,000P)
            UPDATE tb_customer 
            SET tarot_coin_balance = tarot_coin_balance + 1000 
            WHERE cust_id = v_cust_id;

            v_coin_earned := 1000;
        END IF;
    END IF;

    -- 3. 타로 요청 데이터 삽입
    INSERT INTO tb_tarot_request (
        req_id,
        phone_number,
        tarot_card_name,
        tarot_card2_name,
        ip_address,
        question,
        wait_number,
        status,
        created_at
    ) VALUES (
        v_req_id,
        p_phone_number,
        p_tarot_card1_name,
        p_tarot_card2_name,
        p_ip_address,
        v_final_question,
        v_wait_number,
        0, 
        NOW()
    );

    -- 4. 결과 반환
    RETURN json_build_object(
        'req_id', v_req_id,
        'wait_number', v_wait_number,
        'question', v_final_question,
        'coin_earned', v_coin_earned,
        'current_balance', (SELECT tarot_coin_balance FROM tb_customer WHERE cust_id = v_cust_id)
    );
END;
$$;
