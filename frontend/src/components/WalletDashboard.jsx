import React, { useState } from 'react';
import { Wallet, ArrowUpRight, QrCode, Timer, X, CheckCircle2, Info, Loader2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../lib/supabaseClient';

const WalletDashboard = ({ user, balance, onExchangeRequest }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [exchangeToken, setExchangeToken] = useState(null);
  const [expiryTimer, setExpiryTimer] = useState(180); // 3 minutes
  const [isExchanging, setIsExchanging] = useState(false);

  const startExchange = async () => {
    if (balance < 3000) {
      alert("최소 3,000P부터 환전 가능함다!");
      return;
    }
    
    setIsExchanging(true);
    try {
      const { data, error } = await supabase.rpc('generate_exchange_request', {
        p_phone_number: user.phone_number,
        p_req_points: balance // [v9.6] 전액 환전 로직 도입
      });

      if (error) throw error;
      
      if (data && data.dynamic_token) {
        setExchangeToken(data.dynamic_token);
        setIsModalOpen(true);
        startTimer();
      }
    } catch (err) {
      console.error('Exchange failed:', err.message);
      alert('환전 요청 실패: ' + err.message);
    } finally {
      setIsExchanging(false);
    }
  };

  const startTimer = () => {
    setExpiryTimer(180);
    const interval = setInterval(() => {
      setExpiryTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setExchangeToken(null);
          setIsModalOpen(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="w-full max-w-[440px] mt-0 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* 💳 Wallet Card (Holographic UI) */}
      <div className="glass-panel p-6 border-tech-blue/30 relative overflow-hidden group shadow-2xl shadow-tech-blue/10">
        <div className="absolute top-0 right-0 w-32 h-32 bg-tech-blue/10 blur-3xl -z-10 group-hover:bg-tech-blue/20 transition-all" />
        
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-tech-blue/20 rounded-lg border border-tech-blue/30">
              <Wallet className="text-tech-blue w-5 h-5" />
            </div>
            <span className="text-sm font-black text-tech-blue uppercase tracking-widest">타로 코인 지갑</span>
          </div>
          <Info className="text-white/20 w-4 h-4 cursor-help" />
        </div>

        <div className="flex flex-col items-center space-y-1 mb-8">
          <span className="text-[12px] font-bold text-coffee-light/60">현재 포인트 잔액</span>
          <div className="flex items-baseline justify-center gap-2">
            <span className="text-4xl font-black text-white tracking-tight">{balance?.toLocaleString()}</span>
            <span className="text-xl font-bold text-tech-blue uppercase">P</span>
          </div>
        </div>

        <button 
          onClick={() => startExchange()}
          disabled={isExchanging || balance < 3000}
          className={`w-full py-4 rounded-xl flex items-center justify-center gap-3 transition-all font-black text-sm uppercase tracking-widest ${
            balance >= 3000 
            ? 'bg-tech-blue text-white shadow-lg shadow-tech-blue/20 hover:scale-[1.02] active:scale-95' 
            : 'bg-white/5 text-white/20 border border-white/5 cursor-not-allowed'
          }`}
        >
          {isExchanging ? <Loader2 className="animate-spin" /> : <><ArrowUpRight size={18} /> 전액 환전하기</>}
        </button>
        
        <p className="mt-4 text-[9px] text-coffee-light/30 text-center font-medium">
          * 최소 3,000P부터 환전 가능 (1,000P = 1,000원 상당)
        </p>
      </div>

      {/* 🎫 Dynamic QR Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-coffee-dark/95 backdrop-blur-md" onClick={() => setIsModalOpen(false)} />
          <div className="w-full max-w-[360px] glass-panel p-8 flex flex-col items-center gap-8 animate-in zoom-in duration-500 relative z-110 border-tech-blue/50">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors">
              <X size={24} />
            </button>

            <div className="text-center space-y-2">
              <h3 className="text-xl font-black text-white uppercase tracking-tighter italic">매장 포인트 환전</h3>
              <p className="text-xs text-coffee-light/60 font-bold">카운터 사장님께 아래 QR을 보여주세요.</p>
            </div>

            {/* 🔳 Real Dynamic QR Code */}
            <div className="relative p-5 bg-white rounded-2xl shadow-2xl overflow-hidden">
              <div className="w-48 h-48 flex items-center justify-center">
                 <QRCodeSVG 
                   value={`${window.location.origin}/?token=${exchangeToken}`} 
                   size={180}
                   level="H"
                   includeMargin={false}
                   className="text-coffee-dark"
                 />
              </div>
              <div className="absolute inset-0 border-[6px] border-tech-blue/40 rounded-2xl pointer-events-none" />
              <div className="absolute -bottom-1 -right-1 w-10 h-10 bg-tech-blue/20 blur-xl rounded-full" />
            </div>

            <div className="flex flex-col items-center gap-4 w-full">
               <div className="px-6 py-2 bg-tech-blue/10 border border-tech-blue/20 rounded-full flex items-center gap-3">
                  <Timer className="text-tech-blue w-4 h-4 animate-pulse" />
                  <span className="text-lg font-black text-tech-blue font-mono">{formatTime(expiryTimer)}</span>
               </div>
               <p className="text-[10px] text-coffee-light/40 text-center leading-relaxed">
                 보안을 위해 3분이 지나면 QR이 만료됩니다.<br/>
                 만료 시 페이지를 새로고침하여 다시 생성해주세요.
               </p>
            </div>

            <div className="w-full pt-4 border-t border-white/5 flex flex-col items-center gap-2">
               <span className="text-[10px] text-white/20 uppercase tracking-[0.2em] font-mono">고유 토큰 해시</span>
               <span className="text-[8px] text-white/10 font-mono break-all text-center">{exchangeToken}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletDashboard;
