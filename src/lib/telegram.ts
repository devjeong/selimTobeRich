import { prisma } from "@/lib/prisma";

// ─── 기본 메시지 전송 ──────────────────────────────────────────

interface SendMessageOptions {
  text: string;
  chatId: string;
  parseMode?: "HTML" | "Markdown";
}

export async function sendTelegramMessage({ text, chatId, parseMode = "HTML" }: SendMessageOptions) {
  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

  if (!TELEGRAM_BOT_TOKEN) {
    console.warn("[Telegram] BOT_TOKEN이 설정되지 않았습니다.");
    return { ok: false };
  }

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: parseMode,
          disable_web_page_preview: false,
        }),
      }
    );

    const data = await res.json();
    if (!res.ok) {
      console.error(`[Telegram] 전송 실패 (chatId: ${chatId}):`, data);
    }
    return data;
  } catch (error) {
    console.error(`[Telegram] 네트워크 오류 (chatId: ${chatId}):`, error);
    return { ok: false };
  }
}

// ─── 전체 구독자에게 발송 ───────────────────────────────────────

export async function sendTelegramToAll(text: string) {
  const subscribers = await prisma.telegramSubscriber.findMany();

  if (subscribers.length === 0) {
    console.warn("[Telegram] 구독자가 없습니다.");
    return;
  }

  // 병렬 발송 (개별 실패가 전체에 영향 없도록 allSettled 사용)
  const results = await Promise.allSettled(
    subscribers.map((sub) =>
      sendTelegramMessage({ text, chatId: sub.chatId })
    )
  );

  const success = results.filter((r) => r.status === "fulfilled").length;
  const fail = results.filter((r) => r.status === "rejected").length;
  console.log(`[Telegram] 발송 완료: ${success}명 성공, ${fail}명 실패 / 총 ${subscribers.length}명`);
}

// ─── 메시지 템플릿 ─────────────────────────────────────────────

interface PostNotificationParams {
  recommendation: "BUY" | "SELL";
  title: string;
  ticker?: string | null;
  tickerName?: string | null;
  market?: string | null;
  sectorName?: string | null;
  recommendedPrice?: number | null;
  username: string;
  postUrl: string;
}

function buildPostNotificationText(params: PostNotificationParams): string {
  const { recommendation, title, ticker, tickerName, market, sectorName, recommendedPrice, username, postUrl } = params;

  const isBuy = recommendation === "BUY";
  const emoji = isBuy ? "📈" : "📉";
  const label = isBuy ? "매수 추천" : "매도 추천";
  const marketLabel = market === "US" ? "🇺🇸 미국" : market === "KR" ? "🇰🇷 국내" : "";

  let stockLine = "";
  if (ticker && tickerName) {
    stockLine = `\n🏷 <b>종목:</b> ${tickerName} <code>(${ticker})</code> ${marketLabel}`;
  } else if (sectorName) {
    stockLine = `\n🏭 <b>업종·테마:</b> ${sectorName}`;
  }

  let priceLine = "";
  if (recommendedPrice != null) {
    const formatted =
      market === "US"
        ? `$${recommendedPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : `${recommendedPrice.toLocaleString("ko-KR")}원`;
    priceLine = `\n💰 <b>${isBuy ? "매수 추천가" : "매도 추천가"}:</b> <b>${formatted}</b>`;
  }

  return (
    `${emoji} <b>[${label}] 새 게시글</b>\n` +
    `━━━━━━━━━━━━━━━━\n` +
    `📝 <b>${title}</b>` +
    stockLine +
    priceLine +
    `\n👤 <b>작성자:</b> ${username}` +
    `\n🔗 <a href="${postUrl}">게시글 보기</a>`
  );
}

// 전체 구독자에게 게시글 알림 발송
export async function sendPostNotificationToAll(params: PostNotificationParams) {
  const text = buildPostNotificationText(params);
  await sendTelegramToAll(text);
}
