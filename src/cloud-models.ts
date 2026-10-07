// cloud 模式的模型選單與實際送出的模型：照後端 GET /v1/me 的 models／default_model（契約：.claude/notes/saas-v2.md 第 2 節）。
// 純函式、沒有執行期相依，npm run check 會測。byok 完全不走這裡（照舊用 models.ts 的 ANTHROPIC_MODELS 與各供應商自己的清單）。
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
