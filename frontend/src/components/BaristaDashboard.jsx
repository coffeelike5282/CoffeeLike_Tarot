import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Coffee, Users, Clock, Zap, LogOut, RefreshCcw } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { generateAIInterpretation } from '../services/aiOracleService';

const BaristaDashboard = ({ onLogout }) => {
  const [requests, setRequests] = useState([]);
  const [history, setHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('queue'); // 'queue', 'history'
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ pending: 0, completed: 0, rejected: 0 });
  const [isGenerating, setIsGenerating] = useState({}); // 각 요청별 AI 생성 로딩 상태

  const fetchRequests = async () => {
    setLoading(true);
    const { data: pendingData, error: pendingError } = await supabase
      .from('tb_tarot_request')
      .select('*')
      .eq('status', 0)
      .order('created_at', { ascending: false });

    const { data: historyData, error: historyError } = await supabase
      .from('tb_tarot_request')
      .select('*')
      .in('status', [1, 2])
      .order('approved_at', { ascending: false, nullsFirst: false })
      .limit(30);

    const { count: completedCount } = await supabase
      .from('tb_tarot_request')
      .select('*', { count: 'exact', head: true })
      .eq('status', 1);

    const { count: rejectedCount } = await supabase
      .from('tb_tarot_request')
      .select('*', { count: 'exact', head: true })
      .eq('status', 2);

    if (!pendingError && !historyError) {
      setRequests(pendingData || []);
      setHistory(historyData || []);
      setStats({ 
        pending: pendingData?.length || 0, 
        completed: completedCount || 0,
        rejected: rejectedCount || 0
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();

    const subscription = supabase
      .channel('tarot_orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tb_tarot_request' }, (payload) => {
        console.log('Realtime update:', payload);
        fetchRequests();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

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

        console.log("☕ AI 신탁 생성을 시작함다... (요청 ID:", id, ")");
        const aiResult = await generateAIInterpretation(card1, card2);
        
        if (!aiResult) throw new Error('AI 신탁 생성 실패!');
        console.log("✅ AI 신탁 V4.0 생성 완료:", aiResult.engineVersion);

        const { error: updateError } = await supabase
          .from('tb_tarot_request')
          .update({ 
            status: 1,
            approved_at: new Date().toISOString(),
            ai_tarot_result: JSON.stringify(aiResult)
          })
          .eq('req_id', id);

        if (updateError) throw updateError;
        
        setRequests(prev => prev.filter(r => r.req_id !== id));
        setStats(prev => ({ ...prev, completed: prev.completed + 1 }));

      } catch (err) {
        console.error('AI Oracle Error:', err);
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
      }
    }
  };

  const formatDate = (dateString = null) => {
    if (!dateString) return '-';
    try {
      return new Intl.DateTimeFormat('ko-KR', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: true
      }).format(new Date(dateString));
    } catch (e) { return dateString; }
  };

  const formatPhone = (phone) => {
    if (!phone) return 'Unknown';
    return phone.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
  };

  return (
    <div className="w-full max-w-[720px] mx-auto flex flex-col gap-6 animate-in fade-in duration-700">
      
      {/* 🚀 AI ORACLE ENGINE STATUS BANNER (V3.2 PREM) */}
      <div className="glass-panel p-5 border-tech-blue/30 bg-black/60 overflow-hidden relative group">
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
                AI ORACLE ENGINE <span className="text-tech-blue drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]">V3.2</span>
                <span className="text-[8px] bg-tech-blue/20 text-tech-blue px-1.5 py-0.5 rounded-full not-italic font-black border border-tech-blue/10">ACTIVE</span>
              </h2>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-4 bg-white/[0.03] p-3 rounded-2xl border border-white/5 w-full sm:w-auto">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)]" />
                <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-60" />
              </div>
              <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Server Online</span>
            </div>
            
            <div className="w-px h-3 bg-white/10" />
            
            <div className="flex items-center gap-2">
              <span className="text-[9px] bg-amber-500/10 text-amber-500 px-2 py-1 rounded-lg font-black border border-amber-500/10 italic">V3.1.2_STABLE</span>
            </div>
          </div>
        </div>
        
        {/* Decorative Background effects */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-tech-blue/5 blur-3xl -mr-16 -mt-16 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-tech-purple/5 blur-3xl -ml-16 -mb-16 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-tech-blue/[0.03] to-transparent pointer-events-none" />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel p-4 border-tech-blue/20 flex flex-col items-center gap-1">
          <Clock className="text-tech-blue w-5 h-5" />
          <span className="text-[9px] text-coffee-light/40 font-black uppercase tracking-widest">대기</span>
          <span className="text-2xl font-black text-white">{stats.pending}</span>
        </div>
        <div className="glass-panel p-4 border-tech-purple/20 flex flex-col items-center gap-1">
          <Check className="text-tech-purple w-5 h-5" />
          <span className="text-[9px] text-coffee-light/40 font-black uppercase tracking-widest">완료</span>
          <span className="text-2xl font-black text-white">{stats.completed}</span>
        </div>
        <div className="glass-panel p-4 border-red-500/20 flex flex-col items-center gap-1">
          <X className="text-red-500 w-5 h-5" />
          <span className="text-[9px] text-coffee-light/40 font-black uppercase tracking-widest">반려</span>
          <span className="text-2xl font-black text-white">{stats.rejected}</span>
        </div>
        <button 
          onClick={onLogout}
          className="glass-panel p-4 border-amber-500/20 hover:bg-amber-500/10 transition-all flex flex-col items-center gap-1 group"
        >
          <LogOut className="text-amber-500 w-5 h-5 group-hover:scale-110 transition-transform" />
          <span className="text-[9px] text-amber-500/60 font-black uppercase tracking-widest">종료</span>
          <span className="text-xs font-bold text-white italic uppercase">LOGOUT</span>
        </button>
      </div>

      {/* Tabs & Content */}
      <div className="glass-panel p-8 min-h-[500px] flex flex-col gap-6 bg-black/40 backdrop-blur-xl border-white/5">
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
            <button onClick={fetchRequests} className="p-2 hover:bg-white/5 rounded-lg transition-all text-coffee-light/40 hover:text-white"><RefreshCcw size={16} className={loading ? "animate-spin" : ""} /></button>
          </div>
        </div>

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
                    className="flex flex-col md:flex-row items-center justify-between p-5 md:p-6 bg-white/[0.03] border border-white/5 rounded-2xl gap-5 md:gap-6 hover:bg-white/[0.05] transition-all group"
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
                        <span className="text-white font-bold text-lg leading-none tracking-tight">{formatPhone(order.phone_number)}</span>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-coffee-light/40 font-black text-[9px] uppercase tracking-widest">심층 조합</span>
                          <div className="flex flex-col gap-1 mt-0.5">
                            <div className="flex items-center gap-2">
                              <div className="w-1 h-1 bg-tech-blue rounded-full shadow-[0_0_5px_rgba(59,130,246,0.5)]" />
                              <span className="text-tech-blue font-bold text-[11px] leading-none">{order.tarot_card_name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-1 h-1 bg-tech-purple rounded-full shadow-[0_0_5px_rgba(168,85,247,0.5)]" />
                              <span className="text-tech-purple font-bold text-[11px] leading-none">{order.tarot_card2_name}</span>
                            </div>
                          </div>
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
                          {isGenerating[order.req_id] ? 'AI 생성 중' : '승인'}
                        </span>
                      </button>
                    </div>
                  </motion.div>
                ))
              )
            ) : (
              history.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-coffee-light/20 gap-4">
                  <Clock size={48} strokeWidth={1} />
                  <p className="font-heading text-sm font-bold italic uppercase tracking-widest">이전 상담 기록이 없습니다</p>
                </div>
              ) : (
                history.map((order) => (
                  <div key={order.req_id} className="flex flex-col p-5 bg-white/[0.02] border border-white/5 rounded-2xl gap-4 hover:bg-white/[0.04] transition-all group">
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
                    
                    {/* ID 하단 배치로 가독성 확보 */}
                    <div className="border-t border-white/[0.03] pt-3 flex justify-between items-center">
                      <span className="text-[10px] text-white/40 font-mono tracking-tighter uppercase">ID: {order.req_id}</span>
                      <span className="text-[10px] text-coffee-light/40 font-black italic">{new Date(order.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                ))
              )
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default BaristaDashboard;
