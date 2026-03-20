import { NextResponse } from "next/server";

export async function GET() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    return NextResponse.json({ error: "환경 변수 미설정", token: !!token, chatId: !!chatId }, { status: 400 });
  }

  // 1. Bot 유효성 확인
  const meRes = await fetch(`https://api.telegram.org/bot${token}/getMe`);
  const me = await meRes.json();

  if (!me.ok) {
    return NextResponse.json({ error: "Bot Token 오류", detail: me.description }, { status: 400 });
  }

  // 2. 테스트 메시지 발송
  const msgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: "✅ <b>StockShare 텔레그램 연동 테스트</b>\n\n설정이 정상적으로 완료되었습니다!",
      parse_mode: "HTML",
    }),
  });
  const msg = await msgRes.json();

  if (!msg.ok) {
    return NextResponse.json({
      error: "메시지 전송 실패",
      botName: me.result.username,
      detail: msg.description,
    }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    botName: me.result.username,
    message: "테스트 메시지 전송 완료",
  });
}
