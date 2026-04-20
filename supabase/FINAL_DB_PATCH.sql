-- ☕ 커피라이크 AI 타로: [초긴급] 컬럼명 불일치 해결 및 클린 설치 스크립트 v2
-- 1. 기존 테이블 삭제 (타입 및 컬럼명 충돌 원천 봉쇄)
DROP TABLE IF EXISTS public.tb_exchange_request;
DROP TABLE IF EXISTS public.tb_delivery_qr;
DROP TABLE IF EXISTS public.tb_customer;

-- 2. tb_customer: phone_number로 컬럼명 통일
CREATE TABLE public.tb_customer (
    cust_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number TEXT UNIQUE NOT NULL, -- 프론트엔드(useAuth.js) 요구대로 phone_number 사용
    tarot_coin_balance INT DEFAULT 0,
    point_balance INT DEFAULT 0, -- legacy 지원용
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. tb_delivery_qr: 배달 쿠폰 관리
CREATE TABLE public.tb_delivery_qr (
    qr_serial TEXT PRIMARY KEY,
    status INT DEFAULT 0, 
    used_by UUID REFERENCES public.tb_customer(cust_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. tb_exchange_request: 환전 요청 관리
CREATE TABLE public.tb_exchange_request (
    req_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cust_id UUID REFERENCES public.tb_customer(cust_id),
    req_points INT NOT NULL,
    dynamic_token TEXT NOT NULL,
    status INT DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. 권한(RLS) 설정
ALTER TABLE public.tb_customer ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tb_delivery_qr ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tb_exchange_request ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public all" ON public.tb_customer FOR ALL USING (true);
CREATE POLICY "Allow public all" ON public.tb_delivery_qr FOR ALL USING (true);
CREATE POLICY "Allow public all" ON public.tb_exchange_request FOR ALL USING (true);

-- 6. RPC: process_deep_tarot_request_v2 (컬럼명 수정 반영)
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

    -- phone_number 컬럼 사용
    INSERT INTO tb_customer (phone_number)
    VALUES (p_phone_number)
    ON CONFLICT (phone_number) DO UPDATE SET phone_number = EXCLUDED.phone_number
    RETURNING cust_id INTO v_cust_id;

    IF p_qr_serial IS NOT NULL THEN
        IF EXISTS (SELECT 1 FROM tb_delivery_qr WHERE qr_serial = p_qr_serial AND status = 0) THEN
            UPDATE tb_delivery_qr SET status = 1, used_by = v_cust_id, updated_at = NOW() WHERE qr_serial = p_qr_serial;
            UPDATE tb_customer SET tarot_coin_balance = tarot_coin_balance + 1000 WHERE cust_id = v_cust_id;
            v_coin_earned := 1000;
        END IF;
    END IF;

    INSERT INTO tb_tarot_request (req_id, phone_number, tarot_card_name, tarot_card2_name, ip_address, question, wait_number, status, created_at)
    VALUES (v_req_id, p_phone_number, p_tarot_card1_name, p_tarot_card2_name, p_ip_address, v_final_question, v_wait_number, 0, NOW());

    RETURN json_build_object(
        'req_id', v_req_id,
        'wait_number', v_wait_number,
        'question', v_final_question,
        'coin_earned', v_coin_earned,
        'current_balance', (SELECT tarot_coin_balance FROM tb_customer WHERE cust_id = v_cust_id)
    );
END;
$$;

-- 7. RPC: generate_exchange_request (컬럼명 수정 반영)
CREATE OR REPLACE FUNCTION public.generate_exchange_request(
    p_phone_number text, -- p_phone_num에서 수정
    p_req_points int
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_cust_id uuid;
    v_token text;
    v_current_balance int;
BEGIN
    SELECT cust_id, tarot_coin_balance INTO v_cust_id, v_current_balance
    FROM tb_customer WHERE phone_number = p_phone_number; -- phone_number로 조회

    IF v_cust_id IS NULL OR v_current_balance < p_req_points THEN
        RAISE EXCEPTION '잔액이 부족함다, 큰형님!';
    END IF;

    v_token := encode(gen_random_bytes(16), 'hex');

    INSERT INTO tb_exchange_request (cust_id, req_points, dynamic_token, expires_at)
    VALUES (v_cust_id, p_req_points, v_token, NOW() + INTERVAL '3 minutes');

    RETURN json_build_object('dynamic_token', v_token);
END;
$$;
