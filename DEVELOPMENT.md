# BBIP — 바이브코딩 개발 과정 문서

## 프로젝트 개요

**BBIP**은 자연어로 계획을 입력하면 AI가 자동으로 날짜·시간·할일을 파싱해주는 투두리스트 웹앱이다.
디자이너가 AI 코딩 에이전트(바이브코딩)를 활용하여 기획부터 배포까지 전 과정을 구현했다.

- **URL**: https://bbip.vercel.app
- **배포**: Vercel (Serverless Functions + Static Hosting)
- **DB**: Turso (LibSQL, SQLite 호환 엣지 DB)

---

## 개발 과정 (바이브코딩)

### 1단계: 기획 & 구조 설계
- 디자이너가 원하는 기능과 UI를 자연어로 설명
- AI 에이전트가 프로젝트 구조, 기술 스택, 파일 구성을 설계
- Vercel Serverless Functions 기반 백엔드 + 바닐라 HTML/CSS/JS 프론트엔드로 결정

### 2단계: 백엔드 API 구현
- 회원가입/로그인 (JWT 인증)
- 계획 CRUD (생성/조회/수정/삭제)
- **AI 자연어 파싱** — OpenAI GPT로 "내일 3시 카페가기" 같은 문장에서 날짜, 시간, 할일을 자동 추출

### 3단계: 프론트엔드 UI 구현
- 대시보드 (홈), 캘린더, 통계 3개 탭 구성
- 반응형 사이드바 네비게이션
- 계획 입력 모달 (텍스트 + 음성 입력)
- 캘린더 뷰 + 날짜별 계획 조회
- 통계 페이지 (연도별 월간 바차트, 주간 달성률)

### 4단계: 디자인 리파인
- 프라이머리 컬러 `#FF5E4F` 적용
- 미니멀 플랫 디자인 — 불필요한 그라디언트, 글로우, 이너섀도우 전부 제거
- 스트록(border) 없는 fill 기반 컴포넌트
- 참고 UI 이미지를 기반으로 통계 페이지 구조 리디자인

### 5단계: 배포 & 테스트
- GitHub 푸시 → Vercel 자동 배포
- 프로덕션 환경에서 UI, API, 인증 플로우 검증

---

## 기술 스택

| 영역 | 기술 |
|------|------|
| 프론트엔드 | HTML, CSS, Vanilla JavaScript |
| 백엔드 | Vercel Serverless Functions (Node.js) |
| 데이터베이스 | Turso (LibSQL / SQLite 호환) |
| AI 파싱 | OpenAI GPT API |
| 인증 | JWT + bcrypt |
| 배포 | Vercel |
| 버전관리 | Git + GitHub |

---

## 프로젝트 구조

```
bbip/
├── public/                  ← 프론트엔드 (정적 파일)
│   ├── index.html           ← 메인 HTML (SPA 구조)
│   ├── styles.css           ← 전체 스타일시트
│   └── app.js               ← 클라이언트 로직 (라우팅, API 통신, UI 렌더링)
│
├── api/                     ← Vercel Serverless Functions (백엔드 API)
│   ├── auth/
│   │   ├── register.js      ← POST /api/auth/register (회원가입)
│   │   ├── login.js         ← POST /api/auth/login (로그인)
│   │   └── me.js            ← GET /api/auth/me (현재 유저 조회)
│   ├── plans/
│   │   ├── index.js         ← GET/POST /api/plans (계획 조회/생성)
│   │   ├── [id].js          ← PUT/DELETE /api/plans/:id (계획 수정/삭제)
│   │   ├── parse.js         ← POST /api/plans/parse (AI 자연어 파싱)
│   │   └── bulk.js          ← POST /api/plans/bulk (대량 생성)
│   └── health.js            ← GET /api/health (서버 상태 체크)
│
├── lib/                     ← 공유 모듈
│   ├── db.js                ← Turso DB 연결 + 테이블 초기화
│   └── auth.js              ← JWT 토큰 검증 미들웨어
│
├── vercel.json              ← Vercel 라우팅 + CORS 설정
├── package.json             ← 의존성 관리
└── .gitignore
```

---

## 주요 기능 상세

### 🗣️ AI 자연어 파싱
사용자가 "내일 오후 3시에 카페에서 공부하기"를 입력하면:
- OpenAI GPT가 JSON으로 파싱
- `{ date: "2026-02-23", time: "15:00", title: "카페에서 공부하기" }` 반환
- 자동으로 계획 목록에 추가

### 📅 캘린더
- 월별 달력 뷰 + 날짜 클릭 시 해당 날짜 계획 조회
- 오늘 날짜 하이라이트
- 좌우 네비게이션으로 월 이동

### 📊 통계
- 연도별 네비게이션 (`< 2026년 >`)
- 12개월 바차트 (현재 월 강조)
- 듀얼 요약 카드 — 전체 계획 수 / 완료 수
- 주간 달성률 인사이트 (최근 7일 기준)
- 연속 달성 스트릭

### 🔐 인증
- 이메일/비밀번호 회원가입 + 로그인
- JWT 토큰 기반 세션 유지
- 비밀번호 bcrypt 해싱

---

## 디자인 원칙

1. **미니멀 플랫** — 불필요한 장식 요소 없이 깔끔하게
2. **다크 모드 기본** — `#08090d` 배경, 고대비 텍스트
3. **프라이머리 컬러** — `#FF5E4F` (따뜻한 코랄 레드)
4. **Fill 기반** — 스트록(border) 없이 배경색으로 구분
5. **최소 인터랙션** — hover opacity, active scale 정도만

---

## 환경 변수 (Vercel 설정)

| 변수명 | 용도 |
|--------|------|
| `TURSO_DB_URL` | Turso 데이터베이스 URL |
| `TURSO_DB_TOKEN` | Turso 인증 토큰 |
| `JWT_SECRET` | JWT 서명 키 |
| `OPENAI_API_KEY` | OpenAI API 키 (자연어 파싱) |

---

## 바이브코딩 워크플로우

```
디자이너 (자연어 지시)
    ↓
AI 에이전트 (코드 생성/수정)
    ↓
Git push → Vercel 자동 배포
    ↓
프로덕션 확인 → 피드백 → 반복
```

전체 개발 과정에서 디자이너는 코드를 직접 작성하지 않고,
원하는 기능과 디자인을 자연어로 설명하면 AI 에이전트가 구현했다.
디자인 레퍼런스 이미지를 제공하거나, 컬러 값을 지정하는 등
디자이너의 시각적 판단이 최종 결과물의 품질을 결정했다.
