import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { put } from "@vercel/blob";
import { writeFile, mkdir } from "fs/promises";
import { join, extname } from "path";
import { existsSync } from "fs";
import { randomUUID } from "crypto";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

// App Router Route Handler body size 제한 해제
export const config = {
  api: { bodyParser: false },
};

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file)
      return NextResponse.json({ error: "파일이 없습니다" }, { status: 400 });
    if (!ALLOWED_TYPES.includes(file.type))
      return NextResponse.json({ error: "JPG, PNG, GIF, WEBP 형식만 지원합니다" }, { status: 400 });
    if (file.size > MAX_SIZE)
      return NextResponse.json({ error: "파일 크기는 5MB 이하여야 합니다" }, { status: 400 });

    const ext = extname(file.name) || `.${file.type.split("/")[1]}`;
    const filename = `${randomUUID()}${ext}`;

    const hasToken = !!process.env.BLOB_READ_WRITE_TOKEN;
    console.log(`[Upload] 파일명: ${filename}, 크기: ${file.size}, BLOB 토큰: ${hasToken}`);

    // Vercel Blob 사용 가능 시 → 클라우드 저장 (프로덕션)
    if (hasToken) {
      try {
        const blob = await put(`uploads/${filename}`, file, { access: "public" });
        console.log(`[Upload] Vercel Blob 업로드 성공: ${blob.url}`);
        return NextResponse.json({ url: blob.url });
      } catch (blobError) {
        console.error("[Upload] Vercel Blob 오류:", blobError);
        return NextResponse.json(
          { error: `Blob 업로드 실패: ${blobError instanceof Error ? blobError.message : String(blobError)}` },
          { status: 500 }
        );
      }
    }

    // 로컬 개발 환경 → public/uploads/ 저장
    try {
      const uploadDir = join(process.cwd(), "public", "uploads");
      if (!existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true });
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(join(uploadDir, filename), buffer);
      console.log(`[Upload] 로컬 저장 성공: /uploads/${filename}`);
      return NextResponse.json({ url: `/uploads/${filename}` });
    } catch (fsError) {
      console.error("[Upload] 로컬 파일시스템 오류:", fsError);
      return NextResponse.json(
        { error: `파일 저장 실패: ${fsError instanceof Error ? fsError.message : String(fsError)}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[Upload] 전체 오류:", error);
    return NextResponse.json(
      { error: `업로드 오류: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}
