// byok 的美元估計（用量列的「≈ $0.0030」）。純函式，npm run check 會測。
// 價格＝Anthropic 官方定價，每百萬 token 的美元價；2026-10-08 查證：https://platform.claude.com/docs/en/about-claude/pricing
// 只是估計：不含折扣、1 小時快取寫入、資料落地加價等。cloud 不顯示美元（顯示剩餘點數）；
// 非 Anthropic 的供應商也不顯示（價格不一，不替他們猜）。
import { SONNET, OPUS, HAIKU } from "./models";

type Rate = { input: number; output: number; cacheRead: number; cacheWrite: number };
// cacheWrite＝5 分鐘快取寫入（請求的 cache_control 是預設的 ephemeral）。
// Sonnet／Opus 5.5 的快取讀取是基本輸入價的 5%（其他模型 10%），照官方表格直接寫數字
const PRICES: Record<string, { low: Rate; high?: Rate }> = {
  [SONNET]: { low: { input: 2, output: 10, cacheRead: 0.1, cacheWrite: 2.5 } },
  [OPUS]: { low: { input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5 } },
  // Haiku 5.5 依「單次呼叫的 prompt 長度」分兩段：100,000 token 以內用 low，超過用 high
  [HAIKU]: { low: { input: 0.1, output: 0.5, cacheRead: 0.01, cacheWrite: 0.125 }, high: { input: 0.5, output: 2.5, cacheRead: 0.05, cacheWrite: 0.625 } },
};
export const TIER_TOKENS = 100_000;

// input＝沒命中快取的輸入 token（Anthropic usage 的 input_tokens）；prompt 長度＝input＋快取讀＋快取寫
export type CallUsage = { input: number; cacheRead: number; cacheWrite: number; output: number };

// 一次呼叫的美元估計；不在價格表裡的模型回 null
export function usdOf(model: string, u: CallUsage): number | null {
  const p = PRICES[model];
  if (!p) return null;
  const r = p.high && u.input + u.cacheRead + u.cacheWrite > TIER_TOKENS ? p.high : p.low;
  return (u.input * r.input + u.cacheRead * r.cacheRead + u.cacheWrite * r.cacheWrite + u.output * r.output) / 1e6;
}

export const fmtUsd = (n: number) => (n < 0.0001 ? "<$0.0001" : n < 0.01 ? `$${n.toFixed(4)}` : `$${n.toFixed(2)}`);
