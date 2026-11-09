/* 后台：定时检测、工具栏角标、风险升高时发通知 */
importScripts("lib/regions.js");

// 通知图标用内嵌的 data URL 小图（仓库纯文本发布，不带二进制图标文件）；
// 想换成自定义工具栏图标，见 icons/README.md
const NOTIFY_ICON = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAABRklEQVR4nO2Z0RGDMAiGtdcRXKEuVsfKZFmh7tA+eedxkEAgcqT+j9aE/5OYIplf7893CqyHtwGtbgBvhQd4Wk+Y01L8fd1203izxS5UM03JAkYF0GocSgPSBFAyDs0c9x7XJWM5Er8DmAFJ4PO9cK6cFjGEaBeCAddtV6UfGy9dlmwAzLyVNBAsgJ7mqTm5EFWAK8xTc3MgRO9AT/OtMYoA5ydwhXksVi0L4WshEsDr6WMxS1kYNwNRhAJ4Lx8sNrWMxsxAJIUHqJbTVh8tVvNAjZ8B7S4Ev8hax1MKnwEUQFJM9RTn/2jMDEQSCeC9jLjlzLgZmCa/LEiKSVVfqIfM+0LaxpNELR0QVgaugGht37CXUE8ITe9J1RfKaVGBYOOlNZO4O71uO9pV5hqwbq//5wEHVNgjJkwhD/k8NXYtFEE3gLd+ll6qB+FQBEoAAAAASUVORK5CYII=";

const ALARM = "region-align-check";

async function getSettings() {
  const { settings } = await chrome.storage.local.get("settings");
  return { ...DEFAULT_SETTINGS, ...(settings || {}) };
}

async function schedule() {
  const s = await getSettings();
  chrome.alarms.create(ALARM, { periodInMinutes: Math.max(15, s.checkIntervalMinutes || 30) });
}

async function doCheck(fromAlarm) {
  const settings = await getSettings();
  let ip = null;
  try { ip = await fetchIpInfo(); } catch (e) { /* 查不到就按 unknown 处理 */ }
  const result = evaluateAlignment(
    { ip, deviceTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone, browserLanguage: "zh-CN" },
    settings
  );
  const prev = (await chrome.storage.local.get("lastCheck")).lastCheck;
  await chrome.storage.local.set({ lastCheck: { ip, result, checkedAt: Date.now() } });

  const badge = { ok: ["✓", "#1a9e4b"], low: ["!", "#d9a400"], medium: ["!", "#d97c00"],
                  high: ["!!", "#cf2e24"], unknown: ["?", "#8a90a3"] }[result.level];
  chrome.action.setBadgeText({ text: badge[0] });
  chrome.action.setBadgeBackgroundColor({ color: badge[1] });

  const rank = { ok: 0, low: 1, unknown: 1, medium: 2, high: 3 };
  const gotWorse = !prev || rank[result.level] > rank[prev.result.level];
  if (fromAlarm && settings.notifyOnRisk && gotWorse && (result.level === "high" || result.level === "medium")) {
    chrome.notifications.create("region-align-" + Date.now(), {
      type: "basic",
      iconUrl: NOTIFY_ICON,
      title: result.level === "high" ? "🚨 地区对不上了" : "⚠️ 地区有点对不上",
      message: result.summary
    }, () => void chrome.runtime.lastError); // 通知发不出去也不影响检测本身
  }
  return result;
}

chrome.runtime.onInstalled.addListener(async () => { await schedule(); await doCheck(false); });
chrome.runtime.onStartup.addListener(async () => { await schedule(); await doCheck(false); });
chrome.alarms.onAlarm.addListener((a) => { if (a.name === ALARM) doCheck(true); });
chrome.storage.onChanged.addListener((changes, area) => { if (area === "local" && changes.settings) schedule(); });
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === "check-now") { doCheck(false).then(r => sendResponse({ ok: true, result: r })); return true; }
});
