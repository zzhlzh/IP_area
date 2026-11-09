/* popup：打开就实时检测一次，并展示人话结论 */
const $ = (id) => document.getElementById(id);

async function getSettings() {
  const { settings } = await chrome.storage.local.get("settings");
  return { ...DEFAULT_SETTINGS, ...(settings || {}) };
}

function render(result, ip, settings, checkedAt) {
  const box = $("status");
  box.className = "status " + result.level;
  const emoji = { ok: "✅", low: "🙂", medium: "⚠️", high: "🚨", unknown: "❔" }[result.level];
  const title = { ok: "都对得上，放心", low: "基本对得上", medium: "有小地方对不上",
                  high: "对不上，先别做敏感操作", unknown: "这次没查出来" }[result.level];
  $("status-emoji").textContent = emoji;
  $("status-title").textContent = title;
  $("status-summary").textContent = result.summary;

  $("fact-home").textContent = `${settings.homeLabel || ""} · ${countryName(settings.homeCountry)}`.trim();
  $("fact-ip").textContent = ip
    ? `${countryName(ip.country_code)}${ip.city ? " · " + ip.city : ""}${ip.ip ? " · " + ip.ip : ""}`
    : "查询失败";
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "未知";
  $("fact-tz").textContent = `${tz}${result.facts.tzCountry ? "（" + countryName(result.facts.tzCountry) + "）" : ""}`;
  $("fact-lang").textContent = navigator.language || "未知";

  const acct = $("accounts");
  acct.innerHTML = "";
  for (const [name, region] of Object.entries(settings.accountRegions || {})) {
    const row = document.createElement("div");
    row.className = "acct-row";
    const left = document.createElement("span");
    left.textContent = name;
    const right = document.createElement("span");
    right.textContent = countryName(region) + " ";
    const badge = document.createElement("span");
    const match = ip && region && String(region).toUpperCase() === String(ip.country_code).toUpperCase();
    badge.className = "badge " + (match ? "ok" : "bad");
    badge.textContent = ip ? (match ? "与 IP 一致" : "与 IP 不一致") : "未检测";
    right.appendChild(badge);
    row.appendChild(left);
    row.appendChild(right);
    acct.appendChild(row);
  }

  const ul = $("issues");
  ul.innerHTML = "";
  if (result.issues.length === 0) {
    const li = document.createElement("li");
    li.textContent = "没有发现地区冲突。";
    ul.appendChild(li);
  } else {
    for (const issue of result.issues) {
      const li = document.createElement("li");
      li.textContent = issue.text;
      ul.appendChild(li);
    }
  }
  $("checked-at").textContent = checkedAt ? "上次检测：" + new Date(checkedAt).toLocaleString("zh-CN") : "";
}

async function runCheck() {
  $("status-title").textContent = "正在检测…";
  const settings = await getSettings();
  let ip = null;
  try { ip = await fetchIpInfo(); } catch (e) { ip = null; }
  const input = {
    ip,
    deviceTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    browserLanguage: navigator.language
  };
  const result = evaluateAlignment(input, settings);
  const checkedAt = Date.now();
  await chrome.storage.local.set({ lastCheck: { ip, result, checkedAt } });
  render(result, ip, settings, checkedAt);
}

$("refresh").addEventListener("click", runCheck);
$("open-options").addEventListener("click", () => chrome.runtime.openOptionsPage());

// 先把上次检测结果立刻画出来（不等网络），再在后台刷新成最新结果
(async () => {
  const settings = await getSettings();
  const { lastCheck } = await chrome.storage.local.get("lastCheck");
  if (lastCheck && lastCheck.result) {
    render(lastCheck.result, lastCheck.ip, settings, lastCheck.checkedAt);
  }
  runCheck();
})();
