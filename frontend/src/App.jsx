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
    
    // 1. 거절된 경우
    if (data.status === 2) {
      setRequestStatus(curr => curr !== 'rejected' ? 'rejected' : curr);
      return;
    }

    // 2. 승인(수락)된 경우
    if (data.status === 1) {
      // AI 결과가 아직 없는 경우 -> 해석 중 상태로 전환
      if (!data.ai_tarot_result) {
        setRequestStatus(current => {
          if (current !== 'processing' && current !== 'approved') {
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
            setRequestStatus(curr => curr !== 'error' ? 'error' : curr);
          } else {
            setDeepResult(resObj);
            setRequestStatus(curr => curr !== 'approved' ? 'approved' : curr);
          }
        } catch (e) {
          console.error('JSON Parsing Error:', e);
        }
      }
    }
  }, []);

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
            <BaristaDashboard onLogout={handleLogout} />
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
