/**
 * ☕ 커피라이크 AI 오라클 엔진 (V5.0 - 외부 마스터 에이전트 연동)
 * 
 * 큰형님! 20년 경력 타로 마스터 에이전트를 외부 API로 전격 연동했슴다!
 * 이제 진짜 마스터의 깊이 있는 해석을 실시간으로 가져옵니다.
 */

export const generateAIInterpretation = async (question, card1, card2) => {
  if (!card1 || !card2) return null;

  try {
    console.log("🔮 [마스터 에이전트 호출] 질문:", question);
    
    // 큰형님 명령대로 카드는 배열 형태로 화끈하게 보냅니다!
    const requestBody = {
      question: question || "오늘의 전반적인 운세가 궁금합니다.",
      cards: [card1.name, card2.name]
    };

    const response = await fetch('https://tarot-master-worker.hatnim72.workers.dev/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error('마스터와의 통신에 실패했슴다!');
    }

    const data = await response.json();
    
    // 데이터는 data.response 안에 들어있슴다! 다른 데서 찾지 않슴다.
    if (!data || !data.response) {
      throw new Error('마스터의 응답에 문제가 있슴다!');
    }

    console.log("✅ 마스터 해석 수신 완료");

    return {
      mainFortune: "마스터의 깊은 신탁",
      deepInsight: data.response, // 전체 응답을 통찰 영역에 담습니다.
      caution: "마스터의 조언을 가슴 깊이 새기십시오.",
      coffeePairing: `마스터의 기운과 어울리는 '오라클 블렌드'를 추천함다.`,
      generatedAt: new Date().toISOString(),
      engineVersion: "5.0-master-agent"
    };

  } catch (err) {
    console.error('Master Agent API Error:', err);
    // 큰형님이 지시하신 정중한 에러 메시지
    throw new Error('사장님, 통신 중에 문제가 생겼습니다. 잠시 후 다시 시도해 주세요!');
  }
};

