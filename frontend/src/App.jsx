import React, { useState, useEffect } from 'react';
import { Coffee, Sparkles, Loader2, RefreshCcw, ChevronRight, Zap, Shield, Moon, CheckCircle2 } from 'lucide-react';
import { useAuth } from './hooks/useAuth';
import TarotCard from './components/TarotCard';
import BaristaDashboard from './components/BaristaDashboard';
import { supabase } from './lib/supabaseClient';
import AdminPinModal from './components/AdminPinModal';

import backImage from './assets/card_back.jpg';

function App() {
  const [phonePart2, setPhonePart2] = useState('');
  const [phonePart3, setPhonePart3] = useState('');
  const [selectedCard, setSelectedCard] = useState(null);
  const [selectedCard2, setSelectedCard2] = useState(null);
  const [isCasting, setIsCasting] = useState(false);
  const [isCasting2, setIsCasting2] = useState(false);
  const [requestStatus, setRequestStatus] = useState(null); // 'pending', 'approved', 'idle'
  const [requestId, setRequestId] = useState(null);
  const [waitNumber, setWaitNumber] = useState('');
  const [deepResult, setDeepResult] = useState(null);
  const [cards, setCards] = useState([]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAdminPinModalOpen, setIsAdminPinModalOpen] = useState(false);
  const [firstCardFlipped, setFirstCardFlipped] = useState(false);
  const [isResultCard1Flipped, setIsResultCard1Flipped] = useState(false);
  const [isResultCard2Flipped, setIsResultCard2Flipped] = useState(false);
  const [question, setQuestion] = useState('');
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
    const fullPhone = `010${phonePart2}${phonePart3}`;
    
    // 관리자 전용 번호 (01000009999 대응)
    if (fullPhone === '01000009999') {
      setIsAdminPinModalOpen(true);
      return;
    }
    
    if (phonePart2.length === 4 && phonePart3.length === 4) {
      login(fullPhone);
    } else {
      alert('휴대폰 번호 8자리를 모두 입력해주세요!');
    }
  };

  const handleLogout = () => {
    setIsAdmin(false);
    authLogout();
    setSelectedCard(null);
    setSelectedCard2(null);
    setRequestStatus(null);
    setFirstCardFlipped(false);
    setIsResultCard1Flipped(false);
    setIsResultCard2Flipped(false);
    setDeepResult(null);
  };

  const shuffleAndDraw = () => {
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
  };


  const performDeepTarotRequest = async (c1, c2, ip = null) => {
    if (!user || !c1 || !c2) return;
    
    try {
      const { data, error } = await supabase
        .rpc('process_deep_tarot_request', {
          p_phone_number: user.phone_number,
          p_tarot_card1_name: c1.name,
          p_tarot_card2_name: c2.name,
          p_ip_address: ip,
          p_question: question // 질문 파라미터 추가
        });

      setIsCasting2(false);

      if (error) {
        console.error('RPC Error:', error.message);
        setRequestStatus('error');
        return;
      }

      if (data && data.req_id) {
        setRequestId(data.req_id);
        setWaitNumber(data.wait_number || '??');
        setRequestStatus('pending');
      } else {
        console.error('Unexpected RPC Result:', data);
        setRequestStatus('error');
      }
    } catch (err) {
      console.error('Network/Internal Error:', err);
      setIsCasting2(false);
      setRequestStatus('error');
    }
  };

  const startDeepProcess = async () => {
    if (cards.length === 0 || !selectedCard) return;
    
    setIsCasting2(true);
    setRequestStatus('processing_init');

    // IP 주소 수집 시도 (실패해도 진행은 하되 null로 처리)
    let clientIp = null;
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const ipData = await response.json();
      clientIp = ipData.ip;
    } catch (ipErr) {
      console.warn('IP collection failed:', ipErr);
    }
    
    // 2번째 카드 자동 추첨
    let randomCard;
    do {
      randomCard = cards[Math.floor(Math.random() * cards.length)];
    } while (randomCard.name === selectedCard.name);
    
    setSelectedCard2(randomCard);
    
    // 즉시 서버 요청 수행 (IP 포함)
    performDeepTarotRequest(selectedCard, randomCard, clientIp);
  };

  const retryDeepProcess = async () => {
    if (!selectedCard || !selectedCard2) return;
    setIsCasting2(true);
    setRequestStatus('processing_init');
    performDeepTarotRequest(selectedCard, selectedCard2, null);
  };

  // Poll for approval status with timeout
  useEffect(() => {
    let interval;
    let startTime = Date.now();
    
    if ((requestStatus === 'pending' || requestStatus === 'processing') && requestId) {
      interval = setInterval(async () => {
        // 60초 넘게 결과가 없으면 에러 처리 (먹통 방지)
        const elapsed = (Date.now() - startTime) / 1000;
        if (elapsed > 60) {
          console.warn('AI Oracle Timeout: 60 seconds elapsed without result.');
          setRequestStatus('error');
          clearInterval(interval);
          return;
        }

        const { data } = await supabase
          .from('tb_tarot_request')
          .select('status, ai_tarot_result')
          .eq('req_id', requestId)
          .single();

        if (data && data.status === 1) {
          // 승인됨 (Barista Approved)
          if (!data.ai_tarot_result) {
            if (requestStatus !== 'processing') {
              setRequestStatus('processing');
              // 진동 알림
              if ("vibrate" in navigator) {
                navigator.vibrate([200, 100, 200]);
              }
            }
          } else {
            // AI 결과까지 도착함
            try {
              const resObj = typeof data.ai_tarot_result === 'string' 
                ? JSON.parse(data.ai_tarot_result) 
                : data.ai_tarot_result;
              
              // 에러 객체가 들어온 경우 (Barista Dashboard에서 명시적으로 보낸 에러)
              if (resObj.isError) {
                setRequestStatus('error');
                clearInterval(interval);
                return;
              }

              setDeepResult(resObj);
              setRequestStatus('approved');
              clearInterval(interval);
            } catch (e) {
              console.error('JSON Parsing Error for AI result:', e);
            }
          }
        } else if (data && data.status === 2) {
          // 거절됨
          setRequestStatus('rejected');
          clearInterval(interval);
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [requestStatus, requestId]);

  // Handle sequential flipping in approved state
  useEffect(() => {
    if (requestStatus === 'approved') {
      setIsResultCard1Flipped(false);
      setIsResultCard2Flipped(false);

      const timer1 = setTimeout(() => {
        setIsResultCard1Flipped(true);
      }, 2000);

      const timer2 = setTimeout(() => {
        setIsResultCard2Flipped(true);
      }, 4000);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, [requestStatus]);

  return (
    <div className={`min-h-screen w-full coffee-gradient-bg flex flex-col items-center ${isAdmin ? 'justify-start pt-6 overflow-y-auto' : 'justify-center overflow-hidden'} p-4`}>
      <div className="max-w-[720px] w-full flex flex-col items-center gap-6 sm:gap-10 text-center relative mx-auto">
        
        {/* Animated Background Decor */}
        <div className="absolute -top-20 -left-20 w-64 h-64 bg-tech-blue/10 rounded-full blur-[80px] animate-pulse-subtle" />
        <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-tech-purple/10 rounded-full blur-[80px] animate-pulse-subtle" />

        {/* Header - Only show when logged in to avoid duplication on login screen */}
        {user && (
          <header className="flex flex-col items-center gap-4 z-10 w-full mb-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-coffee-dark rounded-full flex items-center justify-center border border-coffee-light/20 shadow-xl neon-shadow">
                  <Coffee className="text-coffee-light w-8 h-8 sm:w-10 sm:h-10" />
              </div>
              <h1 className="font-heading text-xl sm:text-2xl md:text-4xl font-bold tracking-tighter text-white/90 drop-shadow-lg">
                  COFFEELIKE <span className="text-tech-blue">TAROT</span>
              </h1>
          </header>
        )}

        <div className="w-full z-10 transition-all duration-700 flex flex-col items-center mx-auto">
          {isAdmin ? (
            <BaristaDashboard onLogout={handleLogout} />
          ) : !user ? (
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
          ) : (requestStatus === 'pending' || isCasting2 || requestStatus === 'processing_init' || requestStatus === 'error') ? (
            <main className="w-full flex-1 flex flex-col items-center justify-center gap-6 sm:gap-10 animate-in fade-in zoom-in duration-500 mx-auto">
              <div className="glass-panel px-4 py-6 sm:px-6 sm:py-10 flex flex-col items-center justify-center gap-10 shadow-2xl relative overflow-hidden min-h-[500px]">
                {/* Branding in Wait Screen */}
                <div className="flex flex-col items-center gap-4 mb-2 w-full text-center">
                  <div className="p-3 bg-coffee-dark/50 rounded-full border border-coffee-light/10 shadow-lg glow-coffee scale-90">
                    <Coffee className="text-coffee-light w-8 h-8" />
                  </div>
                  <h1 className="text-lg sm:text-xl font-black text-white tracking-widest uppercase italic bg-clip-text text-transparent bg-gradient-to-r from-coffee-light to-white w-full text-center">COFFEELIKE TAROT</h1>
                </div>

                {requestStatus === 'error' ? (
                  <div className="flex flex-col items-center gap-8 py-6 w-full animate-in fade-in duration-500">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-16 h-16 bg-red-500/20 border border-red-500/40 rounded-full flex items-center justify-center">
                        <RefreshCcw className="text-red-400 w-8 h-8" />
                      </div>
                      <h2 className="text-xl font-black text-white uppercase tracking-tighter italic">운명의 연결이 잠시 끊겼슴다</h2>
                    </div>
                    
                    <p className="text-coffee-light/80 text-sm sm:text-base leading-relaxed font-bold max-w-[320px] text-center">
                      영적 주파수 정렬 중에 약간의 정체가 발생했슴다.<br/>
                      걱정 마십쇼, 큰형님! 카드는 그대로 있으니<br/>
                      <span className="text-tech-blue font-black underline underline-offset-4 decoration-2">아래 지팡이를 다시 휘둘러서</span><br/>
                      마스터를 재촉해 보겠슴다!
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
                ) : (isCasting2 || requestStatus === 'processing_init') ? (
                  <div className="flex flex-col items-center gap-6 py-10">
                    <div className="relative">
                      <Loader2 className="animate-spin text-tech-purple w-16 h-16" />
                      <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-tech-purple w-6 h-6 animate-pulse" />
                    </div>
                    <h2 className="text-xl font-black text-tech-purple uppercase tracking-[0.2em] animate-pulse">운명의 향기를 조합 중...</h2>
                  </div>
                ) : (
                  <>
                    <div className="relative flex items-center justify-center">
                      <div className="w-40 h-40 rounded-full border-[6px] border-tech-blue/10 border-t-tech-blue animate-spin" />
                      <div className="absolute w-28 h-28 bg-coffee-dark border border-tech-blue/30 rounded-full flex flex-col items-center justify-center backdrop-blur-sm shadow-2xl">
                        <span className="text-[10px] text-tech-blue font-black uppercase tracking-widest mb-1">YOUR NO.</span>
                        <span className="text-4xl font-black text-tech-blue animate-pulse">{waitNumber}</span>
                      </div>
                    </div>
                    <div className="space-y-4 text-center">
                      <h2 className="font-heading text-xl sm:text-2xl font-black text-white uppercase tracking-tighter italic">바리스타 승인 대기 중</h2>
                      <p className="text-coffee-light/60 text-sm sm:text-base leading-relaxed mx-auto font-bold max-w-[280px]">
                        카운터 바리스타에게 <span className="text-tech-blue font-black underline underline-offset-4 decoration-2">"{waitNumber}번 대기 중"</span>이라고 말씀해주세요. 
                      </p>
                    </div>
                    <div className="w-full p-5 bg-black/30 rounded-2xl border border-white/5 text-[10px] text-coffee-light/40 flex justify-between items-center font-mono">
                      <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-tech-blue animate-pulse" /> 동기화 중</span>
                      <span>ID: {requestId}</span>
                    </div>
                  </>
                )}
                
                <footer className="mt-4 text-[8px] sm:text-[9px] text-coffee-light/10 font-medium uppercase tracking-[0.3em] text-center w-full">
                  © 2026 COFFEELIKE. POWERED BY HOLOGRAPHIC BARISTA AI.
                </footer>
              </div>
            </main>
          ) : requestStatus === 'processing' ? (
            <main className="w-full flex-1 flex flex-col items-center justify-center p-2 sm:p-6 relative">
              {/* Inline Style for Flash Animation */}
              <style>{`
                @keyframes customFlash {
                  0% { opacity: 1; }
                  100% { opacity: 0; visibility: hidden; }
                }
              `}</style>
              
              {/* Flash effect on entry */}
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
                {/* Show Selected Cards (Blurred/Glow Effect) */}
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
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles className="text-tech-purple w-8 h-8 animate-pulse" />
                  </div>
                </div>

                <div className="space-y-4 text-center">
                  <div className="inline-flex items-center gap-2 px-4 py-1 bg-tech-purple/20 rounded-full border border-tech-purple/30 text-[10px] font-black text-tech-purple tracking-widest uppercase animate-pulse">
                    <CheckCircle2 size={12} /> 승인 완료
                  </div>
                  <h2 className="font-heading text-xl sm:text-2xl font-black text-white uppercase tracking-tighter italic">마스터의 영적 통찰을 기다리는 중</h2>
                  <p className="text-coffee-light/80 text-sm sm:text-base leading-relaxed font-bold max-w-[320px]">
                    운명의 실타래가 정교하게 엮어지고 있슴다.<br/>
                    <span className="text-tech-purple decoration-2">{selectedCard.name} & {selectedCard2.name}</span> 의<br/>
                    깊은 진실을 위해 최대 1분 정도 소요될 수 있슴다.
                  </p>
                  <p className="text-coffee-light/40 text-[10px] animate-pulse">마스터가 카드 한 장 한 장에 온 마음을 다해 통찰을 불어넣는 중임다...</p>
                </div>

                <footer className="mt-4 text-[8px] sm:text-[9px] text-coffee-light/10 font-medium uppercase tracking-[0.3em] text-center w-full">
                  © 2026 COFFEELIKE. POWERED BY HOLOGRAPHIC BARISTA AI.
                </footer>
              </div>
            </main>
          ) : (requestStatus === 'approved' && deepResult) ? (
            <main className="w-full flex-1 flex flex-col items-center justify-center gap-4 sm:gap-6 animate-in slide-in-from-bottom duration-1000 pb-10 mx-auto">
              <div className="flex gap-2 sm:gap-4 mb-4 scale-75 sm:scale-100">
                <div className="flex flex-col items-center gap-4">
                  <span className="text-xl sm:text-2xl text-white font-black uppercase tracking-[0.1em] mb-1">현재 실타래</span>
                  <TarotCard card={selectedCard} backImage={backImage} size="medium" isFlipped={isResultCard1Flipped} />
                </div>
                <div className="flex flex-col items-center justify-center pt-8">
                  <div className="w-8 h-px bg-tech-purple animate-pulse" />
                </div>
                <div className="flex flex-col items-center gap-4">
                  <span className="text-xl sm:text-2xl text-tech-purple font-black uppercase tracking-[0.1em] mb-1">미래 향기</span>
                  <TarotCard card={selectedCard2} backImage={backImage} size="medium" isFlipped={isResultCard2Flipped} />
                </div>
              </div>

              <div className="glass-panel px-4 py-6 sm:px-6 sm:py-10 flex flex-col gap-8 shadow-2xl relative overflow-hidden text-center">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                   <Zap size={80} className="text-tech-purple" />
                </div>
                
                <div className="flex flex-col items-center gap-2">
                   <div className="px-6 py-2 bg-tech-purple/20 border border-tech-purple/40 rounded-full text-lg text-tech-purple font-black tracking-[0.2em] uppercase">심층 조합 결과 오픈</div>
                </div>

                <div className="space-y-6 text-left">
                  <section className="space-y-4">
                    <div className="space-y-2">
                      <div className="text-2xl font-black text-tech-blue uppercase tracking-tighter flex flex-col gap-1 mb-4">
                        <div className="flex items-center gap-2">
                           <div className="w-8 h-px bg-tech-blue/50" /> {selectedCard.name}
                        </div>
                        <div className="flex items-center gap-2">
                           <div className="w-8 h-px bg-tech-blue/50" /> {selectedCard2.name}
                        </div>
                      </div>
                      <h3 className="text-lg sm:text-xl font-black text-white tracking-widest flex items-start gap-2 break-keep">
                        <Zap size={20} className="text-tech-blue shadow-glow flex-shrink-0 mt-1" /> {deepResult.mainFortune}
                      </h3>
                    </div>
                  </section>

                  <section className="space-y-3 px-4 py-6 bg-white/5 rounded-3xl border border-white/10 shadow-inner">
                    <h3 className="text-lg font-black text-tech-purple uppercase tracking-widest flex items-center gap-2">
                      <Moon size={18} /> 영적 통찰 (Insight)
                    </h3>
                    <p className="text-lg text-coffee-light/90 leading-relaxed font-medium whitespace-pre-wrap">{deepResult.deepInsight}</p>
                  </section>
                </div>

                <div className="pt-6">
                  <button 
                    onClick={() => { 
                      setRequestStatus(null); 
                      setSelectedCard(null); 
                      setSelectedCard2(null); 
                      setDeepResult(null); 
                      setFirstCardFlipped(false);
                      setIsResultCard1Flipped(false);
                      setIsResultCard2Flipped(false);
                    }} 
                    className="w-full bg-white text-black font-black py-4 rounded-2xl text-lg uppercase tracking-[0.2em] hover:bg-tech-blue hover:text-white transition-all shadow-2xl active:scale-[0.98]"
                  >
                    상담 종료
                  </button>
                </div>
                <footer className="mt-6 text-[8px] sm:text-[9px] text-coffee-light/10 font-medium uppercase tracking-[0.3em] text-center w-full">
                  © 2026 COFFEELIKE. POWERED BY HOLOGRAPHIC BARISTA AI.
                </footer>
              </div>
            </main>
          ) : (
            <main className="w-full flex-1 flex flex-col items-center justify-center gap-8 mx-auto py-8">
              {selectedCard ? (
                <div className="flex flex-col items-center justify-center gap-10 w-full animate-in fade-in zoom-in duration-700">
                  <TarotCard 
                    card={selectedCard} 
                    backImage={backImage} 
                    isFlipped={firstCardFlipped}
                    onFlip={() => setFirstCardFlipped(true)}
                  />
                  
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
                        
                        <div className="mb-6 space-y-3">
                          <label className="text-lg text-tech-purple font-black uppercase tracking-tight block text-left pl-1">
                            상담 질문 입력
                          </label>
                          <textarea 
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            placeholder={"예: 올해 연애운이 궁금합니다. / 이직을 고민 중인데 어떨까요?\n\n질문을 입력하지 않으면 오늘의 운세가 자동으로 적용됩니다."}
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
              ) : (
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
              )}
            </main>
          )}
          
        </div>
      </div>

      {/* 바리스타 이중 보안 PIN 모달 */}
      <AdminPinModal 
        isOpen={isAdminPinModalOpen}
        onClose={() => setIsAdminPinModalOpen(false)}
        onSuccess={() => setIsAdmin(true)}
        adminPhone="01000009999"
      />
    </div>
  );
}

export default App;
