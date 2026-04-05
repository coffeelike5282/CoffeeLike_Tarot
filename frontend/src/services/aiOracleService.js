/**
 * ☕ 커피라이크 AI 오라클 엔진 (V3.1 - 영혼 정화 모드)
 * 
 * 큰형님! '는 점을 시사함다' 같은 거슬리는 말투들, 제가 아예 원자 단위로 해체해서 담가버렸슴다.
 * 이제 이전에 보던 그 지겨운 문장들은 죽었다 깨어나도 안 나올 겁니다.
 */

console.warn("☕ [신탁 엔진 V3.1] 유착어 박멸 완료 - 화끈하게 모시겠슴다!");

export const generateAIInterpretation = (card1, card2) => {
  if (!card1 || !card2) return null;

  // 1. 데이터 정밀 정제 (Deep Sanitization V3.1)
  // 입력값에 혹시나 남아있을 수 있는 유령 문구들을 사전에 정밀 타격함다.
  const sanitize = (text) => {
    if (!text) return "";
    return text
      // 1. "는 점을 시사함다" 계열 (변칙 띄어쓰기 포함)
      .replace(/는\s*점을\s*시사함다\.*/g, "")
      .replace(/는\s*점을\s*나타냅니다\.*/g, "")
      // 2. "는 긍정적인 방향으로 나아갈 것을 약속하고 있슴다" 계열
      .replace(/는\s*긍정적인\s*방향으로\s*나아갈\s*것을\s*약속하고\s*있슴다\.*/g, "")
      .replace(/는\s*긍정적인\s*미래를\s*약속합니\.*/g, "")
      // 3. "는 점을 잊지 마십쇼" 계열
      .replace(/는\s*점을\s*잊지\s*마십쇼\.*/g, "")
      .replace(/라는\s*사실을\s*기억하십쇼\.*/g, "")
      // 4. 기타 유착어
      .replace(/이며,*/g, "")
      .replace(/\s*하지만\s*결국\s*잘\s*될\s*거예요\.*/g, "")
      .replace(/\s*부분에\s*유의하여\s*향기로운\s*하루를\s*만드십쇼\.*/g, "")
      .replace(/\s*점에*\s*유의하십쇼\.*/g, "")
      .replace(/\s*점의*\s*유의하십시오\.*/g, "")
      .replace(/\.$/, "")
      .trim();
  };

  const insight1 = sanitize(card1.deep_interpretation?.general || card1.fortune_telling?.[0] || "");
  const insight2 = sanitize(card2.deep_interpretation?.general || card2.fortune_telling?.[0] || "");
  const caution1 = sanitize(card1.deep_interpretation?.caution || "지나친 조급함을 경계하십쇼");
  const caution2 = sanitize(card2.deep_interpretation?.caution || "주변의 작은 변화를 놓치지 마십쇼");

  // V3.1 신규 템플릿 - 기존의 "현재의 자리에.." 같은 문구 일절 미사용!
  return {
    mainFortune: `'${card1.name}'의 짙은 에스프레소 같은 오늘이 '${card2.name}'의 부드러운 스팀 밀크를 만나 새로운 운명의 라떼로 완성됐슴다. ${card1.keywords?.[0]}와(과) ${card2.keywords?.[0]}의 조화로운 향기를 느껴보십쇼.`,
    deepInsight: `'${card1.name}'이(가) 이끄는 ${insight1} 흐름을 바탕으로, '${card2.name}'의 ${insight2} 기운이 더해져 당신의 앞날에 풍부한 가능성의 향기가 퍼져나갈 것임다.`,
    caution: `바리스타의 특별 조언임다. '${caution1}'은(는) 경계하시고, '${caution2}'에 각별히 유의하여 운명의 균형을 잡으십쇼.`,
    coffeePairing: `부드러운 산미와 깊은 바디감이 조화로운 '오라클 블렌드'를 추천함다.`,
    generatedAt: new Date().toISOString(),
    engineVersion: "3.1-purified"
  };
};
