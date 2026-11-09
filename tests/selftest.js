// 用 Node 跑核心逻辑自测：node tests/selftest.js
const { evaluateAlignment, countryFromTimezone } = require("../lib/regions.js");
const settings = { homeCountry: "CN", homeLabel: "成都", accountRegions: { Google: "CN", Meta: "CN", Muse: "CN" } };

let fails = 0;
function check(name, cond) { console.log((cond ? "PASS" : "FAIL") + " - " + name); if (!cond) fails++; }

// 场景1：Jenifer 的典型情况——人在成都、IP 出口香港、时区上海
let r = evaluateAlignment({ ip: { country_code: "HK", timezone: "Asia/Hong_Kong" }, deviceTimezone: "Asia/Shanghai" }, settings);
check("香港出口应判为 high", r.level === "high");
check("应指出 IP 与常驻地不一致", r.issues.some(i => i.key === "ip-vs-home"));
check("应指出 IP 与 Meta 账号地区不一致", r.issues.some(i => i.key === "ip-vs-account-Meta"));
check("应指出 IP 时区与设备时区不一致", r.issues.some(i => i.key === "ip-tz-vs-device-tz"));

// 场景2：全部对齐（在成都、IP 中国、时区上海）
r = evaluateAlignment({ ip: { country_code: "CN", timezone: "Asia/Shanghai" }, deviceTimezone: "Asia/Shanghai" }, settings);
check("全部对齐应判为 ok 且无提醒", r.level === "ok" && r.issues.length === 0);

// 场景3：IP 查询失败
r = evaluateAlignment({ ip: null, deviceTimezone: "Asia/Shanghai" }, settings);
check("查不到 IP 应判为 unknown", r.level === "unknown");

// 场景4：时区映射
check("Asia/Shanghai -> CN", countryFromTimezone("Asia/Shanghai") === "CN");
check("America/New_York -> US", countryFromTimezone("America/New_York") === "US");
check("未知时区 -> null", countryFromTimezone("Mars/Olympus") === null);

// 场景5（异步）：第一个 IP 查询源失败时，应自动切换到备用源
const { fetchIpInfo } = require("../lib/regions.js");
(async () => {
  const mockFetch = async (url) => {
    if (url.includes("ipapi.co")) throw new Error("模拟限流");
    if (url.includes("ipwho.is")) return { ok: true, json: async () => ({ success: true, ip: "1.2.3.4", country_code: "HK", city: "Hong Kong", timezone: { id: "Asia/Hong_Kong" }, connection: { org: "TEST" } }) };
    throw new Error("不应走到第三个源");
  };
  try {
    const info = await fetchIpInfo(mockFetch);
    check("主源失败应自动切到备用源并拿到 HK", info.country_code === "HK" && info.source === "ipwho.is");
  } catch (e) {
    check("主源失败应自动切到备用源并拿到 HK（抛错: " + e.message + "）", false);
  }
  process.exit(fails ? 1 : 0);
})();
