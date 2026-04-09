/**
 * ☕ 커피라이크 AI 오라클 엔진 (V5.1 - 멀티 엔진 지원)
 * 
 * 큰형님! 구글 제미나이 1.5 플래시랑 기존 라마 엔진을 모두 품었슴다!
 * 이제 관리자 화면에서 자유롭게 스위칭하며 최고의 해석을 뽑아낼 수 있슴다.
 */

import { supabase } from '../lib/supabaseClient';

/**
 * Cloudflare Workers 기반 Llama 3 엔진 호출
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
    throw new Error(`라마 마스터와의 통신에 실패했슴다! (상태: ${response.status})`);
  }
  
  const data = await response.json();
  if (!data || !data.response) throw new Error('라마 마스터의 응답에 문제가 있슴다! 응답 본문을 확인해 보십쇼.');
  
  return data.response;
};

/**
 * Google AI Studio 기반 Gemini 1.5 Flash 엔진 호출 (Supabase Edge Function 우회)
 */
const callGeminiEngine = async (question, card1, card2) => {
  // supabaseClient는 외부에서 주입받거나 전역 설정을 이용한다고 가정함다.
  // 여기서는 supabaseClient가 이미 프로젝트 어딘가에 설정되어 있다고 보고 호출함다.
  // (실제 프로젝트 구조에 따라 supabaseClient 임포트가 필요할 수 있슴다)
  
  const { data, error } = await supabase.functions.invoke('gemini-oracle', {
    body: { question, card1, card2 }
  });

  if (error) {
    console.error('❌ Supabase 함수 호출 오류 상세:', error)
    
    // 상세 에러 메시지 추출 시도 (더 꼼꼼하게!)
    let detailMsg = error.message;
    const errorSource = error.context || error.response; // SDK 버전에 따라 다를 수 있슴다

    if (errorSource && typeof errorSource.json === 'function') {
      try {
        const errorBody = await errorSource.json();
        detailMsg = errorBody.error || errorBody.message || JSON.stringify(errorBody);
      } catch (e) {
        console.warn('에러 본문 JSON 파싱 실패, 텍스트로 시도함다:', e);
        try {
          detailMsg = await errorSource.text();
        } catch (e2) {
          console.error('텍스트 파싱도 실패했슴다:', e2);
        }
      }
    }
    
    console.error(`🔍 최종 추출된 에러 사유: ${detailMsg}`);
    throw new Error(`제미나이 마스터와의 통신에 실패했슴다! (사유: ${detailMsg})`);
  }
  
  if (!data || !data.interpretation) {
    throw new Error('제미나이 마스터가 신탁을 내리지 않았슴다! 응답 형식을 확인해 보십쇼.');
  }
  
  return data.interpretation;
};

export const generateAIInterpretation = async (question, card1, card2, engine = 'llama') => {
  if (!card1 || !card2) return null;
  const finalQuestion = question?.trim() || "오늘의 운세 알려줘";

  try {
    console.log(`🔮 [마스터 에이전트 호출] 엔진: ${engine}, 질문:`, question);
    
    let responseText = "";
    if (engine === 'gemini') {
      responseText = await callGeminiEngine(finalQuestion, card1, card2);
    } else {
      responseText = await callLlamaEngine(finalQuestion, card1, card2);
    }

    console.log(`✅ ${engine === 'gemini' ? '제미나이' : '라마'} 해석 수신 완료`);

    return {
      mainFortune: engine === 'gemini' ? "제미나이 1.5의 서버 사이드 신탁" : "마스터의 깊은 신탁",
      deepInsight: responseText,
      caution: "신탁의 조언을 가슴 깊이 새기십시오.",
      coffeePairing: `마스터의 기운과 어울리는 '오라클 블렌드'를 추천함다.`,
      generatedAt: new Date().toISOString(),
      engineVersion: engine === 'gemini' ? "Gemini-3.0-Flash (Server)" : "Llama-3-Master"
    };

  } catch (err) {
    console.error('AI Oracle Service Error:', err);
    // 에러 메시지가 구체적이면(우리가 던진 Error 객체라면) 그 메시지를 쓰고, 아니면 기본 메시지를 씀다.
    const userMsg = err.message || 'AI 통신 중에 사고가 났습니다. 잠시 후 다시 시도해 주세요!';
    throw new Error(`사장님, ${userMsg}`);
  }
};

