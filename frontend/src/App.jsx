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

  const [isSavingPDF, setIsSavingPDF] = useState(false);

  // 📄 [v2.6.5] 신탁 결과 PDF 저장 기능 (oklab/oklch 패치 적용)
  // 📄 [v3.0.0] 신탁 결과 PDF 저장 기능 (황금비율 & 멀티페이지 정밀 타격)
  const saveAsPDF = async () => {
    const element = document.getElementById('tarot-result-sheet');
    if (!element) return;

    try {
      setIsSavingPDF(true);
      
      const getBase64 = async (url) => {
        try {
          const res = await fetch(url, { mode: 'cors' });
          const blob = await res.blob();
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
          });
        } catch (e) {
          console.warn('Base64 conversion failed:', e);
          return url;
        }
      };

      const [img1Data, img2Data] = await Promise.all([
        selectedCard ? getBase64(selectedCard.image_url) : Promise.resolve(null),
        selectedCard2 ? getBase64(selectedCard2.image_url) : Promise.resolve(null)
      ]);

      const images = Array.from(element.querySelectorAll('img'));
      await Promise.all(images.map(img => img.complete ? Promise.resolve() : new Promise(resolve => {
        img.onload = resolve;
        img.onerror = resolve;
      })));
      await new Promise(r => setTimeout(r, 1000)); 

      const TARGET_WIDTH = 800; // A4 최적 가로폭
      const canvas = await html2canvas(element, {
        scale: 1, // 800px면 충분하므로 배율 1로 조정 (메모리 효율)
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#161311',
        logging: false,
        width: TARGET_WIDTH,
        windowWidth: TARGET_WIDTH,
        onclone: (clonedDoc) => {
          // [v3.2.0] '스타일 격리(Isolation)' 공법: oklab/oklch 지뢰밭 원천 봉쇄
          // 기존 모든 style/link 태그를 삭제하여 html2canvas가 oklab을 만날 기회조차 주지 않슴다.
          clonedDoc.querySelectorAll('link, style').forEach(el => el.remove());

          const style = clonedDoc.createElement('style');
          style.innerHTML = `
            * { box-sizing: border-box !important; -webkit-print-color-adjust: exact; }
            body { background: #161311 !important; margin: 0 !important; font-family: sans-serif !important; }
            #tarot-result-sheet { 
              width: ${TARGET_WIDTH}px !important; 
              max-width: ${TARGET_WIDTH}px !important;
              margin: 0 auto !important; 
              padding: 60px 40px !important; 
              background: #161311 !important;
              color: #eae1dd !important;
              display: flex !important;
              flex-direction: column !important;
              align-items: center !important;
              gap: 40px !important;
            }
            .text-left { text-align: left !important; width: 100% !important; }
            .flex-col { display: flex !important; flex-direction: column !important; align-items: center !important; }
            .flex { display: flex !important; }
            .justify-center { justify-content: center !important; }
            .gap-4 { gap: 1rem !important; }
            .gap-30px { gap: 30px !important; }
            .w-full { width: 100% !important; }
            .text-white { color: #ffffff !important; }
            .text-tech-purple { color: #8B5CF6 !important; }
            .bg-tech-purple\\/10 { background-color: rgba(139, 92, 246, 0.1) !important; }
            .border-tech-purple { border-color: #8B5CF6 !important; }
            .border-l-4 { border-left-width: 4px !important; border-left-style: solid !important; }
            .rounded-r-2xl { border-top-right-radius: 1rem !important; border-bottom-right-radius: 1rem !important; }
            .rounded-2xl { border-radius: 1rem !important; }
            .p-4 { padding: 1rem !important; }
            .p-5 { padding: 1.25rem !important; }
            .mb-1 { margin-bottom: 0.25rem !important; }
            .mb-4 { margin-bottom: 1rem !important; }
            .mb-12 { margin-bottom: 3rem !important; }
            .font-bold { font-weight: 700 !important; }
            .font-black { font-weight: 900 !important; }
            .uppercase { text-transform: uppercase !important; }
            .tracking-widest { letter-spacing: 0.1em !important; }
            .italic { font-style: italic !important; }
            .leading-tight { line-height: 1.25 !important; }
            .leading-relaxed { line-height: 1.625 !important; }
            .break-keep { word-break: keep-all !important; }
            .bg-white\\/\\[0\\.02\\] { background-color: rgba(255, 255, 255, 0.02) !important; }
            .border-white\\/5 { border: 1px solid rgba(255, 255, 255, 0.05) !important; }
            
            /* 카드 배치 수호 */
            .card-container-pdf { display: flex !important; justify-content: center !important; gap: 30px !important; margin-top: 40px !important; }
            .card-wrapper-pdf { width: 220px !important; height: 374px !important; border-radius: 20px !important; border: 3px solid rgba(139, 92, 246, 0.5) !important; overflow: hidden !important; position: relative !important; }
            .card-img-pdf { width: 100% !important; height: 100% !important; object-fit: cover !important; }
          `;
          clonedDoc.head.appendChild(style);

          const clonedElement = clonedDoc.getElementById('tarot-result-sheet');
          if (clonedElement) {
             // [v3.3.0] 스마트 페이지 분할 (Spacer Injection) - 글자 잘림 방지 태클
             // A4 높이 수치 계산 (800px 가로 기준 약 1130px)
             const pxPageHeight = 1131; 
             const blocks = clonedElement.querySelectorAll('.p-5, .text-left p, h4');
             
             // clonedDoc이 레이아웃을 가지도록 임시 렌더링 환경 확인이 필요할 수 있으나,
             // html2canvas의 onclone 내부에서는 어느 정도 거리 계산이 가능함다.
             blocks.forEach((block) => {
               const rect = block.getBoundingClientRect();
               const containerRect = clonedElement.getBoundingClientRect();
               const relativeTop = rect.top - containerRect.top;
               const relativeBottom = relativeTop + rect.height;
               
               const currentPage = Math.floor(relativeTop / pxPageHeight);
               const pageBoundary = (currentPage + 1) * pxPageHeight;
               
               // 문단이 페이지 경계에 걸리면 (경계선 50px 전부터 체크)
               if (relativeBottom > pageBoundary - 50 && relativeTop < pageBoundary) {
                 const spacerNeeded = pageBoundary - relativeTop;
                 const spacer = clonedDoc.createElement('div');
                 spacer.style.height = `${spacerNeeded}px`;
                 spacer.style.width = '100%';
                 spacer.className = 'pdf-page-spacer';
                 block.parentNode.insertBefore(spacer, block);
               }
             });

             // 카드 배치 비율 수호
             const cardContainer = clonedElement.querySelector('.flex.justify-center.gap-4') || 
                                   clonedElement.querySelector('.animate-in.fade-in.zoom-in');
             if (cardContainer) {
               cardContainer.style.display = 'flex';
               cardContainer.style.justifyContent = 'center';
               cardContainer.style.gap = '30px'; 
               cardContainer.style.marginTop = '40px';
               
               const imageWrappers = cardContainer.querySelectorAll('div.relative');
               imageWrappers.forEach((w, idx) => {
                  w.style.width = '220px'; 
                  w.style.height = '374px'; // 1:1.7 비율 유지
                  w.style.borderRadius = '20px';
                  w.style.border = '3px solid rgba(139, 92, 246, 0.5)';
                  
                  const img = w.querySelector('img');
                  if (img) {
                    img.src = idx === 0 ? img1Data : img2Data;
                    img.style.width = '100%';
                    img.style.height = '100%';
                    img.style.objectFit = 'cover';
                  }
               });
             }

             // 요약문 박스 세탁
             const summaryBox = clonedElement.querySelector('.p-5.bg-tech-purple\\/10');
             if (summaryBox) {
               summaryBox.style.background = 'rgba(139, 92, 246, 0.15)';
               summaryBox.style.border = '1px solid rgba(139, 92, 246, 0.3)';
               const p = summaryBox.querySelector('p');
               if (p) {
                 p.style.fontSize = '22px';
                 p.style.lineHeight = '1.8';
                 p.style.color = '#ffffff';
                 p.style.fontWeight = '700';
               }
             }

             // 장문 해설 줄간격 확보
             const paras = clonedElement.querySelectorAll('.text-left p');
             paras.forEach(p => {
               p.style.fontSize = '18px';
               p.style.lineHeight = '1.9';
               p.style.marginBottom = '20px';
               p.style.color = '#eae1dd';
             });
          }
        }
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * pageWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;

      // [v3.3.0] 배경색 사전에 칠하기 (하얀 속살 방지)
      const fillBackground = () => {
        pdf.setFillColor(22, 19, 17); // #161311
        pdf.rect(0, 0, pageWidth, pageHeight, 'F');
      };

      // 첫 페이지 추가
      fillBackground();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // 내용이 넘치면 멀티 페이지 생성 루프 (뚱보 방지 핵심 로직)
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        fillBackground(); // 새 페이지에도 배경색 주입
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const now = new Date();
      const filename = `COFFEELIKE_REPORT_${now.getTime().toString().slice(-6)}.pdf`;
      pdf.save(filename);
      
      console.log('✅ 마스터 피규어 비율 복구 완료! (v3.0.0)');
    } catch (error) {
      console.error('❌ PDF 저장 실패:', error);
      alert('영적 전송 실패: ' + (error.message || '알 수 없는 방해'));
    } finally {
      setIsSavingPDF(false);
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

  // 🕰️ [v2.4] 카운트다운 전용 로직 (바리스타 승인 후 시작)
  useEffect(() => {
    let countdownInterval;
    
    // 바리스타가 승인하여 'processing' 상태가 될 때부터 시계가 돌아감다!
    if (requestStatus === 'processing' && requestId) {
      setCountdown(60); 
      setIsExtended(false);
      
      countdownInterval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            if (!isExtended) {
              // 60초 만료 시 1회 자동 연장 (60초로 대폭 확대!)
              setIsExtended(true);
              console.log('🔮 영적 주파수 미약... 60초 자동 연장함다!');
              return 60;
            } else {
              // 연장(60초)까지 다 썼으면 종료 및 에러 처리
              // [v2.6] 레이스 컨디션 방지: 이미 성공했으면 에러로 덮어쓰지 않음
              setRequestStatus(current => (current === 'approved' ? current : 'error'));
              clearInterval(countdownInterval);
              return 0;
            }
          }
          return prev - 1;
        });
      }, 1000);
    } else if (requestStatus === 'pending') {
      // 대기 중일 때는 카운트다운을 표시하지 않거나 초기화 상태 유지
      setCountdown(60);
      setIsExtended(false);
    }

    return () => clearInterval(countdownInterval);
  }, [requestStatus, requestId]); // requestStatus 변화에 민감하게 반응함다!

  // 📡 [v2.2.1] DB 폴링 전용 로직
  useEffect(() => {
    let interval;
    
    if ((requestStatus === 'pending' || requestStatus === 'processing') && requestId) {
      interval = setInterval(async () => {
        // DB 상태 체크
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
  }, [requestStatus, requestId]); // countdown 의존성 제거!

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
                        ? '영적 주파수를 정밀하게 조정하고 있슴다. 조금만 더 인내심을 갖고 기다려주십쇼.' 
                        : '운명의 실타래가 정교하게 엮어지고 있슴다.'}
                      <br/>
                      <span className="text-tech-purple decoration-2">{selectedCard.name} & {selectedCard2.name}</span> 의<br/>
                      깊은 진실을 위해 정성을 다하는 중임다.
                    </p>
                    {isExtended && (
                      <p className="text-tech-blue font-black text-[11px] animate-bounce uppercase tracking-widest">⚠️ 영적 통로 개방 시간 연장됨</p>
                    )}
                    <p className="text-coffee-light/40 text-[10px] animate-pulse">마스터가 카드 한 장 한 장에 온 마음을 다해 통찰을 불어넣는 중임다...</p>
                  </div>

                <footer className="mt-4 text-[8px] sm:text-[9px] text-coffee-light/10 font-medium uppercase tracking-[0.3em] text-center w-full">
                  © 2026 COFFEELIKE. POWERED BY HOLOGRAPHIC BARISTA AI.
                </footer>
              </div>
            </main>
          ) : (requestStatus === 'approved' && deepResult) ? (
            <main className="w-full flex-1 flex flex-col items-center justify-center gap-4 sm:gap-6 animate-in slide-in-from-bottom duration-1000 pb-10 mx-auto">
              <div className="flex flex-row gap-2 sm:gap-12 mb-12 sm:mb-20 scale-[0.8] sm:scale-105 items-start justify-center w-full max-w-full overflow-hidden">
                <div className="flex flex-col items-center gap-6">
                  <span className="text-xs sm:text-xl text-white/30 font-black uppercase tracking-[0.3em]">현재 실타래</span>
                  <TarotCard card={selectedCard} backImage={backImage} size="medium" isFlipped={isResultCard1Flipped} />
                </div>
                <div className="hidden lg:flex flex-col items-center justify-center pt-32">
                  <div className="w-16 h-px bg-tech-purple/20 animate-pulse" />
                </div>
                <div className="flex flex-col items-center gap-6">
                  <span className="text-xs sm:text-xl text-tech-purple/30 font-black uppercase tracking-[0.3em]">미래 향기</span>
                  <TarotCard card={selectedCard2} backImage={backImage} size="medium" isFlipped={isResultCard2Flipped} />
                </div>
              </div>
              <div className="glass-panel px-4 py-6 sm:px-6 sm:py-10 flex flex-col gap-8 shadow-2xl relative overflow-hidden text-center">
                <div id="tarot-result-sheet" className="flex flex-col gap-6 sm:gap-10 pb-6">
                  <div className="flex flex-col items-center gap-2">
                    <div className="px-6 py-2 bg-tech-purple/20 border border-tech-purple/40 rounded-full text-lg text-tech-purple font-black tracking-[0.2em] uppercase">심층 조합 결과</div>
                    
                    {/* [v2.8] PDF용 카드 이미지 요약 섹션 (명함 사이즈) */}
                    {(selectedCard || selectedCard2) && (
                      <div className="flex justify-center gap-4 mt-6 mb-4 sm:gap-8 sm:mt-10 sm:mb-6 animate-in fade-in zoom-in duration-1000">
                        {selectedCard && (
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-24 sm:w-32 aspect-[9/16] rounded-xl overflow-hidden border-2 border-tech-purple/30 shadow-2xl relative group">
                              <img 
                                src={selectedCard.image_url} 
                                alt={selectedCard.name}
                                className="w-full h-full object-cover grayscale-[0.2] hover:grayscale-0 transition-all duration-500"
                                crossOrigin="anonymous"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                            </div>
                            <span className="text-[10px] sm:text-xs text-white/40 font-black uppercase tracking-[0.3em] leading-none">Present</span>
                          </div>
                        )}
                        {selectedCard2 && (
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-24 sm:w-32 aspect-[9/16] rounded-xl overflow-hidden border-2 border-tech-purple/30 shadow-2xl relative group">
                              <img 
                                src={selectedCard2.image_url} 
                                alt={selectedCard2.name}
                                className="w-full h-full object-cover grayscale-[0.2] hover:grayscale-0 transition-all duration-500"
                                crossOrigin="anonymous"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                            </div>
                            <span className="text-[10px] sm:text-xs text-tech-purple/50 font-black uppercase tracking-[0.3em] leading-none">Future</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* [v2.7.1] 소실된 카드명 정보 복원 - 심층 조합 결과와 제목 사이 */}
                    {(selectedCard || selectedCard2) && (
                      <div className="flex items-center gap-3 text-white/60 font-black tracking-tight mt-2 animate-in fade-in slide-in-from-top-4 duration-1500 fill-mode-both">
                        {selectedCard && <span>{selectedCard.name.split('(')[0].trim()}</span>}
                        {selectedCard && selectedCard2 && <span className="text-tech-purple/60">&</span>}
                        {selectedCard2 && <span>{selectedCard2.name.split('(')[0].trim()}</span>}
                      </div>
                    )}

                    <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tighter mt-1 group-hover:text-tech-purple transition-colors italic">운명의 신탁</h2>
                    <div className="w-12 h-1 bg-tech-purple/40 rounded-full mt-2" />
                  </div>

                   <div className="text-left space-y-6 sm:space-y-8">
                    {/* [v2.6.6] 요약문(summary) 강조 표시 섹션 */}
                    {deepResult && (deepResult.mainFortune || deepResult.summary) && (
                      <div className="p-5 bg-tech-purple/10 border-l-4 border-tech-purple rounded-r-2xl animate-in slide-in-from-left duration-1000">
                        <h4 className="text-xs font-black text-tech-purple uppercase tracking-widest mb-1">한 줄 요약 (Oracle Summary)</h4>
                        <p className="text-xl sm:text-2xl text-white font-black leading-tight italic break-keep">
                          "{deepResult.mainFortune || deepResult.summary}"
                        </p>
                      </div>
                    )}

                    <div className="prose prose-invert max-w-none">
                      {(() => {
                        // [v2.6.6] deepResult 데이터 구조 완벽 대응!
                        let content = "";
                        if (typeof deepResult === 'string') {
                          content = deepResult;
                        } else if (deepResult && typeof deepResult === 'object') {
                          // deepInsight(라마 호환) 또는 interpretation(제미나이 호환) 우선 추출
                          content = deepResult.deepInsight || deepResult.interpretation || "";
                        }
                        
                        if (!content) return <p className="text-coffee-light/40 italic">신령님의 말씀이 구름에 가려졌슴다...</p>;

                        return content.split('\n\n').filter(p => p.trim()).map((paragraph, idx) => (
                          <p key={idx} className="text-lg sm:text-xl text-white/90 font-bold leading-relaxed break-keep tracking-tight bg-white/[0.02] p-4 rounded-2xl border border-white/5 hover:border-tech-purple/20 transition-all">
                            {paragraph.trim()}
                          </p>
                        ));
                      })()}
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
                    {isSavingPDF ? 'PDF 저장 중...' : '결과 PDF 저장'}
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
                    새로운 상담 시작
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
