/**
 * ☕ 커피라이크 AI 오라클 엔진 (V5.1 - 멀티 엔진 지원)
 * 
 * 큰형님! 구글 제미나이 1.5 플래시랑 기존 라마 엔진을 모두 품었슴다!
 * 이제 관리자 화면에서 자유롭게 스위칭하며 최고의 해석을 뽑아낼 수 있슴다.
 */

// 제미나이 API 키는 환경 변수에서 가져옵니다.
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

/**
 * Cloudflare Workers 기반 Llama 3 엔진 호출
 */
const callLlamaEngine = async (question, card1, card2) => {
  const requestBody = {
    question: question || "오늘의 전반적인 운세가 궁금합니다.",
    cards: [card1.name, card2.name]
  };

  const response = await fetch('https://tarot-master-worker.hatnim72.workers.dev/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) throw new Error('라마 마스터와의 통신에 실패했슴다!');
  
  const data = await response.json();
  if (!data || !data.response) throw new Error('라마 마스터의 응답에 문제가 있슴다!');
  
  return data.response;
};

/**
 * Google AI Studio 기반 Gemini 1.5 Flash 엔진 호출
 */
const callGeminiEngine = async (question, card1, card2) => {
  if (!GEMINI_API_KEY) throw new Error('제미나이 API 키가 설정되지 않았슴다, 큰형님!');

  const prompt = `
    당신은 20년 경력의 베테랑 타로 마스터 '커피라이크 AI 오라클'입니다.
    사용자의 질문과 뽑은 2장의 카드를 바탕으로 깊이 있고 통찰력 있는 해석을 제공하세요.
    
    질문: ${question || "오늘의 운세"}
    카드 1: ${card1.name} (${card1.rank} - ${card1.suit})
    카드 2: ${card2.name} (${card2.rank} - ${card2.suit})
    
    [응답 규칙]
    1. 답변은 반드시 한국어로 작성하세요.
    2. 전문적인 타로 지식을 기반으로 하되, 따뜻하고 희망적인 어조를 유지하세요.
    3. 각 카드의 상징성과 두 카드의 조합(조화/상충)을 상세히 설명하세요.
    4. 마지막에 구체적인 조언이나 행동 지침을 제공하세요.
    5. '큰형님' 스타일의 조폭 말투가 아닌, 정중하고 신비로운 타로 마스터의 말투를 사용하세요.
  `;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    })
  });

  if (!response.ok) throw new Error('제미나이 마스터와의 통신에 실패했슴다!');
  
  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!text) throw new Error('제미나이 마스터가 신탁을 내리지 않았슴다!');
  
  return text;
};

export const generateAIInterpretation = async (question, card1, card2, engine = 'llama') => {
  if (!card1 || !card2) return null;

  try {
    console.log(`🔮 [마스터 에이전트 호출] 엔진: ${engine}, 질문:`, question);
    
    let responseText = "";
    if (engine === 'gemini') {
      responseText = await callGeminiEngine(question, card1, card2);
    } else {
      responseText = await callLlamaEngine(question, card1, card2);
    }

    console.log(`✅ ${engine === 'gemini' ? '제미나이' : '라마'} 해석 수신 완료`);

    return {
      mainFortune: engine === 'gemini' ? "제미나이 1.5의 정교한 통찰" : "마스터의 깊은 신탁",
      deepInsight: responseText,
      caution: "신탁의 조언을 가슴 깊이 새기십시오.",
      coffeePairing: `마스터의 기운과 어울리는 '오라클 블렌드'를 추천함다.`,
      generatedAt: new Date().toISOString(),
      engineVersion: engine === 'gemini' ? "Gemini-1.5-Flash" : "Llama-3-Master"
    };

  } catch (err) {
    console.error('AI Oracle Service Error:', err);
    throw new Error('사장님, AI 통신 중에 사고가 났습니다. 잠시 후 다시 시도해 주세요!');
  }
};

