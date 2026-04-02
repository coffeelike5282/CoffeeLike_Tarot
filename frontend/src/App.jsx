import React, { useState, useEffect } from 'react';
import { Coffee, Sparkles, Loader2, RefreshCcw, CreditCard, ChevronRight, Heart, Zap, Shield, Moon, Sun } from 'lucide-react';
import { useAuth } from './hooks/useAuth';
import TarotCard from './components/TarotCard';
import BaristaDashboard from './components/BaristaDashboard';
import { supabase } from './lib/supabaseClient';

import backImage from './assets/card_back.png';
import foolImage from './assets/the_fool.png';
import magicianImage from './assets/the_magician.png';
import sunImage from './assets/the_sun.png';
import moonImage from './assets/the_moon.png';

const cardImages = {
  'The Fool': foolImage,
  'The Magician': magicianImage,
  'The Sun': sunImage,
  'The Moon': moonImage,
  // Add more mappings as needed
};

function App() {
  const [receipt, setReceipt] = useState('');
  const [selectedCard, setSelectedCard] = useState(null);
  const [isCasting, setIsCasting] = useState(false);
  const [requestStatus, setRequestStatus] = useState(null); // 'pending', 'approved', 'idle'
  const [requestId, setRequestId] = useState(null);
  const [deepResult, setDeepResult] = useState(null);
  const [cards, setCards] = useState([]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const { login, user, loading, logout: authLogout } = useAuth();

  // 타로 카드 데이터를 DB에서 가져옵니다.
  useEffect(() => {
    const fetchTarotCards = async () => {
      setIsDataLoading(true);
      const { data, error } = await supabase
        .from('tb_tarot_card')
        .select('*');
      
      if (error) {
        console.error('Error fetching tarot cards:', error.message);
        alert('타로 데이터를 불러오는 데 실패했습니다.');
      } else {
        setCards(data);
      }
      setIsDataLoading(false);
    };

    fetchTarotCards();
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (receipt === '9999') {
      setIsAdmin(true);
      return;
    }
    
    if (receipt.length === 4) {
      login(receipt);
    } else {
      alert('영수증 번호 뒷 4자리를 입력해주세요!');
    }
  };

  const handleLogout = () => {
    setIsAdmin(false);
    authLogout();
    setSelectedCard(null);
    setRequestStatus(null);
  };

  const shuffleAndDraw = () => {
    if (cards.length === 0) return;
    setIsCasting(true);
    setTimeout(() => {
      const randomCard = cards[Math.floor(Math.random() * cards.length)];
      setSelectedCard(randomCard);
      setIsCasting(false);
    }, 1500);
  };

  const generateDeepResult = (card) => {
    // 78장 전수 주입된 프리미엄 심층 해설 데이터를 가져옵니다.
    const deep = card.deep_interpretation;
    
    if (!deep) {
      // 혹시라도 데이터가 없는 경우를 대비한 가디언 로직
      return {
        mainFortune: card.fortune_telling[0],
        deepInsight: card.meanings.light[0],
        caution: card.meanings.shadow[0],
        coffee: { name: "바리스타 추천 커피", desc: "당신의 운명에 가장 잘 어울리는 한 잔을 준비하겠슴다." }
      };
    }

    return {
      mainFortune: deep.oracle_message,
      deepInsight: deep.spiritual_insight,
      caution: deep.special_caution,
      coffee: deep.coffee_pairing
    };
  };


  const requestDeepTarot = async () => {
    if (!user || !selectedCard) return;
    
    // RPC 함수 호출로 포인트 차감 및 요청 생성을 한 번에 처리합니다.
    const { data: newId, error } = await supabase
      .rpc('process_deep_tarot_request', {
        p_receipt_last4: user.receipt_last4,
        p_tarot_card_name: selectedCard.name
      });

    if (error) {
      console.error('RPC Error:', error.message);
      alert(error.message || '요청 중 오류가 발생했습니다.');
      return;
    }

    if (newId) {
      setRequestId(newId);
      setRequestStatus('pending');
      
      // 포인트 차감 후 로컬 사용자 정보 갱신 (3,000P 차감 시뮬레이션 및 실제 데이터 동기화 권장)
      // 간단히 3,000P를 뺀 상태로 로컬 상태를 업데이트합니다.
      // (실제 데이터는 다음 로그인이나 명시적 fetch 시 동기화됩니다.)
      // user.point_balance -= 3000; // Note: user object should be handled as immutable if using hooks properly
    }
  };

  // Poll for approval status
  useEffect(() => {
    let interval;
    if (requestStatus === 'pending' && requestId) {
      interval = setInterval(async () => {
        const { data, error } = await supabase
          .from('tb_tarot_request')
          .select('status')
          .eq('req_id', requestId)
          .single();

        if (data && data.status === 1) { // Approved
          setDeepResult(generateDeepResult(selectedCard));
          setRequestStatus('approved');
          clearInterval(interval);
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [requestStatus, requestId, selectedCard]);

  return (
    <div className="min-h-screen w-full coffee-gradient-bg flex flex-col items-center justify-center p-4 overflow-x-hidden">
      <div className="max-w-[480px] w-full flex flex-col items-center gap-10 text-center relative">
        
        {/* Animated Background Decor */}
        <div className="absolute -top-20 -left-20 w-64 h-64 bg-tech-blue/10 rounded-full blur-[80px] animate-pulse-subtle" />
        <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-tech-purple/10 rounded-full blur-[80px] animate-pulse-subtle" />

        {/* Logo & Header */}
        <header className="flex flex-col items-center gap-4 z-10">
          <div className="w-20 h-20 bg-coffee-dark rounded-full flex items-center justify-center border border-coffee-light/20 shadow-xl neon-shadow">
            <Coffee className="text-coffee-light w-10 h-10" />
          </div>
          <h1 className="font-heading text-4xl font-bold tracking-tighter holographic-text">
            COFFEELIKE TAROT
          </h1>
          {user && (
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-2 px-4 py-1.5 glass-panel border-none shadow-sm">
                <div className="w-2 h-2 rounded-full bg-tech-blue animate-pulse" />
                <span className="text-[10px] text-coffee-light/80 font-bold uppercase tracking-[0.2em]">VIP: {user.receipt_last4}</span>
              </div>
              <div className="px-3 py-1 bg-tech-blue/20 rounded-full border border-tech-blue/30 scale-90">
                <span className="text-[10px] font-black text-tech-blue tracking-widest">{user.point_balance?.toLocaleString()} P</span>
              </div>
            </div>
          )}
        </header>

        {/* Main Interface System */}
        <div className="w-full z-10 transition-all duration-700">
          {isAdmin ? (
            <BaristaDashboard onLogout={handleLogout} />
          ) : !user ? (
            <main className="w-full flex flex-col gap-8 glass-panel p-10">
              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-2">
                  <h2 className="font-heading text-2xl font-bold text-white tracking-tight">Secret Tarot Access</h2>
                  <p className="text-sm text-coffee-light/40 font-medium">영수증 번호 뒷 4자리를 입력하고 운명을 확인하세요.</p>
                </div>
                <div className="relative group">
                  <input 
                    type="text" maxLength={4} value={receipt}
                    onChange={(e) => setReceipt(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="0000"
                    className="w-full bg-coffee-dark/50 border border-coffee-light/10 focus:border-tech-blue rounded-2xl py-5 px-6 text-center text-3xl font-heading tracking-[0.5em] outline-none transition-all duration-500 text-white shadow-inner"
                  />
                </div>
                <button disabled={loading} className="w-full bg-coffee-light text-coffee-dark font-black text-lg py-5 rounded-2xl transition-all hover:bg-white active:scale-[0.98] shadow-lg shadow-black/20 flex items-center justify-center gap-3">
                  {loading ? <Loader2 className="animate-spin" /> : <>ENTER THE ORACLE <ChevronRight size={20} /></>}
                </button>
              </form>
            </main>
          ) : requestStatus === 'pending' ? (
            <main className="w-full flex flex-col items-center gap-10 glass-panel p-12">
              <div className="relative flex items-center justify-center">
                <div className="w-36 h-36 rounded-full border-[6px] border-tech-blue/10 border-t-tech-blue animate-spin" />
                <div className="absolute w-24 h-24 bg-tech-blue/5 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <CreditCard className="text-tech-blue w-12 h-12" />
                </div>
              </div>
              <div className="space-y-4">
                <h2 className="font-heading text-3xl font-black text-white uppercase tracking-tighter italic">Waiting for Barista</h2>
                <p className="text-coffee-light/60 text-sm leading-relaxed max-w-[280px] mx-auto">
                  카운터에서 <span className="text-tech-blue font-extrabold underline underline-offset-4">3,000P 장부 차감</span>을 말씀해주세요. 바리스타 승인 즉시 심층 상담이 시작됩니다.
                </p>
              </div>
              <div className="w-full p-5 bg-black/30 rounded-2xl border border-white/5 text-[10px] text-coffee-light/40 flex justify-between items-center font-mono">
                <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-tech-blue animate-pulse" /> LIVE SYNCING</span>
                <span>ID: {requestId}</span>
              </div>
            </main>
          ) : requestStatus === 'approved' && deepResult ? (
            <main className="w-full flex flex-col items-center gap-6 animate-in slide-in-from-bottom duration-1000">
              <div className="glass-panel p-8 w-full space-y-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                   <Zap size={80} className="text-tech-purple" />
                </div>
                
                <div className="flex flex-col items-center gap-2">
                   <div className="px-4 py-1 bg-tech-purple/20 border border-tech-purple/40 rounded-full text-[10px] text-tech-purple font-black tracking-widest uppercase">Deep Insight Unlocked</div>
                   <h2 className="text-3xl font-black text-gradient-gold uppercase italic">{selectedCard.name}</h2>
                </div>

                <div className="space-y-6 text-left">
                  <section className="space-y-2">
                    <h3 className="text-[10px] font-bold text-tech-blue uppercase tracking-widest flex items-center gap-2">
                      <Zap size={12} /> Barista's Oracle
                    </h3>
                    <p className="text-lg font-medium text-white leading-snug">"{deepResult.mainFortune}"</p>
                  </section>

                  <section className="space-y-2 p-5 bg-white/5 rounded-2xl border border-white/5">
                    <h3 className="text-[10px] font-bold text-tech-purple uppercase tracking-widest flex items-center gap-2">
                      <Moon size={12} /> Spiritual Insight
                    </h3>
                    <p className="text-sm text-coffee-light/80 leading-relaxed">{deepResult.deepInsight}</p>
                  </section>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-black/20 rounded-xl space-y-1">
                      <h4 className="text-[9px] font-bold text-amber-500 uppercase flex items-center gap-1"><Shield size={10} /> Watch Out</h4>
                      <p className="text-[11px] text-white/60 leading-tight">{deepResult.caution}</p>
                    </div>
                    <div className="p-4 bg-coffee-light/5 rounded-xl space-y-1 border border-coffee-light/10">
                      <h4 className="text-[9px] font-bold text-coffee-light uppercase flex items-center gap-1"><Coffee size={10} /> Coffee Pair</h4>
                      <p className="text-[11px] text-white font-bold leading-tight">{deepResult.coffee.name}</p>
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <p className="text-[10px] text-coffee-light/40 italic mb-4">"{deepResult.coffee.desc}"</p>
                  <button onClick={() => { setRequestStatus('idle'); setSelectedCard(null); setDeepResult(null); }} className="w-full bg-white text-black font-black py-4 rounded-xl text-xs uppercase tracking-widest hover:bg-tech-blue hover:text-white transition-all shadow-xl">
                    Finish Consultation
                  </button>
                </div>
              </div>
            </main>
          ) : (
            <main className="w-full flex flex-col items-center gap-8 min-h-[400px]">
              {selectedCard ? (
                <div className="flex flex-col items-center gap-10 w-full animate-in fade-in zoom-in duration-700">
                  <TarotCard 
                    card={selectedCard} 
                    backImage={backImage} 
                    frontImage={cardImages[selectedCard.name] || foolImage} 
                  />
                  
                  <div className="w-full glass-panel p-8 space-y-6">
                    <div className="space-y-2">
                      <h3 className="text-[10px] font-black text-tech-blue tracking-[0.3em] uppercase">Daily Oracle</h3>
                      <p className="text-xl font-bold text-white tracking-tight leading-tight">
                        {selectedCard.fortune_telling[0]}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-white/5 space-y-4">
                      <div className="text-center">
                        <p className="text-[10px] text-tech-purple font-black uppercase tracking-[0.2em] mb-2 px-3 py-1 bg-tech-purple/10 inline-block rounded-full">Secret Chamber</p>
                        <p className="text-xs text-coffee-light/50 font-medium leading-relaxed">
                          더 깊은 운명의 향기와 <span className="text-white font-bold">바리스타의 특별 처방전</span>이<br/>필요하신가요?
                        </p>
                      </div>
                      <button onClick={requestDeepTarot} className="w-full bg-tech-purple/20 hover:bg-tech-purple text-tech-purple hover:text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-3 group border border-tech-purple/30 shadow-lg shadow-tech-purple/10">
                        심층 타로 신청 (3,000P)
                        <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  </div>

                  <button onClick={() => setSelectedCard(null)} className="text-[10px] text-coffee-light/30 font-bold uppercase tracking-widest hover:text-white transition-colors">
                    카드 다시 섞기
                  </button>
                </div>
              ) : (
                <div className="w-full flex flex-col items-center gap-12 glass-panel p-12">
                  <div className="relative group cursor-pointer" onClick={!isCasting ? shuffleAndDraw : null}>
                    <div className={`w-52 h-80 bg-coffee-dark border border-coffee-light/10 rounded-[2rem] flex items-center justify-center transition-all duration-700 ${isCasting ? 'scale-95 blur-sm' : 'hover:scale-105 hover:border-tech-blue/40 shadow-2xl'}`}>
                      {isCasting ? (
                        <div className="flex flex-col items-center gap-4">
                          <div className="relative">
                            <Loader2 className="animate-spin text-tech-blue w-12 h-12" />
                            <Coffee className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-tech-blue w-4 h-4 animate-bounce" />
                          </div>
                          <span className="text-[10px] text-tech-blue font-black uppercase tracking-[0.3em] animate-pulse">Filtering your soul...</span>
                        </div>
                      ) : (
                        <div className="relative w-full h-full p-4 flex flex-col items-center justify-center gap-2">
                           {/* Decorative Card Shapes */}
                           <div className="w-20 h-28 bg-coffee-light/5 border border-coffee-light/10 rounded-xl rotate-[-15deg] absolute transform -translate-x-8 -translate-y-4" />
                           <div className="w-20 h-28 bg-coffee-light/5 border border-coffee-light/10 rounded-xl rotate-[15deg] absolute transform translate-x-8 -translate-y-4" />
                           <div className="w-24 h-36 bg-coffee-dark border-2 border-coffee-light/20 rounded-2xl relative z-10 flex items-center justify-center shadow-2xl">
                             <Sparkles className="text-coffee-light/20 w-10 h-10 animate-pulse" />
                           </div>
                        </div>
                      )}
                    </div>
                    {!isCasting && <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 px-6 py-2 bg-tech-blue text-white text-[10px] font-black rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all uppercase tracking-tighter">Tap to draw</div>}
                  </div>
                  
                  <div className="space-y-6 w-full">
                    <div className="space-y-2">
                      <h3 className="text-white font-bold text-lg tracking-tight">당신의 커피 향기를 읽어드립니다.</h3>
                      <p className="text-xs text-coffee-light/40 font-medium">바리스타가 직접 내려주는 오늘의 커피 타로</p>
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
                </div>
              )}
            </main>
          )}
        </div>

        <footer className="mt-6 text-[10px] text-coffee-light/20 font-medium uppercase tracking-[0.2em] z-10">
          © 2026 COFFEELIKE. POWERED BY HOLOGRAPHIC BARISTA AI.
        </footer>
      </div>
    </div>
  );
}

export default App;
