import React, { useState, useEffect, useCallback } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Coffee, Users, Clock, Zap, LogOut, RefreshCcw } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { generateAIInterpretation } from '../services/aiOracleService';

const BaristaDashboard = ({ onLogout }) => {
  const [requests, setRequests] = useState([]);
  const [history, setHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('queue'); // 'queue', 'history'
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [stats, setStats] = useState({ pending: 0, completed: 0, rejected: 0 });
  const [isGenerating, setIsGenerating] = useState({}); // 각 요청별 AI 생성 로딩 상태
  const [isSoundEnabled, setIsSoundEnabled] = useState(false);
  const [lastNotifiedReqId, setLastNotifiedReqId] = useState(null);
  const [showNewOrderToast, setShowNewOrderToast] = useState(false);
  const [aiEngine, setAiEngine] = useState('llama'); // 'llama' or 'gemini'
  const [historyPage, setHistoryPage] = useState(0);
  const [totalHistoryCount, setTotalHistoryCount] = useState(0);
  const itemsPerPage = 20;

  const playNotification = useCallback(() => {
    if (!isSoundEnabled) return;
    const audio = new Audio('/assets/sfx/notification.mp3');
    audio.play().catch(err => console.log('Audio play failed (need interaction):', err));
  }, [isSoundEnabled]);

  const fetchSettings = useCallback(async () => {
    const { data, error } = await supabase
      .from('tb_admin_config')
      .select('ai_engine')
      .single();
    
    if (!error && data) {
      setAiEngine(data.ai_engine || 'llama');
    }
  }, []);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    const { data: pendingData, error: pendingError } = await supabase
      .from('tb_tarot_request')
      .select('*')
      .eq('status', 0)
      .order('created_at', { ascending: false });

    // 전체 히스토리 카운트만 가져옴 (Stats용)
    const { count: totalCompleted } = await supabase
      .from('tb_tarot_request')
      .select('*', { count: 'exact', head: true })
      .eq('status', 1);

    const { count: totalRejected } = await supabase
      .from('tb_tarot_request')
      .select('*', { count: 'exact', head: true })
      .eq('status', 2);

    if (!pendingError) {
      if (pendingData && pendingData.length > 0) {
        const latestReq = pendingData[0];
        if (latestReq.req_id !== lastNotifiedReqId && isSoundEnabled) {
          playNotification();
          setLastNotifiedReqId(latestReq.req_id);
          setShowNewOrderToast(true);
          setTimeout(() => setShowNewOrderToast(false), 5000);
        }
      }

      setRequests(pendingData || []);
      setStats({ 
        pending: pendingData?.length || 0, 
        completed: totalCompleted || 0,
        rejected: totalRejected || 0
      });
      setTotalHistoryCount((totalCompleted || 0) + (totalRejected || 0));
    }
    setLoading(false);
  }, [isSoundEnabled, lastNotifiedReqId, playNotification]);

  const fetchHistory = useCallback(async (page = 0) => {
    setHistoryLoading(true);
    const from = page * itemsPerPage;
    const to = from + itemsPerPage - 1;

    const { data: historyData, error: historyError, count } = await supabase
      .from('tb_tarot_request')
      .select('*', { count: 'exact' })
      .in('status', [1, 2])
      .order('approved_at', { ascending: false, nullsFirst: false })
      .range(from, to);

    if (!historyError) {
      setHistory(historyData || []);
      setHistoryPage(page);
      if (count !== null) setTotalHistoryCount(count);
    }
    setHistoryLoading(false);
  }, [itemsPerPage]);

  const toggleAiEngine = async () => {
    const newEngine = aiEngine === 'llama' ? 'gemini' : 'llama';
    setAiEngine(newEngine);
    
    const { error } = await supabase
      .from('tb_admin_config')
      .update({ ai_engine: newEngine })
      .eq('id', 1); // 어차피 어드민 설정은 1번 고정임다!
    
    if (error) {
      alert('AI 엔진 설정 업데이트 실패했슴다!');
      setAiEngine(aiEngine); // 롤백
    }
  };

  // 🚀 초기 로딩 (최초 1회만 실행)
  useEffect(() => {
    fetchRequests();
    fetchHistory(0);
    fetchSettings();
  }, [fetchRequests, fetchHistory, fetchSettings]);

  // 🔄 탭 전환 시 히스토리 최신화 (0페이지일 때만)
  useEffect(() => {
    if (activeTab === 'history' && historyPage === 0) {
      fetchHistory(0);
    }
  }, [activeTab, historyPage, fetchHistory]);

  // ⚡ 실시간 전용 및 폴링 관리
  useEffect(() => {
    // 🚀 10초 주기 폴링 (백업용)
    const pollInterval = setInterval(() => {
      console.log('🔄 10초 주기 폴링 중...');
      fetchRequests();
    }, 10000);

    // ⚡ 수파베이스 리얼타임 구독
    const subscription = supabase
      .channel('tarot_orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tb_tarot_request' }, (payload) => {
        console.log('Realtime update:', payload);
        
        // 새로운 주문(INSERT) 발생 시 즉시 소리 알림
        if (payload.eventType === 'INSERT') {
          playNotification();
        }
        
        fetchRequests();
        // 히스토리 첫 페이지라면 리얼타임으로 같이 갱신
        if (historyPage === 0) {
          fetchHistory(0);
        }
      })
      .subscribe();

    return () => {
      clearInterval(pollInterval);
      supabase.removeChannel(subscription);
    };
  }, [fetchRequests, fetchHistory, playNotification, historyPage]);

  const handleAction = async (id, newStatus, requestData = null) => {
    if (newStatus === 1 && requestData) {
      setIsGenerating(prev => ({ ...prev, [id]: true }));
      
      try {
        const { data: cards, error: cardError } = await supabase
          .from('tb_tarot_card')
          .select('*')
          .in('name', [requestData.tarot_card_name, requestData.tarot_card2_name]);

        if (cardError || !cards || cards.length < 2) {
          throw new Error('카드 정보를 가져오지 못했슴다, 큰형님!');
        }

        const card1 = cards.find(c => c.name === requestData.tarot_card_name);
        const card2 = cards.find(c => c.name === requestData.tarot_card2_name);

        // 1. 상태를 즉시 status=1(승인됨/처리 중)로 업데이트하여 손님 화면 전환 유도
        const { error: startError } = await supabase
          .from('tb_tarot_request')
          .update({ 
            status: 1,
            approved_at: new Date().toISOString()
          })
          .eq('req_id', id);

        if (startError) throw startError;

        // 2. AI 해석 생성 시작 (약 20초 소요)
        console.log(`☕ AI ${aiEngine === 'gemini' ? '제미나이' : '라마'} 신탁 생성을 시작함다... (요청 ID: ${id})`);
        const aiResult = await generateAIInterpretation(requestData.question, card1, card2, aiEngine);
        
        if (!aiResult) throw new Error('AI 신탁 생성 실패!');
        console.log("✅ AI 신탁 V5.0 생성 완료:", aiResult.engineVersion);

        // 3. AI 결과를 최종 저장
        const { error: finalError } = await supabase
          .from('tb_tarot_request')
          .update({ 
            ai_tarot_result: JSON.stringify(aiResult)
          })
          .eq('req_id', id);

        if (finalError) throw finalError;
        
        setRequests(prev => prev.filter(r => r.req_id !== id));
        setStats(prev => ({ ...prev, completed: prev.completed + 1 }));
        
        // 🚀 히스토리 탭의 0페이지를 보고 있다면 즉시 로드
        if (activeTab === 'history' && historyPage === 0) {
          fetchHistory(0);
        }

      } catch (err) {
        console.error('AI Oracle Error:', err);
        
        // AI 실패 시 DB에 에러 기록 (고객 화면 무한 대기 방지)
        await supabase
          .from('tb_tarot_request')
          .update({ 
            ai_tarot_result: JSON.stringify({ 
              isError: true, 
              interpretation: "죄송함다, 큰형님! 지금 영적 주파수가 일시적으로 불안정해서 신탁을 불러오는 데 실패했슴다. 1분만 숨 고르고 다시 시도해 주시면 화끈하게 모시겠슴다!",
              message: err.message 
            })
          })
          .eq('req_id', id);

        alert(err.message || 'AI 해설 생성 중 사고가 났슴다!');
      } finally {
        setIsGenerating(prev => ({ ...prev, [id]: false }));
      }
    } else {
      const { error } = await supabase
        .from('tb_tarot_request')
        .update({ 
          status: newStatus,
          approved_at: new Date().toISOString()
        })
        .eq('req_id', id);

      if (error) {
        alert('상태 업데이트 중 오류가 발생했슴다, 큰형님!');
      } else {
        setRequests(prev => prev.filter(r => r.req_id !== id));
        if (newStatus === 2) setStats(prev => ({ ...prev, rejected: prev.rejected + 1 }));
        
        // 🚀 히스토리 탭의 0페이지를 보고 있다면 즉시 로드해서 '기분 째지게' 반영!
        if (activeTab === 'history' && historyPage === 0) {
          fetchHistory(0);
        }
      }
    }
  };

  const formatDate = (dateString = null) => {
    if (!dateString) return '-';
    try {
      return new Intl.DateTimeFormat('ko-KR', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false
      }).format(new Date(dateString));
    } catch { return dateString; }
  };

  const formatPhone = (phone) => {
    if (!phone) return 'Unknown';
    return phone.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
  };

  const formatDuration = (start, end) => {
    if (!start || !end) return '-';
    try {
      const diff = Math.floor((new Date(end) - new Date(start)) / 1000);
      if (diff < 0) return '0s';
      const mins = Math.floor(diff / 60);
      const secs = diff % 60;
      return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    } catch { return '-'; }
  };

  return (
    <div className="w-full max-w-[720px] mx-auto flex flex-col gap-6 animate-in fade-in duration-700">
      
      {/* 🚀 AI ORACLE ENGINE STATUS BANNER (V5.0 PREM) */}
      <div className="glass-panel px-4 py-5 border-tech-blue/30 bg-black/60 overflow-hidden relative group">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-5 relative z-10">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className="relative">
              <div className="w-12 h-12 bg-tech-blue/10 rounded-2xl flex items-center justify-center text-tech-blue border border-tech-blue/20 shadow-[0_0_20px_-5px_rgba(59,130,246,0.3)] z-10 relative">
                <Zap className="w-6 h-6 animate-pulse" />
              </div>
              <div className="absolute inset-0 bg-tech-blue/20 blur-xl rounded-full scale-150 opacity-30 group-hover:opacity-50 transition-opacity" />
            </div>
            <div className="flex flex-col text-left">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[9px] text-tech-blue font-black uppercase tracking-[0.2em]">System Insight</span>
                <div className="w-1 h-1 rounded-full bg-tech-blue animate-ping" />
              </div>
              <h2 className="text-sm font-black text-white italic tracking-tight flex items-baseline gap-2">
                AI ORACLE ENGINE <span className="text-tech-blue drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]">V5.0</span>
                <span className="text-[8px] bg-tech-blue/20 text-tech-blue px-1.5 py-0.5 rounded-full not-italic font-black border border-tech-blue/10">ACTIVE</span>
              </h2>
            </div>
          </div>

          <div className="w-full sm:w-auto grid grid-cols-2 sm:flex sm:flex-row items-center justify-between sm:justify-end gap-2 sm:gap-3 bg-white/[0.03] px-2 py-2 sm:px-3 sm:py-3 rounded-2xl border border-white/5">
            {/* Server Status (Mobile Row 1) */}
            <div className="flex items-center gap-2 px-2 py-1.5 bg-black/20 rounded-xl border border-white/5 sm:bg-transparent sm:border-0 sm:px-0">
              <div className="relative">
                <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)]" />
                <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-60" />
              </div>
              <span className="text-[8px] sm:text-[10px] text-white/40 font-bold uppercase tracking-widest whitespace-nowrap">Online</span>
            </div>
            
            {/* Stable Version (Mobile Row 1) */}
            <div className="flex items-center justify-end sm:justify-center gap-2 px-2 py-1.5 bg-black/20 rounded-xl border border-white/5 sm:bg-transparent sm:border-0 sm:px-0">
              <span className="text-[8px] sm:text-[9px] text-amber-500 font-black italic">V5.0_STABLE</span>
            </div>

            {/* AI Engine Toggle (Mobile Row 2) */}
            <button 
              onClick={toggleAiEngine}
              className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl border transition-all ${aiEngine === 'gemini' ? 'bg-tech-purple/20 border-tech-purple/40 text-tech-purple shadow-[0_0_15px_-5px_rgba(168,85,247,0.4)]' : 'bg-tech-blue/20 border-tech-blue/40 text-tech-blue shadow-[0_0_15px_-5px_rgba(59,130,246,0.4)]'}`}
            >
              <RefreshCcw size={10} className={aiEngine === 'gemini' ? "text-tech-purple" : "text-tech-blue"} />
              <span className="text-[9px] font-black uppercase tracking-tighter">
                {aiEngine === 'gemini' ? 'Gemini' : 'Llama'}
              </span>
            </button>

            {/* Sound Toggle (Mobile Row 2 - Critical Visibility) */}
            <button 
              onClick={() => setIsSoundEnabled(!isSoundEnabled)}
              className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl border transition-all ${isSoundEnabled ? 'bg-tech-blue/30 border-tech-blue/60 text-tech-blue shadow-[0_0_20px_-3px_rgba(59,130,246,0.6)]' : 'bg-white/5 border-white/10 text-white/40'}`}
            >
              <div className="relative">
                <Zap size={10} className={isSoundEnabled ? "animate-pulse" : ""} />
                {isSoundEnabled && <div className="absolute inset-0 bg-tech-blue rounded-full animate-ping opacity-40" />}
              </div>
              <span className="text-[9px] font-black uppercase tracking-tighter">
                {isSoundEnabled ? 'Audio ON' : 'Audio OFF'}
              </span>
            </button>
          </div>
        </div>
        
        {/* Decorative Background effects */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-tech-blue/5 blur-3xl -mr-16 -mt-16 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-tech-purple/5 blur-3xl -ml-16 -mb-16 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-tech-blue/[0.03] to-transparent pointer-events-none" />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel px-3 py-4 border-tech-blue/20 flex flex-col items-center gap-1">
          <Clock className="text-tech-blue w-5 h-5" />
          <span className="text-[9px] text-coffee-light/40 font-black uppercase tracking-widest">대기</span>
          <span className="text-2xl font-black text-white">{stats.pending}</span>
        </div>
        <div className="glass-panel px-3 py-4 border-tech-purple/20 flex flex-col items-center gap-1">
          <Check className="text-tech-purple w-5 h-5" />
          <span className="text-[9px] text-coffee-light/40 font-black uppercase tracking-widest">완료</span>
          <span className="text-2xl font-black text-white">{stats.completed}</span>
        </div>
        <div className="glass-panel px-3 py-4 border-red-500/20 flex flex-col items-center gap-1">
          <X className="text-red-500 w-5 h-5" />
          <span className="text-[9px] text-coffee-light/40 font-black uppercase tracking-widest">반려</span>
          <span className="text-2xl font-black text-white">{stats.rejected}</span>
        </div>
        <button 
          onClick={onLogout}
          className="glass-panel px-3 py-4 border-amber-500/20 hover:bg-amber-500/10 transition-all flex flex-col items-center gap-1 group"
        >
          <LogOut className="text-amber-500 w-5 h-5 group-hover:scale-110 transition-transform" />
          <span className="text-[9px] text-amber-500/60 font-black uppercase tracking-widest">종료</span>
          <span className="text-xs font-bold text-white italic uppercase">LOGOUT</span>
        </button>
      </div>

      {/* Tabs & Content */}
      <div className="glass-panel px-4 py-8 sm:px-8 min-h-[500px] flex flex-col gap-6 bg-black/40 backdrop-blur-xl border-white/5">
        <div className="flex flex-col md:flex-row justify-between items-center border-b border-white/5 pb-6 gap-6">
          <div className="flex items-center gap-4">
            <div className={`w-2 h-8 ${activeTab === 'queue' ? 'bg-tech-blue' : 'bg-tech-purple'} rounded-full transition-all`} />
            <h2 className="text-2xl font-black text-white tracking-tight italic uppercase">
              {activeTab === 'queue' ? '오라클 대기열' : '상담 이력 관리'}
            </h2>
          </div>

          <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl">
            <button onClick={() => setActiveTab('queue')} className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'queue' ? 'bg-tech-blue text-white shadow-lg' : 'text-coffee-light/40 hover:text-white'}`}>대기열 ({requests.length})</button>
            <button onClick={() => setActiveTab('history')} className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'history' ? 'bg-tech-purple text-white shadow-lg' : 'text-coffee-light/40 hover:text-white'}`}>히스토리</button>
            <button 
              onClick={() => {
                fetchRequests();
                fetchHistory(historyPage);
              }} 
              className="p-2 hover:bg-white/5 rounded-lg transition-all text-coffee-light/40 hover:text-white"
            >
              <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* 🎮 History Pagination (TOP) */}
        {activeTab === 'history' && totalHistoryCount > itemsPerPage && (
          <div className="flex flex-col items-center gap-4 mb-4 pt-2">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => fetchHistory(historyPage - 1)}
                disabled={historyPage === 0 || historyLoading}
                className="w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white/40 hover:text-white disabled:opacity-20 transition-all group"
              >
                <Clock size={12} className="group-hover:-rotate-45 transition-transform" />
              </button>
              
              <div className="flex items-center gap-1.5 px-2">
                {Array.from({ length: Math.ceil(totalHistoryCount / itemsPerPage) }).map((_, idx) => {
                  const totalPages = Math.ceil(totalHistoryCount / itemsPerPage);
                  if (idx === 0 || idx === totalPages - 1 || (idx >= historyPage - 1 && idx <= historyPage + 1)) {
                    return (
                      <button
                        key={idx}
                        onClick={() => fetchHistory(idx)}
                        disabled={historyLoading}
                        className={`w-8 h-8 rounded-lg text-[10px] font-black transition-all border ${
                          historyPage === idx 
                            ? 'bg-tech-purple border-tech-purple text-white shadow-[0_0_10px_-2px_rgba(168,85,247,0.5)]' 
                            : 'bg-white/5 border-white/10 text-white/40 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        {idx + 1}
                      </button>
                    );
                  } else if ((idx === historyPage - 2 && idx > 0) || (idx === historyPage + 2 && idx < totalPages - 1)) {
                    return <span key={idx} className="text-white/20 text-[9px] font-black px-0.5">...</span>;
                  }
                  return null;
                })}
              </div>

              <button 
                onClick={() => fetchHistory(historyPage + 1)}
                disabled={(historyPage + 1) * itemsPerPage >= totalHistoryCount || historyLoading}
                className="w-8 h-8 flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white/40 hover:text-white disabled:opacity-20 transition-all group"
              >
                <RefreshCcw size={12} className="group-hover:rotate-180 transition-transform" />
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-4">
          <AnimatePresence mode="popLayout">
            {activeTab === 'queue' ? (
              requests.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-coffee-light/20 gap-4">
                  <Users size={48} strokeWidth={1} />
                  <p className="font-heading text-sm font-bold italic uppercase tracking-widest text-center">현재 대기 중인 주문이 없습니다</p>
                </div>
              ) : (
                requests.map((order) => (
                  <motion.div 
                    key={order.req_id} 
                    initial={{ opacity: 0, y: 10 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    exit={{ opacity: 0, scale: 0.95 }} 
                    className="flex flex-col md:flex-row items-center justify-between px-4 py-5 md:px-6 md:py-6 bg-white/[0.03] border border-white/5 rounded-2xl gap-5 md:gap-6 hover:bg-white/[0.05] transition-all group"
                  >
                    <div className="flex items-center gap-5 md:gap-6 flex-1 w-full">
                      {/* 🔢 대기 번호: 원형 글로우 디자인 */}
                      <div className="relative flex-shrink-0">
                        <div className="w-14 h-14 bg-coffee-dark/80 border-2 border-tech-blue/30 rounded-full flex items-center justify-center shadow-[0_0_15px_-5px_rgba(59,130,246,0.5)] z-10 relative overflow-hidden">
                          <span className="text-xl font-black text-tech-blue drop-shadow-[0_0_5px_rgba(59,130,246,0.5)]">{order.wait_number}</span>
                        </div>
                        <div className="absolute inset-0 bg-tech-blue/10 rounded-full blur-md animate-pulse" />
                      </div>

                      {/* 📱 정보 영역: 모바일 가독성 중심 */}
                      <div className="flex flex-col gap-1.5 text-left flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-bold text-lg leading-none tracking-tight">{formatPhone(order.phone_number)}</span>
                          {order.ip_address && (
                            <span className="text-[10px] text-tech-blue/60 font-mono font-black italic">{order.ip_address}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                           <Clock size={10} className="text-white/20" />
                           <span className="text-[10px] text-white/40 font-mono tracking-tighter">{formatDate(order.created_at)}</span>
                        </div>
                        <div className="flex flex-col gap-0.5 mt-2">
                          <span className="text-coffee-light/40 font-black text-[9px] uppercase tracking-widest">심층 조합</span>
                          <div className="flex flex-row gap-3 mt-1">
                            <div className="flex items-center gap-1.5 bg-tech-blue/5 px-2 py-0.5 rounded-lg border border-tech-blue/10">
                              <div className="w-1 h-1 bg-tech-blue rounded-full shadow-[0_0_5px_rgba(59,130,246,0.5)]" />
                              <span className="text-tech-blue font-bold text-[10px] leading-none">{order.tarot_card_name}</span>
                            </div>
                            <div className="flex items-center gap-1.5 bg-tech-purple/5 px-2 py-0.5 rounded-lg border border-tech-purple/10">
                              <div className="w-1 h-1 bg-tech-purple rounded-full shadow-[0_0_5px_rgba(168,85,247,0.5)]" />
                              <span className="text-tech-purple font-bold text-[10px] leading-none">{order.tarot_card2_name}</span>
                            </div>
                          </div>
                        </div>

                        {/* 💬 상담 질문 노출 */}
                        <div className="mt-4 bg-black/40 px-3 py-3 rounded-xl border border-white/5 shadow-inner">
                          <div className="flex items-center gap-2 mb-1.5">
                            <Coffee size={10} className="text-tech-blue" />
                            <span className="text-[9px] text-tech-blue/60 font-black uppercase tracking-widest">상담 요청 내용</span>
                          </div>
                          <p className="text-[11px] text-coffee-light/90 leading-relaxed font-medium line-clamp-3 md:line-clamp-none italic">
                            "{(order.question && order.question.trim()) ? order.question : '오늘의 운세 알려줘'}"
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* 🎮 액션 버튼: 콤팩트 레이아웃 */}
                    <div className="flex items-center gap-2.5 w-full md:w-auto justify-end md:justify-start border-t md:border-t-0 border-white/5 pt-4 md:pt-0">
                      <button 
                        onClick={() => handleAction(order.req_id, 2)} 
                        className="p-3 bg-white/5 hover:bg-red-500/20 text-coffee-light/40 hover:text-red-500 rounded-xl border border-white/5 transition-all flex-1 md:flex-none flex justify-center"
                      >
                        <X size={18} />
                      </button>
                      <button 
                        onClick={() => handleAction(order.req_id, 1, order)} 
                        disabled={isGenerating[order.req_id]} 
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-tech-blue hover:bg-white text-white hover:text-tech-blue font-black rounded-xl transition-all shadow-lg disabled:opacity-30 flex-[2] md:flex-none whitespace-nowrap"
                      >
                        {isGenerating[order.req_id] ? <RefreshCcw size={16} className="animate-spin" /> : <Check size={16} />}
                        <span className="text-[10px] uppercase italic tracking-tighter">
                          {isGenerating[order.req_id] ? '마스터가 카드를 해석 중입니다...' : '승인'}
                        </span>
                      </button>
                    </div>
                  </motion.div>
                ))
              )
            ) : (
              history.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-coffee-light/20 gap-4">
                  {historyLoading ? (
                    <RefreshCcw size={48} className="animate-spin text-tech-purple opacity-40" />
                  ) : (
                    <>
                      <Clock size={48} strokeWidth={1} />
                      <p className="font-heading text-sm font-bold italic uppercase tracking-widest">이전 상담 기록이 없습니다</p>
                    </>
                  )}
                </div>
              ) : (
                <div className={`flex flex-col gap-4 transition-all duration-300 ${historyLoading ? 'opacity-30 blur-sm pointer-events-none' : 'opacity-100'}`}>
                  {history.map((order) => (
                    <motion.div 
                      key={order.req_id} 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex flex-col px-4 py-5 bg-white/[0.02] border border-white/5 rounded-2xl gap-4 hover:bg-white/[0.04] transition-all group"
                    >
                      {/* ... history item content ... */}
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        {/* 🏁 상태 아이콘: 원형 글로우 디자인 */}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border shadow-sm ${order.status === 1 ? 'bg-tech-blue/10 border-tech-blue/20 text-tech-blue' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
                          {order.status === 1 ? <Check size={18} /> : <X size={18} />}
                        </div>
                        
                        <div className="flex flex-col text-left min-w-0">
                          <span className="text-white font-bold text-base leading-none tracking-tight">{formatPhone(order.phone_number)}</span>
                          {/* 🃏 카드 조합: 계단식 레이아웃 */}
                          <div className="flex flex-col gap-1 mt-1.5 flex-wrap">
                            <div className="flex items-center gap-1.5">
                              <div className={`w-1 h-1 rounded-full ${order.status === 1 ? 'bg-tech-blue' : 'bg-red-500/40'}`} />
                              <span className="text-coffee-light/60 font-medium text-[10px] truncate">{order.tarot_card_name}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className={`w-1 h-1 rounded-full ${order.status === 1 ? 'bg-tech-purple' : 'bg-red-500/40'}`} />
                              <span className="text-coffee-light/60 font-medium text-[10px] truncate">{order.tarot_card2_name}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 🎫 리퀘스트 ID: 전체 노출 스타일 */}
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${order.status === 1 ? 'bg-tech-blue/20 text-tech-blue' : 'bg-red-500/20 text-red-500'}`}>
                          {order.status === 1 ? 'COMPLETED' : 'REJECTED'}
                        </span>
                      </div>
                    </div>
                    
                    {/* 🕒 상세 타임스탬프 & 엔진 정보 */}
                    {order.status === 1 && order.ai_tarot_result && (
                      <div className="mt-3 bg-tech-blue/[0.03] border border-tech-blue/10 rounded-xl p-3 grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[8px] text-tech-blue/50 font-black uppercase tracking-widest">사용 엔진</span>
                          <span className="text-[10px] text-tech-blue font-bold italic">
                            {JSON.parse(order.ai_tarot_result).engineVersion || "Unknown"}
                          </span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[8px] text-white/30 font-black uppercase tracking-widest">승인 시각</span>
                          <span className="text-[10px] text-white/60 font-mono">
                            {new Date(order.approved_at).toLocaleTimeString('ko-KR', { hour12: false })}
                          </span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[8px] text-white/30 font-black uppercase tracking-widest">완료 시각</span>
                          <span className="text-[10px] text-white/60 font-mono">
                            {JSON.parse(order.ai_tarot_result).generatedAt ? new Date(JSON.parse(order.ai_tarot_result).generatedAt).toLocaleTimeString('ko-KR', { hour12: false }) : '-'}
                          </span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[8px] text-amber-500/50 font-black uppercase tracking-widest">응답 소요시간</span>
                          <span className="text-[10px] text-amber-500 font-black italic">
                            {formatDuration(order.approved_at, JSON.parse(order.ai_tarot_result).generatedAt)}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* 💬 신청 시 상담 질문 */}
                    <div className="mt-2 text-left bg-black/20 p-2.5 rounded-lg border border-white/5">
                      <p className="text-white/70 text-sm mt-1 line-clamp-2 italic">
                      "{(order.question && order.question.trim()) ? order.question : '질문 미입력'}"
                    </p>
                    </div>
                    
                    {/* ID 하단 배치로 가독성 확보 */}
                    <div className="border-t border-white/[0.03] mt-3 pt-3 flex flex-wrap justify-between items-center gap-2">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-white/40 font-mono tracking-tighter uppercase">ID: {order.req_id}</span>
                        {order.ip_address && (
                          <span className="text-[9px] text-tech-purple/50 font-mono italic">IP: {order.ip_address}</span>
                        )}
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[8px] text-white/20 font-black uppercase">요청 일시</span>
                        <span className="text-[10px] text-coffee-light/40 font-black italic">{formatDate(order.created_at)}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
                </div>
              )
            )}
          </AnimatePresence>

          {/* 🎮 History Pagination Controls */}
          {activeTab === 'history' && totalHistoryCount > itemsPerPage && (
            <div className="flex flex-col items-center gap-6 mt-12 pb-6">
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => fetchHistory(historyPage - 1)}
                  disabled={historyPage === 0 || historyLoading}
                  className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white/40 hover:text-white disabled:opacity-20 transition-all group"
                >
                  <Clock size={14} className="group-hover:-rotate-45 transition-transform" />
                </button>
                
                <div className="flex items-center gap-1.5 px-2">
                  {Array.from({ length: Math.ceil(totalHistoryCount / itemsPerPage) }).map((_, idx) => {
                    // 현재 페이지 주변 번호만 표시 (예: 5개)
                    const totalPages = Math.ceil(totalHistoryCount / itemsPerPage);
                    if (
                      idx === 0 || 
                      idx === totalPages - 1 || 
                      (idx >= historyPage - 1 && idx <= historyPage + 1)
                    ) {
                      return (
                        <button
                          key={idx}
                          onClick={() => fetchHistory(idx)}
                          disabled={historyLoading}
                          className={`w-10 h-10 rounded-xl text-[11px] font-black transition-all border ${
                            historyPage === idx 
                              ? 'bg-tech-purple border-tech-purple shadow-[0_0_15px_-3px_rgba(168,85,247,0.6)] text-white' 
                              : 'bg-white/5 border-white/10 text-white/40 hover:text-white hover:bg-white/10'
                          }`}
                        >
                          {idx + 1}
                        </button>
                      );
                    } else if (
                      (idx === historyPage - 2 && idx > 0) || 
                      (idx === historyPage + 2 && idx < totalPages - 1)
                    ) {
                      return <span key={idx} className="text-white/20 text-[10px] font-black px-1">...</span>;
                    }
                    return null;
                  })}
                </div>

                <button 
                  onClick={() => fetchHistory(historyPage + 1)}
                  disabled={(historyPage + 1) * itemsPerPage >= totalHistoryCount || historyLoading}
                  className="w-10 h-10 flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white/40 hover:text-white disabled:opacity-20 transition-all group"
                >
                  <RefreshCcw size={14} className="group-hover:rotate-180 transition-transform" />
                </button>
              </div>

              <div className="flex items-center gap-3 px-4 py-2 bg-white/[0.03] rounded-full border border-white/5">
                <span className="text-[9px] text-white/20 font-black uppercase tracking-widest">Total Results</span>
                <span className="text-[10px] text-tech-purple font-black italic">{totalHistoryCount}</span>
                <div className="w-1 h-1 rounded-full bg-white/10" />
                <span className="text-[9px] text-white/20 font-black uppercase tracking-widest">Page</span>
                <span className="text-[10px] text-white font-black italic">{historyPage + 1} / {Math.ceil(totalHistoryCount / itemsPerPage)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* 🔔 New Order Toast Notification */}
      <AnimatePresence>
        {showNewOrderToast && (
          <motion.div 
            initial={{ opacity: 0, y: -100, x: '-50%' }}
            animate={{ opacity: 1, y: 20, x: '-50%' }}
            exit={{ opacity: 0, y: -100, x: '-50%' }}
            className="fixed top-0 left-1/2 z-[100] w-[90%] max-w-[400px]"
          >
            <div className="bg-tech-blue border border-white/20 rounded-2xl p-4 shadow-[0_20px_50px_-10px_rgba(59,130,246,0.5)] flex items-center gap-4">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center animate-bounce">
                <Zap className="text-white w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-black text-white/70 uppercase tracking-widest">New Oracle Request</span>
                <span className="text-sm font-bold text-white">새로운 타로 신탁 요청이 들어왔슴다!</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BaristaDashboard;
