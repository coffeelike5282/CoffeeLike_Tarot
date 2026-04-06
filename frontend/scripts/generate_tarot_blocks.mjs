import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// 🛡️ 환경 변수 경로 정밀 타격 (frontend/.env 파일을 확실히 잡음다)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY 환경변수가 필요합니다.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const OLLAMA_API_URL = 'http://localhost:11434/api/generate';
const MODEL_NAME = 'qwen2.5-local:latest';

// 🛡️ 데이터 무결성 검증 함수 (Null 또는 빈 칸이 있으면 가차없이 탈락!)
function validateBlockData(data) {
  const fields = ['short_modifier', 'short_advice', 'essay_intro', 'essay_meaning', 'essay_advice'];
  return fields.every(field => data && data[field] && typeof data[field] === 'string' && data[field].trim().length > 0);
}

async function generateBlockForCard(cardName, cardNameKr, keywords, retryCount = 0) {
  const prompt = `당신은 대한민국 최고의 '커피라이크' 프리미엄 타로 마스터입니다. 
카드: ${cardNameKr} (${cardName})
핵심 키워드: ${keywords}

### [해설 작성 지침]
1. 말투: 정중하고 기품 있는 존댓말 (~하십시오/해요).
2. 필드 간 독립성: 5개 필드 내용이 절대 중복되거나 겹치지 않게 하십시오.
3. 응답은 반드시 순수 JSON만 반환하십시오.

{
  "short_modifier": "...",
  "short_advice": "...",
  "essay_intro": "...",
  "essay_meaning": "...",
  "essay_advice": "..."
}`;

  try {
    const response = await fetch(OLLAMA_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL_NAME,
        prompt: prompt,
        stream: false,
        format: "json",
        options: {
          temperature: 0.75 + (retryCount * 0.05),
          num_predict: 1000
        }
      })
    });
    
    if (!response.ok) throw new Error(`Ollama 통신 실패: ${response.status}`);
    const data = await response.json();
    const parsed = JSON.parse(data.response);
    
    // 🛡️ 1차 검증: 필수 필드 누락 여부
    if (!validateBlockData(parsed)) {
       throw new Error("필수 데이터 누락");
    }

    // 🛡️ 2차 검증: 필드 간 중복 검사
    const values = [parsed.short_modifier, parsed.short_advice, parsed.essay_intro, parsed.essay_meaning, parsed.essay_advice];
    const uniqueValues = new Set(values.map(v => v.trim()));
    if (uniqueValues.size < values.length) {
       throw new Error("필드 내용 중복");
    }

    // 🛡️ 3차 검증: 플레이스홀더 포함 여부
    const placeholderTerms = ["해요체", "수식어 문장", "상징 묘사", "해석", "마무리 조언"];
    const hasPlaceholder = Object.values(parsed).some(val => 
      placeholderTerms.some(term => val.includes(term))
    );
    if (hasPlaceholder) {
       throw new Error("플레이스홀더 포함");
    }

    return parsed;
  } catch (error) {
    if (retryCount < 5) { // 🏹 무려 5회나 정밀 재시도!
      process.stdout.write(` 🔄 [${cardNameKr}] 품질 미달로 재시도 중 (${retryCount + 1})... `);
      return generateBlockForCard(cardName, cardNameKr, keywords, retryCount + 1);
    }
    console.error(`\n❌ [${cardNameKr}] 5회 재시도에도 품질 확보 실패:`, error.message);
    return null;
  }
}

async function main() {
  console.log("🚀 [품질 제일주의] 꼬봉이의 타로 블록 정밀 재탈환 기동! 🏙️🎯🔍");

  const { data: allCards, error } = await supabase
    .from('tb_tarot_card')
    .select('name, keywords')
    .order('suit', { ascending: true })
    .order('rank', { ascending: true });

  if (error) return console.error("❌ Supabase 조회 에러:", error);

  console.log(`✅ 총 ${allCards.length}장의 카드를 개별 타격하여 즉시 적재합니다.`);

  for (let i = 0; i < allCards.length; i++) {
    const card = allCards[i];
    const cardNameKr = card.name_kr || card.name;
    
    let keywordStr = Array.isArray(card.keywords) ? card.keywords.join(", ") : "";
    
    process.stdout.write(`[${i+1}/${allCards.length}] 🤖 [${cardNameKr}] 깎는 중...`);
    const blockData = await generateBlockForCard(card.name, cardNameKr, keywordStr);
    
    if (blockData) {
      // 💾 [즉시 저장] 성공하자마자 전장에 투입!
      const { error: upsertError } = await supabase
        .from('tb_tarot_blocks')
        .upsert({
          card_name: card.name,
          card_name_kr: cardNameKr,
          ...blockData
        }, { onConflict: 'card_name' });

      if (upsertError) {
        console.error(`\n   ❌ [${cardNameKr}] DB 적재 실패:`, upsertError.message);
      } else {
        console.log(` ✨ 완료 및 DB 저장 성공!`);
      }
    } else {
      console.warn(`\n   ⚠️ [${cardNameKr}] 최종 품질 미달로 인해 스킵합니다.`);
    }
  }
  console.log("\n🎉 모든 작전 종료! 품질 기반 타로 블록 적재 완료!");
}

main();
