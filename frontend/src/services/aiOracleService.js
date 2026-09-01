/**
 * ☕ 커피라이크 AI 오라클 엔진 (V5.2 - 제미나이 2.5/3.5 초고속 하이브리드 엔진)
 * 
 * 큰형님! 구글 제미나이 최신 엔진과 클라이언트 직통 다이렉트 백업, 
 * 그리고 비상용 라마 3 엔진까지 3중 방어선으로 무장했슴다!
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
 * 1차: Supabase Edge Function을 통한 Gemini 최신 엔진 호출
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

/**
 * 2차 방어선: 브라우저에서 Google Gemini API 직접 호출 (Edge Function 우회 백업)
 */
const callGeminiDirect = async (question, card1, card2) => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("VITE_GEMINI_API_KEY 환경변수가 설정되지 않았습니다.");
  }

  let prompt = "당신은 20년 경력의 베테랑 타로 마스터 '커피라이크 오라클'입니다.\n\n";
  prompt += "[전달 사항]\n";
  prompt += "질문: " + question + "\n";
  prompt += "첫 번째 카드: " + card1.name + " (" + card1.rank + " - " + card1.suit + ")\n";
  prompt += "두 번째 카드: " + card2.name + " (" + card2.rank + " - " + card2.suit + ")\n\n";
  prompt += "[응답 형식]\n";
  prompt += "1. [요약] 태그 뒤에 한 줄 통찰을 작성하십시오.\n";
  prompt += "2. [해설] 태그 뒤에 5개 문단으로 상세 해설을 작성하십시오. 문단 사이에는 반드시 줄바꿈 두 번(\\n\\n)을 사용하십시오.\n";
  prompt += "3. 마스터의 신비롭고 정중한 말투를 유지하십시오.";

  const modelPool = ["gemini-2.5-flash", "gemini-3.5-flash", "gemini-3.5-flash-lite"];
  let lastErr = null;

  for (const modelId of modelPool) {
    try {
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { max_output_tokens: 4096, temperature: 0.8 }
        })
      });

      if (res.ok) {
        const json = await res.json();
        const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text || "";
        if (rawText) {
          const cleanText = (t) => t.replace(/^\s*[\*\#\-\d\.\:]+\s*/, '').replace(/[\*\_]/g, '').trim();

          const extractTag = (text, tag) => {
            const patterns = [
              new RegExp(`\\[${tag}\\]([\\s\\S]*?)(?=\\[(요약|해설)\\]|$)`, 'i'),
              new RegExp(`${tag}\\s*:\\s*([\\s\\S]*?)(?=(요약|해설)\\s*:|$)`, 'i')
            ];
            for (const p of patterns) {
              const m = text.match(p);
              if (m && m[1] && m[1].trim()) return m[1].trim();
            }
            return "";
          };

          let summary = cleanText(extractTag(rawText, "요약"));
          let interpretation = extractTag(rawText, "해설");

          if (!interpretation) {
            interpretation = rawText.replace(/\[요약\][\s\S]*?(?=\[해설\]|$)/i, '').replace(/\[해설\]/i, '').trim();
          }

          if (!summary || !interpretation) {
            const lines = rawText.split("\n").filter(l => l.trim());
            summary = summary || cleanText(lines[0]?.substring(0, 70)) || "운명의 요약문";
            interpretation = interpretation || lines.slice(1).join("\n\n") || rawText;
          }

          return { summary, interpretation, model: modelId };
        }
      } else {
        lastErr = new Error(`${modelId} (HTTP ${res.status})`);
      }
    } catch (e) {
      lastErr = e;
    }
  }

  throw lastErr || new Error("Gemini Direct 호출에 실패했습니다.");
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
        // 1차 시도: Supabase Edge Function
        const result = await callGeminiEngine(finalQuestion, card1, card2);
        summary = result.summary;
        interpretation = result.interpretation;
        engineVersion = `Gemini (${result.model || 'Server'})`;
        console.log("✅ 제미나이 서버 엣지 펑션 해석 수신 완료:", engineVersion);
      } catch (geminiServerErr) {
        console.warn("⚠️ 제미나이 엣지 펑션 호출 실패, 프론트엔드 직통 API(2차 방어선) 가동:", geminiServerErr);
        
        try {
          // 2차 시도: 브라우저 Direct Gemini API
          const directResult = await callGeminiDirect(finalQuestion, card1, card2);
          summary = directResult.summary;
          interpretation = directResult.interpretation;
          engineVersion = `Gemini (${directResult.model || 'Direct'})`;
          console.log("✅ 제미나이 직통 API(2차 방어선) 해석 수신 완료:", engineVersion);
        } catch (geminiDirectErr) {
          console.warn("⚠️ 제미나이 직통 API 실패. 비상용 라마 마스터(3차)로 우회함다!", geminiDirectErr);
          
          // 3차 시도: Llama 3 Emergency Fallback
          interpretation = await callLlamaEngine(finalQuestion, card1, card2);
          if (interpretation.includes('.')) {
            summary = interpretation.split('.')[0].substring(0, 50);
          }
          engineVersion = "Llama-3-Master (Emergency Fallback)";
          console.log("✅ 라마(비상 우회) 해석 수신 완료");
        }
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


