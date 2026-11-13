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
  if (pathname === "/api/stores/inspect" && req.method === "GET") {
    if (origin && origin !== ALLOWED_ORIGIN) return send(res, 403, { ok: false, error: "origin_not_allowed" }, origin);
    const sources = [
      { id: "salonowa", label: "サロノワ・また行きたい順", url: "https://www.salonowa.jp/area/hiroshima/hiroshima" },
      { id: "mensesthe_rank", label: "メンズエステ情報ランキング・アクセス順", url: "https://mensesthe-rank.jp/areas/hiroshima-hiroshima" },
      { id: "menes_note", label: "メンエスノート・口コミ情報", url: "https://men-esthe-review.com/area/%E5%BA%83%E5%B3%B6%E5%B8%82" }
    ];
    const results = await Promise.all(sources.map(async source => {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 15000);
        let response;
        try {
          response = await fetch(source.url, { signal: controller.signal, headers: {
            "user-agent": "Mozilla/5.0 (compatible; HiroshimaCastRefresh/1.0)",
            "accept": "text/html,application/xhtml+xml"
          }});
        } finally { clearTimeout(timer); }
        if (!response.ok) throw new Error("source_http_" + response.status);
        const html = await response.text();
        if (html.length < 5000 || html.length > 5000000) throw new Error("unexpected_html_size");
        const $ = cheerio.load(html);
        const title = $("title").first().text().replace(/\s+/g, " ").trim();
        const bodyText = $("body").text().replace(/\s+/g, " ").trim();
        const links = new Set();
        const candidateLinks = [];
        const storeLinks = [];
        $("a[href]").each((_, el) => {
          const href = $(el).attr("href") || "";
          const label = $(el).text().replace(/\s+/g, " ").trim();
          if (!href || href.startsWith("#") || href.startsWith("javascript:")) return;
          let absolute;
          try { absolute = new URL(href, source.url); } catch { return; }
          links.add(absolute.origin + absolute.pathname);
          let node = $(el);
          const ancestors = [];
          for (let depth = 0; depth < 4 && node.length; depth++, node = node.parent()) {
            ancestors.push({
              tag: node[0]?.tagName || "",
              className: String(node.attr("class") || "").slice(0, 120),
              text: node.text().replace(/\s+/g, " ").trim().slice(0, 260)
            });
          }
          const item = { text: label, href: absolute.href, ancestors };
          if (label.length >= 2 && label.length <= 45) candidateLinks.push(item);
          if ((source.id === "salonowa" && /\/shop\/[^/]+\/paid/.test(absolute.pathname)) ||
              (source.id === "mensesthe_rank" && /\/areas\/hiroshima-hiroshima\/shops\//.test(absolute.pathname)) ||
              (source.id === "menes_note" && /\/stores\/[0-9a-f-]+/.test(absolute.pathname))) {
            storeLinks.push(item);
          }
        });
        const countMentions = [...bodyText.matchAll(/(?:全\s*)?([0-9,]+)\s*(?:店舗|店|件|口コミ)/g)]
          .slice(0, 12).map(m => m[0]);
        const headingSamples = $("h1,h2,h3").toArray().map(el => $(el).text().replace(/\s+/g, " ").trim()).filter(Boolean).slice(0, 24);
        const valid = title.length > 0 && bodyText.length > 1000 && links.size >= 10;
        return { id: source.id, label: source.label, url: source.url, ok: valid,
          httpStatus: response.status, htmlBytes: Buffer.byteLength(html), title,
          uniqueLinkCount: links.size, countMentions, headingSamples,
          storeLinkCount: storeLinks.length, storeLinkSamples: storeLinks.slice(0, 12),
          candidateLinks: candidateLinks.slice(0, 8), retrievedAt: new Date().toISOString(),
          note: valid ? "店舗リンクの親要素構造を診断用に抽出。順位・件数の確定抽出は未実施です。" : "ページ構造の検証条件を満たしません。" };
      } catch (error) {
        return { id: source.id, label: source.label, url: source.url, ok: false,
          status: "更新未確認", error: String(error?.message || error),
          note: "取得失敗時は既存データを変更しません。" };
      }
    }));
    return send(res, results.every(x => x.ok) ? 200 : 502, {
      ok: results.every(x => x.ok), mode: "diagnostic-only",
      metricPolicy: "媒体ごとの指標は独立して扱い、総合順位へ混合しません。",
      sources: results,
      note: "診断専用。店舗ランキングの公開・既存データの上書きは行いません。"
    }, origin);
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
      const rankMatch = text.match(/(?:^|\s)(\d{1,2})\s+(?=[^\d])/);
      const rank = rankClass ? Number(rankClass[1]) : (rankMatch ? Number(rankMatch[1]) : null);
      const cleaned = text.replace(/^[A-I]\s*cup\s+/i, "").replace(/^\d{1,2}\s+/, "");
      const nameMatch = cleaned.match(/^(.+?)(?:\s+T\d{2,3}\b|\s+B\d{2}\b|\s+\(\d{2}\)|\s+広島市|$)/);
      const name = (nameMatch ? nameMatch[1] : "").trim();
      const isPR = /(?:^|\s)PR(?:\s|$)/i.test(text) || /PR/.test(item.attr("class") || "");
      const isHiroshima = /広島市/.test(text) && !/岡山市|山口市|下関市|周南市/.test(text);
      rankingItems.push({ rank, name, href, isPR, isHiroshima });
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
      samples: rankingItems.slice(0, 8).map(({ rank, name, href, isPR, isHiroshima }) => ({ rank, name, href, isPR, isHiroshima })),
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
  // Run one compact source-structure inspection at boot so results can be reviewed
  // from Render logs without requiring the user to copy a large JSON response.
  setTimeout(async () => {
    try {
      const response = await fetch("http://127.0.0.1:" + PORT + "/api/stores/inspect");
      const report = await response.json();
      const compact = {
        event: "store_source_inspection",
        ok: report.ok,
        mode: report.mode,
        retrievedAt: new Date().toISOString(),
        sources: (report.sources || []).map(source => ({
          id: source.id,
          ok: source.ok,
          httpStatus: source.httpStatus || null,
          title: source.title || null,
          storeLinkCount: source.storeLinkCount || 0,
          countMentions: source.countMentions || [],
          samples: (source.storeLinkSamples || []).slice(0, 3).map(item => ({
            text: item.text,
            href: item.href,
            ancestors: (item.ancestors || []).slice(0, 3).map(node => ({
              tag: node.tag,
              className: node.className,
              text: node.text.slice(0, 110)
            }))
          })),
          error: source.error || null
        }))
      };
      console.log("STORE_SOURCE_INSPECTION " + JSON.stringify(compact));
    } catch (error) {
      console.log("STORE_SOURCE_INSPECTION " + JSON.stringify({
        event: "store_source_inspection",
        ok: false,
        error: String(error?.message || error)
      }));
    }
  }, 1200);
});
