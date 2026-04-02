import React, { useState } from 'react';
import { motion } from 'framer-motion';

const TarotCard = ({ card, backImage, frontImage, onFlip }) => {
  const [flipped, setFlipped] = useState(false);

  const handleFlip = () => {
    if (!flipped) {
      setFlipped(true);
      if (onFlip) onFlip();
    }
  };

  return (
    <div 
      className="perspective-1000 w-64 h-96 cursor-pointer"
      onClick={handleFlip}
    >
      <motion.div
        className="relative w-full h-full transition-all duration-700 preserve-3d"
        animate={{ rotateY: flipped ? 180 : 0 }}
      >
        {/* Front of the Card (Hidden initially) */}
        <div 
          className="absolute inset-0 w-full h-full backface-hidden flex flex-col items-center justify-between p-6 bg-coffee-dark border-2 border-tech-blue rounded-2xl shadow-2xl overflow-hidden"
          style={{ transform: 'rotateY(180deg)' }}
        >
          <div className="absolute inset-0 opacity-20 bg-cover bg-center" style={{ backgroundImage: `url(${frontImage})` }} />
          <div className="relative z-10 flex flex-col items-center gap-4 text-center">
            <h3 className="font-heading text-2xl font-bold text-tech-blue uppercase tracking-widest">{card.name}</h3>
            <div className="w-12 h-0.5 bg-tech-purple/50" />
            <p className="text-xs text-coffee-light/60 font-body uppercase tracking-tighter">
              {card.keywords.join(' • ')}
            </p>
          </div>
          
          <div className="relative z-10 bg-coffee-dark/80 p-3 rounded-xl border border-white/5 backdrop-blur-sm">
            <p className="text-sm font-body text-coffee-light italic leading-relaxed">
              "{card.fortune_telling[0]}"
            </p>
          </div>
        </div>

        {/* Back of the Card (Shown initially) */}
        <div className="absolute inset-0 w-full h-full backface-hidden bg-coffee-dark border-2 border-coffee-light/20 rounded-2xl shadow-xl flex items-center justify-center group overflow-hidden">
          <div 
            className="absolute inset-0 opacity-40 bg-cover bg-center transition-transform duration-1000 group-hover:scale-110" 
            style={{ backgroundImage: `url(${backImage})` }} 
          />
          <div className="relative z-10 w-full h-full border-8 border-coffee-dark flex items-center justify-center">
            <div className="w-16 h-16 rounded-full border border-tech-blue/30 flex items-center justify-center animate-pulse">
              <div className="w-8 h-8 rounded-full bg-tech-blue shadow-[0_0_15px_rgba(0,122,255,0.7)]" />
            </div>
          </div>
          {/* Holographic Sheen */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer-fast pointer-events-none" />
        </div>
      </motion.div>
    </div>
  );
};

export default TarotCard;
