// Anthropic 模型（官方 id）：cloud 與 byok 都用這幾個。2026-10-08 起換成 5.5 系列（比舊的便宜）。
// 純函式、沒有執行期相依，skills.ts 與 npm run check 也能直接 import。
import type { Key } from "./i18n";

export const SONNET = "claude-sonnet-5-5";
export const OPUS = "claude-opus-5-5";
export const HAIKU = "claude-haiku-5-5"; // 首頁建議等自動呼叫、技能的 model: haiku 都用它

export const ANTHROPIC_MODELS = [
  { value: SONNET, label: "Sonnet 5.5", hint: "model.hint.sonnet" },
  { value: OPUS, label: "Opus 5.5", hint: "model.hint.opus" },
  { value: HAIKU, label: "Haiku 5.5", hint: "model.hint.haiku" },
] as const satisfies readonly { value: string; label: string; hint: Key }[];

export const DEFAULT_MODEL = SONNET;

// Haiku 不開自適應思考與 effort（Haiku 5.5 其實支援，但維持不開，比較省）
export const isHaiku = (model: string) => model.startsWith("claude-haiku");

// 舊模型 id → 5.5：升級時把存過的模型搬過去（cloud 與 byok 一樣，這是官方模型、自己的 Anthropic Key 也能用）；
// 技能裡寫的舊 id（SKILL.md 的 model）也照這張表解讀
const RENAMED: Record<string, string> = { "claude-sonnet-5": SONNET, "claude-opus-5": OPUS, "claude-haiku-4-5": HAIKU };
export const migrateModel = (m: string) => RENAMED[m] ?? m;
