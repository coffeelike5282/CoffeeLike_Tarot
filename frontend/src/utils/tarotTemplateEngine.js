/**
 * 커피라이크 타로 V4.0 고급 템플릿 엔진
 * 
 * 꼬봉이(로컬 LLM)가 생성하여 Supabase(tb_tarot_blocks)에 보관된 카드 해설 조각들을 읽어와서
 * 은/는/이/가 등의 조사를 한국어 문법에 맞게 연결하고,
 * 짧은 임팩트 조언과 긴 에세이를 조합하는 템플릿 엔진입니다.
 */

// 종성(받침) 여부 확인 함수
function hasJongseong(str) {
  if (!str || str.length === 0) return false;
  const lastChar = str.charCodeAt(str.length - 1);
  // 한글 가상 범위 내에 있는지 확인
  if (lastChar < 0xac00 || lastChar > 0xd7a3) return false;
  return (lastChar - 0xac00) % 28 > 0;
}

// 조사 자동 선택기
function attachJosa(word, josaOptions) {
  const [josaWithJongseong, josaWithoutJongseong] = josaOptions.split('/');
  return word + (hasJongseong(word) ? josaWithJongseong : josaWithoutJongseong);
}

/**
 * 2장의 카드를 조합하여 최종 해설 결과를 생성합니다.
 * @param {Object} card1Block - 첫 번째 카드(과거/원인)의 해설 블록
 * @param {Object} card2Block - 두 번째 카드(현재/결과)의 해설 블록
 * @returns {Object} { shortInterpretation, essayInterpretation }
 */
export function generateCompositeInterpretation(card1Block, card2Block) {
  if (!card1Block || !card2Block) return null;

  // 1. [임팩트 있는 짧은 조언 생성]
  // 조합 예시: [과거 카드의 수식어] + [현재 카드의 강렬한 조언]
  // 예: "끝이 보이지 않는 미궁 속에서 헤매고 있지만, 스스로를 믿고 직진하십시오."
  const shortInterpretation = `${card1Block.short_modifier} ${card2Block.short_advice}`;

  // 2. [접속사 계산 및 긴 에세이 조립]
  // 접속사는 두 카드의 관계나 스토리 방향에 따라 다양하게 줄 수 있지만 
  // 여기서는 가장 자연스러운 템플릿 접속 문장을 사용.
  const transitions = [
    "과거의 이러한 흔적 위로, 새로운 운명의 흐름이 당신에게 다가옵니다.",
    "이제 페이지를 넘겨 새롭게 펼쳐진 당신의 현재를 마주할 시간입니다.",
    "이러한 배경 속에서 등장한 다음 카드는 당신에게 새로운 방향성을 제시하고 있습니다."
  ];
  // 랜덤 접속사 선택 (또는 해시 알고리즘 기반 고정 선택)
  const randomTransition = transitions[Math.floor(Math.random() * transitions.length)];

  // 첫 번째 카드의 한국어 이름에 '은/는' 조사 붙이기
  const card1NameWithJosa = attachJosa(`'${card1Block.card_name_kr}'`, '은/는');
  const card2NameWithJosa = attachJosa(`'${card2Block.card_name_kr}'`, '이/가');

  const essayIntro = `운명의 수레바퀴가 돌며 당신이 첫 번째로 마주한 카드${card1NameWithJosa} 과거의 흔적과 현재의 원인을 비추고 있습니다.\n${card1Block.essay_intro}`;
  
  const essayMiddle = `${card1Block.essay_meaning}\n\n${randomTransition}\n\n두 번째로 펼쳐진 카드${card2NameWithJosa} 당신이 나아갈 길을 가리킵니다.\n${card2Block.essay_intro}`;
  
  const essayConclusion = `${card2Block.essay_meaning}\n\n[ 타로 오라클의 마지막 조언 ]\n${card2Block.essay_advice}`;

  const essayInterpretation = `${essayIntro}\n\n${essayMiddle}\n\n${essayConclusion}`;

  return {
    shortInterpretation,
    essayInterpretation
  };
}
