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
  
  // 2. 다이내믹 주의사항 (Dynamic Caution V3.2)
  // 고정된 문구 대신 카드의 키워드와 성격에 따라 다양한 조합을 생성함다.
  const getDynamicCaution = (c1, c2) => {
    const fallbacks = [
      "지나친 조급함보다는 에스프레소처럼 진득하게 기다리십쇼",
      "주변의 작은 변화를 놓치지 않는 세밀한 바리스타의 눈을 가지십쇼",
      "한쪽으로 치우친 생각은 운명의 온도를 떨어뜨릴 수 있슴다",
      "자신감을 갖되, 다른 이의 향기(의견)도 존중하는 여유를 갖으십쇼",
      "지금의 안정이 자칫 정체로 이어지지 않게 긴장을 늦추지 마십쇼"
    ];

    const ctx1 = c1.deep_interpretation?.caution || (c1.keywords?.[1] ? `'${c1.keywords[1]}'의 이면에 숨은 함정을 경계하십쇼` : fallbacks[0]);
    const ctx2 = c2.deep_interpretation?.caution || (c2.keywords?.[0] ? `'${c2.keywords[0]}'의 과잉된 욕심만 버린다면 완벽함다` : fallbacks[1]);
    
    const templates = [
      `바리스타의 특별 조언임다. '${ctx1}'은(는) 경계하시고, '${ctx2}'에 각별히 유의하여 운명의 균형을 잡으십쇼.`,
      `오늘의 추출 포인트! '${ctx1}'에 유의하면서, '${ctx2}'의 흐름만 잘 타면 최상의 결과가 나올 것임다.`,
      `운명의 배합이 미묘함다. '${ctx1}'에 대한 각별한 유의가 필요하며, 특히 '${ctx2}' 부분을 놓치지 마십쇼.`
    ];

    // 카드 이름 조합을 기반으로 한 유사 랜덤 선택
    const seed = (c1.name?.length || 0) + (c2.name?.length || 0);
    return templates[seed % templates.length];
  };

  const cautionText = getDynamicCaution(card1, card2);

  return {
    mainFortune: `'${card1.name}'의 짙은 에스프레소 같은 오늘이 '${card2.name}'의 부드러운 스팀 밀크를 만나 새로운 운명의 라떼로 완성됐슴다. ${card1.keywords?.[0]}와(과) ${card2.keywords?.[0]}의 조화로운 향기를 느껴보십쇼.`,
    deepInsight: `'${card1.name}'이(가) 이끄는 ${insight1} 흐름을 바탕으로, '${card2.name}'의 ${insight2} 기운이 더해져 당신의 앞날에 풍부한 가능성의 향기가 퍼져나갈 것임다.`,
    caution: cautionText,
    coffeePairing: `부드러운 산미와 깊은 바디감이 조화로운 '오라클 블렌드'를 추천함다.`,
    generatedAt: new Date().toISOString(),
    engineVersion: "3.2-dynamic-insight"
  };
};
