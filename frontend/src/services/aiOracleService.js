/**
 * ☕ 커피라이크 AI 오라클 엔진 (V5.3 - 서버 사이드 철통 보안 & 하이브리드 엔진)
 * 
 * 큰형님! 브라우저 직통 위험 코드를 완전히 도려내고,
 * 1차 Supabase Edge Function(서버 보안 제미나이) + 2차 Cloudflare Llama 3(비상 우회)로
 * 빈틈없는 2중 철통 방어선을 구축했슴다!
 */

import { supabase } from '../lib/supabaseClient';

/**
 * Cloudflare Workers 기반 Llama 3 엔진 호출 (비상용)
 */
const callLlamaEngine = async (question, card1, card2) => {
  const requestBody = {
    question: question || "오늘의 운세 알려줘",
    cards: [card1.name, card2.name]
  };

  const response = await fetch('https://tarot-master-worker.hatnim72.workers.dev/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "알 수 없는 오류");
    console.error('❌ 라마 응답 오류 상세:', errorText);
    throw new Error(`라마 마스터와의 통신에 실패했습니다! (상태: ${response.status})`);
  }
  
  const data = await response.json();
  if (!data || !data.response) throw new Error('라마 마스터의 응답에 문제가 있습니다! 응답 본문을 확인해 보십시오.');
  
  return data.response;
};

/**
 * 1차 메인: Supabase Edge Function을 통한 Gemini 최신 엔진 호출 (서버 시크릿 기반 안전 통신)
 */
const callGeminiEngine = async (question, card1, card2) => {
  const { data, error } = await supabase.functions.invoke('gemini-oracle', {
    body: { question, card1, card2 }
  });

  if (error) {
    console.error('❌ Supabase 함수 호출 오류 상세:', error);
    
    let detailMsg = error.message;
    const errorSource = error.context || error.response;

    if (errorSource && typeof errorSource.json === 'function') {
      try {
        const errorBody = await errorSource.json();
        detailMsg = errorBody.error || errorBody.message || JSON.stringify(errorBody);
      } catch (e) {
        try {
          detailMsg = await errorSource.text();
        } catch (e2) {
          // ignore
        }
      }
    }
    
    throw new Error(`제미나이 서버 통신 실패 (사유: ${detailMsg})`);
  }
  
  if (!data || !data.interpretation) {
    throw new Error('제미나이 마스터가 신탁을 내리지 않았습니다! 응답 형식을 확인해 보십시오.');
  }
  
  return {
    summary: data.summary || "운명의 요약문",
    interpretation: data.interpretation,
    model: data.model || "gemini-2.5-flash"
  };
};

export const generateAIInterpretation = async (question, card1, card2, engine = 'gemini') => {
  if (!card1 || !card2) return null;
  const finalQuestion = question?.trim() || "오늘의 운세 알려줘";

  try {
    console.log(`🔮 [마스터 에이전트 호출] 요청 엔진: ${engine}, 질문:`, question);
    
    let summary = "마스터의 깊은 신탁";
    let interpretation = "";
    let engineVersion = "Gemini-2.5-Flash (Server)";

    if (engine === 'gemini') {
      try {
        // 1차 시도: Supabase Edge Function (서버사이드 안전 호출)
        const result = await callGeminiEngine(finalQuestion, card1, card2);
        summary = result.summary;
        interpretation = result.interpretation;
        engineVersion = `Gemini (${result.model || 'Server'})`;
        console.log("✅ 제미나이 서버 엣지 펑션 해석 수신 완료:", engineVersion);
      } catch (geminiServerErr) {
        console.warn("⚠️ 제미나이 엣지 펑션 실패, 비상용 라마 마스터(2차 방어선)로 즉시 우회함다:", geminiServerErr);
        
        // 2차 시도: Llama 3 Emergency Fallback
        interpretation = await callLlamaEngine(finalQuestion, card1, card2);
        if (interpretation.includes('.')) {
          summary = interpretation.split('.')[0].substring(0, 50);
        }
        engineVersion = "Llama-3-Master (Emergency Fallback)";
        console.log("✅ 라마(비상 우회) 해석 수신 완료");
      }
    } else {
      // 명시적으로 llama를 선택한 경우
      interpretation = await callLlamaEngine(finalQuestion, card1, card2);
      if (interpretation.includes('.')) {
        summary = interpretation.split('.')[0].substring(0, 50);
      }
      engineVersion = "Llama-3-Master";
      console.log("✅ 라마 해석 수신 완료");
    }

    return {
      mainFortune: summary,
      deepInsight: interpretation,
      caution: "신탁의 조언을 가슴 깊이 새기십시오.",
      coffeePairing: "마스터의 기운과 어울리는 '오라클 블렌드'를 추천합니다.",
      generatedAt: new Date().toISOString(),
      engineVersion: engineVersion
    };

  } catch (err) {
    console.error('AI Oracle Service Error:', err);
    let userMsg = err.message || 'AI 통신 중에 사고가 났습니다. 잠시 후 다시 시도해 주세요!';
    
    if (userMsg.includes('high demand') || userMsg.includes('과부하')) {
      userMsg = "모든 AI 서버가 너무 바쁩니다! 1분 정도만 숨 고르고 다시 시도해 주십시오!";
    }

    throw new Error(userMsg);
  }
};


