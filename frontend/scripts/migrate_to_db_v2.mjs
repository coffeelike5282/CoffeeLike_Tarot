import fs from 'fs';

const tarotData = JSON.parse(fs.readFileSync('./src/data/tarot.json', 'utf8'));
const cards = tarotData.tarot_interpretations;

function sqlEscape(val) {
    if (val === null || val === undefined) return 'NULL';
    if (typeof val === 'string') {
        return `'${val.replace(/'/g, "''")}'`;
    }
    if (typeof val === 'object') {
        return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
    }
    return val;
}

function mapRank(rank) {
    if (typeof rank === 'number') return rank;
    const rankMap = {
        'ace': 1,
        'page': 11,
        'knight': 12,
        'queen': 13,
        'king': 14
    };
    return rankMap[rank.toLowerCase()] || 0;
}

function getAromaNote(suit, rank) {
    const numericRank = mapRank(rank);
    if (suit === 'major') {
        const majorAromas = {
            0: '에티오피아의 화사한 꽃향기',
            1: '갓 볶은 원두의 복합적인 향',
            2: '차가운 콜드브루의 정적',
            3: '달콤한 카라멜의 풍요',
            4: '강배전 케냐의 묵직한 바디감',
            5: '은은한 홍차의 전통적인 맛',
            6: '바닐라와 우유의 조화',
            7: '강렬한 에스프레소의 추진력',
            8: '허니 티의 차분한 힘',
            9: '다크 로스팅의 깊은 고독',
            10: '빙글빙글 도는 아인슈페너의 반전',
            11: '정확한 배합의 카푸치노',
            12: '서서히 녹아드는 콘 파냐의 인내',
            13: '정화된 블랙 브루잉의 재탄생',
            14: '절묘하게 블렌딩된 라떼의 균형',
            15: '달콤 쌉싸름한 초코 모카의 유혹',
            16: '정신이 번쩍 드는 더블 샷의 충격',
            17: '청량한 블루 리몬의 희망',
            18: '안개 속의 몽환적인 헤이즐넛',
            19: '태양 아래 과일 샤벳의 활기',
            20: '심판의 날에 울리는 진동 필터',
            21: '완벽하게 완성된 시그니처 블렌딩'
        };
        return majorAromas[numericRank] || '깊고 풍부한 오리지널 블렌드';
    }
    const suitAromas = {
        'wands': '불꽃 향이 배어있는 스모키한 맛',
        'cups': '부드럽고 달콤한 밀크티의 감성',
        'swords': '날카롭고 깔끔한 산미의 긴장감',
        'coins': '고소하고 묵직한 견과류의 풍미'
    };
    return suitAromas[suit] || '전통적인 클래식 커피';
}

function getStoryTag(suit, rank) {
    const numericRank = mapRank(rank);
    if (suit === 'major') {
        const positive = [0, 1, 3, 6, 10, 14, 17, 19, 21];
        const negative = [13, 15, 16, 18];
        if (positive.includes(numericRank)) return 'POSITIVE';
        if (negative.includes(numericRank)) return 'NEGATIVE';
        return 'NEUTRAL';
    }
    if (suit === 'wands') return 'ACTION';
    if (suit === 'cups') return 'EMOTION';
    if (suit === 'swords') return 'CONFLICT';
    if (suit === 'coins') return 'MATERIAL';
    return 'NEUTRAL';
}

function getElement(suit) {
    const mapping = {
        'major': 'Ether',
        'wands': 'Fire',
        'cups': 'Water',
        'swords': 'Air',
        'coins': 'Earth'
    };
    return mapping[suit] || 'Unknown';
}

const sqlBatches = [];
const batchSize = 10;

for (let i = 0; i < cards.length; i += batchSize) {
    const batch = cards.slice(i, i + batchSize);
    let sql = 'INSERT INTO public.tb_tarot_card (name, rank, suit, fortune_telling, keywords, meanings, deep_interpretation, story_tag, element, aroma_note) VALUES \n';
    
    sql += batch.map(card => {
        const storyTag = getStoryTag(card.suit, card.rank);
        const element = getElement(card.suit);
        const aromaNote = getAromaNote(card.suit, card.rank);
        const numericRank = mapRank(card.rank);
        
        return `(${sqlEscape(card.name)}, ${numericRank}, ${sqlEscape(card.suit)}, ${sqlEscape(card.fortune_telling)}, ${sqlEscape(card.keywords)}, ${sqlEscape(card.meanings)}, ${sqlEscape(card.deep_interpretation)}, ${sqlEscape(storyTag)}, ${sqlEscape(element)}, ${sqlEscape(aromaNote)})`;
    }).join(',\n') + ';';
    
    sqlBatches.push(sql);
}

fs.writeFileSync('./scripts/migrate_to_db_generated.sql', sqlBatches.join('\n\n'));
console.log('SQL generated in ./scripts/migrate_to_db_generated.sql');

