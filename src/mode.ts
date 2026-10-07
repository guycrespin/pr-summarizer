// 使用模式（純函式，npm run check 會測）。
// cloud：預設，免登入的匿名裝置帳號、LLM 走自家後端、扣點數。
// byok：使用者自己的 API Key，跟以前一樣直連供應商；這個模式下完全不碰我們的後端
//       （不註冊裝置、不帶 x-ba-* 標頭、不打 /v1/me），資料只送到使用者自己選的供應商。
export type Mode = "cloud" | "byok";

// 啟動時決定模式：
// - 之前存過（含使用者在設定頁切換的結果）就照存的
// - 沒存過＝這個版本第一次跑：升級前已經設定過金鑰或自訂位址的舊使用者維持 byok（不能升級後就壞掉或突然開始扣點）；
//   其他（全新安裝、只挑過供應商但沒填金鑰）是 cloud
export function detectMode(saved: { mode?: unknown; key?: unknown; providers?: unknown }): Mode {
  if (saved.mode === "cloud" || saved.mode === "byok") return saved.mode;
  const filled = (v: unknown) => typeof v === "string" && v.trim() !== "";
  const configured = filled(saved.key) || Object.values((saved.providers ?? {}) as Record<string, any>).some((c) => filled(c?.key) || filled(c?.baseURL));
  return configured ? "byok" : "cloud";
}
