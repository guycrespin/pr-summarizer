// 背景 service worker：點工具列圖示開側邊欄；第一次安裝時註冊匿名裝置，再開歡迎頁（KOL 推薦歸因靠這一頁）
import { BACKEND, ensureDevice } from "./backend";

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason !== "install") return;
  try {
    const { userId } = await ensureDevice();
    await chrome.tabs.create({ url: `${BACKEND}/welcome?u=${encodeURIComponent(userId)}` });
  } catch { /* 後端連不上：之後側邊欄第一次用到時會再註冊，只是這次沒有歡迎頁 */ }
});
