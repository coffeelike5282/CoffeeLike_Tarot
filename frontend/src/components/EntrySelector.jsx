import React from 'react';
import { Package, Coffee, ChevronRight, Sparkles } from 'lucide-react';

const EntrySelector = ({ setEntryMode }) => {
  return (
    <main className="w-full flex-1 flex flex-col items-center justify-center p-4 sm:p-6 relative">
      <div 
        className="fixed inset-0 z-[-1] bg-cover bg-center transition-all duration-1000 scale-105"
        style={{ backgroundImage: 'url("/assets/tarot_bg.png")' }}
      />
      <div className="fixed inset-0 z-[-1] bg-gradient-to-b from-coffee-dark/60 via-coffee-dark/90 to-coffee-dark backdrop-blur-[4px]" />
      
      <div className="w-full max-w-[500px] glass-panel px-6 py-10 sm:px-8 sm:py-12 space-y-10 animate-in fade-in zoom-in duration-700 shadow-2xl shadow-black/80 flex flex-col items-center border border-white/5">
        
        <div className="text-center space-y-4">
          <div className="inline-block p-3 rounded-2xl bg-tech-blue/10 border border-tech-blue/20 mb-2">
            <Sparkles className="text-tech-blue w-6 h-6 animate-pulse" />
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-widest uppercase italic bg-clip-text text-transparent bg-gradient-to-r from-coffee-light to-white">
            CHOOSE YOUR PATH
          </h1>
          <p className="text-sm sm:text-base text-coffee-light/60 font-medium tracking-tight">
            운명을 확인하기 위한 입장 방식을 선택해주십쇼.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 w-full">
          {/* 배달 고객 선택지 */}
          <button 
            onClick={() => {
              alert('배달 봉투의 QR 코드를 스캔하거나, 발송된 링크로 접속해주십쇼, 큰형님!');
            }}
            className="group relative overflow-hidden bg-coffee-dark/40 border border-white/10 p-6 rounded-3xl transition-all duration-300 hover:border-tech-blue/50 hover:bg-tech-blue/5 flex items-center justify-between"
          >
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-tech-blue/10 rounded-2xl flex items-center justify-center border border-tech-blue/20 group-hover:scale-110 transition-transform duration-500">
                <Package className="text-tech-blue w-7 h-7" />
              </div>
              <div className="text-left">
                <h3 className="text-lg font-bold text-white group-hover:text-tech-blue transition-colors">배달 쿠폰 입장</h3>
                <p className="text-xs text-white/40">배달 봉투 QR 또는 링크 필요</p>
              </div>
            </div>
            <ChevronRight className="text-white/20 group-hover:text-tech-blue group-hover:translate-x-1 transition-all" />
          </button>

          {/* 매장 고객 선택지 */}
          <button 
            onClick={() => setEntryMode('instore')}
            className="group relative overflow-hidden bg-coffee-dark/40 border border-white/10 p-6 rounded-3xl transition-all duration-300 hover:border-coffee-light/50 hover:bg-coffee-light/5 flex items-center justify-between"
          >
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-coffee-light/10 rounded-2xl flex items-center justify-center border border-coffee-light/20 group-hover:scale-110 transition-transform duration-500">
                <Coffee className="text-coffee-light w-7 h-7" />
              </div>
              <div className="text-left">
                <h3 className="text-lg font-bold text-white group-hover:text-coffee-light transition-colors">매장 테이블 입장</h3>
                <p className="text-xs text-white/40">매장 내 테이블 QR 스캔 고객 전용</p>
              </div>
            </div>
            <ChevronRight className="text-white/20 group-hover:text-coffee-light group-hover:translate-x-1 transition-all" />
          </button>
        </div>

        <footer className="text-[10px] text-white/10 font-bold uppercase tracking-[0.4em] pt-4 border-t border-white/5 w-full text-center">
          COFFEELIKE SECRET TAROT ROOM
        </footer>
      </div>
    </main>
  );
};

export default EntrySelector;
