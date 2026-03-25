import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

const INITIAL_PASSWORD = "semas1@3";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  const hashed = await bcrypt.hash(INITIAL_PASSWORD, 12);
  await prisma.user.update({
    where: { id: session.user.id },
    data: { hashedPassword: hashed },
  });

  return NextResponse.json({ message: "비밀번호가 초기화되었습니다. 초기 비밀번호로 다시 로그인해주세요." });
}
