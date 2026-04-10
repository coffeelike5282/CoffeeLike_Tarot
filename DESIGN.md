# 🎨 COFFEELIKE TAROT: 디자인 시스템 가이드 (DESIGN.md)

큰형님, 이 구역의 디자인 기강을 확실히 잡고 가는 **안 본부장**의 특급 지시서입니다. 
단순한 앱이 아니라, 하나의 '브랜드'로서 커피라이크 타로의 아우라를 유지하기 위한 핵심 토큰들을 정리했슴다!

---

## 🌘 Visual Concept: "Mystic Coffee & Cyber Tarot"

전통적인 타로의 신비로움과 현대적인 커피바의 세련미, 그리고 미래 지향적인 테크 감성을 한 그릇에 담았습니다.

### 🎨 Color Palette (핵심 색상)

| 용도 | 색상 코드 | 이름 | 설명 |
| :--- | :--- | :--- | :--- |
| **Background** | `#161311` | **Deep Espresso** | 깊게 로스팅된 원두의 어두운 갈색. 눈의 피로를 줄이고 신비감을 조성. |
| **Primary** | `#eae1dd` | **Foam White** | 라떼 거품처럼 부드러운 화이트. 텍스트 시독성 확보. |
| **Accent 1** | `#8B5CF6` | **Tech Violet** | 신비로운 보랏빛 네온. 영적인 통찰과 AI 기술의 결합을 상징. |
| **Accent 2** | `#3B82F6` | **Electric Blue** | 차갑고 냉철한 블루. 상담의 신뢰도와 전문성 강조. |
| **Border** | `rgba(234, 225, 221, 0.1)` | **Mist Grey** | 보일 듯 말 듯한 경계선. 글래스모피즘(Glassmorphism) 효과의 핵심. |

---

## 📄 PDF Export Standard: "Slim Pillar" Layout

그동안 우리를 괴롭혔던 PDF 가로 늘어짐 현상을 **안 본부장**이 '슬림 필러(Slim Pillar)' 공법으로 해결해버렸슴다! 

- **Target Width**: `420px` (강제 클로닝 가로폭)
- **Grid Strategy**: 
    - **Header/Cards**: 정밀한 `Center` 정렬로 무게중심 확보.
    - **Body Text**: 가독성을 위해 `Left` 정렬. (긴 문장은 왼쪽이 국룰!)
- **Image Treatment**: 카드 이미지는 Base64로 미리 구워서(Pre-bake) 네트워크 누락을 원천 차단.
- **Color Correction**: PDF 렌더링 엔진에서 지원하지 않는 `oklch/oklab` 컬러는 자동으로 고전적인 `HEX`로 치환하여 집행.

---

## 🖋️ Typography (글꼴 정책)

- **Heading**: **Pretendard Bold** (또는 Inter). 묵직하고 강렬한 인상.
- **Body**: **Pretendard Regular**. 장문의 해설도 막힘없이 읽히는 시독성.
- **Point**: 숫자는 **Mono** 계열을 사용하여 데이터의 정확성 강조.

---

## ✨ Micro-Animations (상호작용)

1. **Card Orbit**: 선택된 카드는 은은하게 발광(`glow-coffee`)하며 숨을 쉬듯이 움직임.
2. **Flash Entry**: 결과 페이지 진입 시 강력한 화이트 플래시 효과로 '운명의 순간'을 연출.
3. **Ghost Scroll**: 바리스타 히스토리 이동 시 부드러운 트랜지션 적용.

---

> "큰형님, 이 가이드만 있으면 담남 바닥 어떤 디자인도 명함을 못 내밉니다. 기분 째지게 작업하십시오!"
