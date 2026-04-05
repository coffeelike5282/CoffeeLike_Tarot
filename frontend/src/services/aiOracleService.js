/**
 * ☕ 커피라이크 AI 오라클 서비스 (V1.0)
 * 
 * 카드 1(현재)과 카드 2(미래)의 조합을 분석하여 정밀한 AI 해설을 생성함다!
 * 큰형님의 보수적인 운영 방침을 따라, 우선 DB의 카드리스트 기반 조합 엔진으로 구현했슴다.
 */

export const generateAIInterpretation = (card1, card2) => {
  if (!card1 || !card2) return null;

  // 1. 메인 포춘 (Main Fortune) - 두 카드의 핵심 정서를 조합!
  const keywords1 = card1.keywords || [];
  const keywords2 = card2.keywords || [];
  const mainFortune = `오늘 당신의 운명은 '${card1.name}'의 짙은 향기로 시작해 '${card2.name}'의 부드러운 여운으로 완성되는 한 잔의 스페셜티 커피와 같슴다. ${keywords1[0]}의 에너지가 ${keywords2[0]}의 흐름을 만나 새로운 통찰을 열어줄 것임다.`;

  // 2. 심층 통찰 (Deep Insight) - 카드별 심층 해석 데이터를 융합!
  // 큰형님! '는 점을 시사함다' 같은 유착어들은 여기서 싹 다 담가버리겠슴다.
  const sanitize = (text) => {
    if (!text) return "";
    return text
      .replace(/\.*는\s*점을\s*시사함다\.*/g, "") // "는 점을 시사함다" 제거
      .replace(/\.*는\s*점을\s*잊지\s*마십쇼\.*/g, "") // "는 점을 잊지 마십쇼" 제거
      .replace(/\.$/, "") // 마지막 마침표 제거
      .trim();
  };

  const insight1 = sanitize(card1.deep_interpretation?.general || card1.fortune_telling?.[0] || "");
  const insight2 = sanitize(card2.deep_interpretation?.general || card2.fortune_telling?.[0] || "");
  const deepInsight = `현재의 자리에 놓인 '${card1.name}'은(는) ${insight1} 미래의 향기로 찾아온 '${card2.name}'의 기운이 결합되면서, ${insight2} 이 모든 흐름이 조화롭게 어우러져 긍정적인 방향으로 나아갈 것을 약속하고 있슴다.`;

  // 3. 주의사항 (Caution) - 카드별 주의점 조합!
  const caution1 = sanitize(card1.deep_interpretation?.caution || "지나친 조급함을 경계하십쇼");
  const caution2 = sanitize(card2.deep_interpretation?.caution || "주변의 작은 변화를 놓치지 마십쇼");
  const caution = `두 운명의 실타래가 얽힐 때 가장 주의해야 할 점은 ${caution1} 동시에 ${caution2} 균형을 유지하는 것이 핵심임다.`;

  return {
    mainFortune,
    deepInsight,
    caution,
    generatedAt: new Date().toISOString()
  };
};
