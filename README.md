# 📈 StockShare - 주식 정보 공유 커뮤니티

주식 아이디어를 공유하고, 매수/매도 인증을 통해 신뢰할 수 있는 투자 정보를 나누는 커뮤니티 플랫폼입니다.

## 주요 기능

- **게시판**: 종목 분석 / 업종·테마 / 일반 정보 구분
- **투자 의견**: 매수 추천 / 매도 추천 / 중립 선택
- **마크다운 에디터**: 풍부한 텍스트 작성 (표, 코드, 이미지 등)
- **종목 검색**: Yahoo Finance로 국내(KRX) + 미국(NYSE/NASDAQ) 실시간 검색
- **매수 인증**: 평균 매수가, 수량 인증
- **매도 인증**: 매도가 + 수익률 자동 계산
- **댓글**: 대댓글 지원
- **좋아요**: 유용한 게시글 추천
- **회원 관리**: 이메일/비밀번호 로그인, 프로필 페이지

## 기술 스택

| 분류 | 기술 |
|------|------|
| Framework | Next.js 15 (App Router) |
| Database | PostgreSQL + Prisma ORM v7 |
| Auth | NextAuth.js v5 |
| Styling | Tailwind CSS + @tailwindcss/typography |
| Markdown | react-markdown + @uiw/react-md-editor |
| Stock API | yahoo-finance2 |
| Validation | Zod |
| State | TanStack Query |

## 시작하기

### 1. 환경변수 설정

```bash
cp .env.example .env.local
```

`.env.local`을 열고 값을 설정합니다:

```env
# Neon PostgreSQL 무료 티어: https://neon.tech
DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"

# 랜덤 시크릿 생성: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
AUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"
```

### 2. 의존성 설치

```bash
npm install
```

### 3. DB 마이그레이션

```bash
npx prisma migrate dev --name init
```

### 4. 개발 서버 실행

```bash
npm run dev
```

http://localhost:3000 에서 확인합니다.

## Vercel 배포

1. [Neon](https://neon.tech)에서 무료 PostgreSQL DB 생성
2. Vercel에 GitHub 저장소 연결
3. 환경변수 설정:
   - `DATABASE_URL`: Neon 연결 문자열
   - `AUTH_SECRET`: 랜덤 시크릿
   - `NEXTAUTH_URL`: 배포된 도메인 (예: `https://myapp.vercel.app`)
4. 배포 후 마이그레이션: `npx prisma migrate deploy`

## 페이지 구조

```
/                    # 홈 (최신 게시글 피드)
/posts               # 전체 게시판 (타입/의견 필터)
/posts/new           # 게시글 작성
/posts/[id]          # 게시글 상세 + 인증 + 댓글
/posts/[id]/edit     # 게시글 수정
/stocks/[ticker]     # 종목별 게시글 모음 + 실시간 시세
/profile/[username]  # 사용자 프로필
/login               # 로그인
/register            # 회원가입
```

## 국내 주식 티커 형식

| 거래소 | 형식 | 예시 |
|--------|------|------|
| 코스피 (KRX) | `종목코드.KS` | `005930.KS` (삼성전자) |
| 코스닥 | `종목코드.KQ` | `035720.KQ` (카카오) |
| 미국 | 심볼 | `AAPL`, `TSLA`, `NVDA` |

---

> ⚠️ 본 서비스의 모든 내용은 투자 참고용이며, 투자 판단의 최종 책임은 본인에게 있습니다.
