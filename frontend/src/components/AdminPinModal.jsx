import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const AdminPinModal = ({ isOpen, onClose, onSuccess, adminPhone }) => {
  const [pin, setPin] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // 모달이 열릴 때 첫 번째 입력창에 자동 포커스
  React.useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        document.getElementById('pin-0')?.focus();
      }, 100);
    }
  }, [isOpen]);

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newPin = [...pin];
    newPin[index] = value.slice(-1);
    setPin(newPin);

    // 자동 다음 칸 이동
    if (value && index < 3) {
      document.getElementById(`pin-${index + 1}`).focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      document.getElementById(`pin-${index - 1}`).focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fullPin = pin.join('');
    if (fullPin.length !== 4) {
      setError('PIN 번호 4자리를 모두 입력해주세요.');
      return;
    }

    setIsVerifying(true);
    setError('');

    try {
      const { data, error: rpcError } = await supabase.rpc('check_admin_auth', {
        p_phone: adminPhone,
        p_pin: fullPin
      });

      if (rpcError) throw rpcError;

      if (data === true) {
        onSuccess();
        onClose();
      } else {
        setError('PIN 번호가 일치하지 않슴다! 다시 확인해주십쇼!');
        setPin(['', '', '', '']);
        document.getElementById('pin-0').focus();
      }
    } catch (err) {
      console.error('PIN Verification Error:', err.message);
      setError('인증 중 서버 오류가 발생했슴다. 잠시 후 다시 시도해주십쇼.');
    } finally {
      setIsVerifying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm overflow-hidden rounded-3xl bg-white/10 border border-white/20 shadow-2xl backdrop-blur-md">
        <div className="p-8 text-center">
          <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/20 text-amber-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          
          <h2 className="mb-2 text-2xl font-bold text-white">바리스타 인증</h2>
          <p className="mb-8 text-sm text-gray-400">비밀 PIN 번호 4자리를 입력해주십쇼.</p>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex justify-center gap-3">
              {pin.map((digit, idx) => (
                <input
                  key={idx}
                  id={`pin-${idx}`}
                  type="password"
                  inputMode="numeric"
                  pattern="\d*"
                  value={digit}
                  onChange={(e) => handleChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  className="h-14 w-12 rounded-xl border border-white/20 bg-white/5 text-center text-2xl font-bold text-white shadow-inner focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all"
                  maxLength={1}
                  required
                />
              ))}
            </div>

            {error && (
              <p className="text-sm font-medium text-red-400 animate-pulse">{error}</p>
            )}

            <div className="flex flex-col gap-3">
              <button
                type="submit"
                disabled={isVerifying}
                className="w-full rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 py-4 font-bold text-white shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              >
                {isVerifying ? '검증 중...' : '바리스타 입장'}
              </button>
              
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-2xl bg-white/5 py-4 font-medium text-gray-300 transition-all hover:bg-white/10"
              >
                취소
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminPinModal;
