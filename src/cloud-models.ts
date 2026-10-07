// cloud 模式從後端 GET /v1/me 來的選項：模型選單（models／default_model）與讀頁字數檔位（read_levels／default_read_chars）。
// 契約：.claude/notes/saas-v2.md 第 2 節。純函式、沒有執行期相依，npm run check 會測。
// byok 完全不走這裡（照舊用 models.ts 的 ANTHROPIC_MODELS、各供應商自己的清單、pages.tsx 的 PAGE_CHARS 五個選項）。
import { ANTHROPIC_MODELS, DEFAULT_MODEL } from "./models";
import type { Key } from "./i18n";

// 後端回的一筆模型：tier 只會是 fast／balanced／best；credits＝做一個任務扣幾點（舊版後端沒有這欄）；
// locked＝使用者的方案低於該模型的最低方案
export type CloudModel = { id: string; label: string; tier: "fast" | "balanced" | "best"; credits?: number; locked: boolean };
// 選單的一個項目。hint 是字典 key（tier 對應既有的說明文字）
export type ModelItem = { value: string; label: string; hint?: Key; credits?: number; locked: boolean };

const HINT: Record<string, Key> = { fast: "model.hint.haiku", balanced: "model.hint.sonnet", best: "model.hint.opus" };

// me：/v1/me 的回應（null＝還沒拿到）。saved：存過的選擇。
// want：這次任務想用的模型（技能的 model 欄位）；在清單裡而且沒鎖才算數，否則照 saved。
// 回傳的 model 一定是清單裡沒鎖的項目（全鎖光才退回 DEFAULT_MODEL，那時後端會回 402 model_not_in_plan）。
export function cloudModels(
  me: { models?: CloudModel[]; default_model?: string } | null,
  saved?: string,
  want?: string | null,
): { items: ModelItem[]; model: string } {
  const items: ModelItem[] = me?.models?.length
    ? me.models.map((m) => ({ value: m.id, label: m.label || m.id, hint: HINT[m.tier], credits: Number.isFinite(m.credits) ? m.credits : undefined, locked: !!m.locked }))
    : ANTHROPIC_MODELS.map((m) => ({ value: m.value, label: m.label, hint: m.hint, locked: false })); // 還沒拿到 /v1/me（第一次啟動、離線）或舊版後端沒給清單
  const usable = (id?: string | null) => items.some((i) => i.value === id && !i.locked);
  return { items, model: [want, saved, me?.default_model].find(usable) ?? items.find((i) => !i.locked)?.value ?? DEFAULT_MODEL };
}

// 讀頁字數的一檔：chars＝一次讀頁最多回傳的字數；credits＝選這一檔時，每個任務在模型點數之外多扣幾點
export type ReadLevel = { chars: number; credits: number };
const DEFAULT_READ_CHARS = 8000; // 還沒拿到 /v1/me（或舊版後端沒給檔位）時用的字數，跟 store.ts 的預設一樣

// saved：存過的字數（S.pageChars）。存過的不在清單裡 → default_read_chars；還沒拿到 /v1/me → 只有 8000 一檔。
// 伺服器對不在清單裡的字數回 400 read level not allowed，所以回傳的 chars 一定是 levels 裡的其中一檔。
export function cloudReadLevels(
  me: { read_levels?: ReadLevel[]; default_read_chars?: number } | null,
  saved?: number,
): { levels: ReadLevel[]; chars: number } {
  const raw = me?.read_levels;
  const levels = (Array.isArray(raw) ? raw : []).filter((l) => Number.isFinite(l?.chars) && l.chars > 0).map((l) => ({ chars: l.chars, credits: Number.isFinite(l.credits) && l.credits > 0 ? l.credits : 0 }));
  if (!levels.length) return { levels: [{ chars: DEFAULT_READ_CHARS, credits: 0 }], chars: DEFAULT_READ_CHARS };
  const usable = (n?: number) => levels.some((l) => l.chars === n);
  return { levels, chars: [saved, me?.default_read_chars].find(usable) ?? levels[0].chars };
}
