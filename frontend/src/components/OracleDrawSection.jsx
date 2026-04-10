import React from 'react';
import { Loader2, RefreshCcw, Coffee, Sparkles, ChevronRight } from 'lucide-react';
import TarotCard from './TarotCard';

const OracleDrawSection = ({ 
  selectedCard, 
  firstCardFlipped, 
  setFirstCardFlipped, 
  backImage, 
  question, 
  setQuestion, 
  startDeepProcess, 
  setSelectedCard, 
  isCasting, 
  shuffleAndDraw, 
  isDataLoading 
}) => {
  if (selectedCard) {
    return (
      <main className="w-full flex-1 flex flex-col items-center justify-center gap-8 mx-auto py-8 animate-in fade-in zoom-in duration-700">
        <div className="flex flex-col items-center justify-center gap-10 w-full">
          <div className="mb-12">
            <TarotCard 
              card={selectedCard} 
              backImage={backImage} 
              isFlipped={firstCardFlipped}
              onFlip={() => setFirstCardFlipped(true)}
            />
          </div>
          
          <div className="w-full glass-panel px-4 py-6 sm:px-6 sm:py-8 space-y-6">
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-2 mb-2">
                <span className="text-tech-blue font-black text-2xl tracking-[0.1em] uppercase">
                  {selectedCard.name.includes('(') ? selectedCard.name.split('(')[0].trim() : selectedCard.name}
                </span>
                {selectedCard.name.includes('(') && (
                  <span className="text-tech-blue/40 font-bold text-base tracking-[0.2em] uppercase -mt-1">
                    {selectedCard.name.split('(')[1].replace(')', '').trim()}
                  </span>
                )}
                <h3 className="text-xl font-black text-white/40 tracking-[0.4em] uppercase italic mt-4 border-t border-white/5 pt-4 w-full">오늘의 신탁</h3>
              </div>
              <div className="text-xl font-bold text-white tracking-tight leading-relaxed break-keep">
                <p>{selectedCard.fortune_telling?.join(' ') || '카드의 의미를 읽는 중입니다...'}</p>
                <p className="mt-4 text-sm text-tech-blue/60 font-bold italic animate-pulse break-keep">
                  이 카드가 속삭이는 더 깊은 진실이 궁금하지 않으신가요?<br/>
                  운명의 바리스타에게 직접 물어보십쇼.
                </p>
              </div>
            </div>

            <div className="px-4 py-6 bg-white/[0.03] border border-white/5 rounded-2xl group transition-all hover:bg-white/[0.05]">
                <p className="text-lg text-tech-purple font-bold leading-relaxed mb-4 break-keep">
                  더 깊은 운명의 향기를 알고 싶으시면<br/>
                  질문을 입력하고 바리스타에게 말씀해 보세요.
                </p>
                
                <div className="mb-6">
                  <textarea 
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder={"예: 올해 연애운이 궁금합니다. / 이직을 고민 중인데 어떨까요?\n\n(질문을 입력하지 않으면 '오늘의 운세 알려줘'가 자동으로 적용됩니다.)"}
                    className="w-full bg-black/40 border border-tech-purple/30 rounded-xl p-4 text-white text-sm outline-none focus:border-tech-purple transition-all min-h-[120px] resize-none placeholder:text-white/20"
                  />
                </div>

                <div className="flex items-center justify-center gap-3 py-2 animate-in slide-in-from-bottom-2 duration-700">
                  <span className="px-3 py-1 bg-tech-purple/5 border border-tech-purple/20 rounded-full text-[10px] font-black text-tech-purple/70 uppercase tracking-widest">
                    1,000P 차감
                  </span>
                  <div className="w-1 h-1 rounded-full bg-tech-purple/20" />
                  <span className="px-3 py-1 bg-tech-purple/5 border border-tech-purple/20 rounded-full text-[10px] font-black text-tech-purple/70 uppercase tracking-widest">
                    결제 시 1,000원
                  </span>
                </div>
                <p className="text-[10px] text-coffee-light/40 font-bold tracking-tight mb-2">
                  ※ 포인트 차감 신청은 <span className="text-tech-purple">3,000P 이상</span> 보유 시에만 가능합니다.
                </p>
              <button onClick={startDeepProcess} className="w-full bg-tech-purple/20 hover:bg-tech-purple text-tech-purple hover:text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-3 group border border-tech-purple/30 shadow-lg shadow-tech-purple/10">
                심층 타로 신청
                <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
            <footer className="mt-6 text-[8px] sm:text-[9px] text-coffee-light/10 font-medium uppercase tracking-[0.3em] text-center w-full">
              © 2026 COFFEELIKE. POWERED BY HOLOGRAPHIC BARISTA AI.
            </footer>
          </div>

          <button onClick={() => { setSelectedCard(null); setFirstCardFlipped(false); }} className="text-[10px] text-coffee-light/30 font-bold uppercase tracking-widest hover:text-white transition-colors">
            카드 다시 섞기
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="w-full flex-1 flex flex-col items-center justify-center gap-8 mx-auto py-8">
      <div className="w-full max-w-[440px] flex flex-col items-center gap-6 sm:gap-12 glass-panel px-4 py-6 sm:px-6 sm:py-10 mx-auto">
        <div className="relative group cursor-pointer" onClick={!isCasting ? shuffleAndDraw : null}>
          <div className={`w-44 h-64 sm:w-52 sm:h-80 bg-coffee-dark border border-coffee-light/10 rounded-[2rem] flex items-center justify-center transition-all duration-700 ${isCasting ? 'scale-95 blur-sm' : 'hover:scale-105 hover:border-tech-blue/40 shadow-2xl'}`}>
            {isCasting ? (
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <Loader2 className="animate-spin text-tech-blue w-12 h-12" />
                  <Coffee className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-tech-blue w-4 h-4 animate-bounce" />
                </div>
                <span className="text-[10px] text-tech-blue font-black uppercase tracking-[0.3em] animate-pulse">영혼의 향기를 필터링 중...</span>
              </div>
            ) : (
              <div className="relative w-full h-full p-4 flex flex-col items-center justify-center gap-2">
                  <div className="w-20 h-28 bg-coffee-light/5 border border-coffee-light/10 rounded-xl rotate-[-15deg] absolute transform -translate-x-8 -translate-y-4" />
                  <div className="w-20 h-28 bg-coffee-light/5 border border-coffee-light/10 rounded-xl rotate-[15deg] absolute transform translate-x-8 -translate-y-4" />
                  <div className="w-24 h-36 bg-coffee-dark border-2 border-coffee-light/20 rounded-2xl relative z-10 flex items-center justify-center shadow-2xl">
                    <Sparkles className="text-coffee-light/20 w-10 h-10 animate-pulse" />
                  </div>
              </div>
            )}
          </div>
          {!isCasting && <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 px-6 py-2 bg-tech-blue text-white text-xs font-black rounded-full shadow-lg animate-bounce uppercase tracking-tighter z-20 whitespace-nowrap">터치하여 카드 뽑기</div>}
        </div>
        
        <div className="space-y-4 sm:space-y-6 w-full">
          <div className="space-y-2">
            <h3 className="text-white font-black text-xl sm:text-2xl tracking-tight leading-tight">
              당신의 운명의 향기를 읽어드립니다.
            </h3>
            <p className="text-[10px] sm:text-sm text-coffee-light/60 font-bold">바리스타가 직접 내려주는 오늘의 신비로운 운명 타로</p>
          </div>
          <button 
            onClick={shuffleAndDraw} 
            disabled={isCasting || isDataLoading} 
            className="w-full group bg-coffee-light hover:bg-white text-coffee-dark font-black text-lg py-5 rounded-2xl transition-all shadow-xl shadow-black/30 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDataLoading ? (
              <Loader2 className="animate-spin" />
            ) : (
              <RefreshCcw className={isCasting ? "animate-spin text-tech-blue" : "group-hover:rotate-180 transition-transform duration-1000"} />
            )}
            {isDataLoading ? "데이터 로딩 중..." : "운명의 카드 뽑기"}
          </button>
        </div>
        <footer className="mt-4 sm:mt-6 text-[8px] sm:text-[9px] text-coffee-light/20 font-medium uppercase tracking-[0.3em] text-center w-full">
          © 2026 COFFEELIKE. POWERED BY HOLOGRAPHIC BARISTA AI.
        </footer>
      </div>
    </main>
  );
};

export default OracleDrawSection;
