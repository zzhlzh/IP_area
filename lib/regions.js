/* 地区数据与对齐判断逻辑 —— popup / options / background 共用
 * 纯函数为主，方便自测：evaluateAlignment(input, settings) -> { level, score, issues, summary }
 */

const COUNTRY_NAMES_ZH = {
  CN: "中国", HK: "中国香港", TW: "中国台湾", MO: "中国澳门",
  US: "美国", CA: "加拿大", JP: "日本", SG: "新加坡",
  KR: "韩国", GB: "英国", DE: "德国", FR: "法国", AU: "澳大利亚",
  NL: "荷兰", CH: "瑞士", SE: "瑞典", IN: "印度", RU: "俄罗斯",
  BR: "巴西", MX: "墨西哥", TH: "泰国", VN: "越南", MY: "马来西亚",
  ID: "印度尼西亚", PH: "菲律宾", NZ: "新西兰", IT: "意大利", ES: "西班牙"
};

function countryName(code) {
  if (!code) return "未知";
  const up = String(code).toUpperCase();
  return COUNTRY_NAMES_ZH[up] ? `${COUNTRY_NAMES_ZH[up]} (${up})` : up;
}

/* 常见 IANA 时区 -> 国家/地区代码。只覆盖常用项，未知时区返回 null，不硬猜。 */
const TIMEZONE_TO_COUNTRY = {
  "Asia/Shanghai": "CN", "Asia/Chongqing": "CN", "Asia/Chungking": "CN",
  "Asia/Harbin": "CN", "Asia/Urumqi": "CN", "Asia/Beijing": "CN",
  "Asia/Hong_Kong": "HK", "Asia/Taipei": "TW", "Asia/Macau": "MO",
  "Asia/Tokyo": "JP", "Asia/Singapore": "SG", "Asia/Seoul": "KR",
  "Asia/Bangkok": "TH", "Asia/Ho_Chi_Minh": "VN", "Asia/Kuala_Lumpur": "MY",
  "Asia/Jakarta": "ID", "Asia/Manila": "PH", "Asia/Kolkata": "IN",
  "America/New_York": "US", "America/Chicago": "US", "America/Denver": "US",
  "America/Los_Angeles": "US", "America/Anchorage": "US", "Pacific/Honolulu": "US",
  "America/Toronto": "CA", "America/Vancouver": "CA",
  "Europe/London": "GB", "Europe/Berlin": "DE", "Europe/Paris": "FR",
  "Europe/Moscow": "RU", "Europe/Amsterdam": "NL", "Europe/Zurich": "CH",
  "Europe/Stockholm": "SE", "Europe/Rome": "IT", "Europe/Madrid": "ES",
  "Australia/Sydney": "AU", "Australia/Perth": "AU",
  "Pacific/Auckland": "NZ", "America/Sao_Paulo": "BR", "America/Mexico_City": "MX"
};

function countryFromTimezone(tz) {
  return TIMEZONE_TO_COUNTRY[tz] || null;
}

const DEFAULT_SETTINGS = {
  homeCountry: "CN",
  homeLabel: "成都 · 天府新区",
  // 账号地区需要用户在设置页按各平台账户中心里显示的实际地区填写，
  // 扩展无法（也不应）绕过登录去替用户读取各平台的账号地区。
  accountRegions: {
    Google: "CN",
    Meta: "CN",
    Muse: "CN",
    Apple: "CN"
  },
  checkIntervalMinutes: 30,
  notifyOnRisk: true
};

/**
 * @param {object} input
 *   ip: { ip, country_code, city, region, org, timezone } | null
 *   deviceTimezone: string (IANA)
 *   browserLanguage: string e.g. "zh-CN"
 * @param {object} settings 见 DEFAULT_SETTINGS
 */
function evaluateAlignment(input, settings) {
  const s = { ...DEFAULT_SETTINGS, ...(settings || {}) };
  const issues = [];
  const ip = input && input.ip ? input.ip : null;
  const ipCountry = ip && ip.country_code ? String(ip.country_code).toUpperCase() : null;
  const tz = (input && input.deviceTimezone) || null;
  const tzCountry = tz ? countryFromTimezone(tz) : null;

  // 1) IP 出口 vs 常驻地
  if (!ipCountry) {
    issues.push({ level: "unknown", key: "ip-missing",
      text: "这次没有查到你的 IP 出口地（网络异常或查询服务限流），暂时无法判断，稍后点「重新检测」再试。" });
  } else if (ipCountry !== s.homeCountry) {
    issues.push({ level: "high", key: "ip-vs-home",
      text: `IP 出口在 ${countryName(ipCountry)}，但你的常驻地是 ${countryName(s.homeCountry)}。从网站看，你像是从${COUNTRY_NAMES_ZH[ipCountry] || ipCountry}登录的——登录 Meta / Google、改账号设置时，很可能被记成异地并触发安全提醒。` });
  }

  // 2) 设备时区推断的地区 vs 常驻地
  if (tz && tzCountry && tzCountry !== s.homeCountry) {
    issues.push({ level: "medium", key: "tz-vs-home",
      text: `设备时区是 ${tz}（对应 ${countryName(tzCountry)}），和常驻地 ${countryName(s.homeCountry)} 对不上。有些服务会拿时区辅助判断地区。` });
  }

  // 3) IP 报告的时区 vs 设备时区
  if (ip && ip.timezone && tz && ip.timezone !== tz) {
    issues.push({ level: "medium", key: "ip-tz-vs-device-tz",
      text: `IP 那边的时区是 ${ip.timezone}，设备时区是 ${tz}，两者不一致——这是代理/VPN 出口与本地设备对不上的典型信号，最容易触发风控。` });
  }

  // 4) IP 出口 vs 每个账号的地区
  if (ipCountry && s.accountRegions) {
    for (const [name, region] of Object.entries(s.accountRegions)) {
      if (!region) continue;
      const r = String(region).toUpperCase();
      if (r !== ipCountry) {
        issues.push({ level: "high", key: `ip-vs-account-${name}`,
          text: `${name} 账号地区是 ${countryName(r)}，但当前 IP 出口在 ${countryName(ipCountry)}。在这个网络下用 ${name}，可能出现安全警告，或像视频生成这类按地区开放的功能被判定不可用。` });
      }
    }
  }

  // 5) 账号地区之间彼此不一致（提醒用户自己核对账户中心）
  const regions = Object.values(s.accountRegions || {}).filter(Boolean).map(v => String(v).toUpperCase());
  if (new Set(regions).size > 1) {
    issues.push({ level: "low", key: "accounts-differ",
      text: "你填写的几个账号地区彼此不一致。如果不是你有意这样设置，建议去各平台账户中心核对一遍。" });
  }

  const hasHigh = issues.some(i => i.level === "high");
  const hasMedium = issues.some(i => i.level === "medium");
  const unknownOnly = issues.length > 0 && issues.every(i => i.level === "unknown");

  let level, summary;
  if (issues.length === 0) {
    level = "ok";
    summary = "都对得上：IP 出口、设备时区和账号地区一致，触发安全警告的概率低。";
  } else if (unknownOnly) {
    level = "unknown";
    summary = "暂时查不到 IP 出口，这次没法下结论。";
  } else if (hasHigh) {
    level = "high";
    summary = "对不上，而且是关键项：现在做登录、改设置、开地区限定功能这类操作，比较容易触发安全警告或被限制。";
  } else if (hasMedium) {
    level = "medium";
    summary = "有小地方对不上，一般不影响日常使用，但敏感操作前值得留意。";
  } else {
    level = "low";
    summary = "基本对得上，只有次要项不一致。";
  }

  return { level, issues, summary,
    facts: { ipCountry, tz, tzCountry, homeCountry: s.homeCountry } };
}

/* 依次尝试多个公开 IP 查询服务，归一化返回。浏览器扩展环境可用。 */
async function fetchIpInfo(fetchFn, timeoutMs) {
  const raw = fetchFn || (typeof fetch !== "undefined" ? fetch : null);
  if (!raw) throw new Error("当前环境没有 fetch");
  const timeout = timeoutMs || 6000;
  // 每个查询源最多等 timeout 毫秒，卡住就自动换下一个源，不让面板一直转圈
  const f = fetchFn ? raw : (url) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeout);
    return raw(url, { signal: ctrl.signal }).finally(() => clearTimeout(t));
  };
  const attempts = [
    async () => {
      const r = await f("https://ipapi.co/json/");
      if (!r.ok) throw new Error("ipapi " + r.status);
      const j = await r.json();
      if (!j.country_code) throw new Error("ipapi no country");
      return { ip: j.ip, country_code: j.country_code, city: j.city, region: j.region,
               org: j.org, timezone: j.timezone, source: "ipapi.co" };
    },
    async () => {
      const r = await f("https://ipwho.is/");
      if (!r.ok) throw new Error("ipwho " + r.status);
      const j = await r.json();
      if (!j.success || !j.country_code) throw new Error("ipwho failed");
      return { ip: j.ip, country_code: j.country_code, city: j.city, region: j.region && j.region,
               org: j.connection && j.connection.org, timezone: j.timezone && j.timezone.id, source: "ipwho.is" };
    },
    async () => {
      const r = await f("https://api.country.is/");
      if (!r.ok) throw new Error("country.is " + r.status);
      const j = await r.json();
      if (!j.country) throw new Error("country.is no country");
      return { ip: j.ip, country_code: j.country, city: null, region: null, org: null, timezone: null, source: "api.country.is" };
    }
  ];
  let lastErr;
  for (const a of attempts) { try { return await a(); } catch (e) { lastErr = e; } }
  throw lastErr || new Error("所有 IP 查询服务都失败了");
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { COUNTRY_NAMES_ZH, TIMEZONE_TO_COUNTRY, DEFAULT_SETTINGS,
                     countryName, countryFromTimezone, evaluateAlignment, fetchIpInfo };
}
