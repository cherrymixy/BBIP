# 삡-플랜 배포 가이드

## 1. Turso DB 설정

```bash
# Turso CLI 설치 (macOS)
brew install tursodatabase/tap/turso

# 로그인 (GitHub)
turso auth login

# DB 생성
turso db create bbip-plan

# URL 확인
turso db show bbip-plan --url

# 인증 토큰 생성
turso db tokens create bbip-plan
```

## 2. Vercel 환경변수 등록

Vercel Dashboard → 프로젝트 → **Settings → Environment Variables**:

| Key | Value |
|-----|-------|
| `TURSO_DATABASE_URL` | `libsql://bbip-plan-xxx.turso.io` |
| `TURSO_AUTH_TOKEN` | Turso 토큰 |
| `JWT_SECRET` | 임의의 강력한 시크릿 키 |

## 3. 배포

```bash
# Git push → Vercel 자동 배포
git add -A
git commit -m "feat: Vercel 프로덕션 배포 전환"
git push
```

Vercel이 자동으로:
- `public/` → 정적 파일 서빙
- `api/` → 서버리스 함수 배포
- `package.json` → 의존성 설치

## 4. 로컬 개발

```bash
# .env.local 생성
echo "TURSO_DATABASE_URL=libsql://bbip-plan-xxx.turso.io" >> .env.local
echo "TURSO_AUTH_TOKEN=your-token" >> .env.local
echo "JWT_SECRET=dev-secret" >> .env.local

# Vercel CLI로 로컬 실행
npx vercel dev
```

## 프로젝트 구조

```
bbip/
├── public/          정적 프론트엔드
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── api/             서버리스 API
│   ├── auth/        인증 (login, register, me)
│   ├── plans/       계획 CRUD (index, [id], bulk)
│   └── health.js
├── lib/             공유 유틸
│   ├── db.js        Turso 클라이언트
│   └── auth.js      JWT 유틸
├── backend/         (로컬 개발용 레거시)
├── vercel.json      라우팅 설정
└── package.json     루트 의존성
```
