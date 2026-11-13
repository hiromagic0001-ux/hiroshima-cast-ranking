import http from "node:http";
import * as cheerio from "cheerio";

const PORT = Number(process.env.PORT || 10000);
const SOURCE_URL = "https://estama.jp/etc/ranking/therapist/3401/";
const ALLOWED_ORIGIN = "https://hiroshima-cast-portal.onrender.com";
let lastFetchAt = 0;
let cachedInspection = null;

function send(res, status, body, origin) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "access-control-allow-origin": origin === ALLOWED_ORIGIN ? origin : ALLOWED_ORIGIN,
    "vary": "Origin"
  });
  res.end(JSON.stringify(body));
}

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin || "";
  const requestUrl = new URL(req.url || "/", "http://localhost");
  let pathname = decodeURIComponent(requestUrl.pathname);
  for (const invisible of ["\u200B", "\u200C", "\u200D", "\u2060", "\uFEFF"]) pathname = pathname.split(invisible).join("");
  while (pathname.length > 1 && pathname.endsWith("/")) pathname = pathname.slice(0, -1);
  console.log(JSON.stringify({ event: "request", method: req.method, path: pathname, origin: origin || null }));
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "access-control-allow-origin": ALLOWED_ORIGIN,
      "access-control-allow-methods": "GET, OPTIONS",
      "access-control-allow-headers": "Content-Type",
      "access-control-max-age": "600"
    });
    return res.end();
  }
  if (pathname === "/health" && req.method === "GET") {
    return send(res, 200, { ok: true, service: "hiroshima-cast-refresh-api", mode: "diagnostic-only" }, origin);
  }
  if (pathname !== "/api/estama/inspect" || req.method !== "GET") {
    return send(res, 404, { ok: false, error: "not_found" }, origin);
  }
  if (origin && origin !== ALLOWED_ORIGIN) {
    return send(res, 403, { ok: false, error: "origin_not_allowed" }, origin);
  }
  const now = Date.now();
  if (cachedInspection && now - lastFetchAt < 30000) {
    return send(res, 200, { ...cachedInspection, cached: true }, origin);
  }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    let response;
    try {
      response = await fetch(SOURCE_URL, {
        signal: controller.signal,
        headers: {
          "user-agent": "Mozilla/5.0 (compatible; HiroshimaCastRefresh/1.0)",
          "accept": "text/html,application/xhtml+xml"
        }
      });
    } finally {
      clearTimeout(timer);
    }
    if (!response.ok) throw new Error("source_http_" + response.status);
    const html = await response.text();
    if (html.length < 10000 || html.length > 5000000) throw new Error("unexpected_html_size");
    const $ = cheerio.load(html);
    const title = $("title").first().text().trim();
    const titleMatched = /セラピスト.*人気ランキング|セラピストの人気ランキング/.test(title);
    const rankingItems = [];
    $("ul.main_ranking_list > li").each((_, li) => {
      const item = $(li);
      const link = item.find('a[href*="/shop/"][href*="/cast/"]').filter((__, a) =>
        /\/shop\/\d+\/cast\/\d+\/?/.test($(a).attr("href") || "")
      ).first();
      if (!link.length) return;
      const href = link.attr("href") || "";
      const text = item.text().replace(/\s+/g, " ").trim();
      const rankClass = (item.find('[class*="therapist_rank_no"]').attr("class") || item.attr("class") || "").match(/therapist_rank_no(\d+)/);
      const rankText = text.match(/^\s*(\d{1,2})\s+/);
      const rank = rankClass ? Number(rankClass[1]) : (rankText ? Number(rankText[1]) : null);
      const name = link.find(".cast_name").first().text().trim() || link.text().replace(/\s+/g, " ").trim();
      const isPR = /(?:^|\s)PR(?:\s|$)/i.test(text) || /PR/.test(item.attr("class") || "");
      const isHiroshima = /広島市/.test(text) && !/岡山市|山口市|下関市|周南市/.test(text);
      rankingItems.push({ rank, name, href, isPR, isHiroshima, text: text.slice(0, 360) });
    });
    const uniqueRanked = rankingItems.filter(x => Number.isInteger(x.rank) && x.rank >= 1 && x.rank <= 30);
    const accepted = uniqueRanked.filter(x => !x.isPR && x.isHiroshima && x.name);
    const uniqueAccepted = [...new Map(accepted.map(x => [x.href, x])).values()];
    const profileLinks = $('a[href*="/shop/"][href*="/cast/"]').filter((_, el) => { const href = $(el).attr("href") || ""; return href.includes("/shop/") && href.includes("/cast/"); });
    const rankTextMatches = uniqueRanked.length;
    const prMarkers = rankingItems.filter(x => x.isPR).length;
    const inspection = {
      ok: titleMatched && uniqueRanked.length >= 20 && uniqueAccepted.length >= 15,
      validation: {
        titleMatched,
        profileLinkCount: profileLinks.length,
        rankingItemCount: rankingItems.length,
        rankedItemCount: uniqueRanked.length,
        acceptedHiroshimaCount: uniqueAccepted.length,
        profileLinkThreshold: 20
      },
      mode: "diagnostic-only",
      source: SOURCE_URL,
      retrievedAt: new Date().toISOString(),
      httpStatus: response.status,
      htmlBytes: Buffer.byteLength(html),
      title,
      candidateProfileLinks: profileLinks.length,
      rankTextMatches,
      prMarkers,
      records: uniqueAccepted.map(({ rank, name, href }) => ({ rank, name, href })),
      samples: rankingItems.slice(0, 8),
      note: "解析構造の確認専用。順位データの公開・既存データの上書きは行いません。"
    };
    if (inspection.ok) {
      cachedInspection = inspection;
      lastFetchAt = now;
    }
    return send(res, 200, inspection, origin);
  } catch (error) {
    return send(res, 502, {
      ok: false,
      status: "更新未確認",
      source: SOURCE_URL,
      error: String(error?.message || error),
      note: "取得または構造検証に失敗したため、既存データには触れていません。"
    }, origin);
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log("Hiroshima cast refresh API listening on " + PORT);
});
