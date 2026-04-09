import React, { useState, useEffect } from 'react';
import { Coffee, Sparkles, Loader2, RefreshCcw, ChevronRight, Zap, Shield, Moon, CheckCircle2, Download } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
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
  const [countdown, setCountdown] = useState(60);
  const [isExtended, setIsExtended] = useState(false);
  const { login, user, loading, logout: authLogout } = useAuth();

  // ?濡?移대뱶 ?곗씠?곕? DB?먯꽌 媛?몄샃?덈떎.
  useEffect(() => {
    const fetchTarotCards = async () => {
      setIsDataLoading(true);
      const { data, error } = await supabase
        .from('tb_tarot_card')
        .select('*');
      
      if (error) {
        console.error('Error fetching tarot cards:', error.message);
        alert('?濡??곗씠?곕? 遺덈윭?ㅻ뒗 ???ㅽ뙣?덉뒿?덈떎.');
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
    
    // 愿由ъ옄 ?꾩슜 踰덊샇 (01000009999 ???
    if (fullPhone === '01000009999') {
      setIsAdminPinModalOpen(true);
      return;
    }
    
    if (phonePart2.length === 4 && phonePart3.length === 4) {
      login(fullPhone);
    } else {
      alert('?대???踰덊샇 8?먮━瑜?紐⑤몢 ?낅젰?댁＜?몄슂!');
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
      
      // 3珥????먮룞 ?ㅼ쭛湲?      setTimeout(() => {
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
          p_question: question // 吏덈Ц ?뚮씪誘명꽣 異붽?
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

  const [isSavingPDF, setIsSavingPDF] = useState(false);

  // ?뱞 [v2.5] ?좏긽 寃곌낵 PDF ???湲곕뒫
  const handleSavePDF = async () => {
    const element = document.getElementById('tarot-result-sheet');
    if (!element) return;

    try {
      setIsSavingPDF(true);
      
      // 罹≪쿂 ?덉쭏 ?μ긽???꾪븳 ?듭뀡 ?ㅼ젙
      const canvas = await html2canvas(element, {
        scale: 2, // ?댁긽??2諛?        useCORS: true,
        backgroundColor: '#0a0a0a', // 諛곌꼍??吏??        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`CoffeeLike_Tarot_Oracle_${new Date().getTime()}.pdf`);
      
      console.log('???좏긽 PDF ????꾨즺!');
    } catch (error) {
      console.error('??PDF ????ㅽ뙣:', error);
      alert('?좊졊?섏쓽 留먯???湲곕줉?섎뒗 ???ㅽ뙣?덉뒾?? ?ㅼ떆 ?쒕룄?대낫??눥.');
    } finally {
      setIsSavingPDF(false);
    }
  };

  const startDeepProcess = async () => {
    if (cards.length === 0 || !selectedCard) return;
    
    setIsCasting2(true);
    setRequestStatus('processing_init');

    // IP 二쇱냼 ?섏쭛 ?쒕룄 (?ㅽ뙣?대룄 吏꾪뻾? ?섎릺 null濡?泥섎━)
    let clientIp = null;
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const ipData = await response.json();
      clientIp = ipData.ip;
    } catch (ipErr) {
      console.warn('IP collection failed:', ipErr);
    }
    
    // 2踰덉㎏ 移대뱶 ?먮룞 異붿꺼
    let randomCard;
    do {
      randomCard = cards[Math.floor(Math.random() * cards.length)];
    } while (randomCard.name === selectedCard.name);
    
    setSelectedCard2(randomCard);
    
    // 利됱떆 ?쒕쾭 ?붿껌 ?섑뻾 (IP ?ы븿)
    performDeepTarotRequest(selectedCard, randomCard, clientIp);
  };

  const retryDeepProcess = async () => {
    if (!selectedCard || !selectedCard2) return;
    setIsCasting2(true);
    setRequestStatus('processing_init');
    performDeepTarotRequest(selectedCard, selectedCard2, null);
  };

  // ?빊截?[v2.4] 移댁슫?몃떎???꾩슜 濡쒖쭅 (諛붾━?ㅽ? ?뱀씤 ???쒖옉)
  useEffect(() => {
    let countdownInterval;
    
    // 諛붾━?ㅽ?媛 ?뱀씤?섏뿬 'processing' ?곹깭媛 ???뚮????쒓퀎媛 ?뚯븘媛먮떎!
    if (requestStatus === 'processing' && requestId) {
      setCountdown(60); 
      setIsExtended(false);
      
      countdownInterval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            if (!isExtended) {
              // 60珥?留뚮즺 ??1???먮룞 ?곗옣 (60珥덈줈 ????뺣?!)
              setIsExtended(true);
              console.log('?뵰 ?곸쟻 二쇳뙆??誘몄빟... 60珥??먮룞 ?곗옣?⑤떎!');
              return 60;
            } else {
              // ?곗옣(60珥?源뚯? ???쇱쑝硫?醫낅즺 諛??먮윭 泥섎━
              console.warn('AI Oracle Timeout: Final time elapsed (120s).');
              setRequestStatus('error');
              clearInterval(countdownInterval);
              return 0;
            }
          }
          return prev - 1;
        });
      }, 1000);
    } else if (requestStatus === 'pending') {
      // ?湲?以묒씪 ?뚮뒗 移댁슫?몃떎?댁쓣 ?쒖떆?섏? ?딄굅??珥덇린???곹깭 ?좎?
      setCountdown(60);
      setIsExtended(false);
    }

    return () => clearInterval(countdownInterval);
  }, [requestStatus, requestId]); // requestStatus 蹂?붿뿉 誘쇨컧?섍쾶 諛섏쓳?⑤떎!

  // ?뱻 [v2.2.1] DB ?대쭅 ?꾩슜 濡쒖쭅
  useEffect(() => {
    let interval;
    
    if ((requestStatus === 'pending' || requestStatus === 'processing') && requestId) {
      interval = setInterval(async () => {
        // DB ?곹깭 泥댄겕
        const { data } = await supabase
          .from('tb_tarot_request')
          .select('status, ai_tarot_result')
          .eq('req_id', requestId)
          .single();

        if (data && data.status === 1) {
          if (!data.ai_tarot_result) {
            if (requestStatus !== 'processing') {
              setRequestStatus('processing');
              if ("vibrate" in navigator) navigator.vibrate([200, 100, 200]);
            }
          } else {
            try {
              const resObj = typeof data.ai_tarot_result === 'string' 
                ? JSON.parse(data.ai_tarot_result) 
                : data.ai_tarot_result;
              
              if (resObj.isError) {
                setRequestStatus('error');
                clearInterval(interval);
                return;
              }

              setDeepResult(resObj);
              setRequestStatus('approved');
              clearInterval(interval);
            } catch (e) {
              console.error('JSON Parsing Error:', e);
            }
          }
        } else if (data && data.status === 2) {
          setRequestStatus('rejected');
          clearInterval(interval);
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [requestStatus, requestId]); // countdown ?섏〈???쒓굅!

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
                    <h2 className="font-heading text-xl sm:text-2xl font-bold text-white tracking-tight">?쒗겕由??濡쒕８ ?묒냽</h2>
                    <p className="text-sm text-coffee-light/40 font-medium">?대???踰덊샇瑜??낅젰?섍퀬 ?대챸???뺤씤?섏꽭??</p>
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
                    {loading ? <Loader2 className="animate-spin" /> : <>?대챸??臾??닿린 <ChevronRight size={20} /></>}
                  </button>
                </form>
                <footer className="mt-6 text-[8px] sm:text-[9px] text-coffee-light/10 font-medium uppercase tracking-[0.3em] text-center w-full">
                  짤 2026 COFFEELIKE. POWERED BY HOLOGRAPHIC BARISTA AI.
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
                      <h2 className="text-xl font-black text-white uppercase tracking-tighter italic">?대챸???곌껐???좎떆 ?딄꼈?대떎</h2>
                    </div>
                    
                    <p className="text-coffee-light/80 text-sm sm:text-base leading-relaxed font-bold max-w-[320px] text-center">
                      ?곸쟻 二쇳뙆???뺣젹 以묒뿉 ?쎄컙???뺤껜媛 諛쒖깮?덉뒾??<br/>
                      嫄깆젙 留덉떗?? ?고삎?? 移대뱶??洹몃?濡??덉쑝??br/>
                      <span className="text-tech-blue font-black underline underline-offset-4 decoration-2">?꾨옒 吏?≪씠瑜??ㅼ떆 ?섎몮?ъ꽌</span><br/>
                      留덉뒪?곕? ?ъ큺??蹂닿쿋?대떎!
                    </p>

                    <button 
                      onClick={retryDeepProcess} 
                      className="w-full max-w-[280px] bg-tech-blue hover:bg-white text-white hover:text-black font-black py-4 rounded-2xl text-lg uppercase tracking-[0.2em] transition-all shadow-2xl active:scale-[0.98] flex items-center justify-center gap-3 group"
                    >
                      <Zap size={20} className="group-hover:animate-bounce" /> ?ㅼ떆 ?쒕룄 (Retry)
                    </button>

                    <button 
                       onClick={() => { setRequestStatus(null); setSelectedCard(null); setSelectedCard2(null); }}
                       className="text-[10px] text-coffee-light/30 font-bold uppercase tracking-widest hover:text-white transition-colors"
                    >
                      ?곷떞 痍⑥냼?섍퀬 泥섏쓬?쇰줈
                    </button>
                  </div>
                ) : (isCasting2 || requestStatus === 'processing_init') ? (
                  <div className="flex flex-col items-center gap-6 py-10">
                    <div className="relative">
                      <Loader2 className="animate-spin text-tech-purple w-16 h-16" />
                      <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-tech-purple w-6 h-6 animate-pulse" />
                    </div>
                    <h2 className="text-xl font-black text-tech-purple uppercase tracking-[0.2em] animate-pulse">?대챸???κ린瑜?議고빀 以?..</h2>
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
                      <h2 className="font-heading text-xl sm:text-2xl font-black text-white uppercase tracking-tighter italic">諛붾━?ㅽ? ?뱀씤 ?湲?以?/h2>
                      <p className="text-coffee-light/60 text-sm sm:text-base leading-relaxed mx-auto font-bold max-w-[280px]">
                        移댁슫??諛붾━?ㅽ??먭쾶 <span className="text-tech-blue font-black underline underline-offset-4 decoration-2">"{waitNumber}踰??湲?以?</span>?대씪怨?留먯??댁＜?몄슂. 
                      </p>
                    </div>
                    <div className="w-full p-5 bg-black/30 rounded-2xl border border-white/5 text-[10px] text-coffee-light/40 flex justify-between items-center font-mono">
                      <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-tech-blue animate-pulse" /> ?숆린??以?/span>
                      <span>ID: {requestId}</span>
                    </div>
                  </>
                )}
                
                <footer className="mt-4 text-[8px] sm:text-[9px] text-coffee-light/10 font-medium uppercase tracking-[0.3em] text-center w-full">
                  짤 2026 COFFEELIKE. POWERED BY HOLOGRAPHIC BARISTA AI.
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
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-xl font-black text-tech-purple animate-pulse leading-none">{countdown}</span>
                      <span className="text-[8px] font-bold text-tech-purple/60 uppercase">sec</span>
                    </div>
                  </div>

                  <div className="space-y-4 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-1 bg-tech-purple/20 rounded-full border border-tech-purple/30 text-[10px] font-black text-tech-purple tracking-widest uppercase animate-pulse">
                      <CheckCircle2 size={12} /> ?뱀씤 ?꾨즺
                    </div>
                    <h2 className="font-heading text-xl sm:text-2xl font-black text-white uppercase tracking-tighter italic">
                      {isExtended ? '源딆? ?곸쟻 ?듭같???뚯뼱?ㅻ뒗 以? : '留덉뒪?곗쓽 ?곸쟻 ?듭같??湲곕떎由щ뒗 以?}
                    </h2>
                    <p className="text-coffee-light/80 text-sm sm:text-base leading-relaxed font-bold max-w-[320px]">
                      {isExtended 
                        ? '?곸쟻 二쇳뙆?섎? ?뺣??섍쾶 議곗젙?섍퀬 ?덉뒾?? 議곌툑留????몃궡?ъ쓣 媛뽮퀬 湲곕떎?ㅼ＜??눥.' 
                        : '?대챸???ㅽ??섍? ?뺢탳?섍쾶 ??뼱吏怨??덉뒾??'}
                      <br/>
                      <span className="text-tech-purple decoration-2">{selectedCard.name} & {selectedCard2.name}</span> ??br/>
                      源딆? 吏꾩떎???꾪빐 ?뺤꽦???ㅽ븯??以묒엫??
                    </p>
                    {isExtended && (
                      <p className="text-tech-blue font-black text-[11px] animate-bounce uppercase tracking-widest">?좑툘 ?곸쟻 ?듬줈 媛쒕갑 ?쒓컙 ?곗옣??/p>
                    )}
                    <p className="text-coffee-light/40 text-[10px] animate-pulse">留덉뒪?곌? 移대뱶 ???????μ뿉 ??留덉쓬???ㅽ빐 ?듭같??遺덉뼱?ｋ뒗 以묒엫??..</p>
                  </div>

                <footer className="mt-4 text-[8px] sm:text-[9px] text-coffee-light/10 font-medium uppercase tracking-[0.3em] text-center w-full">
                  짤 2026 COFFEELIKE. POWERED BY HOLOGRAPHIC BARISTA AI.
                </footer>
              </div>
            </main>
          ) : (requestStatus === 'approved' && deepResult) ? (
            <main className="w-full flex-1 flex flex-col items-center justify-center gap-4 sm:gap-6 animate-in slide-in-from-bottom duration-1000 pb-10 mx-auto">
              <div className="flex gap-2 sm:gap-4 mb-4 scale-75 sm:scale-100">
                <div className="flex flex-col items-center gap-4">
                  <span className="text-xl sm:text-2xl text-white font-black uppercase tracking-[0.1em] mb-1">?꾩옱 ?ㅽ???/span>
                  <TarotCard card={selectedCard} backImage={backImage} size="medium" isFlipped={isResultCard1Flipped} />
                </div>
                <div className="flex flex-col items-center justify-center pt-8">
                  <div className="w-8 h-px bg-tech-purple animate-pulse" />
                </div>
                <div className="flex flex-col items-center gap-4">
                  <span className="text-xl sm:text-2xl text-tech-purple font-black uppercase tracking-[0.1em] mb-1">誘몃옒 ?κ린</span>
                  <TarotCard card={selectedCard2} backImage={backImage} size="medium" isFlipped={isResultCard2Flipped} />
                </div>
              </div>

                <div id="tarot-result-sheet" className="flex flex-col gap-6 sm:gap-10 pb-6">
                  <div className="flex flex-col items-center gap-2">
                    <div className="px-6 py-2 bg-tech-purple/20 border border-tech-purple/40 rounded-full text-lg text-tech-purple font-black tracking-[0.2em] uppercase">?ъ링 議고빀 寃곌낵</div>
                    <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tighter mt-2 group-hover:text-tech-purple transition-colors italic">?대챸???좏긽</h2>
                    <div className="w-12 h-1 bg-tech-purple/40 rounded-full mt-2" />
                  </div>

                  <div className="text-left space-y-6 sm:space-y-8">
                    <div className="prose prose-invert max-w-none">
                      {deepResult.split('\n\n').map((paragraph, idx) => (
                        <p key={idx} className="text-lg sm:text-xl text-white/90 font-bold leading-relaxed break-keep tracking-tight bg-white/[0.02] p-4 rounded-2xl border border-white/5 hover:border-tech-purple/20 transition-all">
                          {paragraph.trim()}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-6 flex flex-col gap-4">
                  <button 
                    onClick={saveAsPDF}
                    disabled={isSavingPDF}
                    className="w-full bg-tech-purple text-white font-black py-4 rounded-2xl text-lg uppercase tracking-[0.2em] hover:bg-tech-purple/80 transition-all shadow-2xl active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    {isSavingPDF ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <Download size={20} />
                    )}
                    {isSavingPDF ? 'PDF ???以?..' : '寃곌낵 PDF ???}
                  </button>

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
                    className="w-full bg-white/10 text-white font-black py-4 rounded-2xl text-lg uppercase tracking-[0.2em] hover:bg-white/20 transition-all shadow-2xl active:scale-[0.98]"
                  >
                    ?덈줈???곷떞 ?쒖옉
                  </button>
                </div>
                <footer className="mt-6 text-[8px] sm:text-[9px] text-coffee-light/10 font-medium uppercase tracking-[0.3em] text-center w-full">
                  짤 2026 COFFEELIKE. POWERED BY HOLOGRAPHIC BARISTA AI.
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
                        <h3 className="text-xl font-black text-white/40 tracking-[0.4em] uppercase italic mt-4 border-t border-white/5 pt-4 w-full">?ㅻ뒛???좏긽</h3>
                      </div>
                      <div className="text-xl font-bold text-white tracking-tight leading-relaxed break-keep">
                        <p>{selectedCard.fortune_telling?.join(' ') || '移대뱶???섎?瑜??쎈뒗 以묒엯?덈떎...'}</p>
                        <p className="mt-4 text-sm text-tech-blue/60 font-bold italic animate-pulse break-keep">
                          ??移대뱶媛 ?띿궘?대뒗 ??源딆? 吏꾩떎??沅곴툑?섏? ?딆쑝?좉???<br/>
                          ?대챸??諛붾━?ㅽ??먭쾶 吏곸젒 臾쇱뼱蹂댁떗??
                        </p>
                      </div>
                    </div>

                    <div className="px-4 py-6 bg-white/[0.03] border border-white/5 rounded-2xl group transition-all hover:bg-white/[0.05]">
                        <p className="text-lg text-tech-purple font-bold leading-relaxed mb-4 break-keep">
                          ??源딆? ?대챸???κ린瑜??뚭퀬 ?띠쑝?쒕㈃<br/>
                          吏덈Ц???낅젰?섍퀬 諛붾━?ㅽ??먭쾶 留먯???蹂댁꽭??
                        </p>
                        
                        <div className="mb-6 space-y-3">
                          <label className="text-lg text-tech-purple font-black uppercase tracking-tight block text-left pl-1">
                            ?곷떞 吏덈Ц ?낅젰
                          </label>
                          <textarea 
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            placeholder={"?? ?ы빐 ?곗븷?댁씠 沅곴툑?⑸땲?? / ?댁쭅??怨좊? 以묒씤???대뼥源뚯슂?\n\n吏덈Ц???낅젰?섏? ?딆쑝硫??ㅻ뒛???댁꽭媛 ?먮룞?쇰줈 ?곸슜?⑸땲??"}
                            className="w-full bg-black/40 border border-tech-purple/30 rounded-xl p-4 text-white text-sm outline-none focus:border-tech-purple transition-all min-h-[120px] resize-none placeholder:text-white/20"
                          />
                        </div>

                        <div className="flex items-center justify-center gap-3 py-2 animate-in slide-in-from-bottom-2 duration-700">
                          <span className="px-3 py-1 bg-tech-purple/5 border border-tech-purple/20 rounded-full text-[10px] font-black text-tech-purple/70 uppercase tracking-widest">
                            1,000P 李④컧
                          </span>
                          <div className="w-1 h-1 rounded-full bg-tech-purple/20" />
                          <span className="px-3 py-1 bg-tech-purple/5 border border-tech-purple/20 rounded-full text-[10px] font-black text-tech-purple/70 uppercase tracking-widest">
                            寃곗젣 ??1,000??                          </span>
                        </div>
                        <p className="text-[10px] text-coffee-light/40 font-bold tracking-tight mb-2">
                          ???ъ씤??李④컧 ?좎껌? <span className="text-tech-purple">3,000P ?댁긽</span> 蹂댁쑀 ?쒖뿉留?媛?ν빀?덈떎.
                        </p>
                      <button onClick={startDeepProcess} className="w-full bg-tech-purple/20 hover:bg-tech-purple text-tech-purple hover:text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-3 group border border-tech-purple/30 shadow-lg shadow-tech-purple/10">
                        ?ъ링 ?濡??좎껌
                        <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                    <footer className="mt-6 text-[8px] sm:text-[9px] text-coffee-light/10 font-medium uppercase tracking-[0.3em] text-center w-full">
                      짤 2026 COFFEELIKE. POWERED BY HOLOGRAPHIC BARISTA AI.
                    </footer>
                  </div>

                  <button onClick={() => { setSelectedCard(null); setFirstCardFlipped(false); }} className="text-[10px] text-coffee-light/30 font-bold uppercase tracking-widest hover:text-white transition-colors">
                    移대뱶 ?ㅼ떆 ?욊린
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
                          <span className="text-[10px] text-tech-blue font-black uppercase tracking-[0.3em] animate-pulse">?곹샎???κ린瑜??꾪꽣留?以?..</span>
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
                    {!isCasting && <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 px-6 py-2 bg-tech-blue text-white text-xs font-black rounded-full shadow-lg animate-bounce uppercase tracking-tighter z-20 whitespace-nowrap">?곗튂?섏뿬 移대뱶 戮묎린</div>}
                  </div>
                  
                  <div className="space-y-4 sm:space-y-6 w-full">
                    <div className="space-y-2">
                      <h3 className="text-white font-black text-xl sm:text-2xl tracking-tight leading-tight">
                        ?뱀떊???대챸???κ린瑜??쎌뼱?쒕┰?덈떎.
                      </h3>
                      <p className="text-[10px] sm:text-sm text-coffee-light/60 font-bold">諛붾━?ㅽ?媛 吏곸젒 ?대젮二쇰뒗 ?ㅻ뒛???좊퉬濡쒖슫 ?대챸 ?濡?/p>
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
                      {isDataLoading ? "?곗씠??濡쒕뵫 以?.." : "?대챸??移대뱶 戮묎린"}
                    </button>
                  </div>
                  <footer className="mt-4 sm:mt-6 text-[8px] sm:text-[9px] text-coffee-light/20 font-medium uppercase tracking-[0.3em] text-center w-full">
                    짤 2026 COFFEELIKE. POWERED BY HOLOGRAPHIC BARISTA AI.
                  </footer>
                </div>
              )}
            </main>
          )}
          
        </div>
      </div>

      {/* 諛붾━?ㅽ? ?댁쨷 蹂댁븞 PIN 紐⑤떖 */}
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
