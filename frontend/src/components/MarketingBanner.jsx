import React from 'react';

const MarketingBanner = () => {
  const [currentSlide, setCurrentSlide] = React.useState(0);
  const banners = [
    { title: "🎁 타로 코인 적립", text: "타로를 볼 때마다\n1,000포인트를 적립해 드립니다.", color: "text-tech-blue" },
    { title: "🎉 포인트 환전", text: "3,000포인트부터 매장에서\n사용 가능한 포인트로 환전하세요.", color: "text-tech-purple" },
    { title: "🛵 배달 QR 혜택", text: "배달 봉투의 1회용 QR로\n매일 행운을 적립하세요.", color: "text-white" }
  ];

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % banners.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center animate-in slide-in-from-bottom-2 duration-700 w-full min-h-[50px] select-none cursor-default">
      <span className={`text-[10px] font-black uppercase tracking-widest ${banners[currentSlide].color} mb-1`}>
        {banners[currentSlide].title}
      </span>
      <span className="text-[12px] font-bold text-white/90 whitespace-pre-line text-center leading-tight px-2">
        {banners[currentSlide].text}
      </span>
    </div>
  );
};

export default MarketingBanner;
