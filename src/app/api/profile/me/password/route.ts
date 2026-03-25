import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const schema = z.object({
  currentPassword: z.string().min(1, "현재 비밀번호를 입력해주세요"),
  newPassword: z
    .string()
    .min(6, "새 비밀번호는 6자 이상이어야 합니다")
    .max(100, "비밀번호가 너무 깁니다"),
});

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
  }

  const { currentPassword, newPassword } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { hashedPassword: true },
  });

  if (!user?.hashedPassword) {
    return NextResponse.json({ error: "비밀번호 변경이 불가능한 계정입니다" }, { status: 400 });
  }

  const isValid = await bcrypt.compare(currentPassword, user.hashedPassword);
  if (!isValid) {
    return NextResponse.json({ error: "현재 비밀번호가 올바르지 않습니다" }, { status: 400 });
  }

  const hashed = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: session.user.id },
    data: { hashedPassword: hashed },
  });

  return NextResponse.json({ message: "비밀번호가 변경되었습니다" });
}
