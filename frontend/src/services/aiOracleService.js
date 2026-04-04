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
  const insight1 = card1.deep_interpretation?.general || card1.fortune_telling?.[0] || "";
  const insight2 = card2.deep_interpretation?.general || card2.fortune_telling?.[0] || "";
  const deepInsight = `먼저, 현재의 자리에 있는 '${card1.name}'은 ${insight1.replace(/\.$/, '')}는 점을 시사함다. 여기에 미래의 향기로 찾아온 '${card2.name}'의 기운이 결합되면서, ${insight2}는 긍정적인 방향으로 나아갈 것을 약속하고 있슴다. 특히 ${card1.aroma_note || '은은한'} 향기와 ${card2.aroma_note || '깊은'} 향기의 조화를 눈여겨보십쇼.`;

  // 3. 주의사항 (Caution) - 카드별 주의점 조합!
  const caution1 = card1.deep_interpretation?.caution || "지나친 조급함을 경계하십쇼.";
  const caution2 = card2.deep_interpretation?.caution || "주변의 작은 변화를 놓치지 마십쇼.";
  const caution = `두 운명의 실타래가 얽힐 때 가장 주의해야 할 점은 ${caution1.replace(/\.$/, '')}이며, 동시에 ${caution2}는 점을 잊지 마십쇼. 균형을 유지하는 것이 핵심임다.`;

  // 4. 커피 페어링 (Coffee Pairing) - 카드별 에레멘트 및 향기 기반!
  const coffeePairing = `${card1.aroma_note || '에티오피아'}의 산미와 ${card2.aroma_note || '콜롬비아'}의 바디감이 어우러진 '오라클 블렌드'를 추천함다.`;

  return {
    mainFortune,
    deepInsight,
    caution,
    coffeePairing,
    generatedAt: new Date().toISOString()
  };
};
