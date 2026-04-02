과거 ASP 웹 개발부터 SQL 데이터베이스 모델링, 그리고 앱/웹 기획 PM(프로젝트 매니저)까지 두루 경험하신 대표님의 전문성 1을 100% 반영하여, 백엔드 개발자가 즉시 이해하고 작업에 착수할 수 있도록 작성된 \*\*백엔드 개발 및 DB 설계 세부 계획서\*\*입니다.  
이 계획서는 앞서 기획한 \*\*'3,000P 허들 기반의 수동 결제(POS) 및 관리자 승인 로직'\*\*을 소프트웨어 구조로 완벽하게 구현하는 데 초점을 맞췄습니다.

# ⚙️ 백엔드 & DB 세부 개발 계획서 커피라이크 AI 시크릿 타로

## 1\. 프로젝트 개요 및 개발 환경 (Architecture)

* **목적:** 오프라인 매장(커피라이크) 방문 고객 대상 AI 타로 웹서비스 제공 및 수동 결제(관리자 승인) 시스템 구축 2\.  
* **권장 기술 스택 (Backend):**  
* **Language & Framework:** Node.js (Express) 또는 Python (FastAPI). *(※ 대표님의 과거 ASP 경험 1을 고려할 때, 직관적인 라우팅이 가능한 최신 프레임워크를 권장합니다.)*  
* **Database:** MySQL 또는 PostgreSQL (관계형 데이터베이스 구조).  
* **External API:** OpenAI API (ChatGPT 4o-mini 또는 Claude 3 Haiku) \- 빠르고 저렴한 텍스트 생성용 3\.  
* **서버 인프라:** AWS EC2 (Free Tier) 또는 Vercel/Heroku \+ 로컬 DB(RDS) (초기 비용 최소화 세팅).

## 2\. 데이터베이스(SQL) 설계 계획 (ERD 및 테이블 명세)

복잡한 외부 결제 API나 POS 직접 연동 없이, 대표님이 카운터에서 확인 후 승인하는 '아날로그+디지털 하이브리드' 방식에 맞춘 심플한 구조입니다 1\.

### Table 1: TB\_Customer (고객 및 포인트 임시 관리용)

*(※ 1인 매장의 한계상 POS기와 실시간 포인트 연동이 불가능하므로, 고객이 전화번호를 입력할 때 세션을 유지하기 위한 기본 테이블입니다.)*

* Cust\_ID (INT, PK, Auto Increment): 고객 고유 번호  
* Phone\_Last4 (VARCHAR(4), Index): 전화번호 뒤 4자리 (접속 인증 키)  
* Visit\_Count (INT, Default 1): 누적 방문(접속) 횟수  
* Last\_Visit\_Date (DATETIME): 최근 접속일

### Table 2: TB\_Tarot\_Request (핵심: 타로 요청 및 승인 로그)

* Req\_ID (VARCHAR(20), PK): 요청 고유 번호 (예: REQ-240402-A12)  
* Phone\_Last4 (VARCHAR(4), FK): 요청한 고객 전화번호 뒤 4자리  
* Payment\_Type (INT): 사용자가 선택한 결제 방식 (1: 2000P 포인트 차감, 2: 3000원 일반 결제)  
* Status (INT): 처리 상태 (0: 대기중, 1: 관리자 승인 완료, 9: 취소/시간초과)  
* Wait\_Number (VARCHAR(5)): 화면에 띄워줄 대기 번호 (예: A-12)  
* AI\_Tarot\_Result (TEXT, Nullable): AI가 생성한 심층 타로 결과 텍스트 (승인 전까지는 Null)  
* Created\_At (DATETIME): 요청 생성(대기 시작) 시간  
* Approved\_At (DATETIME, Nullable): 관리자 승인 시간

## 3\. REST API 명세서 (백엔드 ↔ 프론트엔드 통신)

### API 1\. 사용자 로그인 및 세션 생성 (무료 운세 제공)

1. **Endpoint:** POST /api/v1/auth/login  
2. **Request (Body):** { "phone\_last4": "1234" }  
3. **Backend Logic:**  
4. TB\_Customer 테이블에서 해당 번호 조회 (없으면 신규 생성).  
5. 가벼운 '오늘의 무료 운세' 텍스트를 정적 배열이나 가벼운 로직으로 즉시 반환 (OpenAI 비용 절감).  
6. **Response:** { "status": "success", "free\_fortune": "오늘은 뜻밖의 행운이...", "token": "jwt\_or\_session\_string" }

### API 2\. 심층 타로 결제 요청 (대기열 등록)

1. **Endpoint:** POST /api/v1/tarot/request  
2. **Request (Body):** { "phone\_last4": "1234", "payment\_type": 1 } // 1: 포인트결제, 2: 카드결제  
3. **Backend Logic:**  
4. TB\_Tarot\_Request에 신규 Row 생성 (Status \= 0).  
5. 직관적인 Wait\_Number (예: A-12) 생성 후 저장.  
6. **Response:** { "status": "pending", "req\_id": "REQ-240402-A12", "wait\_number": "A-12" }

### API 3\. 클라이언트 상태 확인 (Polling \- 3초 주기)

* **Endpoint:** GET /api/v1/tarot/status/{req\_id}  
* **Backend Logic:** TB\_Tarot\_Request의 Status 값만 가볍게 조회하여 반환.  
* **Response:** { "status": 0 } (대기중) 또는 { "status": 1 } (승인완료)

## 4\. 관리자(사장님) 기능 API 및 AI 연동 로직 (핵심)

이 부분은 과거 개발/경영 관리자로 일하셨던 대표님이 직접 카운터에서 조작할 백엔드 관리자 페이지용 통신 로직입니다 1\.

### API 4\. 대기열 조회 (관리자 대시보드용)

* **Endpoint:** GET /api/v1/admin/requests/pending  
* **Backend Logic:** Status \= 0 (대기중)이고 당일 생성된 TB\_Tarot\_Request 목록을 생성 시간순으로 가져옴.

### API 5\. 관리자 승인 및 AI 타로 생성 (Trigger)

* **Endpoint:** POST /api/v1/admin/approve/{req\_id}  
* **Backend Logic (매우 중요 \- 동기/비동기 처리):**  
* 사장님이 포스기(POS)에서 손님의 포인트를 수동 차감(또는 3,000원 카드 결제)한 후, 관리자 웹화면에서 승인 버튼을 누릅니다 2\.  
* 백엔드는 즉시 **OpenAI (ChatGPT) API**를 호출합니다 3\.  
* *System Prompt 예시:* "너는 신비로운 타로 마스터야. 카페에 방문한 손님을 위해 오늘의 심층 연애운과 재물운을 300자 이내로 따뜻하게 해석해 줘."  
* OpenAI API로부터 결과(AI\_Tarot\_Result)를 수신받아 DB 테이블에 업데이트합니다.  
* 해당 요청의 Status를 1 (승인완료)로 변경합니다.  
* **Response:** { "status": "success" }

### API 6\. 최종 결과 조회 (클라이언트 화면 렌더링용)

* **Endpoint:** GET /api/v1/tarot/result/{req\_id}  
* **Backend Logic:** 클라이언트의 Polling(API 3)이 Status 1을 감지하면 이 API를 호출하여 최종 텍스트 데이터를 가져갑니다.

## 5\. 💡 개발자 전달용 PM(대표님) 코멘트

**"백엔드 개발자님께,"**

1. 저는 과거 ASP와 SQL로 직접 개발 및 PM을 했던 사람입니다 1\. 이 프로젝트의 핵심은 **결제 시스템(PG사) 연동을 과감히 생략하고, 카페 포스기(POS)를 통한 아날로그 수동 결제와 웹 관리자 승인을 결합하여 개발 공수와 수수료를 0으로 만드는 것**입니다 2\.  
2. 고객 화면(Frontend)에서는 계속 API를 폴링(Polling)하며 기다리고, 제가 카운터에서 결제 확인 후 승인 API를 쏘면, 그때 비로소 백엔드에서 OpenAI API를 호출해 결과값을 DB에 넣어주는 흐름입니다. 무분별한 AI API 호출 비용을 막기 위해 반드시 **'관리자 승인 후 AI 생성'** 로직을 지켜주세요.  
3. DB 구조는 추후 제가 확장하거나 직접 쿼리를 짤 수 있도록 RDBMS(MySQL/MariaDB 등)로 정규화하여 구성해 주시기 바랍니다 1\.

이렇게 정리된 문서를 백엔드 개발자에게 전달하시면, 대표님의 기획 의도와 데이터 흐름을 정확히 파악하여 오차 없는 빠르고 효율적인 시스템 개발이 진행될 것입니다.  
