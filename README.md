# 삡-플랜 (BBIP Plan)

자연어 기반 투두리스트 앱 - React Native + Node.js 풀스택

## 프로젝트 구조

```
bbip/
├── backend/         # Node.js Express API 서버
│   ├── server.js    # 메인 서버
│   ├── database.js  # SQLite 데이터베이스
│   └── routes/      # API 라우트
│
└── frontend/        # React Native (Expo)
    ├── App.tsx      # 메인 앱 컴포넌트
    └── src/
        ├── screens/     # 화면 컴포넌트
        ├── components/  # 재사용 컴포넌트
        ├── services/    # API 서비스
        └── styles/      # 스타일 정의
```

## 실행 방법

### 1. 백엔드 서버 시작

```bash
cd backend
npm install
npm start
```

서버가 `http://localhost:3000`에서 실행됩니다.

### 2. 프론트엔드 실행 (iOS 시뮬레이터)

```bash
cd frontend
npm install --legacy-peer-deps
npx expo run:ios
```

또는 Expo Go 앱 사용:

```bash
npx expo start
```

## API 엔드포인트

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | /api/health | 헬스 체크 |
| GET | /api/plans | 모든 계획 조회 |
| POST | /api/plans | 새 계획 생성 |
| PUT | /api/plans/:id | 계획 수정 |
| DELETE | /api/plans/:id | 계획 삭제 |
| GET | /api/user | 사용자 정보 조회 |
| PUT | /api/user | 사용자 정보 수정 |

## 기술 스택

- **Frontend**: React Native, Expo, TypeScript
- **Backend**: Node.js, Express
- **Database**: SQLite (better-sqlite3)
- **Navigation**: React Navigation
