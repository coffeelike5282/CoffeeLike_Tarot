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
        const aiResult = generateAIInterpretation(card1, card2);
        
        if (!aiResult) throw new Error('AI 신탁 생성 실패!');
        console.log("✅ AI 신탁 V3.1 생성 완료:", aiResult.engineVersion);

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
      
      {/* 🚀 AI ORACLE ENGINE STATUS BANNER (V3.1) */}
      <div className="glass-panel p-4 border-tech-blue/30 bg-tech-blue/5 overflow-hidden relative group">
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-tech-blue/20 rounded-xl flex items-center justify-center text-tech-blue">
              <Zap className="w-5 h-5 animate-pulse" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-tech-blue font-black uppercase tracking-widest">System Status</span>
              <span className="text-sm font-black text-white italic">AI ORACLE ENGINE V3.1 ACTIVE</span>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-black/40 px-4 py-2 rounded-xl border border-white/5">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] text-white/60 font-medium uppercase tracking-tighter">Server Online</span>
            </div>
            <div className="w-[1px] h-3 bg-white/10" />
            <span className="text-[10px] text-amber-500 font-bold uppercase italic">V3.1.2_RELEASE</span>
          </div>
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-tech-blue/10 to-transparent opacity-50" />
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
              {activeTab === 'queue' ? '바리스타 오라클 대기열' : '상담 이력 관리'}
            </h2>
          </div>

          <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl">
            <button onClick={() => setActiveTab('queue')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'queue' ? 'bg-tech-blue text-white shadow-lg' : 'text-coffee-light/40 hover:text-white'}`}>대기열 ({requests.length})</button>
            <button onClick={() => setActiveTab('history')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'history' ? 'bg-tech-purple text-white shadow-lg' : 'text-coffee-light/40 hover:text-white'}`}>히스토리</button>
            <button onClick={fetchRequests} className="p-2 hover:bg-white/5 rounded-lg transition-all text-coffee-light/40 hover:text-white"><RefreshCcw size={16} className={loading ? "animate-spin" : ""} /></button>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <AnimatePresence mode="popLayout">
            {activeTab === 'queue' ? (
              requests.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-coffee-light/20 gap-4">
                  <Users size={48} strokeWidth={1} />
                  <p className="font-heading text-sm font-bold italic uppercase tracking-widest">현재 대기 중인 주문이 없습니다</p>
                </div>
              ) : (
                requests.map((order, index) => (
                  <motion.div key={order.req_id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="flex flex-col md:flex-row items-center justify-between p-6 bg-white/5 border border-white/5 rounded-2xl gap-6">
                    <div className="flex items-center gap-6 flex-1">
                      <div className="w-14 h-14 bg-coffee-dark border border-tech-blue/20 rounded-2xl flex items-center justify-center shadow-2xl relative overflow-hidden">
                        <span className="text-xl font-black text-tech-blue z-10">{order.wait_number}</span>
                        <div className="absolute inset-0 bg-tech-blue/5 animate-pulse" />
                      </div>
                      <div className="flex flex-col gap-1 text-left">
                        <span className="text-white font-bold text-lg">{formatPhone(order.phone_number)}</span>
                        <span className="text-coffee-light font-black text-[10px] uppercase italic tracking-tighter">
                          심층 조합: <span className="text-tech-blue">{order.tarot_card_name}</span> + <span className="text-tech-purple">{order.tarot_card2_name}</span>
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button onClick={() => handleAction(order.req_id, 2)} className="p-3 bg-white/5 hover:bg-red-500/20 text-coffee-light/40 hover:text-red-500 rounded-xl border border-white/5 transition-all"><X size={20} /></button>
                      <button onClick={() => handleAction(order.req_id, 1, order)} disabled={isGenerating[order.req_id]} className="flex items-center gap-2 px-6 py-3 bg-tech-blue hover:bg-white text-white hover:text-tech-blue font-black rounded-xl transition-all shadow-lg disabled:opacity-50">
                        {isGenerating[order.req_id] ? <RefreshCcw size={18} className="animate-spin" /> : <Check size={18} />}
                        <span className="text-xs uppercase italic tracking-tighter">{isGenerating[order.req_id] ? 'AI 생성 중' : '승인'}</span>
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
                  <div key={order.req_id} className="flex flex-col p-6 bg-white/[0.02] border border-white/5 rounded-2xl gap-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${order.status === 1 ? 'bg-tech-purple/10 text-tech-purple' : 'bg-red-500/10 text-red-500'} border border-white/5`}>
                          {order.status === 1 ? <Check size={20} /> : <X size={20} />}
                        </div>
                        <div className="flex flex-col text-left">
                          <span className="text-white font-black text-lg">{formatPhone(order.phone_number)}</span>
                          <span className="text-tech-purple text-[10px] font-black uppercase italic tracking-tighter">{order.tarot_card_name} + {order.tarot_card2_name}</span>
                        </div>
                      </div>
                      <span className="text-[10px] text-white/20 font-mono italic">{order.req_id.slice(0, 8)}</span>
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
