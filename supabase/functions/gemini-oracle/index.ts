import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  // CORS 탐색기(OPTIONS) 요청 처리
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 요청 본문 로깅 및 파싱
    const rawBody = await req.text()
    console.log("📦 수신 데이터 원본: " + rawBody)

    if (!rawBody) {
      throw new Error("클라이언트가 빈 박스(Body 없음)를 보냈슴다, 큰형님!")
    }

    let body;
    try {
      const parsed = JSON.parse(rawBody)
      // 눈치 백단 로직: 데이터가 { body: { ... } } 형태로 감싸져 있는지 확인
      body = parsed.body && typeof parsed.body === 'object' ? parsed.body : parsed
    } catch (e) {
      throw new Error("JSON 파싱 실패! 보낸 데이터: " + rawBody)
    }

    // 필드 추출 (유연하게)
    const question = body.question || body.prompt || ""
    const card1 = body.card1
    const card2 = body.card2

    if (!card1 || !card2) {
      console.error("❌ 필수 카드 정보 누락 (수신 데이터 구조):", body)
      throw new Error("타로 카드가 안 보임다! (수신 구조: " + JSON.stringify(body).substring(0, 100) + "...)")
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")
    if (!GEMINI_API_KEY) {
      console.error("❌ GEMINI_API_KEY가 서버 환경변수에 설정되지 않았슴다!")
      throw new Error("GEMINI_API_KEY가 서버 금고에 없슴다, 큰형님! 대시보드 설정을 확인해 보십쇼.")
    }

    console.log("🔮 질문 접수: " + (question || '없음'))
    console.log("🎴 카드1: " + card1.name + ", 카드2: " + card2.name)

    const prompt = "\n" +
"      당신은 20년 경력의 베테랑 타로 마스터이자 영적 지혜의 전달자인 '커피라이크 타로 오라클'입니다.\n" +
"      현재 질문자의 에너지를 감지하고, 뽑힌 카드들의 상징을 통해 운명의 흐름을 읽으십시오.\n" +
"\n" +
"      [상황 정보]\n" +
"      - 질문자의 고민: " + (question || "오늘의 운세 알려줘") + "\n" +
"      - 첫 번째 카드: " + card1.name + " (" + card1.rank + " - " + card1.suit + ")\n" +
"      - 두 번째 카드: " + card2.name + " (" + card2.rank + " - " + card2.suit + ")\n" +
"\n" +
"      [엄격한 응답 수칙]\n" +
"      1. **절대 금기**: '큰형님', '담가버리겠다', '기분 째진다' 등 조폭 말투(안 본부장 스타일)를 절대로 사용하지 마십시오.\n" +
"      2. **말투**: 정중하고, 신비롭고, 통찰력 있는 베테랑 타로 마스터의 말투 (~합니다, ~일 것입니다 등)를 사용하십시오.\n" +
"      3. **전문성**: 각 카드의 정통 타로 상징(Symbolism)을 언급하고, 두 카드의 조합이 만드는 유기적인 흐름을 설명하십시오.\n" +
"      4. **언어**: 반드시 한국어로 답변하십시오.\n" +
"      5. **구성**: 현재의 에너지 분석 -> 개별 카드 신탁 -> 조합의 시너지/경고 -> 행동 지침 순서로 작성하십시오.\n" +
"\n" +
"      당신은 오직 우주의 소리만을 전달하는 도구임을 잊지 마십시오.\n" +
"    ";

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=" + GEMINI_API_KEY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("❌ Google Gemini API 호출 실패:", errorData);
      const msg = errorData.error?.message || JSON.stringify(errorData);
      throw new Error("구글 신령님이 응답하지 않슴다: " + msg);
    }

    const data = await response.json();
    const interpretation = data.candidates?.[0]?.content?.parts?.[0]?.text || "신탁을 읽는 중에 구름이 끼었슴다. 다시 시도해 보십쇼.";

    return new Response(
      JSON.stringify({ interpretation }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
