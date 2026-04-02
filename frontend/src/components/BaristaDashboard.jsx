import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Coffee, Users, Clock, Zap, LogOut, RefreshCcw } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const BaristaDashboard = ({ onLogout }) => {
  const [requests, setRequests] = useState([]);
  const [history, setHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('queue'); // 'queue', 'history'
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ pending: 0, completed: 0, rejected: 0 });

  const fetchRequests = async () => {
    setLoading(true);
    const { data: pendingData, error: pendingError } = await supabase
      .from('tb_tarot_request')
      .select('*')
      .eq('status', 0)
      .order('created_at', { ascending: false }); // 최신 요청이 위로!

    const { data: historyData, error: historyError } = await supabase
      .from('tb_tarot_request')
      .select('*')
      .in('status', [1, 2])
      .order('approved_at', { ascending: false, nullsFirst: false }) // 처리 시간 기준 최신순, 기록 없는 건 뒤로!
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

    // 실시간 구독 설정 (새로운 요청이 들어오면 즉시 갱신)
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

  const handleAction = async (id, newStatus) => {
    const { error } = await supabase
      .from('tb_tarot_request')
      .update({ 
        status: newStatus,
        approved_at: new Date().toISOString() // 승인이든 거절이든 처리 시간 기록!
      })
      .eq('req_id', id);

    if (error) {
      alert('상태 업데이트 중 오류가 발생했슴다, 큰형님!');
    } else {
      // 로컬 상태에서도 즉시 제거 (실시간 구독이 있으나 빠른 반응성을 위해)
      setRequests(prev => prev.filter(r => r.req_id !== id));
      if (newStatus === 1) setStats(prev => ({ ...prev, completed: prev.completed + 1 }));
    }
  };

  const formatDate = (dateString = null) => {
    if (!dateString) return '-';
    try {
      return new Intl.DateTimeFormat('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: true
      }).format(new Date(dateString));
    } catch (e) {
      return dateString;
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-6 animate-in fade-in duration-700">
      
      {/* Dashboard Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel p-6 border-tech-blue/20 flex flex-col items-center gap-2">
          <div className="p-3 bg-tech-blue/10 rounded-full">
            <Clock className="text-tech-blue w-6 h-6" />
          </div>
          <span className="text-[10px] text-coffee-light/40 font-black uppercase tracking-widest">Pending</span>
          <span className="text-3xl font-black text-white">{stats.pending}</span>
        </div>
        <div className="glass-panel p-6 border-tech-purple/20 flex flex-col items-center gap-2">
          <div className="p-3 bg-tech-purple/10 rounded-full">
            <Check className="text-tech-purple w-6 h-6" />
          </div>
          <span className="text-[10px] text-coffee-light/40 font-black uppercase tracking-widest">Approved</span>
          <span className="text-3xl font-black text-white">{stats.completed}</span>
        </div>
        <div className="glass-panel p-6 border-red-500/20 flex flex-col items-center gap-2">
          <div className="p-3 bg-red-500/10 rounded-full">
            <X className="text-red-500 w-6 h-6" />
          </div>
          <span className="text-[10px] text-coffee-light/40 font-black uppercase tracking-widest">Rejected</span>
          <span className="text-3xl font-black text-white">{stats.rejected}</span>
        </div>
        <div className="hidden md:flex glass-panel p-6 border-amber-500/20 flex-col items-center gap-2">
          <div className="p-3 bg-amber-500/10 rounded-full">
            <Users className="text-amber-500 w-6 h-6" />
          </div>
          <span className="text-[10px] text-coffee-light/40 font-black uppercase tracking-widest">Online</span>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-3xl font-black text-white">LIVE</span>
          </div>
        </div>
        <button 
          onClick={onLogout}
          className="glass-panel p-6 border-red-500/20 hover:bg-red-500/10 transition-all flex flex-col items-center gap-2 group"
        >
          <div className="p-3 bg-red-500/10 rounded-full group-hover:bg-red-500/20">
            <LogOut className="text-red-500 w-6 h-6" />
          </div>
          <span className="text-[10px] text-red-500/60 font-black uppercase tracking-widest">Logout</span>
          <span className="text-xs font-bold text-white uppercase italic">Exit Room</span>
        </button>
      </div>

      {/* Main Order Queue */}
      <div className="glass-panel p-8 min-h-[500px] flex flex-col gap-6 bg-black/40 backdrop-blur-xl border-white/5">
        <div className="flex flex-col md:flex-row justify-between items-center border-b border-white/5 pb-6 gap-6">
          <div className="flex items-center gap-4">
            <div className={`w-2 h-8 ${activeTab === 'queue' ? 'bg-tech-blue' : 'bg-tech-purple'} rounded-full transition-all`} />
            <h2 className="text-2xl font-black text-white tracking-tight italic uppercase">
              {activeTab === 'queue' ? 'Barista Oracle Queue' : 'Operation History'}
            </h2>
          </div>

          <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl">
            <button 
              onClick={() => setActiveTab('queue')}
              className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'queue' ? 'bg-tech-blue text-white shadow-lg' : 'text-coffee-light/40 hover:text-white'}`}
            >
              Queue ({requests.length})
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'history' ? 'bg-tech-purple text-white shadow-lg' : 'text-coffee-light/40 hover:text-white'}`}
            >
              History
            </button>
            <div className="w-[1px] h-4 bg-white/10 mx-2" />
            <button 
              onClick={fetchRequests}
              className="p-2 hover:bg-white/5 rounded-lg transition-all text-coffee-light/40 hover:text-white"
            >
              <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <AnimatePresence mode="popLayout">
            {activeTab === 'queue' ? (
              requests.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-20 text-coffee-light/20 gap-4"
                >
                  <Zap size={48} strokeWidth={1} />
                  <p className="font-heading text-lg font-bold italic uppercase tracking-widest">No orders in queue, Sir!</p>
                </motion.div>
              ) : (
                requests.map((order, index) => (
                  <motion.div
                    key={order.req_id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: index * 0.05 }}
                    className="group flex flex-col md:flex-row items-center justify-between p-6 bg-white/5 hover:bg-white/[0.08] border border-white/5 hover:border-tech-blue/30 rounded-2xl transition-all duration-300 gap-6"
                  >
                    <div className="flex items-center gap-6 flex-1">
                      <div className="w-16 h-16 bg-coffee-dark border border-tech-blue/20 rounded-2xl flex items-center justify-center shadow-2xl relative overflow-hidden">
                        <span className="text-2xl font-black text-tech-blue z-10">{order.wait_number}</span>
                        <div className="absolute inset-0 bg-tech-blue/5 animate-pulse" />
                      </div>
                      <div className="flex flex-col gap-1 text-left">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-tech-blue/20 text-tech-blue text-[9px] font-black rounded uppercase tracking-widest">VIP CLIENT</span>
                          <span className="text-white font-bold text-lg">#{order.receipt_last4}</span>
                        </div>
                        <span className="text-coffee-light font-black text-xs uppercase italic tracking-tighter">
                          Requesting Deep Insight: <span className="text-tech-purple">{order.tarot_card_name || "Unknown Card"}</span>
                        </span>
                        <span className="text-[11px] text-coffee-light/60 font-medium">
                          주문: {formatDate(order.created_at)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => handleAction(order.req_id, 2)}
                        className="p-4 bg-white/5 hover:bg-red-500/20 text-coffee-light/40 hover:text-red-500 rounded-2xl border border-white/5 transition-all group/btn"
                      >
                        <X size={24} />
                      </button>
                      <button 
                        onClick={() => handleAction(order.req_id, 1)}
                        className="flex items-center gap-3 px-8 py-4 bg-tech-blue hover:bg-white text-white hover:text-tech-blue font-black rounded-2xl transition-all shadow-lg hover:shadow-tech-blue/20 group/btn"
                      >
                        <Check size={24} />
                        <span className="uppercase italic tracking-tighter">Approve</span>
                      </button>
                    </div>
                  </motion.div>
                ))
              )
            ) : (
              history.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-coffee-light/20 gap-4">
                  <Clock size={48} strokeWidth={1} />
                  <p className="font-heading text-lg font-bold italic uppercase tracking-widest">No past records, Sir!</p>
                </div>
              ) : (
                history.map((order, index) => (
                  <motion.div
                    key={order.req_id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col p-6 bg-white/[0.02] border border-white/5 rounded-2xl gap-4 hover:border-tech-purple/30 transition-all shadow-xl"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${order.status === 1 ? 'bg-tech-purple/10 text-tech-purple' : 'bg-red-500/10 text-red-500'} border border-white/5 shadow-inner`}>
                          {order.status === 1 ? <Check size={24} /> : <X size={24} />}
                        </div>
                        <div className="flex flex-col text-left">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-black text-xl">#{order.receipt_last4}</span>
                            <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${order.status === 1 ? 'bg-tech-purple/20 text-tech-purple' : 'bg-red-500/20 text-red-500'}`}>
                              {order.status === 1 ? 'Approved' : 'Rejected'}
                            </div>
                          </div>
                          <span className="text-tech-purple text-xs font-black uppercase italic tracking-tighter">
                            {order.tarot_card_name || "Card Name Lost"}
                          </span>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <span className="text-[9px] text-coffee-light/20 font-mono uppercase tracking-widest">ORDER TRACKING</span>
                        <span className="text-[10px] text-white/40 font-mono italic">{order.req_id.slice(0, 8)}...</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5 bg-white/[0.01] -mx-6 px-6 -mb-6 pb-6 rounded-b-2xl">
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] text-coffee-light/40 font-black uppercase tracking-widest">주문 생성 시각</span>
                        <span className="text-[11px] text-white/80 font-medium">{formatDate(order.created_at)}</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] text-tech-purple/60 font-black uppercase tracking-widest">최종 {order.status === 1 ? '승인' : '거절'} 시각</span>
                        <span className="text-[11px] text-tech-purple font-medium">{formatDate(order.approved_at)}</span>
                      </div>
                    </div>
                  </motion.div>
                ))
              )
            )}
          </AnimatePresence>
        </div>
      </div>

      <p className="text-[9px] text-coffee-light/20 font-mono uppercase tracking-[0.3em]">
        © 2026 COFFEELIKE BACKEND SYSTEM. SECURED BY HOLOGRAPHIC BARISTA AI.
      </p>
    </div>
  );
};

export default BaristaDashboard;
