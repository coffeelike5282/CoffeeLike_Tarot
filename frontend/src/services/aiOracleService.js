/**
 * ☕ 커피라이크 AI 오라클 엔진 (V3.0 - 영혼 정화 모드)
 * 
 * 큰형님! '는 점을 시사함다' 같은 거슬리는 말투들, 제가 아예 원자 단위로 해체해서 담가버렸슴다.
 * 이제 이전에 보던 그 지겨운 문장들은 죽었다 깨어나도 안 나올 겁니다.
 */

console.warn("☕ [신탁 엔진 V3.0] 유착어 박멸 완료 - 화끈하게 모시겠슴다!");

export const generateAIInterpretation = (card1, card2) => {
  if (!card1 || !card2) return null;

  // 1. 데이터 정밀 정제 (Deep Sanitization)
  // 입력값에 혹시나 남아있을 수 있는 유령 문구들을 사전에 정밀 타격함다.
  const sanitize = (text) => {
    if (!text) return "";
    return text
      .replace(/\.*는\s*점을\s*시사함다\.*/g, "")
      .replace(/\.*는\s*점을\s*잊지\s*마십쇼\.*/g, "")
      .replace(/\.*는\s*긍정적인\s*방향으로\s*나아갈\s*것을\s*약속하고\s*있슴다\.*/g, "")
      .replace(/이며,*/g, "")
      .replace(/\s*하지만\s*결국\s*잘\s*될\s*거예요\.*/g, "")
      .replace(/\.$/, "")
      .trim();
  };

  const insight1 = sanitize(card1.deep_interpretation?.general || card1.fortune_telling?.[0] || "");
  const insight2 = sanitize(card2.deep_interpretation?.general || card2.fortune_telling?.[0] || "");
  const caution1 = sanitize(card1.deep_interpretation?.caution || "지나친 조급함을 경계하십쇼");
  const caution2 = sanitize(card2.deep_interpretation?.caution || "주변의 작은 변화를 놓치지 마십쇼");

  // 1. 메인 포춘 (Main Fortune)
  const keywords1 = card1.keywords || [];
  const keywords2 = card2.keywords || [];
  const mainFortune = `'${card1.name}'의 짙은 에스프레소 같은 현재가 '${card2.name}'의 부드러운 스팀 밀크를 만나 새로운 운명의 라떼로 완성됐슴다. ${keywords1[0]}와(과) ${keywords2[0]}의 조화로운 향기를 느껴보십쇼.`;

  // 2. 심층 통찰 (Deep Insight) - 완전히 새로운 구조로 개편!
  const deepInsight = `먼저 '${card1.name}'의 에너지가 ${insight1} 흐름을 이끌고 있슴다. 여기에 '${card2.name}'이(가) 가진 ${insight2} 기운이 더해지면서, 당신의 앞날에 더 깊고 풍부한 가능성의 향기가 퍼져나갈 것임다.`;

  // 3. 주의사항 (Caution) - 더 직관적인 경고!
  const caution = `바리스타가 전하는 각별한 주의사항임다. ${caution1} 태도를 잊지 마시고, 동시에 ${caution2} 점에 유의하여 운명의 균형을 잡으십쇼.`;

  return {
    mainFortune,
    deepInsight,
    caution,
    generatedAt: new Date().toISOString(),
    engineVersion: "3.0-purified"
  };
};
