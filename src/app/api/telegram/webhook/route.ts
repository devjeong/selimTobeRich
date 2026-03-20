import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendTelegramMessage } from "@/lib/telegram";

// 텔레그램이 이 엔드포인트로 메시지를 POST 함
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const message = body?.message;

    // 메시지가 없으면 무시 (채널 업데이트 등)
    if (!message) {
      return NextResponse.json({ ok: true });
    }

    const chatId = String(message.chat.id);
    const username = message.from?.username ?? null;
    const firstName = message.from?.first_name ?? null;
    const text: string = message.text ?? "";

    // /start 명령어 처리
    if (text.startsWith("/start")) {
      // DB에 구독자 등록 (이미 있으면 업데이트)
      const existing = await prisma.telegramSubscriber.findUnique({
        where: { chatId },
      });

      await prisma.telegramSubscriber.upsert({
        where: { chatId },
        update: { username, firstName },
        create: { chatId, username, firstName },
      });

      const welcomeText = existing
        ? `✅ <b>이미 구독 중입니다!</b>\n안녕하세요, ${firstName ?? username ?? "회원"}님 👋\n매수/매도 추천 알림을 계속 받으실 수 있습니다.`
        : `🎉 <b>StockShare 알림 구독 완료!</b>\n\n안녕하세요, ${firstName ?? username ?? "회원"}님 👋\n\n매수/매도 추천 게시글이 올라오면 바로 알림을 보내드릴게요 📈📉\n\n구독을 취소하려면 /stop 을 입력하세요.`;

      await sendTelegramMessage({ text: welcomeText, chatId });
    }

    // /stop 명령어 처리
    else if (text.startsWith("/stop")) {
      const deleted = await prisma.telegramSubscriber.deleteMany({
        where: { chatId },
      });

      const stopText =
        deleted.count > 0
          ? `👋 <b>구독이 취소되었습니다.</b>\n더 이상 알림을 받지 않습니다.\n다시 구독하려면 /start 를 입력하세요.`
          : `ℹ️ 구독 정보가 없습니다. /start 로 구독을 시작하세요.`;

      await sendTelegramMessage({ text: stopText, chatId });
    }

    // /status 명령어 처리
    else if (text.startsWith("/status")) {
      const sub = await prisma.telegramSubscriber.findUnique({ where: { chatId } });
      const statusText = sub
        ? `✅ <b>구독 중</b>\n구독일: ${sub.createdAt.toLocaleDateString("ko-KR")}`
        : `❌ <b>미구독 상태</b>\n/start 로 구독을 시작하세요.`;

      await sendTelegramMessage({ text: statusText, chatId });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[Telegram Webhook] 오류:", error);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
