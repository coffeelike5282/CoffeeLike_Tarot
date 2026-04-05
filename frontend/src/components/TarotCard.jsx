import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const TarotCard = ({ card, backImage, frontImage, onFlip, size = 'default', isFlipped = false }) => {
  const [flipped, setFlipped] = useState(isFlipped);
  
  useEffect(() => {
    if (isFlipped && !flipped) {
      setFlipped(true);
      playFlipSound();
    } else if (!isFlipped && flipped) {
      setFlipped(false);
    }
  }, [isFlipped]);

  const playFlipSound = () => {
    try {
      const audio = new Audio('/assets/sfx/card_flip.mp3');
      audio.volume = 0.4; // 너무 크지 않게 40% 볼륨
      audio.play().catch(e => console.warn('Audio play failed (waiting for user interaction):', e));
    } catch (err) {
      console.error('SFX playback error:', err);
    }
  };
  
  const sizeClasses = {
    small: 'w-32 sm:w-40',
    medium: 'w-44 sm:w-52',
    default: 'w-64'
  };

  const handleFlip = () => {
    if (!flipped) {
      setFlipped(true);
      playFlipSound();
      if (onFlip) onFlip();
    }
  };

  return (
    <div 
      className={`perspective-1000 ${sizeClasses[size]} aspect-[9/16] cursor-pointer group`}
      onClick={handleFlip}
    >
      <motion.div
        className="relative w-full h-full transition-all duration-700 preserve-3d"
        animate={{ rotateY: flipped ? 180 : 0 }}
      >
        {/* Front of the Card (Hidden initially) */}
        <div 
          className="absolute inset-0 w-full h-full backface-hidden flex flex-col items-center justify-between p-4 bg-coffee-dark border-2 border-tech-blue rounded-2xl shadow-2xl overflow-hidden"
          style={{ transform: 'rotateY(180deg)' }}
        >
          {/* Card Illustration Background */}
          <div 
            className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110" 
            style={{ backgroundImage: `url(${card.image_url})` }} 
          />
          
          {/* Overlay for readability - Adjusted for cleaner look */}
          <div className="absolute inset-0 bg-gradient-to-t from-coffee-dark/80 via-transparent to-coffee-dark/20 opacity-40" />

          {/* Premium holographic effect on front too */}
          <div className="absolute inset-0 bg-gradient-to-tr from-white/5 via-transparent to-white/5 opacity-30 pointer-events-none" />
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
