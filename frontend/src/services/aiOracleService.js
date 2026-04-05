/**
 * ☕ 커피라이크 AI 오라클 엔진 (V4.0 - 하이브리드 템플릿 모드)
 * 
 * 큰형님! 꼬봉이가 만들어둔 '프리미엄 레고 블록'을 Supabase에서 불러와
 * 자연스러운 한국어로 매끄럽게 조립하는 방식(V4.0)으로 전면 교체했슴다!
 */

import { supabase } from '../lib/supabaseClient';
import { generateCompositeInterpretation } from '../utils/tarotTemplateEngine';

console.warn("☕ [신탁 엔진 V4.0] 다이내믹 템플릿 모드 장착 - 기계 냄새 제로!");

// 임시 모의 블록 (DB에 아직 꼬봉이가 생성한 블록이 없을 때를 대비한 안전망)
const createMockBlock = (card) => ({
  card_name: card.name,
  card_name_kr: card.name, // 일단 영어명으로 대체 (실제 DB에는 한글명 존재)
  short_modifier: "잠시 길을 잃은 듯 하나,",
  short_advice: "스스로를 믿고 나아가십시오.",
  essay_intro: `당신이 뽑은 카드는 '${card.name}' 기운을 담고 있습니다. 무언가 새롭게 변하고자 하는 열망이 내면에 가득합니다.`,
  essay_meaning: `이 카드가 시사하는 바는 바로 '현재의 한계를 넘어서는 힘'입니다. ${card.keywords?.[0] || '불확실성'} 속에서도 분명한 해답이 존재함을 뜻합니다.`,
  essay_advice: "당장의 성과가 보이지 않더라도 흔들리지 마십시오. 결국 원하던 방향으로 궤도에 오를 것입니다."
});

export const generateAIInterpretation = async (card1, card2) => {
  if (!card1 || !card2) return null;

  try {
    // 1. Supabase에서 두 카드의 블록을 가져옴다!
    const { data: blocks, error } = await supabase
      .from('tb_tarot_blocks')
      .select('*')
      .in('card_name', [card1.name, card2.name]);

    if (error) {
      console.error("❌ 블록 데이터를 가져오지 못했슴다:", error);
    }

    // 2. 블록 매칭 및 fallback 처리
    let card1Block = blocks?.find(b => b.card_name === card1.name);
    let card2Block = blocks?.find(b => b.card_name === card2.name);

    if (!card1Block) {
      console.warn(`⚠️ [${card1.name}] DB 블록이 부족하여 예비 부품을 씁니다!`);
      card1Block = createMockBlock(card1);
    }
    if (!card2Block) {
      console.warn(`⚠️ [${card2.name}] DB 블록이 부족하여 예비 부품을 씁니다!`);
      card2Block = createMockBlock(card2);
    }

    // 3. 엔진 가동! 레고 블록 조립 및 은/는/이/가 맞춤
    const { shortInterpretation, essayInterpretation } = generateCompositeInterpretation(card1Block, card2Block);

    // 4. 예전부터 큰형님이 좋아하시던 다이내믹 주의사항 (임시 유지)
    const cautionText = `바리스타 특별 조언임다! '${card1.keywords?.[1] || card1.name}'의 이면을 경계하시고 상황의 흐름만 탄다면 최상의 결과가 나올 것임다.`;

    return {
      mainFortune: shortInterpretation,
      deepInsight: essayInterpretation,
      caution: cautionText,
      coffeePairing: `부드러운 산미와 깊은 바디감이 조화로운 '오라클 블렌드'를 추천함다.`,
      generatedAt: new Date().toISOString(),
      engineVersion: "4.0-template-hybrid"
    };

  } catch (err) {
    console.error('Template Engine Error:', err);
    return null;
  }
};

