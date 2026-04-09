const fs = require('fs');
const path = require('path');

const filePath = 'e:\\AI\\Antigravity\\an-bon\\CoffeeLike_Tarot\\frontend\\src\\App.jsx';
const content = fs.readFileSync(filePath);

// PowerShell Set-Content might have saved as UTF-16LE or similar.
// Try to decode correctly.
let text;
try {
    text = content.toString('utf16le');
    if (!text.includes('import')) {
        text = content.toString('utf8');
    }
} catch (e) {
    text = content.toString('utf8');
}

// Clean up "신령님" -> "마스터"
text = text.replace(/신령님/g, '마스터');

// Fix the corrupted comment found earlier
text = text.replace(/\/\/ 3\?+\?+동 \?집\?/, '// 3초 후 자동 뒤집기');

// Force UTF-8 without BOM
fs.writeFileSync(filePath, text, { encoding: 'utf8' });
console.log('App.jsx fixed and saved as UTF-8');
