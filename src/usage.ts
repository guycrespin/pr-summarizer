// 記帳標頭與額度錯誤判斷（純函式，npm run check 會測）。契約：.claude/notes/saas-v2.md 第 2 節
// 每次呼叫帶的記帳標頭（契約：.claude/notes/saas-v2.md 第 2 節）。stats 是這個任務到這一刻為止的累計
export type Usage = { pages: number; actions: number; chars: number; searches?: number };
export const PAGE_TOOLS = ["read_page", "read_url"]; // 讀取頁面類：次數算 pages，回傳字元數算 chars（search_web 次數算 searches，回傳字元數也算 chars）
export const ACTION_TOOLS = ["navigate", "click", "type", "scroll"]; // 操作類：次數算 actions（use_skill／remember／forget／ask_user／create_file 都不算）
export const charsOf = (c: unknown) => (typeof c === "string" ? c.length : Array.isArray(c) ? c.reduce((n, b) => n + (typeof b?.text === "string" ? b.text.length : 0), 0) : 0);
// readChars：目前那一檔的讀頁字數（每次呼叫都帶；伺服器只在 session 建立時採用，任務點數＝模型點數＋該檔的加點）
export const baHeaders = (kind: "task" | "aux", session: string, u: Usage, readChars: number) => ({
  "x-ba-session": session, "x-ba-kind": kind, "x-ba-stats": `pages=${u.pages};actions=${u.actions};chars=${u.chars};searches=${u.searches ?? 0}`, "x-ba-read-chars": String(readChars),
});

// 額度用完：402＋error.type quota_exceeded
export const isQuota = (err: any) => err?.status === 402 && err?.error?.error?.type === "quota_exceeded";
// 方案不含所選的模型：402＋error.type model_not_in_plan
export const isModelNotInPlan = (err: any) => err?.status === 402 && err?.error?.error?.type === "model_not_in_plan";

