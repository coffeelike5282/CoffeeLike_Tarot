import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const DEFAULT_MODIFIER = "운명의 흐름을 살피십시오.";

async function findMissingBlocks() {
  const { data, error } = await supabase
    .from('tb_tarot_blocks')
    .select('card_name, short_modifier');

  if (error) {
    console.error("❌ Error:", error);
    return;
  }

  const missing = data.filter(x => x.short_modifier === DEFAULT_MODIFIER).map(x => x.card_name);
  console.log(JSON.stringify(missing));
}

findMissingBlocks();
