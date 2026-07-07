import React, { useState } from 'react';
import { Download, Loader2, Volume2, Square, X as CloseIcon } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import TarotCard from './TarotCard';

const TarotResultReport = ({ 
  selectedCard, 
  selectedCard2, 
  deepResult, 
  isResultCard1Flipped, 
  isResultCard2Flipped, 
  backImage,
  handleStartNew,
  isReadOnly = false,
  onClose = null
}) => {
  const [isSavingPDF, setIsSavingPDF] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // 🔊 [v3.1.0] 신탁 결과 음성 낭독 기능 (Voice Barista)
  const toggleSpeech = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const content = typeof deepResult === 'string' 
      ? deepResult 
      : (deepResult?.summary || "") + ". " + (deepResult?.deepInsight || deepResult?.interpretation || "");

    if (!content) return;

    const utterance = new SpeechSynthesisUtterance(content);
    utterance.lang = 'ko-KR';
    utterance.rate = 0.9; // 진중한 분위기를 위해 조금 천천히
    utterance.pitch = 0.8; // 중후한 바리스타 느낌

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  // 📄 [v3.0.0] 신탁 결과 PDF 저장 기능 (황금비율 & 멀티페이지 정밀 타격)
  const saveAsPDF = async () => {
    const element = document.getElementById('tarot-result-sheet');
    if (!element) return;

    try {
      setIsSavingPDF(true);
      
      const getBase64 = async (url) => {
        try {
          const res = await fetch(url, { mode: 'cors' });
          const blob = await res.blob();
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
          });
        } catch (e) {
          console.warn('Base64 conversion failed:', e);
          return url;
        }
      };

      const [img1Data, img2Data] = await Promise.all([
        selectedCard ? getBase64(selectedCard.image_url) : Promise.resolve(null),
        selectedCard2 ? getBase64(selectedCard2.image_url) : Promise.resolve(null)
      ]);

      const images = Array.from(element.querySelectorAll('img'));
      await Promise.all(images.map(img => img.complete ? Promise.resolve() : new Promise(resolve => {
        img.onload = resolve;
        img.onerror = resolve;
      })));
      await new Promise(r => setTimeout(r, 1000)); 

      const TARGET_WIDTH = 800;
      const canvas = await html2canvas(element, {
        scale: 1,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#161311',
        logging: false,
        width: TARGET_WIDTH,
        windowWidth: TARGET_WIDTH,
        onclone: (clonedDoc) => {
          clonedDoc.querySelectorAll('link, style').forEach(el => el.remove());

          const style = clonedDoc.createElement('style');
          style.innerHTML = `
            * { box-sizing: border-box !important; -webkit-print-color-adjust: exact; }
            body { background: #161311 !important; margin: 0 !important; font-family: sans-serif !important; }
            #tarot-result-sheet { 
              width: ${TARGET_WIDTH}px !important; 
              max-width: ${TARGET_WIDTH}px !important;
              margin: 0 auto !important; 
              padding: 30px 40px !important; 
              background: #161311 !important;
              color: #eae1dd !important;
              display: flex !important;
              flex-direction: column !important;
              align-items: center !important;
              gap: 30px !important;
            }
            .text-left { text-align: left !important; width: 100% !important; }
            .flex-col { display: flex !important; flex-direction: column !important; align-items: center !important; }
            .flex { display: flex !important; }
            .justify-center { justify-content: center !important; }
            .gap-4 { gap: 1rem !important; }
            .gap-30px { gap: 30px !important; }
            .w-full { width: 100% !important; }
            .text-white { color: #ffffff !important; }
            .text-tech-purple { color: #8B5CF6 !important; }
            .bg-tech-purple\\/10 { background-color: rgba(139, 92, 246, 0.1) !important; }
            .border-tech-purple { border-color: #8B5CF6 !important; }
            .border-l-4 { border-left-width: 4px !important; border-left-style: solid !important; }
            .rounded-r-2xl { border-top-right-radius: 1rem !important; border-bottom-right-radius: 1rem !important; }
            .rounded-2xl { border-radius: 1rem !important; }
            .p-4 { padding: 1rem !important; }
            .p-5 { padding: 1.25rem !important; }
            .mb-1 { margin-bottom: 0.25rem !important; }
            .mb-4 { margin-bottom: 1rem !important; }
            .mb-12 { margin-bottom: 3rem !important; }
            .font-bold { font-weight: 700 !important; }
            .font-black { font-weight: 900 !important; }
            .uppercase { text-transform: uppercase !important; }
            .tracking-widest { letter-spacing: 0.1em !important; }
            .italic { font-style: italic !important; }
            .leading-tight { line-height: 1.25 !important; }
            .leading-relaxed { line-height: 1.625 !important; }
            .break-keep { word-break: keep-all !important; }
            .bg-white\\/\\[0\\.02\\] { background-color: rgba(255, 255, 255, 0.02) !important; }
            .border-white\\/5 { border: 1px solid rgba(255, 255, 255, 0.05) !important; }
            p, h4, div { break-inside: avoid !important; }
            
            .card-container-pdf { display: flex !important; justify-content: center !important; gap: 30px !important; margin-top: 40px !important; }
            .card-wrapper-pdf { width: 220px !important; height: 374px !important; border-radius: 20px !important; border: 3px solid rgba(139, 92, 246, 0.5) !important; overflow: hidden !important; position: relative !important; }
            .card-img-pdf { width: 100% !important; height: 100% !important; object-fit: cover !important; }
          `;
          clonedDoc.head.appendChild(style);

          const clonedElement = clonedDoc.getElementById('tarot-result-sheet');
          if (clonedElement) {
             const pxPageHeight = 1131; 
             const blocks = clonedElement.querySelectorAll('.p-5, .text-left p, h4');
             
             blocks.forEach((block) => {
               const rect = block.getBoundingClientRect();
               const containerRect = clonedElement.getBoundingClientRect();
               const relativeTop = rect.top - containerRect.top;
               const relativeBottom = relativeTop + rect.height;
               
               const currentPage = Math.floor(relativeTop / pxPageHeight);
               const pageBoundary = (currentPage + 1) * pxPageHeight;
               
               if (relativeBottom > pageBoundary - 100 && relativeTop < pageBoundary) {
                 const spacerNeeded = pageBoundary - relativeTop;
                 const spacer = clonedDoc.createElement('div');
                 spacer.style.height = `${spacerNeeded}px`;
                 spacer.style.width = '100%';
                 spacer.className = 'pdf-page-spacer';
                 block.parentNode.insertBefore(spacer, block);
               }
             });

             const cardContainer = clonedElement.querySelector('.flex.justify-center.gap-4') || 
                                   clonedElement.querySelector('.animate-in.fade-in.zoom-in');
             if (cardContainer) {
               cardContainer.style.display = 'flex';
               cardContainer.style.justifyContent = 'center';
               cardContainer.style.gap = '30px'; 
               cardContainer.style.marginTop = '20px';
               
               const imageWrappers = cardContainer.querySelectorAll('div.relative');
               imageWrappers.forEach((w, idx) => {
                  w.style.width = '220px'; 
                  w.style.height = '374px';
                  w.style.borderRadius = '20px';
                  w.style.border = '3px solid rgba(139, 92, 246, 0.5)';
                  
                  const img = w.querySelector('img');
                  if (img) {
                    img.src = idx === 0 ? img1Data : img2Data;
                    img.style.width = '100%';
                    img.style.height = '100%';
                    img.style.objectFit = 'cover';
                  }
               });
             }

             const cardNamesRow = clonedElement.querySelector('.flex.items-center.gap-3.text-white\\/60');
             if (cardNamesRow) {
               cardNamesRow.style.display = 'flex';
               cardNamesRow.style.alignItems = 'center';
               cardNamesRow.style.justifyContent = 'center';
               cardNamesRow.style.gap = '20px'; 
               cardNamesRow.style.marginTop = '10px';
               cardNamesRow.style.fontSize = '20px';
               cardNamesRow.style.fontWeight = '900';
               cardNamesRow.style.color = 'rgba(255, 255, 255, 0.6)';
               
               const ampersand = cardNamesRow.querySelector('.text-tech-purple\\/60');
               if (ampersand) {
                 ampersand.style.color = '#8B5CF6';
                 ampersand.style.opacity = '0.6';
                 ampersand.style.margin = '0 5px';
                 ampersand.innerText = '&';
               }
             }

             const summaryBox = clonedElement.querySelector('.p-5.bg-tech-purple\\/10');
             if (summaryBox) {
               summaryBox.style.background = 'rgba(139, 92, 246, 0.15)';
               summaryBox.style.border = '1px solid rgba(139, 92, 246, 0.3)';
               const p = summaryBox.querySelector('p');
               if (p) {
                 p.style.fontSize = '22px';
                 p.style.lineHeight = '1.8';
                 p.style.color = '#ffffff';
                 p.style.fontWeight = '700';
               }
             }

             const paras = clonedElement.querySelectorAll('.text-left p');
             paras.forEach(p => {
               p.style.fontSize = '18px';
               p.style.lineHeight = '1.9';
               p.style.marginBottom = '20px';
               p.style.color = '#eae1dd';
             });
          }
        }
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * pageWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;

      const fillBackground = () => {
        pdf.setFillColor(22, 19, 17);
        pdf.rect(0, 0, pageWidth, pageHeight, 'F');
      };

      fillBackground();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        fillBackground();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const now = new Date();
      const filename = `COFFEELIKE_REPORT_${now.getTime().toString().slice(-6)}.pdf`;
      pdf.save(filename);
      
    } catch (error) {
      console.error('❌ PDF 저장 실패:', error);
      alert('영적 전송 실패: ' + (error.message || '알 수 없는 방해'));
    } finally {
      setIsSavingPDF(false);
    }
  };

  return (
    <main className="w-full flex-1 flex flex-col items-center justify-center gap-4 sm:gap-6 animate-in slide-in-from-bottom duration-1000 pb-10 mx-auto relative">
      {isReadOnly && onClose && (
        <button 
          onClick={onClose}
          className="absolute top-0 right-0 sm:right-4 z-50 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all shadow-xl backdrop-blur-md border border-white/10"
        >
          <CloseIcon size={24} />
        </button>
      )}

      <div className="flex flex-row gap-4 sm:gap-12 mb-12 sm:mb-20 scale-[0.9] sm:scale-105 items-start justify-center w-full max-w-full px-4">
        <div className="flex flex-col items-center gap-6">
          <span className="text-xs sm:text-xl text-white/30 font-black uppercase tracking-[0.3em]">현재 실타래</span>
          <TarotCard card={selectedCard} backImage={backImage} size="medium" isFlipped={isResultCard1Flipped} />
        </div>
        <div className="hidden lg:flex flex-col items-center justify-center pt-32">
          <div className="w-16 h-px bg-tech-purple/20 animate-pulse" />
        </div>
        <div className="flex flex-col items-center gap-6">
          <span className="text-xs sm:text-xl text-tech-purple/30 font-black uppercase tracking-[0.3em]">미래 향기</span>
          <TarotCard card={selectedCard2} backImage={backImage} size="medium" isFlipped={isResultCard2Flipped} />
        </div>
      </div>
      <div className="w-full max-w-[440px] glass-panel px-4 py-6 sm:px-6 sm:py-10 flex flex-col gap-8 shadow-2xl relative overflow-hidden text-center mx-auto">
        <div id="tarot-result-sheet" className="flex flex-col gap-6 sm:gap-10 pb-6">
          <div className="flex flex-col items-center gap-2">
            <div className="px-6 py-2 bg-tech-purple/20 border border-tech-purple/40 rounded-full text-lg text-tech-purple font-black tracking-[0.2em] uppercase">심층 조합 결과</div>
            
            {(selectedCard || selectedCard2) && (
              <div className="flex justify-center gap-4 mt-6 mb-4 sm:gap-8 sm:mt-10 sm:mb-6 animate-in fade-in zoom-in duration-1000">
                {selectedCard && (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-24 sm:w-32 aspect-[9/16] rounded-xl overflow-hidden border-2 border-tech-purple/30 shadow-2xl relative group">
                      <img 
                        src={selectedCard.image_url} 
                        alt={selectedCard.name}
                        className="w-full h-full object-cover grayscale-[0.2] hover:grayscale-0 transition-all duration-500"
                        crossOrigin="anonymous"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                    </div>
                    <span className="text-[10px] sm:text-xs text-white/40 font-black uppercase tracking-[0.3em] leading-none">Present</span>
                  </div>
                )}
                {selectedCard2 && (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-24 sm:w-32 aspect-[9/16] rounded-xl overflow-hidden border-2 border-tech-purple/30 shadow-2xl relative group">
                      <img 
                        src={selectedCard2.image_url} 
                        alt={selectedCard2.name}
                        className="w-full h-full object-cover grayscale-[0.2] hover:grayscale-0 transition-all duration-500"
                        crossOrigin="anonymous"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                    </div>
                    <span className="text-[10px] sm:text-xs text-tech-purple/50 font-black uppercase tracking-[0.3em] leading-none">Future</span>
                  </div>
                )}
              </div>
            )}

            {(selectedCard || selectedCard2) && (
              <div className="flex items-center gap-3 text-white/60 font-black tracking-tight mt-2 animate-in fade-in slide-in-from-top-4 duration-1500 fill-mode-both">
                {selectedCard && <span>{selectedCard.name.split('(')[0].trim()}</span>}
                {selectedCard && selectedCard2 && <span className="text-tech-purple/60 mx-2">&</span>}
                {selectedCard2 && <span>{selectedCard2.name.split('(')[0].trim()}</span>}
              </div>
            )}

            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tighter mt-1 hover:text-tech-purple transition-colors italic">운명의 신탁</h2>
            <div className="w-12 h-1 bg-tech-purple/40 rounded-full mt-2" />
          </div>

           <div className="text-left space-y-6 sm:space-y-8">
            {deepResult && (deepResult.mainFortune || deepResult.summary) && (
              <div className="p-5 bg-tech-purple/10 border-l-4 border-tech-purple rounded-r-2xl animate-in slide-in-from-left duration-1000">
                <h4 className="text-xs font-black text-tech-purple uppercase tracking-widest mb-1">한 줄 요약 (Oracle Summary)</h4>
                <p className="text-xl sm:text-2xl text-white font-black leading-tight italic break-keep">
                  "{deepResult.mainFortune || deepResult.summary}"
                </p>
              </div>
            )}

            <div className="prose prose-invert max-w-none">
              {(() => {
                let content = "";
                if (typeof deepResult === 'string') {
                  content = deepResult;
                } else if (deepResult && typeof deepResult === 'object') {
                  content = deepResult.deepInsight || deepResult.interpretation || "";
                }
                
                if (!content) return <p className="text-coffee-light/40 italic">신령님의 말씀이 구름에 가려졌슴다...</p>;

                return content.split('\n\n').filter(p => p.trim()).map((paragraph, idx) => (
                  <p key={idx} className="text-lg sm:text-xl text-white/90 font-bold leading-relaxed break-keep tracking-tight bg-white/[0.02] p-4 rounded-2xl border border-white/5 hover:border-tech-purple/20 transition-all">
                    {paragraph.trim()}
                  </p>
                ));
              })()}
            </div>
          </div>
        </div>

        <div className="pt-6 flex flex-col gap-4">
          <button 
            onClick={toggleSpeech}
            className={`w-full font-black py-4 rounded-2xl text-lg uppercase tracking-[0.2em] transition-all shadow-2xl active:scale-[0.98] flex items-center justify-center gap-3 border ${
              isSpeaking 
              ? 'bg-red-500/20 border-red-500/40 text-red-400' 
              : 'bg-tech-blue/20 border-tech-blue/40 text-tech-blue hover:bg-tech-blue/30'
            }`}
          >
            {isSpeaking ? <Square size={20} fill="currentColor" /> : <Volume2 size={20} />}
            {isSpeaking ? '낭독 중단 (Stop)' : '바리스타 음성으로 듣기'}
          </button>

          <button 
            onClick={saveAsPDF}
            disabled={isSavingPDF}
            className="w-full bg-tech-purple text-white font-black py-4 rounded-2xl text-lg uppercase tracking-[0.2em] hover:bg-tech-purple/80 transition-all shadow-2xl active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {isSavingPDF ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Download size={20} />
            )}
            {isSavingPDF ? 'PDF 저장 중...' : '결과 PDF 저장'}
          </button>

          {isReadOnly ? (
            <button 
              onClick={onClose} 
              className="w-full bg-white/10 text-white font-black py-4 rounded-2xl text-lg uppercase tracking-[0.2em] hover:bg-white/20 transition-all shadow-2xl active:scale-[0.98]"
            >
              닫기 (Close)
            </button>
          ) : (
            <button 
              onClick={handleStartNew} 
              className="w-full bg-white/10 text-white font-black py-4 rounded-2xl text-lg uppercase tracking-[0.2em] hover:bg-white/20 transition-all shadow-2xl active:scale-[0.98]"
            >
              새로운 상담 시작
            </button>
          )}
        </div>
        <footer className="mt-6 text-[8px] sm:text-[9px] text-coffee-light/10 font-medium uppercase tracking-[0.3em] text-center w-full">
          © 2026 COFFEELIKE. POWERED BY HOLOGRAPHIC BARISTA AI.
        </footer>
      </div>
    </main>
  );
};

export default TarotResultReport;
