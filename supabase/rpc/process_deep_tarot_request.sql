CREATE OR REPLACE FUNCTION public.process_deep_tarot_request(
    p_phone_number text,
    p_tarot_card1_name text,
    p_tarot_card2_name text,
    p_ip_address text,
    p_question text
)
RETURNS json
LANGUAGE plpgsql
AS \$\$
DECLARE
    v_wait_number text; 
    v_req_id uuid;
    v_final_question text;
BEGIN
    -- [v3.0] 질문이 없거나 공백이면 '오늘의 운세 알려줘'로 강제 주입함다!
    v_final_question := COALESCE(NULLIF(TRIM(p_question), ''), '오늘의 운세 알려줘');

    -- 1. 새로운 ID 생성
    v_req_id := gen_random_uuid();

    -- 2. 1~999 사이의 완전 랜덤 대기 번호 생성 (3자리 패딩)
    -- 큰형님 말씀대로 999번까지 확 늘렸슴다!
    v_wait_number := LPAD(floor(random() * 999 + 1)::TEXT, 3, '0');

    -- 3. 데이터 삽입
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
        0, -- PENDING 상태
        NOW()
    );

    -- 4. 생성된 정보 반환
    RETURN json_build_object(
        'req_id', v_req_id,
        'wait_number', v_wait_number,
        'question', v_final_question
    );
END;
\$\$;