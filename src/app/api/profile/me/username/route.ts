import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  username: z
    .string()
    .min(2, "사용자명은 2자 이상이어야 합니다")
    .max(20, "사용자명은 20자 이하이어야 합니다")
    .regex(/^[a-zA-Z0-9가-힣_]+$/, "사용자명은 영문, 숫자, 한글, 밑줄(_)만 사용 가능합니다"),
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

  const { username } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing && existing.id !== session.user.id) {
    return NextResponse.json({ error: "이미 사용 중인 사용자명입니다" }, { status: 409 });
  }

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: { username },
    select: { username: true },
  });

  return NextResponse.json({ username: updated.username });
}
