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
      body = parsed.body && typeof parsed.body === 'object' ? parsed.body : parsed
    } catch (e) {
      throw new Error("JSON 파싱 실패! 보낸 데이터: " + rawBody)
    }

    // 필드 추출 (유연하게)
    const question = body.question || body.prompt || ""
    const card1 = body.card1
    const card2 = body.card2

    if (!card1 || !card2) {
      throw new Error("타로 카드가 안 보임다!")
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY가 서버 설정에 없슴다.")
    }

    const prompt = "\n" +
"      당신은 20년 경력의 베테랑 타로 마스터이자 영적 지혜의 전달자인 '커피라이크 타로 오라클'입니다.\n" +
"      현재 질문자의 에너지를 감지하고, 뽑힌 카드들의 상징을 통해 운명의 흐름을 읽으십시오.\n" +
"\n" +
"      [상황 정보]\n" +
"      - 질문자의 고민: " + (question || "오늘의 운세 알려줘") + "\n" +
"      - 첫 번째 카드: " + card1.name + " (" + card1.rank + " - " + card1.suit + ")\n" +
"      - 두 번째 카드: " + card2.name + " (" + card2.rank + " - " + card2.suit + ")\n" +
"\n" +
"      [응답 형식 및 수칙]\n" +
"      반드시 아래와 같은 형식으로 응답하십시오. 기호나 부차적인 설명 없이 태그와 내용만 작성하십시오.\n" +
"\n" +
"      [요약]\n" +
"      전체 해석을 관통하는 통찰력 있는 한 줄 요약 (50자 이내)\n" +
"\n" +
"      [해설]\n" +
"      현재의 에너지가 질문자에게 주는 메시지를 15~20문장 이상의 장문으로 매우 상세하게 서술하십시오.\n" +
"\n" +
"      [해석 가이드 (해설 필수 포함 내용)]\n" +
"      1. **도입**: 현재 질문자의 주변 에너지와 영적 상태에 대한 통찰 (3~4문장)\n" +
"      2. **첫 번째 카드 상세 분석**: 카드의 고유한 상징이 현재 질문과 어떻게 연결되는지 심도 있게 분석 (4~5문장)\n" +
"      3. **두 번째 카드 상세 분석**: 이어지는 카드가 상황에 더하는 구체적인 의미와 변화의 실마리 (4~5문장)\n" +
"      4. **종합 시너지 및 조언**: 두 카드가 만났을 때 발생하는 조화로운 조언 혹은 주의해야 할 경고 (3~4문장)\n" +
"      5. **결론 및 지침**: 질문자가 오늘 바로 실천할 수 있는 구체적인 마음가짐이나 행동지침 (2~3문장)\n" +
"\n" +
"      [주의사항]\n" +
"      - 말투: 정중하고, 신비롭고, 전문적인 마스터의 말투 (~합니다, ~일 것입니다 등)를 사용하십시오.\n" +
"      - 금기: '큰형님', '안 본부장' 같은 조폭 말투는 절대 금지입니다.\n" +
"      - 언어: 반드시 한국어로 작성하십시오.\n" +
"    ";

    const models = [
      "gemini-3-flash-preview", 
      "gemini-1.5-flash-latest"
    ];

    let lastError = "";
    let rawText = "";

    // 모델별 순차 시도 및 재시도 로직
    for (const modelId of models) {
      console.log("🔮 시도 중인 모델: " + modelId);
      
      for (let retryStep = 0; retryStep < 3; retryStep++) {
        try {
          const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + modelId + ":generateContent?key=" + GEMINI_API_KEY, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { 
                max_output_tokens: 4096
              }
            })
          });

          if (response.ok) {
            const data = await response.json();
            rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
            if (rawText) break;
          } else {
            const errorData = await response.json().catch(() => ({}));
            const msg = errorData.error?.message || JSON.stringify(errorData);
            lastError = msg;
            
            if (response.status === 429 || response.status === 503 || (response.status === 400 && msg.includes("high demand"))) {
              console.warn("⚠️ [" + modelId + "] 과부하 감지 (시도 " + (retryStep + 1) + "/3), 잠시 후 다시 시도함다...");
              await new Promise(r => setTimeout(r, 1000 * (retryStep + 1))); 
              continue;
            }
            break;
          }
        } catch (e) {
          lastError = e.message;
          console.error("❌ [" + modelId + "] 통신 에러: ", e);
        }
      }
      
      if (rawText) break;
    }

    if (!rawText) {
      throw new Error("구글 신령님이 모든 채널에서 응답하지 않슴다: " + lastError);
    }

    // [요약] 및 [해설] 태그 추출 로직
    const extractTag = (text: string, tag: string) => {
      const regex = new RegExp("\\[" + tag + "\\]([\\s\\S]*?)(?=\\[|$)", "i");
      const match = text.match(regex);
      return match ? match[1].trim() : "";
    };

    let summary = extractTag(rawText, "요약");
    let interpretation = extractTag(rawText, "해설");

    // 파싱 실패 시 방어 로직
    if (!summary || !interpretation) {
      console.warn("⚠️ 태그 기반 파싱 실패, 스마트 폴백 가동함다.");
      const lines = rawText.replace(/\[.*?\]/g, "").split("\n").filter(l => l.trim());
      summary = lines[0]?.substring(0, 50) || "운명의 요약문";
      interpretation = lines.slice(1).join("\n") || rawText;
    }

    return new Response(
      JSON.stringify({ summary, interpretation }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
