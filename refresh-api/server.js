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
  const decodedPath = decodeURIComponent(requestUrl.pathname);
  const pathname = decodedPath.replace(/[\\u200B-\\u200D\\u2060\\uFEFF]/g, "").replace(/\\/+$/, "") || "/";
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
    const profileLinks = $('a[href*="/shop/"][href*="/cast/"]').filter((_, el) => {
      return /\/shop\/\d+\/cast\/\d+\/?/.test($(el).attr("href") || "");
    });
    const samples = [];
    profileLinks.slice(0, 8).each((_, el) => {
      const anchor = $(el);
      const ancestors = [];
      let node = anchor;
      for (let level = 1; level <= 7; level++) {
        node = node.parent();
        if (!node.length) break;
        const text = node.text().replace(/\s+/g, " ").trim();
        ancestors.push({
          level,
          tag: node.get(0)?.tagName || "",
          className: (node.attr("class") || "").slice(0, 180),
          id: node.attr("id") || "",
          text: text.slice(0, 650)
        });
      }
      samples.push({
        name: anchor.text().replace(/\s+/g, " ").trim(),
        href: anchor.attr("href"),
        ancestors
      });
    });
    const rankTextMatches = (html.match(/>\s*(?:[1-9]|[12]\d|30)\s*</g) || []).length;
    const prMarkers = (html.match(/>\s*PR\s*</gi) || []).length;
    const inspection = {
      ok: title.includes("セラピストランキング") && profileLinks.length >= 20,
      validation: {
        titleMatched: title.includes("セラピストランキング"),
        profileLinkCount: profileLinks.length,
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
      samples,
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
