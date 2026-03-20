/**
 * 크로스 플랫폼 마이그레이션 스크립트
 * .env.local 에서 DIRECT_URL을 읽어 DATABASE_URL로 설정 후 prisma migrate deploy 실행
 * Windows / Linux / macOS 모두 동작
 */
import { execSync } from "child_process";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

// .env.local 파싱
function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return {};
  const content = readFileSync(filePath, "utf-8");
  const env = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    // 따옴표 제거
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

const envPath = resolve(process.cwd(), ".env.local");
const localEnv = loadEnvFile(envPath);

// DIRECT_URL이 없으면 DATABASE_URL 그대로 사용
const directUrl = localEnv.DIRECT_URL || process.env.DIRECT_URL || localEnv.DATABASE_URL || process.env.DATABASE_URL;

if (!directUrl) {
  console.error("❌ DIRECT_URL 또는 DATABASE_URL 환경변수가 설정되지 않았습니다.");
  process.exit(1);
}

console.log("🔄 prisma migrate deploy 실행 중...");
console.log(`   DB: ${directUrl.replace(/:[^:@]+@/, ":****@")}`);

execSync("npx prisma migrate deploy", {
  stdio: "inherit",
  env: {
    ...process.env,
    ...localEnv,
    DATABASE_URL: directUrl,
  },
});
