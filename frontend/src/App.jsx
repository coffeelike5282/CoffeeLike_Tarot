import React, { useState, useEffect } from 'react';
import { Coffee } from 'lucide-react';
import { useAuth } from './hooks/useAuth';
import BaristaDashboard from './components/BaristaDashboard';
import { supabase } from './lib/supabaseClient';
import AdminPinModal from './components/AdminPinModal';

// [Phase 4] 신규 분리 컴포넌트 Import
import PhoneInputForm from './components/PhoneInputForm';
import OracleDrawSection from './components/OracleDrawSection';
import OracleWaitingRoom from './components/OracleWaitingRoom';
import TarotResultReport from './components/TarotResultReport';
import WalletDashboard from './components/WalletDashboard';

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
  const [coinBalance, setCoinBalance] = useState(0);
  const [qrSerial, setQrSerial] = useState(null);
  const { login, user, loading, logout: authLogout } = useAuth();

  // URL에서 QR 시리얼(?code=...) 추출 및 코인 잔액 동기화
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code) {
      console.log('🛵 [QR 인식] 배달 봉투 코드를 발견했슴다:', code);
      setQrSerial(code);
    }
  }, []);

  // 유저 정보가 있을 때 코인 잔액 가져오기
  useEffect(() => {
    if (user?.phone_number) {
      fetchCoinBalance(user.phone_number);
    }
  }, [user]);

  const fetchCoinBalance = async (phoneNumber) => {
    try {
      const { data, error } = await supabase
        .from('tb_customer')
        .select('tarot_coin_balance')
        .eq('phone_number', phoneNumber)
        .single();
      
      if (!error && data) {
        setCoinBalance(data.tarot_coin_balance);
      }
    } catch (err) {
      console.warn('Coin balance fetch failed:', err);
    }
  };

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
        // 카드 로드 후 세션 복구 수행
        restoreSession(data);
      }
      setIsDataLoading(false);
    };

    const restoreSession = (allCards) => {
      try {
        // [v5.0] 익명 유저이거나 유저 정보가 아직 없으면 복구하지 않음다.
        if (!localStorage.getItem('coffee_tarot_user')) {
           console.log('ℹ️ [세션 복구 건너뜀] 로그인 전이므로 복구를 대기함다.');
           return;
        }

        const savedReqId = localStorage.getItem('tarot_requestId');
        const savedStatus = localStorage.getItem('tarot_requestStatus');
        const savedWaitNum = localStorage.getItem('tarot_waitNumber');
        const savedResult = localStorage.getItem('tarot_deepResult');
        const savedCard1 = localStorage.getItem('tarot_selectedCard');
        const savedCard2 = localStorage.getItem('tarot_selectedCard2');
        const savedQuestion = localStorage.getItem('tarot_question');

        if (savedReqId) {
          console.log('🔄 [세션 복구] 이전 상담 정보를 불러옵니다:', savedReqId);
          setRequestId(savedReqId);
          if (savedStatus) setRequestStatus(savedStatus);
          if (savedWaitNum) setWaitNumber(savedWaitNum);
          if (savedQuestion) setQuestion(savedQuestion);
          if (savedResult) setDeepResult(JSON.parse(savedResult));
          
          if (savedCard1 && allCards.length > 0) {
            const c1 = allCards.find(c => c.name === savedCard1);
            if (c1) setSelectedCard(c1);
          }
          if (savedCard2 && allCards.length > 0) {
            const c2 = allCards.find(c => c.name === savedCard2);
            if (c2) setSelectedCard2(c2);
          }
        }
      } catch (e) {
        console.warn('⚠️ 세션 복구 중 오류 발생 (무시함):', e);
      }
    };

    fetchTarotCards();
  }, []);

  // 상태 변경 시 로컬 스토리지 동기화
  useEffect(() => {
    if (requestId) {
      localStorage.setItem('tarot_requestId', requestId);
      if (requestStatus) localStorage.setItem('tarot_requestStatus', requestStatus);
      if (waitNumber) localStorage.setItem('tarot_waitNumber', waitNumber);
      
      // 질문 데이터 동기화 (빈 값일 경우 삭제)
      if (question && question.trim()) {
        localStorage.setItem('tarot_question', question);
      } else {
        localStorage.removeItem('tarot_question');
      }

      if (deepResult) localStorage.setItem('tarot_deepResult', JSON.stringify(deepResult));
      if (selectedCard) localStorage.setItem('tarot_selectedCard', selectedCard.name);
      if (selectedCard2) localStorage.setItem('tarot_selectedCard2', selectedCard2.name);
    }
  }, [requestId, requestStatus, waitNumber, deepResult, selectedCard, selectedCard2, question]);

  const handleLogin = (e) => {
    e.preventDefault();
    const fullPhone = `010${phonePart2}${phonePart3}`;
    
    // 관리자 전용 번호 (01000009999 대응)
    if (fullPhone === '01000009999') {
      setIsAdminPinModalOpen(true);
      return;
    }
    
    if (phonePart2.length === 4 && phonePart3.length === 4) {
      // 새로운 번호로 로그인 시 이전 세션 오염 방지를 위해 선제적 정화!
      handleStartNewConsultation();
      login(fullPhone);
    } else {
      alert('휴대폰 번호 8자리를 모두 입력해주세요!');
    }
  };

  const clearTarotSession = () => {
    localStorage.removeItem('tarot_requestId');
    localStorage.removeItem('tarot_requestStatus');
    localStorage.removeItem('tarot_waitNumber');
    localStorage.removeItem('tarot_deepResult');
    localStorage.removeItem('tarot_selectedCard');
    localStorage.removeItem('tarot_selectedCard2');
    localStorage.removeItem('tarot_question');
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
    setRequestId(null);
    setWaitNumber('');
    setQuestion('');
    // 로컬 스토리지 비우기
    clearTarotSession();
  };

  const handleStartNewConsultation = () => {
    console.log('🔄 [세션 정화] 새로운 상담을 위해 이전의 묵은 정보를 모두 삭제함다!');
    setSelectedCard(null);
    setSelectedCard2(null);
    setRequestStatus(null);
    setFirstCardFlipped(false);
    setIsResultCard1Flipped(false);
    setIsResultCard2Flipped(false);
    setDeepResult(null);
    setRequestId(null);
    setWaitNumber('');
    setQuestion('');
    clearTarotSession();
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


  const performDeepTarotRequest = async (c1, c2, ip = null, finalQuestion = null) => {
    if (!user || !c1 || !c2) return;
    
    // [v2.9.1] 질문이 비어 있으면 무조건 '오늘의 운세 알려줘'로 세팅함다!
    const qText = (finalQuestion || question || '').trim() || '오늘의 운세 알려줘';
    if (!question || question.trim() === '') setQuestion(qText); // 사용자에게도 보여줌다!
    
    try {
      const { data, error } = await supabase
        .rpc('process_deep_tarot_request_v2', {
          p_phone_number: user.phone_number,
          p_tarot_card1_name: c1.name,
          p_tarot_card2_name: c2.name,
          p_ip_address: ip,
          p_question: qText, // 정제된 질문 파라미터 사용
          p_qr_serial: qrSerial // [O2O] 배달 QR 연동 추가
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
        // RPC에서 보정한 질문을 다시 상태에 반영하여 UI 일관성을 유지함다.
        if (data.question) setQuestion(data.question);
        
        // [O2O] 코인 적립 가능성이 있으므로 잔액 최신화
        fetchCoinBalance(user.phone_number);
        setQrSerial(null); // 사용 완료 처리

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

  // PDF 저장 로직은 TarotResultReport.jsx로 이관되었슴다.

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
    
    // [v3.0] DB RPC에서 빈 질문을 '오늘의 운세 알려줘'로 강제 치환하므로, 
    // 여기서는 원본 질문만 깔끔하게 넘겨주면 끝임다!
    performDeepTarotRequest(selectedCard, randomCard, clientIp, question);
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
      setCountdown(prev => (prev === 60 ? prev : 60)); 
      setIsExtended(prev => (prev === false ? prev : false));
      
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
      setCountdown(prev => (prev === 60 ? prev : 60));
      setIsExtended(prev => (prev === false ? prev : false));
    }

    return () => clearInterval(countdownInterval);
  }, [requestStatus, requestId, isExtended]); // requestStatus 변화에 민감하게 반응함다!

  // 📡 [v2.8] 상태 업데이트 통합 핸들러 (Realtime & Polling 공용)
  const handleStatusUpdate = React.useCallback((data) => {
    if (!data) return;
    
    const statusCode = Number(data.status);
    console.log(`🔔 [동기화 알림] ID: ${data.req_id || requestId}, Status: ${statusCode}, ResultExist: ${!!data.ai_tarot_result}`);

    // 1. 거절된 경우
    if (statusCode === 2) {
      setRequestStatus(curr => curr !== 'rejected' ? 'rejected' : curr);
      return;
    }

    // 2. 승인(수락)된 경우
    if (statusCode === 1) {
      // AI 결과가 아직 없는 경우 -> 해석 중 상태로 전환
      if (!data.ai_tarot_result) {
        setRequestStatus(current => {
          if (current !== 'processing' && current !== 'approved') {
             console.log('🚀 바리스타 승인됨! 해석 대기 모드로 전환함다.');
             if ("vibrate" in navigator) navigator.vibrate([200, 100, 200]);
             return 'processing';
          }
          return current;
        });
      } 
      // AI 결과가 있는 경우 -> 결과 화면으로 전환
      else {
        try {
          const resObj = typeof data.ai_tarot_result === 'string' 
            ? JSON.parse(data.ai_tarot_result) 
            : data.ai_tarot_result;
          
          if (resObj.isError) {
            console.warn('⚠️ 신탁 엔진 내부 오류 보고됨:', resObj.message);
            setRequestStatus(curr => curr !== 'error' ? 'error' : curr);
          } else {
            console.log('✅ 결과 수신 완료! 결과 리포트 전환함다.');
            setDeepResult(resObj);
            setRequestStatus(curr => curr !== 'approved' ? 'approved' : curr);
          }
        } catch (e) {
          console.error('❌ 결과 파싱 오류:', e);
        }
      }
    }
  }, [requestId]);

  // 수동 동기화 체크 함수
  const manualCheckStatus = async () => {
    if (!requestId) return;
    console.log('🔍 [수동 동기화] 직접 데이터를 조회함다...');
    try {
      const { data, error } = await supabase
        .from('tb_tarot_request')
        .select('status, ai_tarot_result, req_id')
        .eq('req_id', requestId)
        .single();
      
      if (error) throw error;
      if (data) handleStatusUpdate(data);
    } catch (err) {
      console.error('❌ 수동 동기화 실패:', err.message);
      alert('동기화 실패했슴다, 큰형님! 서버 상태를 확인해주세요.');
    }
  };

  // 📡 [v2.8.1] 5초 주기 폴링(Polling) 폴백 로직
  useEffect(() => {
    let pollingInterval;

    const checkStatus = async () => {
      if (!requestId) return;
      console.log('🔄 [폴링] 데이터 동기화 체크 중...');
      try {
        const { data, error } = await supabase
          .from('tb_tarot_request')
          .select('status, ai_tarot_result')
          .eq('req_id', requestId)
          .single();
        
        if (error) throw error;
        if (data) handleStatusUpdate(data);
      } catch (err) {
        console.warn('⚠️ 폴링 중 오류 발생 (무시하고 계속):', err.message);
      }
    };

    // 'pending' 또는 'processing' 상태일 때만 5초마다 체크함다!
    if (requestId && (requestStatus === 'pending' || requestStatus === 'processing')) {
      pollingInterval = setInterval(checkStatus, 5000);
      // 첫 등록 시 즉시 한 번 수행
      checkStatus();
    }

    return () => clearInterval(pollingInterval);
  }, [requestId, requestStatus, handleStatusUpdate]);

  // 📡 [v2.8.2] 리얼타임(WebSocket) 구독 로직
  // requestId에 고정하여 잦은 재구독 방지
  useEffect(() => {
    if (!requestId) return;

    console.log('🔗 [리얼타임] 운명 채널 구독 시도... ID:', requestId);
    const channel = supabase
      .channel(`tarot_req_v2_${requestId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tb_tarot_request',
          filter: `req_id=eq.${requestId}`
        },
        (payload) => {
          console.log('🔮 [리얼타임] 운명의 파동 감지:', payload.new);
          handleStatusUpdate(payload.new);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ [리얼타임] 운명의 실시간 채널 연결 완료!');
        }
      });

    return () => {
      console.log('🚿 [리얼타임] 운명 채널 해제 중... ID:', requestId);
      const cleanup = async () => {
        try {
          await supabase.removeChannel(channel);
        } catch (err) {
          // 조용히 넘어감다.
        }
      };
      cleanup();
    };
  }, [requestId, handleStatusUpdate]);

  // Handle sequential flipping in approved state
  useEffect(() => {
    if (requestStatus === 'approved') {
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
            <BaristaDashboard 
              onLogout={handleLogout} 
              cards={cards}
              backImage={backImage}
            />
          ) : !user ? (
            <PhoneInputForm 
              phonePart2={phonePart2} setPhonePart2={setPhonePart2}
              phonePart3={phonePart3} setPhonePart3={setPhonePart3}
              handleLogin={handleLogin}
              loading={loading}
            />
          ) : (requestStatus === 'pending' || isCasting2 || requestStatus === 'processing_init' || requestStatus === 'error' || requestStatus === 'processing') ? (
            <OracleWaitingRoom 
               requestStatus={requestStatus} isCasting2={isCasting2} 
               waitNumber={waitNumber} requestId={requestId}
               retryDeepProcess={retryDeepProcess} setRequestStatus={setRequestStatus}
               setSelectedCard={setSelectedCard} setSelectedCard2={setSelectedCard2}
               countdown={countdown} isExtended={isExtended}
               selectedCard={selectedCard} selectedCard2={selectedCard2}
               backImage={backImage}
               manualCheckStatus={manualCheckStatus}
            />
          ) : (requestStatus === 'approved' && deepResult) ? (
            <TarotResultReport 
              selectedCard={selectedCard} selectedCard2={selectedCard2}
              deepResult={deepResult} 
              isResultCard1Flipped={isResultCard1Flipped}
              isResultCard2Flipped={isResultCard2Flipped}
              setRequestStatus={setRequestStatus}
              setSelectedCard={setSelectedCard} setSelectedCard2={setSelectedCard2}
              setDeepResult={setDeepResult} setFirstCardFlipped={setFirstCardFlipped}
              setIsResultCard1Flipped={setIsResultCard1Flipped}
              setIsResultCard2Flipped={setIsResultCard2Flipped}
              backImage={backImage}
              handleStartNew={handleStartNewConsultation}
            />
          ) : (
            <OracleDrawSection 
               selectedCard={selectedCard} 
               firstCardFlipped={firstCardFlipped} setFirstCardFlipped={setFirstCardFlipped}
               backImage={backImage} question={question} setQuestion={setQuestion}
               startDeepProcess={startDeepProcess} setSelectedCard={setSelectedCard}
               isCasting={isCasting} shuffleAndDraw={shuffleAndDraw}
               isDataLoading={isDataLoading}
            />
          )}

          {/* 💳 [O2O] Wallet Dashboard (Only for logged-in users) */}
          {user && (
            <div className="mt-12 flex justify-center w-full px-4">
              <WalletDashboard 
                user={user} 
                balance={coinBalance} 
              />
            </div>
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
