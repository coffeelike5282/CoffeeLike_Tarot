export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // OPTIONS 요청 처리
    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    // [중요 수정] POST가 아니면 실행하지 않음 (주소창 접속 방지)
    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "아이고 박 사장님! 주소창에 직접 치지 마시고 테스트 폼을 이용해 주세요! 충성!" }), { 
        status: 405, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    try {
      // [중요 수정] 데이터가 들어오는지 먼저 확인
      const bodyText = await request.text();
      if (!bodyText) {
        throw new Error("보내주신 데이터가 텅 비어 있습니다, 사장님!");
      }
      
      const { question, cards } = JSON.parse(bodyText);

      // 박 사장님의 고격격 타로 지침
      const systemInstruction = `
 
      당신은 20년 경력의 베테랑 타로 마스터입니다. 
      반드시 **친절한 한국어**로만 답변하세요. 영어/외계어는 절대 금지입니다.

      [상담 원칙]
      1. 인사와 공감: 손님의 마음을 먼저 따뜻하게 보듬어주세요.
      2. 카드 설명: 각 카드의 상징을 사장님만의 통찰로 풀이하세요.
      3. 두 카드의 화학 반응: 두 카드가 만나서 만드는 오늘의 핵심 운세
      4. 조언: 오늘 바로 실천할 수 있는 현실적인 조언을 주세요.
      5. 금기: '원거', 'DateTime' 같은 기술적 단어나 외국어는 절대 쓰지 마세요.
      풍부하게 설명하되, 문장이 꼬이지 않도록 논리적으로 말씀해 주세요.

      `;

      // [에러 해결 포인트] role: 'system' 대신 첫 번째 'user'에 지침을 합칩니다.
      const aiResponse = await env.AI.run('@cf/meta/llama-3.1-8b-instruct-fp8', {
        messages: [
          { 
            role: 'user', 
            content: `${systemInstruction}\n\n[사용자 질문]: ${question}\n[사용자가 뽑은 카드]: ${cards}` 
          }
        ],
        max_tokens: 1200,
        temperature: 0.6,
        // [추가] 이미 나온 단어나 문장이 다시 나올 확률을 낮춥니다.
        //presence_penalty: 0.6,
        //frequency_penalty: 0.6
      });

      return new Response(JSON.stringify(aiResponse), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });

    } catch (e) {
      // 에러 메시지도 JSON으로 예쁘게 보냅니다.
      return new Response(JSON.stringify({ error: e.message }), { 
        status: 500, headers: corsHeaders 
      });
    }
  },
};
