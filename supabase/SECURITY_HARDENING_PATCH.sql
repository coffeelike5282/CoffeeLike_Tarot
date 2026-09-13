-- ☕ 커피라이크 타로: 수파베이스 DB 철통 보안 강화 패치 (v1.0 - 적용 완료)
-- 1. 누락된 RLS(행 단위 보안) 활성화 및 정책 생성
-- 2. 관리자 PIN 번호(tb_admin_config) 컬럼 단위 조회 완벽 차단
-- 3. 함수 search_path 고정으로 스키마 하이재킹 취약점 제거

-- ========================================================
-- 1. tb_tarot_blocks (타로 블록 테이블 RLS 활성화)
-- ========================================================
ALTER TABLE IF EXISTS public.tb_tarot_blocks ENABLE ROW LEVEL SECURITY;

-- ========================================================
-- 2. tb_point_history (포인트 이력 RLS 활성화 및 읽기 전용 정책)
-- ========================================================
ALTER TABLE IF EXISTS public.tb_point_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read point history" ON public.tb_point_history;
CREATE POLICY "Allow public read point history" ON public.tb_point_history 
  FOR SELECT USING (true);

-- ========================================================
-- 3. tb_admin_config (관리자 설정 RLS 활성화 및 PIN 컬럼 원천 은닉)
-- ========================================================
ALTER TABLE IF EXISTS public.tb_admin_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public access ai_engine" ON public.tb_admin_config;
CREATE POLICY "Allow public access ai_engine" ON public.tb_admin_config
  FOR ALL USING (true) WITH CHECK (true);

-- 🚨 핵심 보안: 전체 테이블 권한을 회수하고, 오직 id, ai_engine만 읽기/수정 허용!
-- admin_pin, admin_phone_number는 외부 클라이언트에서 절대 조회 불가(Permission Denied)
REVOKE ALL ON public.tb_admin_config FROM anon, authenticated;
GRANT SELECT (id, ai_engine), UPDATE (ai_engine) ON public.tb_admin_config TO anon, authenticated;

-- ========================================================
-- 4. 함수 search_path 불변화 (스키마 하이재킹 원천 차단)
-- ========================================================
ALTER FUNCTION public.check_admin_auth(text, text) SET search_path = public;
ALTER FUNCTION public.fn_finalize_tarot_transaction() SET search_path = public;
ALTER FUNCTION public.process_deep_tarot_request(text, text) SET search_path = public;
ALTER FUNCTION public.process_deep_tarot_request(text, text, text, text, text) SET search_path = public;
