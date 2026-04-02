import fs from 'fs';
import path from 'path';

const TAROT_JSON_PATH = 'src/data/tarot.json';
const DATA_FILES = [
    'scripts/deep_data_majors.json',
    'scripts/deep_data_wands.json',
    'scripts/deep_data_cups.json',
    'scripts/deep_data_swords.json',
    'scripts/deep_data_coins.json'
];

/**
 * [안본 본부장의 정밀 주입 스크립트]
 * 78장의 타로 카드에 심층 해설 데이터를 담가버립니다.
 */
async function injectDeepData() {
    try {
        console.log('[안본 스크립트] 심층 데이터 주입 작전 개시... 🦾');
        
        // 1. 기존 tarot.json 읽기
        if (!fs.existsSync(TAROT_JSON_PATH)) {
            throw new Error(`원본 파일을 찾을 수 없슴다: ${TAROT_JSON_PATH}`);
        }
        const tarotData = JSON.parse(fs.readFileSync(TAROT_JSON_PATH, 'utf8'));

        // 2. 백업 생성
        fs.writeFileSync(TAROT_JSON_PATH + '.bak', JSON.stringify(tarotData, null, 4));
        console.log('[백업] 안전하게 tarot.json.bak 만들어뒀슴다.');

        // 3. 모든 데이터 파일 로드 및 맵 생성
        const deepDataMap = new Map();
        for (const file of DATA_FILES) {
            if (!fs.existsSync(file)) {
                console.warn(`[경고] 데이터 파일 누락: ${file}`);
                continue;
            }
            const items = JSON.parse(fs.readFileSync(file, 'utf8'));
            items.forEach(item => {
                const key = `${item.suit}_${item.rank}`;
                deepDataMap.set(key, item.deep_interpretation);
            });
        }
        console.log(`[분석] 총 ${deepDataMap.size}장의 심층 데이터를 확보했슴다.`);

        // 4. 데이터 주입
        let updatedCount = 0;
        tarotData.tarot_interpretations = tarotData.tarot_interpretations.map(card => {
            // suit 보정 (pentacles -> coins)
            const suit = card.suit === 'pentacles' ? 'coins' : card.suit;
            const key = `${suit}_${card.rank}`;
            
            if (deepDataMap.has(key)) {
                card.deep_interpretation = deepDataMap.get(key);
                updatedCount++;
            }
            return card;
        });

        // 5. 파일 저장
        fs.writeFileSync(TAROT_JSON_PATH, JSON.stringify(tarotData, null, 4));
        console.log(`[완료] 총 ${updatedCount}장의 카드에 심층 해설을 성공적으로 담갔슴다! 기분 째지네요!`);

    } catch (err) {
        console.error('[오류] 주입 도중 사고가 났슴다:', err.message);
        process.exit(1);
    }
}

injectDeepData();
