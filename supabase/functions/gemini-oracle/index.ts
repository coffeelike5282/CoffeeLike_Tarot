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
    // 요청 본문 파싱
    const rawBody = await req.text()
    if (!rawBody) {
      throw new Error("클라이언트가 빈 박스(Body 없음)를 보냈슴다, 큰형님!")
    }

    let body;
    try {
      const parsed = JSON.parse(rawBody)
      body = parsed.body && typeof parsed.body === 'object' ? parsed.body : parsed
    } catch (e) {
      throw new Error("JSON 파싱 실패!")
    }

    // 필드 추출
    const question = body.question || body.prompt || "오늘의 운세 알려줘"
    const card1 = body.card1
    const card2 = body.card2

    if (!card1 || !card2) {
      throw new Error("타로 카드가 안 보임다!")
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY가 서버 설정에 없슴다.")
    }

    // [v2.7.2] 템플릿 리터럴 번들링 사고 방지를 위한 안전한 문자열 구성
    let prompt = "당신은 20년 경력의 베테랑 타로 마스터 '커피라이크 오라클'입니다.\n\n";
    prompt += "[전달 사항]\n";
    prompt += "질문: " + question + "\n";
    prompt += "첫 번째 카드: " + card1.name + " (" + card1.rank + " - " + card1.suit + ")\n";
    prompt += "두 번째 카드: " + card2.name + " (" + card2.rank + " - " + card2.suit + ")\n\n";
    prompt += "[응답 형식]\n";
    prompt += "1. [요약] 태그 뒤에 한 줄 통찰을 작성하십시오.\n";
    prompt += "2. [해설] 태그 뒤에 5개 문단으로 상세 해설을 작성하십시오. 문단 사이에는 반드시 줄바꿈 두 번(\\n\\n)을 사용하십시오.\n";
    prompt += "3. 마스터의 신비롭고 정중한 말투를 유지하십시오.";

    const modelPool = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-flash-latest"];

    let lastError = "";
    let rawText = "";

    for (const modelId of modelPool) {
      try {
        const apiUrl = "https://generativelanguage.googleapis.com/v1beta/models/" + modelId + ":generateContent?key=" + GEMINI_API_KEY;
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { max_output_tokens: 4096, temperature: 0.8 }
          })
        });

        if (response.ok) {
          const data = await response.json();
          rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
          if (rawText) break;
        } else {
          lastError = modelId + " (HTTP " + response.status + ")";
          // 만약 429 에러(Rate Limit)라면 잠시 후 다른 모델 시도하거나 실패 처리
        }
      } catch (e) {
        lastError = modelId + " (Error: " + e.message + ")";
      }
    }

    if (!rawText) {
      let failReason = lastError;
      if (lastError.includes("429")) {
        failReason = "과부하(HTTP 429) - 1분 뒤에 다시 시도해 주십시오!";
      }
      throw new Error("모든 마스터가 부재중임다: " + failReason);
    }

    // 태그 추출 (안전한 방식)
    const extractTag = (text, tag) => {
      const tagStr = "[" + tag + "]";
      const idx = text.indexOf(tagStr);
      if (idx === -1) return "";
      const start = idx + tagStr.length;
      let end = text.indexOf("[", start);
      if (end === -1) end = text.length;
      return text.substring(start, end).trim();
    };

    let summary = extractTag(rawText, "요약");
    let interpretation = extractTag(rawText, "해설");

    if (!summary || !interpretation) {
      const lines = rawText.split("\n").filter(l => l.trim());
      summary = lines[0]?.substring(0, 50) || "운명의 요약문";
      interpretation = lines.slice(1).join("\n\n") || rawText;
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

