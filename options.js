const $ = (id) => document.getElementById(id);
const PLATFORMS = ["Google", "Meta", "Muse", "Apple"];

async function load() {
  const { settings } = await chrome.storage.local.get("settings");
  const s = { ...DEFAULT_SETTINGS, ...(settings || {}) };
  $("homeCountry").value = s.homeCountry || "CN";
  $("homeLabel").value = s.homeLabel || "";
  $("interval").value = s.checkIntervalMinutes || 30;
  $("notify").checked = s.notifyOnRisk !== false;

  const box = $("accounts");
  box.innerHTML = "";
  for (const name of PLATFORMS) {
    const label = document.createElement("label");
    label.textContent = name + " 账号地区（国家/地区代码）";
    const input = document.createElement("input");
    input.id = "acct-" + name;
    input.value = (s.accountRegions && s.accountRegions[name]) || "";
    input.placeholder = "例如 CN / HK / US";
    label.appendChild(input);
    box.appendChild(label);
  }
}

$("save").addEventListener("click", async () => {
  const accountRegions = {};
  const bad = [];
  const isCode = (v) => /^[A-Z]{2}$/.test(v);
  for (const name of PLATFORMS) {
    const v = $("acct-" + name).value.trim().toUpperCase();
    accountRegions[name] = v;
    if (v && !isCode(v)) bad.push(name);
  }
  const home = $("homeCountry").value.trim().toUpperCase() || "CN";
  if (!isCode(home)) bad.push("常驻地");
  if (bad.length) {
    $("saved").textContent = "⚠ " + bad.join("、") + " 的地区代码不对：应是两位大写字母，如 CN / HK / US。先改好再保存。";
    return;
  }
  const settings = {
    homeCountry: home,
    homeLabel: $("homeLabel").value.trim(),
    accountRegions,
    checkIntervalMinutes: Math.max(15, parseInt($("interval").value, 10) || 30),
    notifyOnRisk: $("notify").checked
  };
  await chrome.storage.local.set({ settings });
  $("saved").textContent = "已保存 ✓ 正在按新设置重新检测…";
  chrome.runtime.sendMessage({ type: "check-now" }, () => setTimeout(() => ($("saved").textContent = "已保存 ✓"), 800));
});

load();
