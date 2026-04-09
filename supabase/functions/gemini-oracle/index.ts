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

    const prompt = `
      당신은 20년 경력의 베테랑 타로 마스터이자 영적 지혜의 전달자인 '커피라이크 타로 오라클'입니다.
      현재 질문자의 에너지를 감지하고, 뽑힌 카드들의 상징을 통해 운명의 흐름을 읽으십시오.

      [전달 사항]
      질문자의 고민: ${question || "오늘의 운세 알려줘"}
      첫 번째 카드: ${card1.name} (${card1.rank} - ${card1.suit})
      두 번째 카드: ${card2.name} (${card2.rank} - ${card2.suit})

      [응답 형식 및 수칙]
      1. 반드시 아래와 같은 형식으로 응답하십시오.
      2. **가독성을 위해 [해설] 내용은 반드시 4~5개의 문단으로 나누고, 문단 사이에는 줄바꿈 두 번(\n\n)을 사용하십시오.**
      3. 기호나 부차적인 설명 없이 아래 태그 내에만 내용을 작성하십시오.

      [요약]
      전체 해석을 관통하는 통찰력 있는 한 줄 요약 (50자 이내)

      [해설]
      여기에 상세 해석을 작성하십시오. 반드시 아래 [해석 가이드]에 따라 내용을 구성하고, 각 번호 항목이 끝날 때마다 줄바꿈 두 번(\n\n)을 넣어 문단을 명확히 분리하십시오.

      [해석 가이드 (문단 구성 필수 규칙)]
      문단 1. **도입**: 현재 질문자의 주변 에너지와 영적 상태에 대한 통찰 (3~4문장)
      문단 2. **첫 번째 카드 분석**: ${card1.name} 카드의 상징이 현재 상황과 연결되는 심도 있는 분석 (4~5문장)
      문단 3. **두 번째 카드 분석**: 이어지는 ${card2.name} 카드가 주는 구체적인 의미와 변화의 실마리 (4~5문장)
      문단 4. **종합 시너지 및 조언**: 두 카드의 조합이 주는 최종 결론과 영적 지침 (3~4문장)
      문단 5. **오늘의 액션**: 질문자가 오늘 바로 실천할 수 있는 구체적인 행동 제안 (2~3문장)

      [주의사항]
      - 말투: 정중하고, 신비롭고, 전문적인 마스터의 말투 (~합니다, ~일 것입니다 등)를 사용하십시오.
      - 형식: 각 문단은 끊김 없이 이어지는 글의 형태여야 하며, 문단 사이의 간격(\n\n)을 절대 잊지 마십시오.
      - 금기: '큰형님', '안 본부장' 같은 조폭 말투는 절대 금지입니다.
      - 언어: 반드시 한국어로 작성하십시오.
    `;

    // 2026년형 고속 Flash 정예 멤버 (큰형님 감수 완료)
    const modelPool = [
      "gemini-flash-latest", 
      "gemini-2.5-flash",
      "gemini-3-flash-preview"
    ];

    // 무작위 셔플로 부하 분산 (Load Balancing)
    const shuffledModels = [...modelPool].sort(() => Math.random() - 0.5);

    let lastError = "";
    let rawText = "";

    // 모델별 순차 시도 및 지능형 페일오버
    for (const modelId of shuffledModels) {
      console.log(`🔮 [${modelId}] 신탁 요청 중...`);
      
      // 모델당 1회 시도 (여러 모델이 있으므로 빠른 페일오버 중점)
      for (let retryStep = 0; retryStep < 1; retryStep++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 45000); // 45초 타임아웃

        try {
          const apiVersion = 'v1beta'; 
          const response = await fetch(`https://generativelanguage.googleapis.com/${apiVersion}/models/${modelId}:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { 
                max_output_tokens: 4096,
                temperature: 0.8,
                topP: 0.95,
              }
            })
          });

          clearTimeout(timeoutId);

          if (response.ok) {
            const data = await response.json();
            rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
            if (rawText) break;
          } else {
            const errorData = await response.json().catch(() => ({}));
            const msg = errorData.error?.message || JSON.stringify(errorData);
            lastError = `${modelId} (HTTP ${response.status}): ${msg}`;
            
            if (response.status === 429 || response.status === 503 || response.status === 400) {
              console.warn(`⚠️ [${modelId}] 에러 발생 (HTTP ${response.status}). 즉시 다음 통로로 이동함다!`);
              break; 
            }
          }
        } catch (e) {
          clearTimeout(timeoutId);
          if (e.name === 'AbortError') {
            lastError = `${modelId} (Timeout): 45초 응답 지연 발생`;
            console.warn(`⏳ [${modelId}] 타임아웃 발생. 다음 엔진으로 전환함다!`);
          } else {
            lastError = `${modelId} (Exception): ${e.message}`;
            console.error(`❌ [${modelId}] 통신 사고 발생:`, e);
          }
          break; // 다음 모델로
        }
      }
      
      if (rawText) {
        console.log(`✅ [${modelId}] 신탁 수신 성공!`);
        break;
      }
    }

    if (!rawText) {
      throw new Error(`모든 신령님이 부재중임다: ${lastError}`);
    }

    // [요약] 및 [해설] 태그 추출 로직
    const extractTag = (text: string, tag: string) => {
      const regex = new RegExp(`\\[${tag}\\]([\\s\\S]*?)(?=\\[|$)`, "i");
      const match = text.match(regex);
      return match ? match[1].trim() : "";
    };

    let summary = extractTag(rawText, "요약");
    let interpretation = extractTag(rawText, "해설");

    // 파싱 실패 시 방어 로직 (스마트 폴백)
    if (!summary || !interpretation) {
      console.warn("⚠️ 태그 기반 파싱 실패, 텍스트 분리 가동!");
      const cleanedText = rawText.replace(/\[.*?\]/g, "").trim();
      const lines = cleanedText.split("\n").filter(l => l.trim());
      summary = lines[0]?.substring(0, 50) || "운명의 요약문";
      interpretation = lines.slice(1).join("\n") || cleanedText;
    }

    return new Response(
      JSON.stringify({ summary, interpretation }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error("🚨 최종 에러 발생:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
