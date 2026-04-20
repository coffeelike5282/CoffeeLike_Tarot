import React, { useState, useEffect, useCallback } from 'react';
import { QrCode, Download, Plus, Search, RefreshCcw, CheckCircle2, CircleChar, AlertCircle, X, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const QRManager = () => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [genCount, setGenCount] = useState(50);
  const [isGenerating, setIsGenerating] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all', 'unused', 'used'
  const [selectedSerial, setSelectedSerial] = useState(null); // QR 프리뷰용

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('tb_delivery_qr')
      .select(`
        *,
        customer:tb_customer(phone_number)
      `)
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

    // 엑셀 한글 깨짐 방지를 위한 BOM (Byte Order Mark) 추가
    const BOM = '\uFEFF';
    const headers = ['시리얼 번호', '상태', '사용자 휴대폰', '사용 일시', '생성 일시'];
    const rows = coupons.map(c => [
      c.qr_serial, 
      c.status === 0 ? '미사용' : '사용완료', 
      c.customer?.phone_number || '-',
      c.used_at ? new Date(c.used_at).toLocaleString('ko-KR') : '-',
      new Date(c.created_at).toLocaleString('ko-KR')
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(',')).join('\n');
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `CFLK_QR_List_${new Date().getTime()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // QR 코드 URL 생성 (배달 QR 연동용)
  const getQRImageUrl = (serial) => {
    const baseUrl = window.location.origin;
    const fullUrl = `${baseUrl}/?code=${serial}`;
    return `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(fullUrl)}&size=300x300&bgcolor=ffffff`;
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
        <div className="relative overflow-x-auto rounded-xl border border-white/5 bg-black/20">
          <table className="w-full text-left text-[11px] border-collapse min-w-max">
            <thead className="bg-white/5 uppercase tracking-widest font-black text-white/30 text-[9px]">
              <tr>
                <th className="px-6 py-4 whitespace-nowrap">Serial Number</th>
                <th className="px-6 py-4 whitespace-nowrap">Status</th>
                <th className="px-6 py-4 whitespace-nowrap">Used By (Phone)</th>
                <th className="px-6 py-4 whitespace-nowrap">Used At</th>
                <th className="px-6 py-4 whitespace-nowrap">Created At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {coupons.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-20 text-center text-white/10 italic font-black uppercase tracking-[0.2em]">
                    {loading ? '데이터 동기화 중...' : '데이터가 없슴다'}
                  </td>
                </tr>
              ) : (
                coupons.map((c) => (
                  <React.Fragment key={c.qr_serial}>
                    {/* 🖼 QR Preview Inline (Appears ABOVE the row) */}
                    {selectedSerial === c.qr_serial && (
                      <tr className="bg-tech-blue/10 border-b border-tech-blue/20 animate-in slide-in-from-top-4 duration-500">
                        <td colSpan="5" className="px-6 py-10 text-left">
                          <div className="flex flex-col sm:flex-row items-start justify-start gap-8 sm:gap-12 max-w-full overflow-hidden ml-4">
                            <div className="relative p-2 bg-white rounded-xl shadow-[0_0_40px_rgba(33,150,243,0.3)] shrink-0">
                              <img 
                                src={getQRImageUrl(c.qr_serial)} 
                                alt="QR" 
                                className="w-28 h-28 sm:w-32 sm:h-32" 
                              />
                            </div>
                            <div className="flex flex-col gap-2 text-left">
                              <div className="flex items-center justify-start gap-2">
                                <QrCode size={14} className="text-tech-blue" />
                                <span className="text-[10px] text-tech-blue font-black uppercase tracking-widest italic">Live QR Preview</span>
                              </div>
                              <h4 className="text-lg font-black text-white font-mono tracking-tighter">{c.qr_serial}</h4>
                              <p className="text-[10px] text-coffee-light/40 font-bold uppercase tracking-tight leading-relaxed max-w-[240px]">
                                스캔 시 자동으로 코인이 적립되는<br/>
                                배달 봉투 전용 QR 코드임다!
                              </p>
                              <button 
                                onClick={() => setSelectedSerial(null)}
                                className="mt-2 text-[9px] text-white/40 hover:text-white uppercase tracking-widest font-black transition-colors w-fit underline decoration-white/10"
                              >
                                [ Close Preview ]
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}

                    <tr className={`transition-colors group ${selectedSerial === c.qr_serial ? 'bg-tech-blue/5' : 'hover:bg-white/[0.02]'}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button 
                          onClick={() => setSelectedSerial(selectedSerial === c.qr_serial ? null : c.qr_serial)}
                          className="flex items-center gap-2 group/btn"
                        >
                          <span className={`font-mono font-black transition-colors underline decoration-white/10 underline-offset-4 group-hover/btn:decoration-tech-blue/40 ${selectedSerial === c.qr_serial ? 'text-tech-blue' : 'text-white group-hover:text-tech-blue'}`}>
                            {c.qr_serial}
                          </span>
                          <ExternalLink size={12} className={`transition-all ${selectedSerial === c.qr_serial ? 'opacity-100 text-tech-blue rotate-45' : 'opacity-0 group-hover/btn:opacity-100 text-tech-blue'}`} />
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
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
                      <td className="px-6 py-4 font-mono whitespace-nowrap">
                        {c.customer?.phone_number ? (
                          <span className="text-white font-black">{c.customer.phone_number}</span>
                        ) : (
                          <span className="text-white/10 italic">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-mono whitespace-nowrap">
                        {c.used_at ? (
                          <span className="text-tech-blue/80 font-black">{new Date(c.used_at).toLocaleString('ko-KR')}</span>
                        ) : (
                          <span className="text-white/10 italic">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-white/20 font-mono italic whitespace-nowrap">
                        {new Date(c.created_at).toLocaleString('ko-KR')}
                      </td>
                    </tr>
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        <p className="text-[9px] text-white/10 text-right italic font-black uppercase tracking-widest">
           * 시리얼 번호를 클릭하면 QR 코드가 해당 행 바로 위에 시원하게 노출됨다.
        </p>
      </div>

      {/* 모달은 이제 안녕임다! 중앙 모달 제거 완료 */}
    </div>
  );
};

export default QRManager;
