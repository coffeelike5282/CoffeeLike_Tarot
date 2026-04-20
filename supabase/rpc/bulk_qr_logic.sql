-- 🛵 커피라이크 AI 타로: 배달용 1회용 QR 쿠폰 대량 생성 로직

CREATE OR REPLACE FUNCTION public.generate_bulk_qr_coupons(p_count int)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
    v_serial text;
    v_generated_count int := 0;
    v_retry_count int := 0;
    v_max_retries int := 10; -- 중복 발생 시 재시도 횟수
    v_result_serials text[] := '{}';
BEGIN
    -- 1회 최대 생성 수 제한 (안전장치)
    IF p_count > 500 THEN
        RAISE EXCEPTION '한 번에 최대 500개까지만 생성 가능함다, 큰형님!';
    END IF;

    WHILE v_generated_count < p_count LOOP
        -- 1. 고유 시리얼 번호 생성 (CFLK - 8자리 랜덤 알판뉴메릭)
        v_serial := 'CFLK-' || 
                    upper(substr(md5(random()::text), 1, 4)) || '-' || 
                    upper(substr(md5(random()::text), 5, 4));

        -- 2. 중복 체크 및 삽입
        BEGIN
            INSERT INTO tb_delivery_qr (qr_serial, status, created_at)
            VALUES (v_serial, 0, NOW());
            
            v_generated_count := v_generated_count + 1;
            v_result_serials := array_append(v_result_serials, v_serial);
            v_retry_count := 0; -- 성공하면 재시도 횟수 초기화
        EXCEPTION WHEN unique_violation THEN
            v_retry_count := v_retry_count + 1;
            IF v_retry_count >= v_max_retries THEN
                -- 너무 많은 중복 발생 시 (이론상 희박하지만) 종료
                EXIT;
            END IF;
            CONTINUE;
        END;
    END LOOP;

    RETURN json_build_object(
        'success', true,
        'count', v_generated_count,
        'serials', v_result_serials,
        'message', v_generated_count || '개의 쿠폰이 화끈하게 생성되었슴다!'
    );
END;
$$;
