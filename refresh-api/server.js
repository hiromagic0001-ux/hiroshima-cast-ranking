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
        // Extract source-specific candidates without combining incomparable metrics.
        let parsedRecords = [];
        let parserValidation = {};
        if (source.id === "salonowa") {
          const addSalonowaCards = (page$, pageUrl) => {
            page$(".c-card__body").each((_, el) => {
              const card = page$(el);
              const name = card.find("h2,h3,[class*='shop-card__name'],[class*='shop-card__title']").first().text().replace(/\\s+/g, " ").trim();
              if (!name || name.length > 70 || parsedRecords.some(item => item.name === name)) return;
              const ratingText = card.find("a.c-rating--voice").first().text().replace(/\\s+/g, " ").trim();
              const ratingMatch = ratingText.match(/([0-5]\\.\\d)\\s*\\(([\\d,]+)件\\)/);
              const shopAnchor = card.find("a[href*='/shop/']").first();
              const hrefRaw = shopAnchor.attr("href") || "";
              const href = hrefRaw ? new URL(hrefRaw, pageUrl).href : null;
              parsedRecords.push({ rank: parsedRecords.length + 1, name, href,
                rating: ratingMatch ? Number(ratingMatch[1]) : null,
                reviewCount: ratingMatch ? Number(ratingMatch[2].replace(/,/g, "")) : null,
                metric: "また行きたい順" });
            });
          };
          addSalonowaCards($, source.url);
          parserValidation = { cardSelectorCount: $(".c-card__body").length, parsedCount: parsedRecords.length,
            expectedDisplayCount: 52, linkedCount: parsedRecords.filter(x => x.href).length,
            unlinkedCount: parsedRecords.filter(x => !x.href).length };
        } else if (source.id === "mensesthe_rank") {
          $("a.font-bold.text-primary[href*='/areas/hiroshima-hiroshima/shops/']").each((_, el) => {
            const anchor = $(el);
            const href = anchor.attr("href") || "";
            if (/\\/casts?\\//.test(href)) return;
            const name = anchor.text().replace(/\\s+/g, " ").trim();
            if (!name || name.length > 80) return;
            parsedRecords.push({ rank: parsedRecords.length + 1, name, href: new URL(href, source.url).href, metric: "アクセス人気順" });
          });
          parsedRecords = [...new Map(parsedRecords.map(x => [x.href, x])).values()];
          parserValidation = { parsedCount: parsedRecords.length, expectedDisplayCount: 107 };
        } else if (source.id === "menes_note") {
          $("a[href*='/stores/']").each((_, el) => {
            const href = $(el).attr("href") || "";
            if (/\/stores\/[0-9a-f-]+/i.test(href) === false || /#/.test(href)) return;
            const anchor = $(el);
            const rawText = anchor.text().replace(/\s+/g, " ").trim();
            const ratingMatch = rawText.match(/([0-5]\.\d)（([\d,]+)件）/);
            const name = anchor.find("h2,h3").first().text().replace(/\s+/g, " ").trim()
              || rawText.match(/^(.+?)(?=中電前駅|宝町|袋町|市役所前駅|八丁堀|広島駅|日本人ルーム|ルームオイル|オイル)/)?.[1]?.trim()
              || rawText.slice(0, 45);
            if (!name) return;
            parsedRecords.push({ rank: parsedRecords.length + 1, name, href: new URL(href, source.url).href,
              rating: ratingMatch ? Number(ratingMatch[1]) : null,
              reviewCount: ratingMatch ? Number(ratingMatch[2].replace(/,/g, "")) : null,
              metric: "口コミ評価" });
          });
          parsedRecords = [...new Map(parsedRecords.map(x => [x.href, x])).values()];
          parserValidation = { parsedCount: parsedRecords.length, expectedDisplayCount: 152 };
        }
        const paginationLinks = $("a[href]").toArray().map(el => {
          const href = $(el).attr("href") || "";
          const text = $(el).text().replace(/\s+/g, " ").trim();
          return { text, href: new URL(href, source.url).href };
        }).filter(x => /page=|次へ|次のページ|もっと見る|load more/i.test(x.href + " " + x.text) || x.href.includes("/page/")).slice(0, 20);
        const pageDiagnostics = [];
        const salonowaCardNames = source.id === "salonowa"
          ? [...new Set($(".c-card__body").toArray().map(el => $(el).find("h2,h3,[class*='shop-card__name'],[class*='shop-card__title']").first().text().replace(/\s+/g, " ").trim()).filter(Boolean))]
          : [];
        let additionalPageCount = 0;
        const maxPage = Math.min(12, Math.max(1, ...paginationLinks.map(item => {
          try { return Number(new URL(item.href).searchParams.get("page") || 1); } catch { return 1; }
        })));
        if (source.id === "salonowa" || source.id === "menes_note") {
          for (let pageNo = 2; pageNo <= maxPage; pageNo++) {
            const pageUrl = new URL(source.url);
            pageUrl.searchParams.set("page", String(pageNo));
            const pageResponse = await fetch(pageUrl.href, { headers: {
              "user-agent": "Mozilla/5.0 (compatible; HiroshimaCastRefresh/1.0)",
              "accept": "text/html,application/xhtml+xml"
            }});
            if (!pageResponse.ok) throw new Error(source.id + "_page_" + pageNo + "_http_" + pageResponse.status);
            const pageHtml = await pageResponse.text();
            if (pageHtml.length < 3000) throw new Error(source.id + "_page_" + pageNo + "_too_small");
            const page$ = cheerio.load(pageHtml);
            const beforeCount = parsedRecords.length;
            if (source.id === "salonowa") {
              page$(".c-card__body").each((_, el) => {
                const card = page$(el);
                const name = card.find("h2,h3,[class*='shop-card__name'],[class*='shop-card__title']").first().text().replace(/\\s+/g, " ").trim();
                if (!name || name.length > 70 || parsedRecords.some(item => item.name === name)) return;
                const ratingText = card.find("a.c-rating--voice").first().text().replace(/\\s+/g, " ").trim();
                const ratingMatch = ratingText.match(/([0-5]\\.\\d)\\s*\\(([\\d,]+)件\\)/);
                const shopAnchor = card.find("a[href*='/shop/']").first();
                const hrefRaw = shopAnchor.attr("href") || "";
                parsedRecords.push({ rank: parsedRecords.length + 1, name, href: hrefRaw ? new URL(hrefRaw, pageUrl.href).href : null,
                  rating: ratingMatch ? Number(ratingMatch[1]) : null,
                  reviewCount: ratingMatch ? Number(ratingMatch[2].replace(/,/g, "")) : null,
                  metric: "また行きたい順" });
              });
            } else {
              page$("a[href*='/stores/']").each((_, el) => {
                const href = page$(el).attr("href") || "";
                if (!/\/stores\/[0-9a-f-]+/i.test(new URL(href, pageUrl.href).pathname) || /#/.test(href)) return;
                const anchor = page$(el);
                const rawText = anchor.text().replace(/\s+/g, " ").trim();
                const ratingMatch = rawText.match(/([0-5]\.\d)（([\d,]+)件）/);
                const name = anchor.find("h2,h3").first().text().replace(/\s+/g, " ").trim()
                  || rawText.match(/^(.+?)(?=中電前駅|宝町|袋町|市役所前駅|八丁堀|広島駅|日本人ルーム|ルームオイル|オイル)/)?.[1]?.trim()
                  || rawText.slice(0, 45);
                if (!name) return;
                parsedRecords.push({ rank: parsedRecords.length + 1, name, href: new URL(href, pageUrl.href).href,
                  rating: ratingMatch ? Number(ratingMatch[1]) : null,
                  reviewCount: ratingMatch ? Number(ratingMatch[2].replace(/,/g, "")) : null,
                  metric: "口コミ評価" });
              });
            }
            parsedRecords = [...new Map(parsedRecords.map(item => [item.href, item])).values()];
            const pageCardNames = source.id === "salonowa"
              ? [...new Set(page$(".c-card__body").toArray().map(el => page$(el).find("h2,h3,[class*='shop-card__name'],[class*='shop-card__title']").first().text().replace(/\s+/g, " ").trim()).filter(Boolean))]
              : [];
            pageDiagnostics.push({ page: pageNo, htmlBytes: Buffer.byteLength(pageHtml),
              cardBodyCount: source.id === "salonowa" ? page$(".c-card__body").length : null,
              uniqueCardNameCount: pageCardNames.length, parsedBefore: beforeCount,
              parsedAfter: parsedRecords.length, pageNameSamples: pageCardNames.slice(0, 8) });
            if (parsedRecords.length > beforeCount) additionalPageCount++;
          }
          parserValidation = { ...parserValidation, parsedCount: parsedRecords.length, additionalPageCount,
            salonowaCardNameCount: source.id === "salonowa" ? salonowaCardNames.length : undefined,
            expectedDisplayCount: source.id === "salonowa" ? 52 : 152 };
        }
        const salonUnlinkedCards = source.id === "salonowa" ? $(".c-card__body").toArray().map(el => {
          const card = $(el);
          const name = card.find("h2,h3,[class*='shop-card__name'],[class*='shop-card__title']").first().text().replace(/\s+/g, " ").trim();
          const anchors = card.find("a[href]").toArray().map(a => ({ text: $(a).text().replace(/\s+/g, " ").trim().slice(0, 60), href: $(a).attr("href") })).slice(0, 5);
          return { name, anchors };
        }).filter(item => !item.anchors.some(a => /\/shop\//.test(a.href || ""))).slice(0, 20) : [];
        const mensStoreLinkDiagnostics = source.id === "mensesthe_rank" ? [...new Map($("a[href*='/areas/hiroshima-hiroshima/shops/']").toArray().map(a => { const a$ = $(a); const href = a$.attr("href") || ""; const url = new URL(href, source.url); return [url.pathname, { href: url.href, text: a$.text().replace(/\s+/g, " ").trim().slice(0, 100), path: url.pathname }]; }).filter(([path]) => /^\/areas\/hiroshima-hiroshima\/shops\/[^/]+\/?$/.test(path)))].map(([, item]) => item) : [];
        const salonCardHtmlSamples = source.id === "salonowa" ? $(".c-card__body").toArray().filter(el => !$(el).find("a[href*='/shop/']").length).slice(0, 5).map(el => $(el).parent().html()?.slice(0, 1800) || $(el).html()?.slice(0, 1800)) : [];
        const mensShopHrefDiagnostics = source.id === "mensesthe_rank" ? [...new Set($("a[href*='/areas/hiroshima-hiroshima/shops/']").toArray().map(a => $(a).attr("href")).filter(Boolean))].slice(-15) : [];
        const salonCardSamples = source.id === "salonowa" ? $(".c-card__body").toArray().slice(0, 12).map(el => {
          const card = $(el);
          return {
            text: card.text().replace(/\s+/g, " ").trim().slice(0, 180),
            nameCandidates: card.find("h2,h3,[class*='shop-card__name'],[class*='shop-card__title']").toArray().map(n => $(n).text().replace(/\s+/g, " ").trim()).filter(Boolean).slice(0, 3),
            shopLinks: card.find("a[href*='/shop/']").toArray().map(a => ({ text: $(a).text().replace(/\s+/g, " ").trim(), href: $(a).attr("href") })).slice(0, 3),
            ratingText: card.find("a.c-rating--voice").first().text().replace(/\s+/g, " ").trim()
          };
        }) : [];
        const valid = title.length > 0 && bodyText.length > 1000 && links.size >= 10;
        return { id: source.id, label: source.label, url: source.url, ok: valid,
          httpStatus: response.status, htmlBytes: Buffer.byteLength(html), title,
          uniqueLinkCount: links.size, countMentions, headingSamples,
          storeLinkCount: storeLinks.length, storeLinkSamples: storeLinks.slice(0, 12),
          parserValidation, parsedCount: parsedRecords.length, parsedSamples: parsedRecords.slice(0, 5),
          paginationLinks, salonCardSamples, pageDiagnostics, salonowaCardNames: salonowaCardNames.slice(0, 20),
          salonUnlinkedCards, salonCardHtmlSamples, mensStoreLinkDiagnostics, mensShopHrefDiagnostics,
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
          parserValidation: source.parserValidation || {},
          parsedCount: source.parsedCount || 0,
          parsedSamples: (source.parsedSamples || []).slice(0, 5),
          paginationLinks: (source.paginationLinks || []).slice(0, 12),
          salonCardSamples: (source.salonCardSamples || []).slice(0, 8),
          pageDiagnostics: source.pageDiagnostics || [],
          salonowaCardNames: (source.salonowaCardNames || []).slice(0, 20),
          salonUnlinkedCards: (source.salonUnlinkedCards || []).slice(0, 20),
          mensShopHrefDiagnostics: source.mensShopHrefDiagnostics || [],
          mensStoreLinkDiagnostics: source.mensStoreLinkDiagnostics || [],
          salonCardHtmlSamples: source.salonCardHtmlSamples || [],
          countMentions: source.countMentions || [],
          paginationLinks: (source.paginationLinks || []).slice(0, 12),
          salonCardSamples: (source.salonCardSamples || []).slice(0, 8),
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
