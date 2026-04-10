import React from 'react';
import { Coffee, ChevronRight, Loader2 } from 'lucide-react';

const PhoneInputForm = ({ 
  phonePart2, 
  setPhonePart2, 
  phonePart3, 
  setPhonePart3, 
  handleLogin, 
  loading 
}) => {
  return (
    <main className="w-full flex-1 flex flex-col items-center justify-center p-2 sm:p-6 relative">
      <div 
        className="fixed inset-0 z-[-1] bg-cover bg-center transition-all duration-1000 scale-105"
        style={{ backgroundImage: 'url("/assets/tarot_bg.png")' }}
      />
      <div className="fixed inset-0 z-[-1] bg-gradient-to-b from-coffee-dark/40 via-coffee-dark/80 to-coffee-dark backdrop-blur-[2px]" />
      
      <div className="w-full max-w-[440px] glass-panel px-4 py-6 sm:px-6 sm:py-10 space-y-8 animate-in fade-in zoom-in duration-700 shadow-2xl shadow-black/80 flex flex-col items-center">
        <div className="flex flex-col items-center gap-4 mb-4 w-full text-center">
          <div className="p-4 bg-coffee-dark/50 rounded-full border border-coffee-light/10 shadow-lg glow-coffee">
            <Coffee className="text-coffee-light w-10 h-10" />
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-widest uppercase italic bg-clip-text text-transparent bg-gradient-to-r from-coffee-light to-white w-full text-center">COFFEELIKE TAROT</h1>
        </div>

        <form onSubmit={handleLogin} className="space-y-8 w-full flex flex-col items-center">
          <div className="space-y-2 text-center w-full">
            <h2 className="font-heading text-xl sm:text-2xl font-bold text-white tracking-tight">시크릿 타로룸 접속</h2>
            <p className="text-sm text-coffee-light/40 font-medium">휴대폰 번호를 입력하고 운명을 확인하세요.</p>
          </div>
          <div className="flex items-center justify-center gap-1 sm:gap-3 w-full">
            <div className="bg-coffee-dark/50 border border-coffee-light/10 rounded-xl py-3 px-2 sm:py-4 sm:px-3 text-lg sm:text-xl font-heading text-white/50 w-16 sm:w-20 text-center">
              010
            </div>
            <span className="text-coffee-light/20">-</span>
            <input 
              type="text" maxLength={4} value={phonePart2}
              inputMode="numeric"
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, '');
                setPhonePart2(val);
                if (val.length === 4) document.getElementById('phone-part3')?.focus();
              }}
              placeholder="0000"
              className="w-20 sm:w-24 bg-coffee-dark/50 border border-coffee-light/10 focus:border-tech-blue rounded-xl py-3 px-2 sm:py-4 text-center text-lg sm:text-xl font-heading outline-none transition-all duration-500 text-white"
            />
            <span className="text-coffee-light/20">-</span>
            <input 
              id="phone-part3"
              type="text" maxLength={4} value={phonePart3}
              inputMode="numeric"
              onChange={(e) => setPhonePart3(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="0000"
              className="w-20 sm:w-24 bg-coffee-dark/50 border border-coffee-light/10 focus:border-tech-blue rounded-xl py-3 px-2 sm:py-4 text-center text-lg sm:text-xl font-heading outline-none transition-all duration-500 text-white"
            />
          </div>
          <button disabled={loading} className="w-full max-w-[400px] bg-coffee-light text-coffee-dark font-black text-lg py-4 sm:py-5 rounded-2xl transition-all hover:bg-white active:scale-[0.98] shadow-lg shadow-black/20 flex items-center justify-center gap-3">
            {loading ? <Loader2 className="animate-spin" /> : <>운명의 문 열기 <ChevronRight size={20} /></>}
          </button>
        </form>
        <footer className="mt-6 text-[8px] sm:text-[9px] text-coffee-light/10 font-medium uppercase tracking-[0.3em] text-center w-full">
          © 2026 COFFEELIKE. POWERED BY HOLOGRAPHIC BARISTA AI.
        </footer>
      </div>
    </main>
  );
};

export default PhoneInputForm;
