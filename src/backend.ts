// 自家後端：匿名裝置帳號（免登入）＋ /v1/me。API 契約見 .claude/notes/saas-v2.md 第 2 節。
// 這個檔案 sidepanel 與 background service worker 共用，只能 import 沒有畫面相依的東西。
import type { CloudModel } from "./cloud-models";
declare const BA_BACKEND: string; // esbuild define（scripts/build.mjs）；沒打包時（npm run check）用預設
export const BACKEND = (typeof BA_BACKEND !== "undefined" ? BA_BACKEND : "http://localhost:4410").replace(/\/+$/, "");

export type Me = {
  user_id: string; plan: string; credits_used: number; credits_limit: number;
  period_end: string; kol_code: string | null; upgrade_url: string;
  models?: CloudModel[]; default_model?: string; // cloud 的模型選單來源（舊版後端沒有）
};

const TOKEN_KEY = "deviceToken";
const USER_KEY = "userId";
const read = async () => (await chrome.storage.local.get([TOKEN_KEY, USER_KEY])) as { deviceToken?: string; userId?: string };

export class BackendError extends Error {
  constructor(message: string, public status?: number) { super(message); }
}

async function register(): Promise<{ token: string; userId: string }> {
  const res = await fetch(`${BACKEND}/v1/devices`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ locale: navigator.language, version: chrome.runtime.getManifest().version }),
  });
  if (!res.ok) throw new BackendError(`HTTP ${res.status}`, res.status);
  const j = await res.json();
  await chrome.storage.local.set({ [TOKEN_KEY]: j.device_token, [USER_KEY]: j.user_id });
  return { token: j.device_token, userId: j.user_id };
}

// 側邊欄與背景可能同時第一次需要帳號：用 Web Locks 擋住，拿到鎖後重讀一次，只註冊一個裝置
export function ensureDevice(): Promise<{ token: string; userId: string }> {
  return navigator.locks.request("ba-register", async () => {
    const s = await read();
    return s.deviceToken && s.userId ? { token: s.deviceToken, userId: s.userId } : register();
  });
}
export const getToken = async () => (await ensureDevice()).token;

// 401＝token 失效（例如後端重置）：清掉、重新註冊。bad 是這次失敗的 token，已經被別人換過就不重複註冊
async function renew(bad: string): Promise<string> {
  return navigator.locks.request("ba-register", async () => {
    const s = await read();
    if (s.deviceToken && s.deviceToken !== bad) return s.deviceToken;
    await chrome.storage.local.remove([TOKEN_KEY, USER_KEY]);
    return (await register()).token;
  });
}

// 給 SDK 的 fetch：x-api-key 用目前的 token；收到 401 就換 token 重試一次（請求本體是字串，可以重送）
export const authFetch: typeof fetch = async (input, init) => {
  const send = (token: string) => {
    const h = new Headers(init?.headers);
    h.set("x-api-key", token);
    return fetch(input, { ...init, headers: h });
  };
  const token = await getToken();
  const res = await send(token);
  if (res.status !== 401) return res;
  return send(await renew(token));
};

export async function fetchMe(): Promise<Me> {
  const res = await authFetch(`${BACKEND}/v1/me`);
  if (!res.ok) throw new BackendError(`HTTP ${res.status}`, res.status);
  return res.json();
}
