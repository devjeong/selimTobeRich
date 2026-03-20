# Vercel 배포 가이드 — StockShare

---

## 사전 준비 확인

| 항목 | 상태 | 비고 |
|------|------|------|
| GitHub 저장소 | ✅ | https://github.com/devjeong/selimTobeRich |
| Neon PostgreSQL | ✅ | 이미 사용 중 |
| Vercel 계정 | 필요 | https://vercel.com |
| Vercel Blob 설정 | 필요 | 이미지 업로드용 (로컬 파일 시스템 대체) |

---

## ⚠️ Vercel 배포 전 필수 수정사항

### 1. 이미지 업로드 → Vercel Blob 마이그레이션

Vercel은 **서버리스 환경**이라 `public/uploads/`에 파일을 저장해도 배포 후 사라집니다.
반드시 **Vercel Blob** 스토리지로 전환해야 합니다.

#### 1-1. 패키지 설치

```bash
npm install @vercel/blob
```

#### 1-2. `src/app/api/upload/route.ts` 교체

```ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { put } from "@vercel/blob";
import { randomUUID } from "crypto";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) return NextResponse.json({ error: "파일이 없습니다" }, { status: 400 });
    if (!ALLOWED_TYPES.includes(file.type))
      return NextResponse.json({ error: "JPG, PNG, GIF, WEBP 형식만 지원합니다" }, { status: 400 });
    if (file.size > MAX_SIZE)
      return NextResponse.json({ error: "파일 크기는 5MB 이하여야 합니다" }, { status: 400 });

    const ext = file.name.split(".").pop() || file.type.split("/")[1];
    const filename = `uploads/${randomUUID()}.${ext}`;

    const blob = await put(filename, file, { access: "public" });

    return NextResponse.json({ url: blob.url });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "업로드 중 오류가 발생했습니다" }, { status: 500 });
  }
}
```

#### 1-3. `package.json` build 스크립트 수정

Vercel 빌드 시 Prisma Client 자동 생성을 위해 수정합니다.

```json
"scripts": {
  "build": "prisma generate && next build",
  ...
}
```

#### 1-4. `next.config.ts` 수정 — Vercel Blob 이미지 도메인 허용

```ts
const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000", "*.vercel.app"],
    },
  },
};
```

---

## 배포 단계

### STEP 1. Vercel 프로젝트 생성

1. https://vercel.com 로그인 (GitHub 계정 연동 권장)
2. **Add New Project** 클릭
3. `selimTobeRich` 저장소 선택 → **Import**
4. Framework Preset: **Next.js** (자동 감지)
5. **Deploy** 클릭 (환경 변수는 다음 단계에서 설정)

---

### STEP 2. 환경 변수 설정

Vercel 대시보드 → 프로젝트 → **Settings** → **Environment Variables**

| 변수명 | 값 | 비고 |
|--------|-----|------|
| `DATABASE_URL` | Neon 연결 문자열 | `.env.local` 참고 |
| `AUTH_SECRET` | 현재 사용 중인 값 | `.env.local` 참고 |
| `AUTH_URL` | `https://your-app.vercel.app` | 배포 후 실제 도메인으로 |
| `TELEGRAM_BOT_TOKEN` | 봇 토큰 | `.env.local` 참고 |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob 토큰 | STEP 3에서 발급 |

> ⚠️ `NEXTAUTH_URL` 대신 `AUTH_URL`을 사용합니다 (NextAuth v5 기준)

---

### STEP 3. Vercel Blob 스토리지 생성

1. Vercel 대시보드 → 프로젝트 → **Storage** 탭
2. **Create Database** → **Blob** 선택
3. 스토리지 이름 입력 → **Create**
4. 생성 후 **Connect to Project** 클릭
5. `BLOB_READ_WRITE_TOKEN`이 환경 변수에 자동 추가됨

---

### STEP 4. Neon DB 연결 문자열 확인

Neon 대시보드 → 프로젝트 → **Connection Details**

- **Connection string** 복사 (`?sslmode=require` 포함된 것)
- Vercel 환경 변수 `DATABASE_URL`에 붙여넣기

---

### STEP 5. 재배포

환경 변수 설정 완료 후:

Vercel 대시보드 → **Deployments** → 최신 배포 → **...** → **Redeploy**

또는 GitHub에 push하면 자동 재배포됩니다.

```bash
git add .
git commit -m "feat: Vercel 배포 설정 (Blob 업로드, build 스크립트)"
git push
```

---

### STEP 6. 텔레그램 웹훅 재등록

배포 완료 후 Vercel 도메인으로 웹훅을 재등록합니다.

```bash
curl -s "https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/setWebhook" \
  -d "url=https://your-app.vercel.app/api/telegram/webhook"
```

또는 브라우저에서:
```
https://your-app.vercel.app/api/telegram/register?url=https://your-app.vercel.app
```

---

## 배포 후 확인 체크리스트

- [ ] 메인 페이지 접속 → 로그인 페이지 리다이렉트 확인
- [ ] 회원가입 → 로그인 정상 동작
- [ ] 게시글 작성 (매수추천) → 저장 정상 동작
- [ ] 이미지 업로드 → Vercel Blob URL로 저장되는지 확인
- [ ] 텔레그램 `/start` 전송 → 구독 완료 메시지 수신
- [ ] 매수추천 게시글 작성 → 텔레그램 알림 수신
- [ ] 오픈채팅 → 실시간 메시지 전송/수신

---

## 주요 환경 변수 정리 (`.env.local` → Vercel)

```env
# DB
DATABASE_URL="postgresql://..."

# Auth (v5는 AUTH_URL 사용)
AUTH_SECRET="..."
AUTH_URL="https://your-app.vercel.app"

# Telegram
TELEGRAM_BOT_TOKEN="..."

# Vercel Blob (자동 주입)
BLOB_READ_WRITE_TOKEN="..."
```

---

## 트러블슈팅

### Q. 빌드 시 `prisma generate` 오류
→ `package.json`의 build 스크립트에 `prisma generate &&` 추가 확인

### Q. 로그인 후 세션이 유지되지 않음
→ `AUTH_URL`이 실제 배포 도메인과 일치하는지 확인

### Q. 이미지 업로드 후 표시 안 됨
→ `BLOB_READ_WRITE_TOKEN` 환경 변수 설정 및 `@vercel/blob` 패키지 설치 확인

### Q. 텔레그램 봇 응답 없음
→ STEP 6의 웹훅 재등록 진행, `getWebhookInfo`로 URL 확인
```bash
curl https://api.telegram.org/bot{TOKEN}/getWebhookInfo
```

### Q. Neon DB 연결 오류
→ Neon 대시보드에서 IP 허용 정책 확인 (기본값: 모든 IP 허용)
