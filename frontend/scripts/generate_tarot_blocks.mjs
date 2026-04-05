import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

// Supabase 클라이언트 초기화 (실제 실행 시 터미널 환경변수 또는 파일 주입 필요)
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY 환경변수가 필요합니다.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const OLLAMA_API_URL = 'http://localhost:11434/api/generate';
const MODEL_NAME = 'qwen2.5-local:latest';

async function generateBlockForCard(cardName, cardNameKr, keywords) {
  const prompt = `당신은 최고급 프리미엄 타로 해설가입니다. 모든 해설은 품격 있는 존댓말(하십시오체 또는 해요체)로 작성해야 합니다.

카드 ID: ${cardName}
카드 이름 (한국어): ${cardNameKr}
주요 키워드: ${keywords}

[요청 사항 - 절대 준수]
1. 말투: 모든 문장은 반드시 '~습니다', '~합니다', '~하십시오', '~해요'와 같은 정중한 존댓말로 마쳐야 합니다. 
   - 절대 금지: '~이다', '~하다', '~한다'와 같은 평어체/반말은 절대 금지합니다.
2. 오타 방지: '지킵니다'를 '주킵니다'로 쓰는 등 초보적인 오타가 나지 않도록 단어 선택과 맞춤법에 각별히 유의하십시오. 특히 '지킵니다'는 정확히 기재하십시오.
3. short_modifier: 이 카드가 과거/원인으로 작동할 때 어울리는 10자 내외의 짧은 수식어. (예: "눈부신 성과가 빛납니다만,", "혼란의 늪에 빠졌으나,")
4. short_advice: 이 카드가 현재/결과로 작동할 때 어울리는 15자 내외의 짧고 강렬한 조언. (예: "스스로를 믿고 직진하십시오.", "지금은 때를 기다려야 합니다.")
5. essay_intro: 긴 에세이 형태의 해설에서 이 카드의 상징을 묘사하는 감성적인 도입부 (약 1~2문장).
6. essay_meaning: 이 카드의 핵심 의미와 현재 상황에 대한 직관적인 해석 (약 2문장).
7. essay_advice: 이 카드가 주는 구체적이고 현실적인 마지막 조언 (약 1~2문장).

응답 형식 (JSON):
{
  "short_modifier": "한 장의 수식어 문장(해요체)",
  "short_advice": "한 장의 조언 문장(해요체)",
  "essay_intro": "카드의 상징 묘사(해요체)",
  "essay_meaning": "카드의 해석(해요체)",
  "essay_advice": "마무리 조언(해요체)"
}
오타 금지: '지킵니다' (O), '주킵니다' (X)
존댓말만 사용하십시오.
`;

  try {
    const response = await fetch(OLLAMA_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL_NAME,
        prompt: prompt,
        stream: false,
        format: "json"
      })
    });
    
    if (!response.ok) throw new Error(`Ollama 통신 실패: ${response.status}`);
    const data = await response.json();
    
    // 🔥 JSON 포맷이므로 바로 파싱
    const parsed = JSON.parse(data.response);
    return parsed;
  } catch (error) {
    console.error(`❌ [${cardNameKr}] 생성 중 에러 발생:`, error);
    return null;
  }
}

async function main() {
  console.log("🚀 꼬봉이(Ollama) 프리미엄 타로 블록 자동 생성기 시작!");

  // 1. 이미 생성된 블록 목록 가져오기 (기본 문구인 것들만 다시 깎기 위해 정보를 포함함다)
  const { data: existingBlocks, error: existingError } = await supabase
    .from('tb_tarot_blocks')
    .select('card_name, short_modifier');
  
  if (existingError) {
    console.error("❌ 기존 블록 조회 에러:", existingError);
    return;
  }
  
  const DEFAULT_MODIFIER = "운명의 흐름을 살피십시오.";
  const redoNames = new Set(existingBlocks.filter(b => b.short_modifier === DEFAULT_MODIFIER).map(b => b.card_name));
  const finishedNames = new Set(existingBlocks.filter(b => b.short_modifier !== DEFAULT_MODIFIER).map(b => b.card_name));

  // 2. 전체 카드 목록 가져오기
  console.log("📥 Supabase에서 전체 카드 목록을 조회합니다...");
  const { data: allCards, error } = await supabase
    .from('tb_tarot_card')
    .select('name, keywords')
    .order('suit', { ascending: true })
    .order('rank', { ascending: true });

  if (error) {
    console.error("❌ Supabase 조회 에러:", error);
    return;
  }

  // 3. 작업 대상 필터링 (V4.0 엔진 고도화를 위해 전체 재생성 강제)
  const FORCE_ALL_REGENERATE = true; 
  const cardsToProcess = (FORCE_ALL_REGENERATE ? allCards : allCards.filter(c => !finishedNames.has(c.name)));
  
  if (cardsToProcess.length === 0) {
    console.log("✅ 이미 모든 카드가 고품질로 생성되었습니다. 작업할 내용이 없슴다!");
    return;
  }

  // 🚀 [V4.0 프리미엄 엔진] 78장 전체 카드 데이터 적재 시작!
  const targetCards = cardsToProcess;
  console.log(`✅ 총 ${targetCards.length}장의 카드를 정밀 재작업합니다. (전체 적재 모드)`);

  const generatedBlocks = [];

  // 순차적으로 꼬봉이에게 요청
  for (let i = 0; i < targetCards.length; i++) {
    const card = targetCards[i];
    // 키워드를 한글로 변환하기 위해 객체 value 추출
    let keywordStr = "";
    if (Array.isArray(card.keywords)) {
      keywordStr = card.keywords.join(", ");
    } else if (typeof card.keywords === 'object' && card.keywords !== null) {
      keywordStr = Object.values(card.keywords).join(", ");
    }
    
    const cardNameKr = card.name_kr || card.name;
    console.log(`[${i+1}/${targetCards.length}] 🤖 꼬봉이가 [${cardNameKr}] 블록을 깎는 중입니다...`);
    const blockData = await generateBlockForCard(card.name, cardNameKr, keywordStr);
    
    if (blockData) {
      // ⚠️ Ollama가 필드를 누락하거나 이름을 다르게 줄 수 있으므로 검증 및 기본값을 적용합니다.
      const requiredFields = ['short_modifier', 'short_advice', 'essay_intro', 'essay_meaning', 'essay_advice'];
      const missingFields = requiredFields.filter(f => !blockData[f]);

      if (missingFields.length > 0) {
        console.warn(`   -> ⚠️ [${card.name}] 필드 누락 (${missingFields.join(', ')}). 재시도 혹은 확인 필요.`);
        // 누락된 필드가 있어도 최소한의 기본값으로 채워서 저장 실패를 방지함다.
        blockData.short_modifier = blockData.short_modifier || "운명의 흐름을 살피십시오.";
        blockData.short_advice = blockData.short_advice || "차분한 마음이 정답을 가져옵니다.";
        blockData.essay_intro = blockData.essay_intro || "신비로운 에너지가 당신 주변을 감싸고 있습니다.";
        blockData.essay_meaning = blockData.essay_meaning || "현재의 상황은 더 깊은 성찰을 요구하고 있습니다.";
        blockData.essay_advice = blockData.essay_advice || "내면의 목소리에 귀를 기울이며 신중하게 행동하세요.";
      }

      const cleanBlock = {
        card_name: card.name,
        card_name_kr: cardNameKr,
        short_modifier: blockData.short_modifier,
        short_advice: blockData.short_advice,
        essay_intro: blockData.essay_intro,
        essay_meaning: blockData.essay_meaning,
        essay_advice: blockData.essay_advice
      };
      
      generatedBlocks.push(cleanBlock);
      console.log(`   -> ✨ 생성 및 검증 완료!`);
    } else {
      console.log(`   -> ⚠️ 생성 실패하여 스킵합니다.`);
    }
  }

  // 2. DB에 Insert
  console.log("💾 생성된 블록을 DB에 저장합니다...");
  if (generatedBlocks.length > 0) {
    const { error: insertError } = await supabase
      .from('tb_tarot_blocks')
      .upsert(generatedBlocks, { onConflict: 'card_name' });

    if (insertError) {
      console.error("❌ DB 저장 실패:", insertError);
    } else {
      console.log("🎉 완벽하게 저장 완료되었습니다!");
    }
  }
}

main();
