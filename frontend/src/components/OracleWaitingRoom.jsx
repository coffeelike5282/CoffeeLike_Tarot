import React from 'react';
import { Coffee, RefreshCcw, Zap, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';
import TarotCard from './TarotCard';

import MarketingBanner from './MarketingBanner';

const OracleWaitingRoom = ({ 
  requestStatus, 
  isCasting2, 
  waitNumber, 
  requestId, 
  retryDeepProcess, 
  setRequestStatus, 
  setSelectedCard, 
  setSelectedCard2,
  countdown,
  isExtended,
  selectedCard,
  selectedCard2,
  backImage,
  manualCheckStatus // 수동 동기화 함수 추가
}) => {
  // 에러 화면
  if (requestStatus === 'error') {
    return (
      <main className="w-full flex-1 flex flex-col items-center justify-center gap-6 sm:gap-10 animate-in fade-in zoom-in duration-500 mx-auto">
        <div className="w-full max-w-[440px] glass-panel px-4 py-6 sm:px-6 sm:py-10 flex flex-col items-center justify-center gap-10 shadow-2xl relative overflow-hidden min-h-[500px]">
          <div className="flex flex-col items-center gap-4 mb-2 w-full text-center">
            <div className="p-3 bg-coffee-dark/50 rounded-full border border-coffee-light/10 shadow-lg glow-coffee scale-90">
              <Coffee className="text-coffee-light w-8 h-8" />
            </div>
            <h1 className="text-lg sm:text-xl font-black text-white tracking-widest uppercase italic bg-clip-text text-transparent bg-gradient-to-r from-coffee-light to-white w-full text-center">COFFEELIKE TAROT</h1>
          </div>
          
          <div className="flex flex-col items-center gap-8 py-6 w-full animate-in fade-in duration-500">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-red-500/20 border border-red-500/40 rounded-full flex items-center justify-center">
                <RefreshCcw className="text-red-400 w-8 h-8" />
              </div>
              <h2 className="text-xl font-black text-white uppercase tracking-tighter italic">운명의 연결이 잠시 끊겼습니다</h2>
            </div>
            
            <p className="text-coffee-light/80 text-sm sm:text-base leading-relaxed font-bold max-w-[320px] text-center">
              영적 주파수 정렬 중에 약간의 정체가 발생했습니다.<br/>
              걱정 마십시오. 카드는 그대로 있으니<br/>
              <span className="text-tech-blue font-black underline underline-offset-4 decoration-2">아래 지팡이를 다시 휘둘러서</span><br/>
              마스터를 재촉해 보겠습니다!
            </p>

            <button 
              onClick={retryDeepProcess} 
              className="w-full max-w-[280px] bg-tech-blue hover:bg-white text-white hover:text-black font-black py-4 rounded-2xl text-lg uppercase tracking-[0.2em] transition-all shadow-2xl active:scale-[0.98] flex items-center justify-center gap-3 group"
            >
              <Zap size={20} className="group-hover:animate-bounce" /> 다시 시도 (Retry)
            </button>

            <button 
               onClick={() => { setRequestStatus(null); setSelectedCard(null); setSelectedCard2(null); }}
               className="text-[10px] text-coffee-light/30 font-bold uppercase tracking-widest hover:text-white transition-colors"
            >
              상담 취소하고 처음으로
            </button>
          </div>
          <footer className="mt-4 text-[8px] sm:text-[9px] text-coffee-light/10 font-medium uppercase tracking-[0.3em] text-center w-full">
            © 2026 COFFEELIKE. POWERED BY HOLOGRAPHIC BARISTA AI.
          </footer>
        </div>
      </main>
    );
  }

  // 초기 처리 중 (Processing Initial)
  if (isCasting2 || requestStatus === 'processing_init') {
    return (
      <main className="w-full flex-1 flex flex-col items-center justify-center gap-6 sm:gap-10 animate-in fade-in zoom-in duration-500 mx-auto">
        <div className="w-full max-w-[440px] glass-panel px-4 py-6 sm:px-6 sm:py-10 flex flex-col items-center justify-center gap-10 shadow-2xl relative overflow-hidden min-h-[500px]">
          <div className="flex flex-col items-center gap-4 mb-2 w-full text-center">
            <div className="p-3 bg-coffee-dark/50 rounded-full border border-coffee-light/10 shadow-lg glow-coffee scale-90">
              <Coffee className="text-coffee-light w-8 h-8" />
            </div>
            <h1 className="text-lg sm:text-xl font-black text-white tracking-widest uppercase italic bg-clip-text text-transparent bg-gradient-to-r from-coffee-light to-white w-full text-center">COFFEELIKE TAROT</h1>
          </div>
          <div className="flex flex-col items-center gap-6 py-10">
            <div className="relative">
              <Loader2 className="animate-spin text-tech-purple w-16 h-16" />
              <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-tech-purple w-6 h-6 animate-pulse" />
            </div>
            <h2 className="text-xl font-black text-tech-purple uppercase tracking-[0.2em] animate-pulse">운명의 향기를 조합 중...</h2>
          </div>
          <footer className="mt-4 text-[8px] sm:text-[9px] text-coffee-light/10 font-medium uppercase tracking-[0.3em] text-center w-full">
            © 2026 COFFEELIKE. POWERED BY HOLOGRAPHIC BARISTA AI.
          </footer>
        </div>
      </main>
    );
  }

  // 바리스타 승인 대기 (Pending)
  if (requestStatus === 'pending') {
    return (
      <main className="w-full flex-1 flex flex-col items-center justify-center gap-6 sm:gap-10 animate-in fade-in zoom-in duration-500 mx-auto">
        <div className="w-full max-w-[440px] glass-panel px-4 py-6 sm:px-6 sm:py-10 flex flex-col items-center justify-center gap-10 shadow-2xl relative overflow-hidden min-h-[500px]">
          <div className="flex flex-col items-center gap-4 mb-2 w-full text-center">
            <div className="p-3 bg-coffee-dark/50 rounded-full border border-coffee-light/10 shadow-lg glow-coffee scale-90">
              <Coffee className="text-coffee-light w-8 h-8" />
            </div>
            <h1 className="text-lg sm:text-xl font-black text-white tracking-widest uppercase italic bg-clip-text text-transparent bg-gradient-to-r from-coffee-light to-white w-full text-center">COFFEELIKE TAROT</h1>
          </div>
          <div className="relative flex items-center justify-center">
            <div className="w-40 h-40 rounded-full border-[6px] border-tech-blue/10 border-t-tech-blue animate-spin" />
            <div className="absolute w-28 h-28 bg-coffee-dark border border-tech-blue/30 rounded-full flex flex-col items-center justify-center backdrop-blur-sm shadow-2xl">
              <span className="text-[10px] text-tech-blue font-black uppercase tracking-widest mb-1">YOUR NO.</span>
              <span className="text-4xl font-black text-tech-blue animate-pulse">{waitNumber}</span>
            </div>
          </div>
          <div className="space-y-4 text-center">
            <h2 className="font-heading text-xl sm:text-2xl font-black text-white uppercase tracking-tighter italic">바리스타 승인 대기 중</h2>
            
            {/* 🎡 Marketing Hub Banner Slider */}
            <div className="w-full h-16 bg-white/5 rounded-xl border border-white/5 overflow-hidden relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
              <div className="flex flex-col h-full items-center justify-center space-y-1 relative z-10">
                <MarketingBanner />
              </div>
            </div>

            <p className="text-coffee-light/60 text-sm sm:text-base leading-relaxed mx-auto font-bold max-w-[280px]">
              카운터 바리스타에게 <span className="text-tech-blue font-black underline underline-offset-4 decoration-2">"{waitNumber}번 대기 중"</span>이라고 말씀해주세요. 
            </p>
          </div>
          <div className="flex flex-col gap-3 w-full">
            <button 
              onClick={manualCheckStatus}
              className="w-full py-3 bg-tech-blue/20 hover:bg-tech-blue/30 border border-tech-blue/30 rounded-xl text-[11px] font-black text-white tracking-widest uppercase transition-all flex items-center justify-center gap-2 group"
            >
              <RefreshCcw size={14} className="group-hover:rotate-180 transition-transform duration-500" />
              신탁 응답 강제 확인 (Sync Now)
            </button>
            <div className="w-full p-4 bg-black/30 rounded-xl border border-white/5 text-[10px] text-coffee-light/40 flex justify-between items-center font-mono">
              <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-tech-blue animate-pulse" /> 실시간 동기화 활성</span>
              <span>ID: {requestId?.slice(0, 8)}...</span>
            </div>
          </div>
          <footer className="mt-4 text-[8px] sm:text-[9px] text-coffee-light/10 font-medium uppercase tracking-[0.3em] text-center w-full">
            © 2026 COFFEELIKE. POWERED BY HOLOGRAPHIC BARISTA AI.
          </footer>
        </div>
      </main>
    );
  }

  // AI 해석 생성 중 (Processing)
  if (requestStatus === 'processing') {
    return (
      <main className="w-full flex-1 flex flex-col items-center justify-center p-2 sm:p-6 relative">
        <style>{`
          @keyframes customFlash {
            0% { opacity: 1; }
            100% { opacity: 0; visibility: hidden; }
          }
        `}</style>
        
        <div 
          className="fixed inset-0 z-[100] bg-white pointer-events-none" 
          style={{ animation: 'customFlash 1s ease-out forwards' }}
        />
        
        <div 
          className="fixed inset-0 z-[-1] bg-cover bg-center transition-all duration-1000 scale-105"
          style={{ backgroundImage: 'url("/assets/tarot_bg.png")' }}
        />
        <div className="fixed inset-0 z-[-1] bg-gradient-to-b from-coffee-dark/40 via-coffee-dark/80 to-coffee-dark backdrop-blur-[2px]" />
        
        <div className="w-full max-w-[440px] glass-panel px-4 py-8 sm:px-8 sm:py-12 space-y-8 animate-in zoom-in duration-700 shadow-2xl shadow-tech-purple/20 flex flex-col items-center border-tech-purple/30">
          <div className="flex gap-4 mb-4 scale-75">
            <div className="relative group">
              <TarotCard card={selectedCard} backImage={backImage} size="small" isFlipped={true} />
              <div className="absolute inset-0 bg-tech-blue/20 blur-xl rounded-xl -z-10 group-hover:bg-tech-blue/40 transition-all" />
            </div>
            <div className="relative group">
              <TarotCard card={selectedCard2} backImage={backImage} size="small" isFlipped={true} />
              <div className="absolute inset-0 bg-tech-purple/20 blur-xl rounded-xl -z-10 group-hover:bg-tech-purple/40 transition-all" />
            </div>
          </div>

          <div className="relative">
            <div className="w-24 h-24 rounded-full border-4 border-tech-purple/20 border-t-tech-purple animate-spin" />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-black text-tech-purple animate-pulse leading-none">{countdown}</span>
              <span className="text-[8px] font-bold text-tech-purple/60 uppercase">sec</span>
            </div>
          </div>

          <div className="space-y-4 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1 bg-tech-purple/20 rounded-full border border-tech-purple/30 text-[10px] font-black text-tech-purple tracking-widest uppercase animate-pulse">
              <CheckCircle2 size={12} /> 승인 완료
            </div>
            <h2 className="font-heading text-xl sm:text-2xl font-black text-white uppercase tracking-tighter italic">
              {isExtended ? '깊은 영적 통찰을 끌어오는 중' : '마스터의 영적 통찰을 기다리는 중'}
            </h2>
            <p className="text-coffee-light/80 text-sm sm:text-base leading-relaxed font-bold max-w-[320px]">
              {isExtended 
                ? '영적 주파수를 정밀하게 조정하고 있습니다. 조금만 더 인내심을 갖고 기다려 주십시오.' 
                : '운명의 실타래가 정교하게 엮어지고 있습니다.'}
              <br/>
              <span className="text-tech-purple decoration-2">{selectedCard?.name} & {selectedCard2?.name}</span> 의<br/>
              깊은 진실을 위해 정성을 다하는 중입니다.
            </p>
            {isExtended && (
              <p className="text-tech-blue font-black text-[11px] animate-bounce uppercase tracking-widest">⚠️ 영적 통로 개방 시간 연장됨</p>
            )}
            <p className="text-coffee-light/40 text-[10px] animate-pulse">마스터가 카드 한 장 한 장에 온 마음을 다해 통찰을 불어넣는 중입니다...</p>
          </div>

          <footer className="mt-4 text-[8px] sm:text-[9px] text-coffee-light/10 font-medium uppercase tracking-[0.3em] text-center w-full">
            © 2026 COFFEELIKE. POWERED BY HOLOGRAPHIC BARISTA AI.
          </footer>
        </div>
      </main>
    );
  }

  return null;
};

export default OracleWaitingRoom;
