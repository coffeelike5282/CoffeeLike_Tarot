-- ☕ 커피라이크 AI 타로: 가상 지갑 환전 관련 RPC 로직

-- 1. 환전 요청 생성 (동적 QR용 토큰 발행)
CREATE OR REPLACE FUNCTION public.generate_exchange_request(
    p_phone_num TEXT,
    p_req_points INT
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    v_cust_id UUID;
    v_current_balance INT;
    v_dynamic_token TEXT;
    v_req_id UUID;
BEGIN
    -- 고객 정보 및 잔액 확인
    SELECT cust_id, tarot_coin_balance INTO v_cust_id, v_current_balance
    FROM tb_customer
    WHERE phone_num = p_phone_num;

    IF v_cust_id IS NULL THEN
        RAISE EXCEPTION '고객 정보를 찾을 수 없슴다!';
    END IF;

    IF v_current_balance < p_req_points THEN
        RAISE EXCEPTION '잔액이 부족함다! (현재: %, 요청: %)', v_current_balance, p_req_points;
    END IF;

    -- 최소 환전 금액 체크 (기획서상 3,000P)
    IF p_req_points < 3000 THEN
        RAISE EXCEPTION '최소 3,000P부터 환전 가능함다!';
    END IF;

    -- 동적 토큰 생성 (단순화를 위해 난수 해시 사용, 3분 만료)
    v_dynamic_token := encode(digest(p_phone_num || now()::text, 'sha256'), 'hex');
    
    INSERT INTO tb_exchange_request (
        cust_id,
        req_points,
        dynamic_token,
        status,
        expires_at
    ) VALUES (
        v_cust_id,
        p_req_points,
        v_dynamic_token,
        0, -- 대기중
        NOW() + INTERVAL '3 minutes'
    ) RETURNING req_id INTO v_req_id;

    RETURN json_build_object(
        'req_id', v_req_id,
        'dynamic_token', v_dynamic_token,
        'expires_at', NOW() + INTERVAL '3 minutes'
    );
END;
$$;

-- 2. 관리자 승인 로직 (QR 스캔 시 호출)
CREATE OR REPLACE FUNCTION public.approve_exchange_request(
    p_dynamic_token TEXT
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    v_req_record RECORD;
    v_phone_num TEXT;
BEGIN
    -- 토큰으로 요청 찾기
    SELECT er.*, c.phone_num INTO v_req_record
    FROM tb_exchange_request er
    JOIN tb_customer c ON er.cust_id = c.cust_id
    WHERE er.dynamic_token = p_dynamic_token;

    IF v_req_record IS NULL THEN
        RAISE EXCEPTION '유효하지 않은 토큰임다!';
    END IF;

    IF v_req_record.status = 1 THEN
        RAISE EXCEPTION '이미 처리된 환전 요청임다!';
    END IF;

    IF v_req_record.expires_at < NOW() THEN
        RAISE EXCEPTION '만료된 토큰임다! 다시 생성해주세요.';
    END IF;

    -- 1. 승인 상태로 변경
    UPDATE tb_exchange_request 
    SET status = 1 
    WHERE req_id = v_req_record.req_id;

    -- 2. 고객 잔액에서 차감
    UPDATE tb_customer 
    SET tarot_coin_balance = tarot_coin_balance - v_req_record.req_points
    WHERE cust_id = v_req_record.cust_id;

    RETURN json_build_object(
        'success', true,
        'phone_num', v_req_record.phone_num,
        'points_exchanged', v_req_record.req_points,
        'message', '환전 승인 완료! 도도 포인트 적립해주십쇼, 큰형님!'
    );
END;
$$;
