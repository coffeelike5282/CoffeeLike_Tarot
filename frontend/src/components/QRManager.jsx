import React, { useState, useEffect, useCallback } from 'react';
import { QrCode, Download, Plus, Search, RefreshCcw, CheckCircle2, CircleChar, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const QRManager = () => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [genCount, setGenCount] = useState(50);
  const [isGenerating, setIsGenerating] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all', 'unused', 'used'

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('tb_delivery_qr')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (filter === 'unused') query = query.eq('status', 0);
    if (filter === 'used') query = query.eq('status', 1);

    const { data, error } = await query;
    if (!error) setCoupons(data || []);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  const handleGenerate = async () => {
    if (genCount <= 0 || genCount > 500) {
      alert('1회 생성 수량은 1~500개 사이여야 함다!');
      return;
    }

    if (!confirm(`${genCount}개의 쿠폰을 화끈하게 생성하시겠슴까?`)) return;

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.rpc('generate_bulk_qr_coupons', {
        p_count: genCount
      });

      if (error) throw error;
      
      alert(data.message);
      fetchCoupons();
    } catch (err) {
      console.error('Generation failed:', err.message);
      alert('생성 실패: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadCSV = () => {
    if (coupons.length === 0) return;

    const headers = ['Serial Number', 'Status', 'Generated At'];
    const rows = coupons.map(c => [
      c.qr_serial, 
      c.status === 0 ? 'Unused' : 'Used', 
      new Date(c.created_at).toLocaleString()
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `CFLK_Coupons_${new Date().getTime()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* 🛠 Generation Controls */}
      <div className="glass-panel p-6 border-tech-blue/30 bg-tech-blue/5">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-tech-blue/10 rounded-xl border border-tech-blue/20">
              <Plus className="text-tech-blue w-6 h-6" />
            </div>
            <div className="text-left">
              <h3 className="text-lg font-black text-white italic uppercase tracking-tight">Bulk Coupon Generator</h3>
              <p className="text-[10px] text-coffee-light/40 font-bold uppercase tracking-widest">배달 봉투용 1회용 QR 시리얼 생성</p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-32">
              <input 
                type="number" 
                value={genCount}
                onChange={(e) => setGenCount(parseInt(e.target.value) || 0)}
                placeholder="수량"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white font-black text-center focus:outline-none focus:border-tech-blue transition-all"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-white/20 font-black uppercase tracking-widest pointer-events-none">EA</span>
            </div>
            <button 
              onClick={handleGenerate}
              disabled={isGenerating}
              className="flex-1 sm:flex-none px-6 py-3 bg-tech-blue hover:bg-white text-white hover:text-tech-blue font-black rounded-xl transition-all shadow-lg shadow-tech-blue/20 flex items-center justify-center gap-2 whitespace-nowrap"
            >
              {isGenerating ? <RefreshCcw size={16} className="animate-spin" /> : <QrCode size={16} />}
              <span className="text-[11px] uppercase tracking-tighter italic">Generate Bulk</span>
            </button>
          </div>
        </div>
      </div>

      {/* 📊 List & Filters */}
      <div className="glass-panel p-6 border-white/5 bg-black/20 flex flex-col gap-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl w-full md:w-auto">
            {['all', 'unused', 'used'].map((f) => (
              <button 
                key={f}
                onClick={() => setFilter(f)}
                className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${filter === f ? 'bg-white/10 text-white shadow-lg' : 'text-white/20 hover:text-white'}`}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <button 
              onClick={fetchCoupons}
              className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white/40 hover:text-white transition-all"
            >
              <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
            <button 
              onClick={downloadCSV}
              disabled={coupons.length === 0}
              className="flex-1 md:flex-none px-5 py-3 bg-white/5 hover:bg-white/20 border border-white/10 rounded-xl text-white font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all disabled:opacity-20"
            >
              <Download size={14} />
              CSV Export
            </button>
          </div>
        </div>

        {/* 📜 Scrollable Table Area */}
        <div className="relative overflow-x-auto rounded-xl border border-white/5">
          <table className="w-full text-left text-[11px] border-collapse">
            <thead className="bg-white/5 uppercase tracking-widest font-black text-white/30 text-[9px]">
              <tr>
                <th className="px-6 py-4">Serial Number</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Created At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {coupons.length === 0 ? (
                <tr>
                  <td colSpan="3" className="px-6 py-20 text-center text-white/10 italic font-black uppercase tracking-[0.2em]">
                    {loading ? '데이터 동기화 중...' : '데이터가 없슴다'}
                  </td>
                </tr>
              ) : (
                coupons.map((c) => (
                  <tr key={c.qr_serial} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-4">
                      <span className="font-mono font-black text-white group-hover:text-tech-blue transition-colors">{c.qr_serial}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {c.status === 0 ? (
                          <>
                            <div className="w-1.5 h-1.5 rounded-full bg-tech-blue animate-pulse" />
                            <span className="text-tech-blue/60 font-black uppercase text-[9px]">Unused</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 size={12} className="text-white/20" />
                            <span className="text-white/20 font-black uppercase text-[9px]">Used</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-white/40 font-mono">
                      {new Date(c.created_at).toLocaleString('ko-KR')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        <p className="text-[9px] text-white/10 text-right italic font-black uppercase tracking-widest">
           * 최근 생성된 {coupons.length}개의 데이터가 노출됨다.
        </p>
      </div>
    </div>
  );
};

export default QRManager;
