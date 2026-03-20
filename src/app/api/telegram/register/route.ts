import { NextRequest, NextResponse } from "next/server";

// GET /api/telegram/register?url=https://your-domain.com
// 웹훅을 텔레그램에 등록하는 편의 API
export async function GET(req: NextRequest) {
  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

  if (!TELEGRAM_BOT_TOKEN) {
    return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN이 설정되지 않았습니다." }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const customUrl = searchParams.get("url");

  const baseUrl = customUrl || process.env.NEXTAUTH_URL || "http://localhost:3000";
  const webhookUrl = `${baseUrl}/api/telegram/webhook`;

  try {
    // 웹훅 등록
    const res = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: webhookUrl }),
      }
    );
    const data = await res.json();

    // 현재 웹훅 정보도 함께 조회
    const infoRes = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo`
    );
    const info = await infoRes.json();

    return NextResponse.json({
      registered: data,
      webhookUrl,
      info: info.result,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
