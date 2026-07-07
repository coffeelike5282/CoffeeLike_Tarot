import React, { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, User, Coins, ArrowRight, Loader2, CheckCircle, AlertCircle, Home } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const ExchangeVerifier = ({ token }) => {
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [requestInfo, setRequestInfo] = useState(null);
  const [success, setSuccess] = useState(false);

  const fetchRequestInfo = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // 토큰으로 요청 정보 및 고객 정보 가져오기
      const { data, error: fetchError } = await supabase
        .from('tb_exchange_request')
        .select(`
          *,
          tb_customer (
            phone_number,
            tarot_coin_balance
          )
        `)
        .eq('dynamic_token', token)
        .single();

      if (fetchError || !data) throw new Error('유효하지 않거나 만료된 토큰임다!');
      
      if (data.status !== 0) {
        throw new Error('이미 처리된 환전 요청임다!');
      }

      setRequestInfo(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchRequestInfo();
    }
  }, [token, fetchRequestInfo]);

  const handleFinalizeExchange = async () => {
    try {
      setProcessing(true);
      const { error: rpcError } = await supabase.rpc('complete_exchange_request', {
        p_token: token
      });

      if (rpcError) throw rpcError;
      
      setSuccess(true);
      if ("vibrate" in navigator) navigator.vibrate([100, 50, 100]);
    } catch (err) {
      alert(err.message || '환전 처리 중 오류가 발생했슴다, 큰형님!');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-coffee-dark/40 backdrop-blur-xl rounded-3xl border border-white/10">
        <Loader2 className="w-12 h-12 text-tech-blue animate-spin mb-4" />
        <p className="text-white font-medium">환전 정보를 확인 중임다...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-coffee-dark/40 backdrop-blur-xl rounded-3xl border border-red-500/30 text-center max-w-md">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">검증 실패!</h2>
        <p className="text-red-400 mb-6">{error}</p>
        <button 
          onClick={() => window.location.href = '/'}
          className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl flex items-center gap-2 transition-all"
        >
          <Home size={18} /> 홈으로 돌아가기
        </button>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-coffee-dark/40 backdrop-blur-xl rounded-3xl border border-green-500/30 text-center max-w-md animate-in fade-in zoom-in duration-500">
        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(34,197,94,0.4)]">
          <CheckCircle className="w-12 h-12 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">환전 완료!</h2>
        <p className="text-green-400 mb-1">큰형님, 성공적으로 처리되었슴다!</p>
        <div className="mt-6 p-4 bg-white/5 rounded-2xl w-full">
            <div className="flex justify-between items-center text-sm mb-2">
                <span className="text-white/60">차감 포인트</span>
                <span className="text-white font-bold">{requestInfo?.req_points.toLocaleString()} CP</span>
            </div>
            <div className="flex justify-between items-center text-sm">
                <span className="text-white/60">완료 시각</span>
                <span className="text-white">{new Date().toLocaleTimeString()}</span>
            </div>
        </div>
        <button 
          onClick={() => window.location.href = '/'}
          className="mt-8 px-8 py-4 bg-green-600 hover:bg-green-500 text-white font-bold rounded-2xl shadow-lg transition-all w-full"
        >
          확인 완료
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md bg-coffee-dark/40 backdrop-blur-xl rounded-3xl border border-white/20 p-6 shadow-2xl relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-tech-blue/10 rounded-full blur-3xl opacity-50" />
      
      <div className="flex flex-col items-center mb-8 relative z-10">
        <div className="w-16 h-16 bg-tech-blue/20 rounded-2xl flex items-center justify-center mb-4 border border-tech-blue/30 shadow-lg">
          <ShieldCheck className="w-10 h-10 text-tech-blue" />
        </div>
        <h2 className="text-2xl font-bold text-white">환전 요청 검증</h2>
        <p className="text-white/60 text-sm">스캔된 정보를 확인 후 승인해 주십쇼.</p>
      </div>

      <div className="space-y-4 mb-8 relative z-10">
        {/* Customer Box */}
        <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex items-center gap-4">
          <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-white/70" />
          </div>
          <div>
            <p className="text-white/40 text-xs font-bold uppercase tracking-wider">고객 번호</p>
            <p className="text-white font-medium">{requestInfo?.tb_customer?.phone_number}</p>
          </div>
        </div>

        {/* Info Cards Row */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
            <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-1">현재 잔액</p>
            <p className="text-tech-purple font-bold">{requestInfo?.tb_customer?.tarot_coin_balance.toLocaleString()} CP</p>
          </div>
          <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
            <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-1">요청 포인트</p>
            <p className="text-tech-blue font-bold tracking-tight">{requestInfo?.req_points.toLocaleString()} CP</p>
          </div>
        </div>

        <div className="p-4 bg-tech-blue/5 border border-tech-blue/20 rounded-2xl flex flex-col items-center gap-2">
            <p className="text-tech-blue/80 text-xs font-bold uppercase tracking-widest">환전 후 예상 잔액</p>
            <div className="flex items-center gap-3">
                <span className="text-white/60 line-through text-sm">{requestInfo?.tb_customer?.tarot_coin_balance.toLocaleString()}</span>
                <ArrowRight size={14} className="text-tech-blue" />
                <span className="text-xl font-bold text-white">
                    {(requestInfo?.tb_customer?.tarot_coin_balance - requestInfo?.req_points).toLocaleString()} CP
                </span>
            </div>
        </div>
      </div>

      <button
        onClick={handleFinalizeExchange}
        disabled={processing}
        className={`w-full py-5 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-xl
          ${processing 
            ? 'bg-gray-600 cursor-not-allowed opacity-50' 
            : 'bg-tech-blue hover:bg-blue-400 text-coffee-dark hover:scale-[1.02] active:scale-95'
          }`}
      >
        {processing ? (
          <>
            <Loader2 className="w-6 h-6 animate-spin" />
            처리 중임다...
          </>
        ) : (
          <>
            <Coins className="w-6 h-6" />
            환전 최종 승인
          </>
        )}
      </button>

      <button 
        onClick={() => window.location.href = '/'}
        className="w-full mt-4 py-3 text-white/40 hover:text-white/70 text-sm font-medium transition-all"
      >
        취소하고 돌아가기
      </button>
    </div>
  );
};

export default ExchangeVerifier;
