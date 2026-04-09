const fs = require('fs');
const filePath = 'e:\\AI\\Antigravity\\an-bon\\CoffeeLike_Tarot\\frontend\\src\\App.jsx';
const buffer = fs.readFileSync(filePath);

// Detect if it's UTF-16LE or UTF-8
let text;
if (buffer[0] === 0xFF && buffer[1] === 0xFE) {
    text = buffer.slice(2).toString('utf16le');
} else if (buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
    text = buffer.slice(3).toString('utf8');
} else {
    // Try to see if it's UTF-16LE without BOM (common in PS output)
    const utf16Text = buffer.toString('utf16le');
    if (utf16Text.includes('import') || utf16Text.includes('export')) {
        text = utf16Text;
    } else {
        text = buffer.toString('utf8');
    }
}

// Global replacement of 신령님 to 마스터
text = text.replace(/신령님/g, '마스터');

// Fix problematic characters or syntax
// Based on the error: lines 96-97
// I will just rewrite the shuffleAndDraw function if it's found
const shuffleRegex = /const shuffleAndDraw = \(\) => \{[\s\S]*? setTimeout\(\(\) => \{[\s\S]*?\}, 1500\);\s*\};/g;
const shuffleFixed = `const shuffleAndDraw = () => {
    if (cards.length === 0) return;
    setIsCasting(true);
    setFirstCardFlipped(false);
    setTimeout(() => {
      const randomCard = cards[Math.floor(Math.random() * cards.length)];
      setSelectedCard(randomCard);
      setIsCasting(false);
      
      // 3초 후 자동 뒤집기
      setTimeout(() => {
        setFirstCardFlipped(true);
      }, 3000);
    }, 1500);
  };`;

text = text.replace(shuffleRegex, shuffleFixed);

fs.writeFileSync(filePath, text, { encoding: 'utf8' });
console.log('App.jsx fixed and saved as UTF-8 (Strict)');
