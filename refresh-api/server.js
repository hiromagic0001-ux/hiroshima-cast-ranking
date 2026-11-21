import http from "node:http";
import * as cheerio from "cheerio";

const PORT = Number(process.env.PORT || 10000);
const SOURCE_URL = "https://estama.jp/etc/ranking/therapist/3401/";
const ALLOWED_ORIGIN = "https://hiroshima-cast-portal.onrender.com";
const ALLOWED_ORIGINS = new Set([ALLOWED_ORIGIN, "https://hiroshima-cast-ranking.onrender.com"]);
let lastFetchAt = 0;
let cachedInspection = null;
let rankingLinkAuditJob = null;

function send(res, status, body, origin) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "access-control-allow-origin": ALLOWED_ORIGINS.has(origin) ? origin : ALLOWED_ORIGIN,
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
      "access-control-allow-origin": ALLOWED_ORIGINS.has(origin) ? origin : ALLOWED_ORIGIN,
      "access-control-allow-methods": "GET, POST, PUT, OPTIONS",
      "access-control-allow-headers": "Content-Type",
      "access-control-max-age": "600"
    });
    return res.end();
  }
  if (pathname === "/health" && req.method === "GET") {
    return send(res, 200, { ok: true, service: "hiroshima-cast-refresh-api", mode: "diagnostic-only" }, origin);
  }
  if (pathname === "/api/bakusai/thread-status" && req.method === "GET") {
    if (origin && !ALLOWED_ORIGINS.has(origin)) return send(res, 403, { ok: false, error: "origin_not_allowed" }, origin);
    const rawUrl = requestUrl.searchParams.get("url") || "";
    const mentionNames = (requestUrl.searchParams.get("names") || "").split("|").map(value => value.normalize("NFKC").trim()).filter(value => value && value.length <= 30).slice(0, 16);
    let target;
    try { target = new URL(rawUrl); } catch { return send(res, 400, { ok: false, error: "invalid_thread_url" }, origin); }
    if (target.protocol !== "https:" || target.hostname !== "bakusai.com" ||
        !/^\/thr_res\/acode=8\/ctgid=(?:103|136)\/bid=\d+\/tid=\d+(?:\/(?:p=\d+\/)?tp=\d+(?:\/rw=\d+)?|\/tp=\d+)?\/?$/.test(target.pathname)) {
      return send(res, 400, { ok: false, error: "thread_url_not_allowed" }, origin);
    }
    const fetchHtml = async url => {
      const response = await fetch(url, { signal: AbortSignal.timeout(12000), headers: {
        "user-agent": "Mozilla/5.0 (compatible; HiroshimaCastRefresh/1.0)",
        "accept": "text/html,application/xhtml+xml"
      }});
      if (!response.ok) throw new Error("source_http_" + response.status);
      const html = await response.text();
      if (html.length < 1000 || html.length > 5000000) throw new Error("unexpected_html_size");
      return html;
    };
    const normalizeTitle = value => String(value || "").normalize("NFKC")
      .replace(/爆サイ.*$/i, "").replace(/(?:part|ＰＡＲＴ)\s*\d+/ig, "")
      .replace(/[①②③④⑤⑥⑦⑧⑨⑩]/g, "").replace(/[0-9０-９]+(?:スレ|個目|代目)?$/g, "")
      .replace(/[\s　・:：【】「」『』()（）［］]/g, "").toLowerCase();
    try {
      let html = await fetchHtml(target.toString());
      let $ = cheerio.load(html);
      // The default thread URL can expose only the last-opened reply. Follow
      // Bakusai's explicit "最新レス" link to retrieve the actual newest page.
      let latestPageFetch = { attempted: false, ok: false, finalUrl: null, error: null };
      const latestHref = $('a').filter((_, el) => /最新レス/.test($(el).text().replace(/\\s+/g, ' ').trim())).first().attr('href') || '';
      if (latestHref) {
        try {
          const latestUrl = new URL(latestHref, 'https://bakusai.com');
          const sameThread = latestUrl.hostname === 'bakusai.com' &&
            latestUrl.pathname.includes('/thr_res/') &&
            latestUrl.pathname.includes('/tid=' + (target.pathname.match(/\/tid=(\d+)/)?.[1] || ''));
          if (sameThread) {
            latestPageFetch.attempted = true;
            latestPageFetch.finalUrl = latestUrl.toString();
            const latestHtml = await fetchHtml(latestUrl.toString());
            const latest$ = cheerio.load(latestHtml);
            const currentCount = $('[id="res_block"]').length;
            const latestCount = latest$('[id="res_block"]').length;
            const currentNo = Number(($('[id="res_block"]').first().find('.res_rotundate').text().match(/#(\d+)/) || [])[1] || 0);
            const latestNo = Number((latest$('[id="res_block"]').first().find('.res_rotundate').text().match(/#(\d+)/) || [])[1] || 0);
            latestPageFetch.ok = latestCount > 0;
            latestPageFetch.currentVisiblePost = currentNo || null;
            latestPageFetch.latestVisiblePost = latestNo || null;
            if (latestCount > currentCount || latestNo > currentNo) {
              html = latestHtml;
              $ = latest$;
            }
          }
        } catch (error) {
          latestPageFetch.error = String(error?.message || error).slice(0, 180);
        }
      }
      const title = $("title").first().text().replace(/\s+/g, " ").trim();
      const bodyText = $("body").text().replace(/\s+/g, " ");
      let replyCount = null;
      $('[class*="res_count"],[class*="rescount"],[class*="thread_count"],[data-res-count]').each((_, el) => {
        const value = $(el).attr("data-res-count") || $(el).text();
        const match = String(value).match(/([0-9,]{1,6})/);
        if (match) replyCount = Math.max(replyCount || 0, Number(match[1].replace(/,/g, "")));
      });
      const countPatterns = [
        /(?:総レス数|レス数|レス件数|全レス)\s*[：:]?\s*([0-9,]{1,6})/i,
        /([0-9,]{1,6})\s*レス(?:\s|　|$)/i
      ];
      for (const pattern of countPatterns) {
        const match = bodyText.match(pattern);
        if (match) replyCount = Math.max(replyCount || 0, Number(match[1].replace(/,/g, "")));
      }
      const responseIds = [...html.matchAll(/(?:id=["'](?:res|レス|response)[_-]?(\d{1,4})["']|data-res-no=["'](\d{1,4})["'])/gi)]
        .map(m => Number(m[1] || m[2])).filter(Number.isFinite);
      if (responseIds.length) replyCount = Math.max(replyCount || 0, ...responseIds);
      let successorUrl = null;
      $('a[href*="/thr_res/"]').each((_, el) => {
        const label = $(el).text().replace(/\s+/g, " ").trim();
        const href = $(el).attr("href") || "";
        if (!successorUrl && /次スレ|新スレ|続スレ|次のスレ/i.test(label) && href.includes("/tid=")) {
          try { const u = new URL(href, "https://bakusai.com"); if (u.hostname === "bakusai.com") successorUrl = u.toString(); } catch {}
        }
      });
      if (replyCount !== null && replyCount >= 999 && !successorUrl) {
        const bid = Number(target.pathname.match(/\/bid=(\d+)/)?.[1] || 0);
        const currentId = Number(target.pathname.match(/\/tid=(\d+)/)?.[1] || 0);
        const currentKey = normalizeTitle(title);
        const candidates = [];
        for (let page = 1; page <= 9; page++) {
          const listingUrl = page === 1
            ? `https://bakusai.com/thr_tl/acode=8/ctgid=136/bid=${bid}/`
            : `https://bakusai.com/thr_tl/acode=8/ctgid=136/bid=${bid}/p=${page}/`;
          try {
            const listingHtml = await fetchHtml(listingUrl);
            const listing = cheerio.load(listingHtml);
            listing('a[href*="/thr_res/"][href*="/tid="]').each((_, el) => {
              const href = listing(el).attr("href") || "";
              const label = listing(el).text().replace(/\s+/g, " ").trim();
              const id = Number(href.match(/\/tid=(\d+)/)?.[1] || 0);
              const key = normalizeTitle(label);
              if (id > currentId && key && key === currentKey) {
                try { candidates.push(new URL(href, "https://bakusai.com").toString()); } catch {}
              }
            });
          } catch {}
        }
        if (candidates.length) successorUrl = candidates.sort((a,b) =>
          Number(b.match(/\/tid=(\d+)/)?.[1] || 0) - Number(a.match(/\/tid=(\d+)/)?.[1] || 0))[0];
      }
      // Read the newest visible post timestamp when the public thread page exposes one.
      // Prefer explicit machine-readable timestamps; fall back to visible date strings.
      const dateCandidates = [];
      $("time[datetime], [datetime], [data-time]").each((_, el) => {
        const raw = $(el).attr("datetime") || $(el).attr("data-time") || "";
        if (!raw) return;
        let parsed = Date.parse(raw);
        if (!Number.isFinite(parsed) && /^\d{10,13}$/.test(raw)) parsed = Number(raw) * (raw.length === 10 ? 1000 : 1);
        if (Number.isFinite(parsed) && parsed > 0) dateCandidates.push(parsed);
      });
      const visibleDates = bodyText.match(/(?:20\d{2})[年\/.\-]\s?\d{1,2}[月\/.\-]\s?\d{1,2}日?(?:\s*[T ]\s*\d{1,2}:\d{2}(?::\d{2})?)?/g) || [];
      for (const raw of visibleDates) {
        const normalized = raw.replace(/年|月/g, "/").replace(/日/g, "").replace(/[.]/g, "/").replace(/\s*T\s*/, " ");
        const parsed = Date.parse(normalized);
        if (Number.isFinite(parsed) && parsed > 0) dateCandidates.push(parsed);
      }
      const latestPostAt = dateCandidates.length ? new Date(Math.max(...dateCandidates)).toISOString() : null;
      // Bakusai currently renders post numbers in span.res_rotundate (not links),
      // with date and body in sibling .res_header and .res_body elements.
      const extractedPosts = new Map();
      const pageFetches = [];
      const baseThreadUrl = new URL(target.toString());
      baseThreadUrl.search = "";
      baseThreadUrl.hash = "";
      const pageCount = replyCount !== null && replyCount > 0 ? Math.ceil(replyCount / 50) : 1;
      // Bakusai exposes replies in 50-post pages. Walk newest pages backwards,
      // stopping only after the rolling-365-day boundary is actually crossed.
      const maxPagesToFetch = Math.min(pageCount, 20);
      const pageNumbers = Array.from({ length: maxPagesToFetch }, (_, i) => pageCount - i);
      if (!pageNumbers.includes(1) && pageCount <= 20) pageNumbers.push(1);
      const parsePostsFromPage = pageHtml => {
        const page$ = cheerio.load(pageHtml);
        page$('[id="res_block"]').each((_, el) => {
          const block = page$(el);
          const numberText = block.find('.res_rotundate').first().text().replace(/\s+/g, ' ').trim();
          const numberMatch = numberText.match(/^#(\d{1,4})$/);
          if (!numberMatch) return;
          const postNo = Number(numberMatch[1]);
          const headerText = block.find('.res_header').first().text().replace(/\s+/g, ' ').trim();
          const bodyNode = block.find('.res_body').first();
          if (!bodyNode.length) return;
          const dateMatch = headerText.match(/20\d{2}[年\/.\-]\s?\d{1,2}[月\/.\-]\s?\d{1,2}(?:日)?(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?/);
          let excerpt = bodyNode.text().replace(/\s+/g, ' ').trim().replace(/\[匿名さん\]/g, '').trim();
          if (!excerpt || excerpt.includes('この投稿は削除されました')) return;
          const existing = extractedPosts.get(postNo);
          if (!existing || excerpt.length > existing.excerpt.length) extractedPosts.set(postNo, { postNo, date: dateMatch ? dateMatch[0] : (existing?.date || null), excerpt: excerpt.slice(0, 220) });
        });
        page$('.res_list_article[id^="res"]').each((_, el) => {
          const article = page$(el);
          const idMatch = (article.attr('id') || '').match(/^res(\d{1,4})$/);
          if (!idMatch) return;
          const postNo = Number(idMatch[1]);
          const dateText = article.find('[itemprop="commentTime"]').first().text().replace(/\s+/g, ' ').trim();
          const bodyNode = article.find('[itemprop="commentText"], .resbody').first();
          if (!bodyNode.length) return;
          let excerpt = bodyNode.text().replace(/\s+/g, ' ').trim().replace(/\[匿名さん\]/g, '').replace(/返信移動/g, '').trim();
          if (!excerpt || excerpt.includes('この投稿は削除されました')) return;
          const dateMatch = dateText.match(/20\d{2}[年\/.-]\s?\d{1,2}[月\/.-]\s?\d{1,2}(?:日)?(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?/);
          const existing = extractedPosts.get(postNo);
          if (!existing || excerpt.length > existing.excerpt.length) extractedPosts.set(postNo, { postNo, date: dateMatch ? dateMatch[0] : (existing?.date || null), excerpt: excerpt.slice(0, 220) });
        });
      };
      const fetchPage = async pageNo => {
        try {
          const pageUrl = new URL(baseThreadUrl.toString());
          pageUrl.pathname = pageUrl.pathname.replace(/\/$/, '') + (pageNo > 1 ? '/p=' + pageNo : '') + '/tp=1/rw=1/';
          const pageHtml = await fetchHtml(pageUrl.toString());
          parsePostsFromPage(pageHtml);
          const page$ = cheerio.load(pageHtml);
          const pagePostNos = page$('[id="res_block"]').map((_, el) => {
            const m = page$(el).find('.res_rotundate').first().text().match(/^#(\d{1,4})$/);
            return m ? Number(m[1]) : null;
          }).get().filter(Number.isFinite);
          return { page: pageNo, ok: true, parsed: pagePostNos.length, minPostNo: pagePostNos.length ? Math.min(...pagePostNos) : null, maxPostNo: pagePostNos.length ? Math.max(...pagePostNos) : null };
        } catch (error) {
          return { page: pageNo, ok: false, error: String(error?.message || error).slice(0, 120) };
        }
      };
      for (let offset = 0; offset < pageNumbers.length; offset += 8) {
        const batch = await Promise.all(pageNumbers.slice(offset, offset + 8).map(fetchPage));
        pageFetches.push(...batch);
      }
      pageFetches.sort((a, b) => a.page - b.page);
      const posts = [...extractedPosts.values()].sort((a,b) => b.postNo-a.postNo).slice(0,20);
      // Count all public posts parsed from the fetched page, not only the 20 shown in the UI.
      // Use Japan-local calendar dates so the 365-day window matches the app audience.
      const nowJst = new Date(Date.now() + 9 * 60 * 60 * 1000);
      const cutoffJst = new Date(nowJst.getTime() - 365 * 24 * 60 * 60 * 1000);
      const recent365Cutoff = cutoffJst.toISOString().slice(0, 10);
      const datedPublicPosts = [...extractedPosts.values()].map(post => {
        const match = String(post.date || "").match(/(20\d{2})\D+(\d{1,2})\D+(\d{1,2})/);
        if (!match) return null;
        return { postNo: post.postNo, date: match[1] + "-" + String(match[2]).padStart(2,"0") + "-" + String(match[3]).padStart(2,"0") };
      }).filter(Boolean);
      const recent365Count = datedPublicPosts.filter(post => post.date >= recent365Cutoff).length;
      const recent365Mentions = Object.fromEntries(mentionNames.map(name => {
        const hits = datedPublicPosts.filter(post => {
          if (post.date < recent365Cutoff) return false;
          const excerpt = extractedPosts.get(post.postNo)?.excerpt || "";
          return excerpt.normalize("NFKC").includes(name);
        }).sort((a, b) => a.postNo - b.postNo);
        return [name, { count: hits.length, postNumbers: hits.map(post => post.postNo), samples: hits.slice(0, 5).map(post => ({ postNo: post.postNo, excerpt: (extractedPosts.get(post.postNo)?.excerpt || "").slice(0, 160) })) }];
      }));
      const oldestParsedPostDate = datedPublicPosts.length
        ? datedPublicPosts.reduce((oldest, post) => post.date < oldest ? post.date : oldest, datedPublicPosts[0].date)
        : null;
      const reached365Boundary = Boolean(oldestParsedPostDate && oldestParsedPostDate <= recent365Cutoff);
      const allPostsDated = datedPublicPosts.length === extractedPosts.size;
      const allPagesFetched = pageNumbers.length === pageCount && pageFetches.length === pageNumbers.length && pageFetches.every(page => page.ok);
      const enoughPagesToReachBoundary = pageFetches.length > 0 && pageFetches.every(page => page.ok);
      const recent365Complete = Boolean(replyCount !== null && allPostsDated && (allPagesFetched || (reached365Boundary && enoughPagesToReachBoundary)));
      const switched = Boolean(replyCount !== null && replyCount >= 999 && successorUrl);
      const postNumberAnchors = $('[class*="res_rotundate"]').filter((_, el) => /^#\d{1,4}$/.test($(el).text().trim())).length;
      const paginationLinks = $('a[href*="tp="]').slice(0, 30).map((_, el) => ({ text: $(el).text().replace(/\s+/g, ' ').trim().slice(0, 50), href: $(el).attr('href') || '' })).get();
      const structuralSamples = $('[id*="res"],[class*="res"],[id*="post"],[class*="post"]').slice(0, 18).map((_, el) => ({
        tag: el.tagName || '',
        id: ($(el).attr('id') || '').slice(0, 100),
        className: ($(el).attr('class') || '').toString().slice(0, 140),
        text: $(el).text().replace(/\\s+/g, ' ').trim().slice(0, 180)
      })).get();
      const raw471 = html.indexOf("#471");
      const raw471Context = raw471 >= 0 ? html.slice(Math.max(0, raw471 - 500), Math.min(html.length, raw471 + 1200)).replace(/\\s+/g, " ").slice(0, 1700) : null;
      const rawBodyMarkers = (html.match(/res_body/g) || []).length;
      const rawPostMarkers = (html.match(/res_rotundate/g) || []).length;
      const rawTargetText = html.includes("本当に一理あると思うこれに尽きる");
      console.log(JSON.stringify({ event: "bakusai_fetch_diagnostic", httpStatus: 200, htmlBytes: Buffer.byteLength(html), title, bodyTextLength: bodyText.length, postNumberAnchors, extractedPosts: posts.length, latestPageFetch, raw471Found: raw471 >= 0, raw471Context, rawBodyMarkers, rawPostMarkers, rawTargetText, paginationLinks, structuralSamples }));
      return send(res, 200, {
        ok: true, title, replyCount, threshold: 999, reached: replyCount !== null && replyCount >= 999,
        diagnostics: { htmlBytes: Buffer.byteLength(html), bodyTextLength: bodyText.length, postNumberAnchors, extractedPosts: posts.length, parsedPublicPosts: extractedPosts.size, recent365Count, recent365Complete, recent365Cutoff, oldestParsedPostDate, latestPageFetch, pageFetches, pageCount, paginationLinks, structuralSamples },
        activeUrl: switched ? successorUrl : target.toString(), successorUrl, switched,
        latestPostAt,
        recent365Count, recent365Complete, recent365Cutoff, oldestParsedPostDate, recent365Mentions,
        posts,
        postsAvailable: posts.length > 0,
        checkedAt: new Date().toISOString(),
        note: replyCount === null ? "公開ページからレス数を判読できません。未確認として現行リンクを維持しました。" :
          switched ? "999レス到達を確認し、同一タイトルの後継スレッドへ切り替えました。" :
          replyCount >= 999 ? "999レス到達を確認しましたが、同一タイトルの後継スレッドを確認できません。現行リンクを維持しました。" :
          "999レス未満です。現行スレッドを維持しました。"
      }, origin);
    } catch (error) {
      return send(res, 502, { ok: false, error: "bakusai_fetch_failed", detail: String(error?.message || error) }, origin);
    }
  }

  if (pathname === "/api/casts/inspect" && req.method === "GET") {
    if (origin && !ALLOWED_ORIGINS.has(origin)) return send(res, 403, { ok: false, error: "origin_not_allowed" }, origin);
    const targets = [
      { group: "delihel", name: "カガミ", profile: "https://www.cityheaven.net/hiroshima/A3401/A340101/hiroshima_hyoban/girlid-47414845/", review: "https://www.cityheaven.net/hiroshima/A3401/A340101/hiroshima_hyoban/reviews/?girlid=47414845" },
      { group: "delihel", name: "サアヤ", profile: "https://www.cityheaven.net/hiroshima/A3401/A340101/rush/girlid-50354138/", review: "https://www.cityheaven.net/hiroshima/A3401/A340101/rush/reviews/?girlid=50354138" },
      { group: "delihel", name: "メイ", profile: "https://www.cityheaven.net/hiroshima/A3401/A340101/rush/girlid-14020683/", review: "https://www.cityheaven.net/hiroshima/A3401/A340101/rush/reviews/?girlid=14020683" },
      { group: "delihel", name: "ルリア", profile: "https://www.cityheaven.net/hiroshima/A3401/A340101/hiroshima_hyoban/girlid-53089242/", review: "https://www.cityheaven.net/hiroshima/A3401/A340101/hiroshima_hyoban/reviews/?girlid=53089242" },
      { group: "delihel", name: "ユズキ", profile: "https://www.cityheaven.net/hiroshima/A3401/A340101/hiroshima_hyoban/girlid-55666630/" },
      { group: "delihel", name: "ブルマー", profile: "https://www.cityheaven.net/hiroshima/A3401/A340101/rush/girlid-64319837/", review: "https://www.cityheaven.net/hiroshima/A3401/A340101/rush/reviews/?girlid=64319837" },
      { group: "delihel", name: "ミウ", profile: "https://www.cityheaven.net/hiroshima/A3401/A340101/rush/girlid-53813734/", review: "https://www.cityheaven.net/hiroshima/A3401/A340101/rush/reviews/?girlid=53813734" },
      { group: "delihel", name: "ユノハ", profile: "https://www.cityheaven.net/hiroshima/A3401/A340101/rush/girlid-28810342/", review: "https://www.cityheaven.net/hiroshima/A3401/A340101/rush/reviews/?girlid=28810342" },
      { group: "delihel", name: "ジュン", profile: "https://www.cityheaven.net/hiroshima/A3401/A340101/hiroshima_hyoban/girlid-55136221/" },
      { group: "delihel", name: "マナミ", profile: "https://fuzoku.jp/hiroshimacoco/girl/90/" },
      { group: "delihel", name: "マーコ", profile: "https://fuzoku.jp/hiroshimacoco/girl/486/" },
      { group: "delihel", name: "ソノ", profile: "https://ranking-deli.jp/hiroshima/area151/style2/252/4782529/maildiary/" },
      { group: "delihel", name: "エミリ", profile: "https://fuzoku.jp/hiroshimacoco/girl/682/" },
      { group: "delihel", name: "サクラコ", profile: "https://fuzoku.jp/hiroshimacoco/girl/741/" },
      { group: "delihel", name: "アンナ", profile: "https://fuzoku.jp/hiroshimacoco/girl/209/" },
      { group: "delihel", name: "ユリー", profile: "https://ranking-deli.jp/hiroshima/area151/style2/252/1837827/maildiary/" },
      { group: "soapland", name: "ことね", profile: "https://www.cityheaven.net/hiroshima/A3401/A340101/sherbet/girlid-52248528/", review: "https://www.cityheaven.net/hiroshima/A3401/A340101/sherbet/reviews/?girlid=52248528" },
      { group: "soapland", name: "きらら", profile: "https://www.cityheaven.net/hiroshima/A3401/A340101/eight/girlid-46701341/", review: "https://www.cityheaven.net/hiroshima/A3401/A340101/eight/reviews/?girlid=46701341" },
      { group: "soapland", name: "すず", profile: "https://www.cityheaven.net/hiroshima/A3401/A340101/sherbet/girlid-50677299/", review: "https://www.cityheaven.net/hiroshima/A3401/A340101/sherbet/reviews/?girlid=50677299" },
      { group: "soapland", name: "れい", profile: "https://www.cityheaven.net/hiroshima/A3401/A340101/eight/girlid-12723960/", review: "https://www.cityheaven.net/hiroshima/A3401/A340101/eight/reviews/?girlid=12723960" },
      { group: "soapland", name: "イヴ", profile: "https://www.cityheaven.net/hiroshima/A3401/A340101/sherbet/girlid-57738554/", review: "https://www.cityheaven.net/hiroshima/A3401/A340101/sherbet/reviews/?girlid=57738554" },
      { group: "soapland", name: "さや", profile: "https://www.cityheaven.net/hiroshima/A3401/A340101/sherbet/girlid-50622923/", review: "https://www.cityheaven.net/hiroshima/A3401/A340101/sherbet/reviews/?girlid=50622923" },
      { group: "soapland", name: "ゆめ", profile: "https://www.cityheaven.net/hiroshima/A3401/A340101/sherbet/girlid-54071012/", review: "https://www.cityheaven.net/hiroshima/A3401/A340101/sherbet/reviews/?girlid=54071012" },
      { group: "soapland", name: "ひな", profile: "https://www.cityheaven.net/hiroshima/A3401/A340101/sherbet/girlid-65602665/", review: "https://www.cityheaven.net/hiroshima/A3401/A340101/sherbet/reviews/?girlid=65602665" }
    ];
    const checkPage = async (url) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12000);
      try {
        const response = await fetch(url, { signal: controller.signal, headers: {
          "user-agent": "Mozilla/5.0 (compatible; HiroshimaCastRefresh/1.0)",
          "accept": "text/html,application/xhtml+xml"
        }});
        if (!response.ok) return { ok: false, status: response.status, url };
        const html = await response.text();
        if (html.length < 1500 || html.length > 5000000) return { ok: false, status: response.status, error: "unexpected_html_size", bytes: html.length, url };
        const $ = cheerio.load(html);
        const title = $("title").first().text().replace(/\s+/g, " ").trim();
        const bodyText = $("body").text().replace(/\s+/g, " ").trim();
        return { ok: Boolean(title && bodyText.length > 100), status: response.status, title: title.slice(0, 140), bytes: Buffer.byteLength(html), url };
      } catch (error) {
        return { ok: false, error: String(error?.message || error), url };
      } finally { clearTimeout(timer); }
    };
    const results = [];
    for (let i = 0; i < targets.length; i += 6) {
      const batch = targets.slice(i, i + 6);
      results.push(...(await Promise.all(batch.map(async target => {
        const profile = await checkPage(target.profile);
        const review = target.review ? await checkPage(target.review) : null;
        return [{ group: target.group, name: target.name, type: "profile", ...profile },
          ...(review ? [{ group: target.group, name: target.name, type: "review", ...review }] : [])];
      }))).flat());
    }
    const groups = ["delihel", "soapland"].map(group => {
      const rows = results.filter(x => x.group === group);
      const profiles = rows.filter(x => x.type === "profile");
      const reviews = rows.filter(x => x.type === "review");
      return { group, expectedProfiles: group === "delihel" ? 16 : 8,
        checkedProfiles: profiles.length, successfulProfiles: profiles.filter(x => x.ok).length,
        reviewPagesChecked: reviews.length, successfulReviewPages: reviews.filter(x => x.ok).length,
        failed: rows.filter(x => !x.ok).map(x => ({ name: x.name, type: x.type, status: x.status || null, error: x.error || null })) };
    });
    return send(res, 200, { ok: groups.every(x => x.successfulProfiles === x.expectedProfiles),
      mode: "diagnostic-only", metricPolicy: "媒体・店舗ごとの指標を混合しません。プロフィール確認と口コミ数の比較可能性は別判定です。",
      retrievedAt: new Date().toISOString(), groups, sampleResults: results.slice(0, 10),
      note: "診断専用。順位や既存データの更新・上書きは行いません。" }, origin);
  }
  if (pathname === "/api/casts/metrics-inspect" && req.method === "GET") {
    if (origin && !ALLOWED_ORIGINS.has(origin)) return send(res, 403, { ok: false, error: "origin_not_allowed" }, origin);
    const targets = [
      { group: "delihel", name: "カガミ", url: "https://www.cityheaven.net/hiroshima/A3401/A340101/hiroshima_hyoban/reviews/?girlid=47414845" },
      { group: "delihel", name: "サアヤ", url: "https://www.cityheaven.net/hiroshima/A3401/A340101/rush/reviews/?girlid=50354138" },
      { group: "delihel", name: "メイ", url: "https://www.cityheaven.net/hiroshima/A3401/A340101/rush/reviews/?girlid=14020683" },
      { group: "delihel", name: "ルリア", url: "https://www.cityheaven.net/hiroshima/A3401/A340101/hiroshima_hyoban/reviews/?girlid=53089242" },
      { group: "delihel", name: "ブルマー", url: "https://www.cityheaven.net/hiroshima/A3401/A340101/rush/reviews/?girlid=64319837" },
      { group: "delihel", name: "ミウ", url: "https://www.cityheaven.net/hiroshima/A3401/A340101/rush/reviews/?girlid=53813734" },
      { group: "delihel", name: "ユノハ", url: "https://www.cityheaven.net/hiroshima/A3401/A340101/rush/reviews/?girlid=28810342" },
      { group: "delihel", name: "ジュン", url: "https://www.cityheaven.net/hiroshima/A3401/A340101/hiroshima_hyoban/reviews/?girlid=55136221" },
      { group: "soapland", name: "ことね", url: "https://www.cityheaven.net/hiroshima/A3401/A340101/sherbet/reviews/?girlid=52248528" },
      { group: "soapland", name: "きらら", url: "https://www.cityheaven.net/hiroshima/A3401/A340101/eight/reviews/?girlid=46701341" },
      { group: "soapland", name: "すず", url: "https://www.cityheaven.net/hiroshima/A3401/A340101/sherbet/reviews/?girlid=50677299" },
      { group: "soapland", name: "れい", url: "https://www.cityheaven.net/hiroshima/A3401/A340101/eight/reviews/?girlid=12723960" },
      { group: "soapland", name: "イヴ", url: "https://www.cityheaven.net/hiroshima/A3401/A340101/sherbet/reviews/?girlid=57738554" },
      { group: "soapland", name: "さや", url: "https://www.cityheaven.net/hiroshima/A3401/A340101/sherbet/reviews/?girlid=50622923" },
      { group: "soapland", name: "ゆめ", url: "https://www.cityheaven.net/hiroshima/A3401/A340101/sherbet/reviews/?girlid=54071012" },
      { group: "soapland", name: "ひな", url: "https://www.cityheaven.net/hiroshima/A3401/A340101/sherbet/reviews/?girlid=65602665" }
    ];
    const inspectReview = async target => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12000);
      try {
        const response = await fetch(target.url, { signal: controller.signal, headers: {
          "user-agent": "Mozilla/5.0 (compatible; HiroshimaCastRefresh/1.0)",
          "accept": "text/html,application/xhtml+xml"
        }});
        if (!response.ok) return { ...target, ok: false, status: response.status };
        const html = await response.text();
        if (html.length < 1500 || html.length > 5000000) return { ...target, ok: false, status: response.status, error: "unexpected_html_size" };
        const $ = cheerio.load(html);
        const title = $("title").first().text().replace(/\s+/g, " ").trim();
        const bodyText = $("body").text().replace(/\s+/g, " ").trim();
        const keywordSnippets = [...bodyText.matchAll(/.{0,45}(?:口コミ|レビュー|投稿|件数|総数).{0,55}/g)]
          .slice(0, 16).map(match => match[0]);
        const countCandidates = [];
        const reviewTotalText = $(".review-total").first().text().replace(/\s+/g, " ").trim();
        const reviewTotalMatch = reviewTotalText.match(/([0-9,]+)\s*件/);
        if (reviewTotalMatch) countCandidates.push({
          source: "DOM .review-total",
          matchedText: reviewTotalText,
          count: Number(reviewTotalMatch[1].replace(/,/g, ""))
        });
        const patterns = [
          /口コミ(?:件数|数)?\s*[:：]?\s*([0-9,]+)\s*件/g,
          /([0-9,]+)\s*件(?:の)?(?:口コミ|レビュー|投稿)/g,
          /レビュー(?:件数|数)?\s*[:：]?\s*([0-9,]+)\s*件/g
        ];
        for (const pattern of patterns) {
          for (const match of bodyText.matchAll(pattern)) countCandidates.push({
            source: "body text",
            matchedText: match[0],
            count: Number(match[1].replace(/,/g, ""))
          });
        }
        const matchingElements = [];
        $("body *").each((_, el) => {
          if (matchingElements.length >= 30) return;
          const text = $(el).children().length ? "" : $(el).text().replace(/\s+/g, " ").trim();
          if (text && text.length <= 100 && /口コミ|レビュー|投稿|[0-9,]+件/.test(text)) {
            matchingElements.push({ tag: el.tagName, className: String($(el).attr("class") || "").slice(0, 100), text });
          }
        });
        return { ...target, ok: Boolean(title && bodyText.length > 100), status: response.status,
          title: title.slice(0, 140), bytes: Buffer.byteLength(html), bodyLength: bodyText.length,
          countCandidates: countCandidates.slice(0, 20), keywordSnippets, matchingElements };
      } catch (error) {
        return { ...target, ok: false, error: String(error?.message || error) };
      } finally { clearTimeout(timer); }
    };
    const results = [];
    for (let i = 0; i < targets.length; i += 4) {
      results.push(...await Promise.all(targets.slice(i, i + 4).map(inspectReview)));
    }
    const groups = ["delihel", "soapland"].map(group => {
      const rows = results.filter(row => row.group === group);
      return { group, expected: group === "delihel" ? 8 : 8, checked: rows.length,
        successful: rows.filter(row => row.ok).length,
        pagesWithCountCandidate: rows.filter(row => row.countCandidates?.length).length,
        failures: rows.filter(row => !row.ok).map(row => ({ name: row.name, status: row.status || null, error: row.error || null })) };
    });
    return send(res, 200, { ok: groups.every(group => group.checked === group.expected && group.successful === group.expected),
      mode: "diagnostic-only", metricPolicy: "口コミ件数の抽出候補を表示するだけで、順位・既存データは変更しません。",
      retrievedAt: new Date().toISOString(), groups, results }, origin);
  }
  if (pathname === "/api/stores/inspect" && req.method === "GET") {
    if (origin && !ALLOWED_ORIGINS.has(origin)) return send(res, 403, { ok: false, error: "origin_not_allowed" }, origin);
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
              const shopAnchor = card.find("a[href*='/shop/']").first();
              const rawName = card.find("h2,h3,[class*='shop-card__name'],[class*='shop-card__title']").first().text()
                || shopAnchor.text() || "";
              const cleanName = rawName.replace(/^\s*\d+位\s*/, "").replace(/\s+/g, " ").trim()
                .split(/\s+(?:[^\s]{1,12}駅|本日\d+名)/)[0].trim();
              const name = cleanName;
              if (!name || name.length > 100 || parsedRecords.some(item => item.name === name)) return;
              const cardText = card.text().replace(/\s+/g, " ").trim();
              const ratingMatch = cardText.match(/また行く！?\s*([0-5]\.\d)\s*\(([\d,]+)件\)/);
              const hrefRaw = shopAnchor.attr("href") || card.closest("a[href*='/shop/']").attr("href") || "";
              const href = hrefRaw ? new URL(hrefRaw, pageUrl).href : null;
              const rankMatch = cardText.match(/(?:^|\s)(\d+)位/);
              parsedRecords.push({ rank: rankMatch ? Number(rankMatch[1]) : parsedRecords.length + 1, name, href,
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
          const groupRanks = { "通常店舗": 0, "アジアン店舗": 0 };
          const seenShopUrls = new Set();
          $("a[href*='/areas/hiroshima-hiroshima/shops/']").each((_, el) => {
            const anchor = $(el);
            const href = anchor.attr("href") || "";
            if (/\/casts?\//.test(href)) return;
            const shopUrl = new URL(href, source.url);
            // The source may link the same shop with and without a trailing slash.
            // Deduplicate by canonical origin + pathname, not the raw href string.
            const canonicalShopPath = shopUrl.pathname.replace(/\/+$/, "").toLowerCase();
            const shopKey = `${shopUrl.origin}${canonicalShopPath}`;
            if (seenShopUrls.has(shopKey)) return;
            const absoluteHref = shopUrl.href;
            const raw = anchor.text().replace(/\s+/g, " ").trim();
            const cityIndex = raw.lastIndexOf("広島市");
            let name = cityIndex >= 0 ? raw.slice(cityIndex + "広島市".length).trim()
              : raw.replace(/^\d+\s*/, "").replace(/^MEN'S\s*ESTHETIC\s*/i, "").trim();
            name = name.replace(/^広島市/, "").replace(/\s*アジアン\s*$/, "").trim();
            if (!name || name.length > 80) return;
            const rankingGroup = /アジアン/.test(raw) ? "アジアン店舗" : "通常店舗";
            groupRanks[rankingGroup] += 1;
            seenShopUrls.add(shopKey);
            parsedRecords.push({ rank: groupRanks[rankingGroup], rankingGroup, name, href: absoluteHref, metric: "アクセス人気順" });
          });
          const mainCount = groupRanks["通常店舗"];
          const asianCount = groupRanks["アジアン店舗"];
          const publishedCountMatch = bodyText.match(/広島市のメンズエステ掲載店\s*([0-9,]+)\s*件/);
          const publishedStoreCount = publishedCountMatch
            ? Number(publishedCountMatch[1].replace(/,/g, ""))
            : null;
          const ranksContinuous = ["通常店舗", "アジアン店舗"].every(group => {
            const ranks = parsedRecords.filter(x => x.rankingGroup === group).map(x => x.rank);
            return ranks.every((rank, index) => rank === index + 1);
          });
          parserValidation = { parsedCount: parsedRecords.length,
            expectedDisplayCount: Number.isInteger(publishedStoreCount) ? publishedStoreCount : 107,
            publishedStoreCount, normalStoreCount: mainCount, asianStoreCount: asianCount, ranksContinuous };
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
                const shopAnchor = card.find("a[href*='/shop/']").first();
                const rawName = card.find("h2,h3,[class*='shop-card__name'],[class*='shop-card__title']").first().text()
                  || shopAnchor.text() || "";
                const name = rawName.replace(/^\s*\d+位\s*/, "").replace(/\s+/g, " ").trim()
                  .split(/\s+(?:[^\s]{1,12}駅|本日\d+名)/)[0].trim();
                if (!name || name.length > 100 || parsedRecords.some(item => item.name === name)) return;
                const cardText = card.text().replace(/\s+/g, " ").trim();
                const ratingMatch = cardText.match(/また行く！?\s*([0-5]\.\d)\s*\(([\d,]+)件\)/);
                const hrefRaw = shopAnchor.attr("href") || card.closest("a[href*='/shop/']").attr("href") || "";
                const href = hrefRaw ? new URL(hrefRaw, pageUrl.href).href : null;
                const rankMatch = cardText.match(/(?:^|\s)(\d+)位/);
                parsedRecords.push({ rank: rankMatch ? Number(rankMatch[1]) : parsedRecords.length + 1, name, href,
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
          parserValidation, parsedCount: parsedRecords.length, parsedSamples: parsedRecords.slice(0, 5), records: parsedRecords.map(record => ({ ...record, sourceId: source.id, sourceLabel: source.label })),
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

  // Persist only complete, validated source-specific store rankings.
  // The 278-store roster and its audit metadata remain untouched.
  if (pathname === "/api/stores/refresh" && req.method === "POST") {
    if (!ALLOWED_ORIGINS.has(origin)) return send(res, 403, { ok: false, error: "allowed_app_origin_required" }, origin);
    const storageUrl = process.env.CAST_STORAGE_URL;
    const storageToken = process.env.CAST_STORAGE_API_TOKEN;
    if (!storageUrl || !storageToken) return send(res, 503, { ok: false, error: "storage_not_configured" }, origin);
    const expected = { salonowa: 52, mensesthe_rank: 107, menes_note: 152 };
    const labels = {
      salonowa: "サロノワ・また行きたい順",
      mensesthe_rank: "メンズエステ情報ランキング・アクセス順",
      menes_note: "メンエスノート・口コミ評価"
    };
    const metrics = {
      salonowa: "また行きたい順",
      mensesthe_rank: "アクセス人気順（通常店舗・アジアン店舗別）",
      menes_note: "口コミ評価・口コミ件数"
    };
    const sourceUrls = {
      salonowa: "https://www.salonowa.jp/area/hiroshima/hiroshima",
      mensesthe_rank: "https://mensesthe-rank.jp/areas/hiroshima-hiroshima",
      menes_note: "https://men-esthe-review.com/area/%E5%BA%83%E5%B3%B6%E5%B8%82"
    };
    try {
      const headers = { authorization: `Bearer ${storageToken}` };
      const existingResponse = await fetch(new URL("/v1/data/ranking_state", storageUrl), {
        headers, signal: AbortSignal.timeout(15000)
      });
      const existing = await existingResponse.json();
      if (!existingResponse.ok || !existing.ok) {
        return send(res, 502, { ok: false, error: "ranking_state_read_failed", upstreamStatus: existingResponse.status }, origin);
      }
      const current = existing.found && existing.value && typeof existing.value === "object" ? existing.value : {};
      const priorSources = current.sources && typeof current.sources === "object" && !Array.isArray(current.sources)
        ? current.sources : {};
      const inspectResponse = await fetch(`http://127.0.0.1:${PORT}/api/stores/inspect`, {
        headers: { origin: ALLOWED_ORIGIN, accept: "application/json" },
        signal: AbortSignal.timeout(120000)
      });
      const inspection = await inspectResponse.json();
      if (!Array.isArray(inspection.sources)) {
        return send(res, 502, { ok: false, error: "inspection_result_invalid" }, origin);
      }
      const attemptedAt = new Date().toISOString();
      const nextSources = { ...priorSources };
      const checks = [];
      for (const id of Object.keys(expected)) {
        const source = inspection.sources.find(item => item.id === id);
        const records = Array.isArray(source?.records) ? source.records : [];
        // mensesthe_rank changes its published listing count over time; use the
        // count explicitly displayed by the source page instead of a stale hard-coded value.
        const expectedCount = id === "mensesthe_rank" &&
          Number.isInteger(source?.parserValidation?.expectedDisplayCount)
          ? source.parserValidation.expectedDisplayCount : expected[id];
        const hrefHosts = {
          salonowa: new Set(["salonowa.jp", "www.salonowa.jp"]),
          mensesthe_rank: new Set(["mensesthe-rank.jp", "www.mensesthe-rank.jp"]),
          menes_note: new Set(["men-esthe-review.com", "www.men-esthe-review.com"])
        }[id];
        const validRecords = records.length === expectedCount && records.every(record => {
          if (!record || !Number.isInteger(record.rank) || record.rank < 1 ||
              typeof record.name !== "string" || !record.name.trim() || record.name.length > 100) return false;
          if (!record.href && id === "salonowa") return true;
          try {
            const url = new URL(record.href);
            return url.protocol === "https:" && hrefHosts.has(url.hostname);
          } catch { return false; }
        });
        let ranksValid = false;
        if (id === "mensesthe_rank") {
          const groups = ["通常店舗", "アジアン店舗"];
          ranksValid = groups.every(group => {
            const groupRows = records.filter(record => record.rankingGroup === group);
            return groupRows.every((record, index) => record.rank === index + 1) &&
              records.every(record => groups.includes(record.rankingGroup));
          });
        } else {
          const sortedRanks = records.map(record => record.rank).sort((a, b) => a - b);
          ranksValid = sortedRanks.every((rank, index) => rank === index + 1);
        }
        const hrefs = records.map(record => record.href).filter(Boolean);
        const uniqueHrefs = new Set(hrefs).size === hrefs.length;
        const valid = Boolean(source?.ok && validRecords && ranksValid && uniqueHrefs);
        const previous = priorSources[id] && typeof priorSources[id] === "object" ? priorSources[id] : {};
        if (valid) {
          nextSources[id] = {
            sourceId: id, label: labels[id], url: sourceUrls[id], metric: metrics[id],
            status: "更新済み", records, recordCount: records.length, expectedCount,
            lastAttemptAt: attemptedAt, lastSuccessAt: attemptedAt, error: null
          };
        } else {
          nextSources[id] = {
            ...previous,
            sourceId: id, label: labels[id], url: sourceUrls[id], metric: metrics[id],
            status: "更新未確認", expectedCount,
            recordCount: Array.isArray(previous.records) ? previous.records.length : 0,
            lastAttemptAt: attemptedAt,
            error: source?.error || (source?.ok
              ? `件数・順位・リンク検証不一致（取得 ${records.length} / 期待 ${expectedCount}）`
              : "外部媒体の取得またはページ構造の確認に失敗")
          };
        }
        checks.push({ id, status: nextSources[id].status, receivedCount: records.length,
          expectedCount, savedRecordCount: nextSources[id].recordCount, error: nextSources[id].error || null });
      }
      const nextState = {
        ...current, schemaVersion: 1, sources: nextSources,
        lastAttemptAt: attemptedAt,
        lastRun: { attemptedAt, checks, note: "媒体別に独立保存。取得失敗・検証不一致の場合は直前の成功データを保持。" }
      };
      const writeResponse = await fetch(new URL("/v1/data/ranking_state", storageUrl), {
        method: "PUT",
        headers: { ...headers, "content-type": "application/json" },
        body: JSON.stringify(nextState),
        signal: AbortSignal.timeout(20000)
      });
      const write = await writeResponse.json();
      if (!writeResponse.ok || !write.ok) {
        return send(res, 502, { ok: false, error: "ranking_state_write_failed", upstreamStatus: writeResponse.status }, origin);
      }
      const verifyResponse = await fetch(new URL("/v1/data/ranking_state", storageUrl), {
        headers, signal: AbortSignal.timeout(15000)
      });
      const verify = await verifyResponse.json();
      if (!verifyResponse.ok || !verify.ok || !verify.found ||
          !verify.value?.sources || Object.keys(expected).some(id => verify.value.sources[id]?.status !== nextSources[id]?.status)) {
        return send(res, 502, { ok: false, error: "ranking_state_verify_failed", checks }, origin);
      }
      return send(res, 200, {
        ok: true, mode: "persisted-source-separated", checks,
        rankingState: verify.value,
        note: "媒体別の順位だけをD1へ保存しました。278店舗の基本情報・照合メモは変更していません。"
      }, origin);
    } catch (error) {
      return send(res, 502, { ok: false, error: "store_ranking_refresh_failed",
        detail: String(error?.message || error),
        note: "保存前の取得・検証に失敗した場合、既存のランキングデータは変更しません。" }, origin);
    }
  }

  if (pathname === "/api/casts/alternative-inspect" && req.method === "GET") {
    if (origin && !ALLOWED_ORIGINS.has(origin)) return send(res, 403, { ok: false, error: "origin_not_allowed" }, origin);
    const sources = [
      { id: "bestcastdata", label: "BEST CAST DATA・最高キャスト選出人数", url: "https://bestcastdata.jp/hiroshima/hiroshima-city/" },
      { id: "fuzoku_repeat", label: "風俗じゃぱん・リピートランキング", url: "https://fuzoku.jp/hiroshimacoco/girllist/ranking/" }
    ];
    const results = await Promise.all(sources.map(async source => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      try {
        const response = await fetch(source.url, { signal: controller.signal, headers: {
          "user-agent": "Mozilla/5.0 (compatible; HiroshimaCastRefresh/1.0)",
          "accept": "text/html,application/xhtml+xml"
        }});
        if (!response.ok) throw new Error("source_http_" + response.status);
        const html = await response.text();
        if (html.length < 5000 || html.length > 5000000) throw new Error("unexpected_html_size");
        const $ = cheerio.load(html);
        const title = $("title").first().text().replace(/\s+/g, " ").trim();
        const bodyText = $("body").text().replace(/\s+/g, " ").trim();
        const links = [];
        $("a[href]").each((_, el) => {
          const a = $(el);
          const href = a.attr("href") || "";
          const text = a.text().replace(/\s+/g, " ").trim();
          if (!href || !text) return;
          let absolute;
          try { absolute = new URL(href, source.url).href; } catch { return; }
          const ancestors = [];
          let node = a;
          for (let depth = 0; depth < 6 && node.length; depth++, node = node.parent()) {
            ancestors.push({ tag: node[0]?.tagName || "", className: String(node.attr("class") || "").slice(0, 120),
              text: node.text().replace(/\s+/g, " ").trim().slice(0, 260) });
          }
          if ((source.id === "bestcastdata" && /cityheaven\.net/.test(absolute)) ||
              (source.id === "fuzoku_repeat" && /\/hiroshimacoco\/girl\//.test(absolute))) {
            links.push({ text, href: absolute, ancestors });
          }
        });
        const validTitle = source.id === "bestcastdata" ? /最高キャスト/.test(title + " " + bodyText) :
          /リピートランキング/.test(title + " " + bodyText);
        return { id: source.id, label: source.label, url: source.url, ok: validTitle && links.length >= 5,
          httpStatus: response.status, htmlBytes: Buffer.byteLength(html), title,
          candidateCount: links.length, candidateSamples: links.slice(0, 12),
          bodySamples: source.id === "bestcastdata" ? bodyText.match(/.{0,35}最高キャスト.{0,35}/g)?.slice(0, 12) || [] : [],
          retrievedAt: new Date().toISOString(),
          note: "取得・DOM構造診断のみ。順位の確定、既存データの変更・上書きは行いません。" };
      } catch (error) {
        return { id: source.id, label: source.label, url: source.url, ok: false,
          status: "更新未確認", error: String(error?.message || error),
          note: "取得失敗時は既存データを変更しません。" };
      } finally { clearTimeout(timer); }
    }));
    return send(res, results.every(x => x.ok) ? 200 : 502, { ok: results.every(x => x.ok),
      mode: "diagnostic-only",
      metricPolicy: "最高キャスト選出人数とリピート順位は独立した指標として扱います。",
      sources: results,
      note: "診断専用。既存ランキングの公開・上書きは行いません。" }, origin);
  }
  if (pathname === "/api/fuzoku/list-inspect" && req.method === "GET") {
    if (origin && !ALLOWED_ORIGINS.has(origin)) return send(res, 403, { ok: false, error: "origin_not_allowed" }, origin);
    const source = "https://fuzoku.jp/hiroshimacoco/girllist/";
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(source, { signal: controller.signal, headers: {
        "user-agent": "Mozilla/5.0 (compatible; HiroshimaCastRefresh/1.0)",
        "accept": "text/html,application/xhtml+xml"
      }});
      if (!response.ok) throw new Error("source_http_" + response.status);
      const html = await response.text();
      if (html.length < 5000 || html.length > 5000000) throw new Error("unexpected_html_size");
      const $ = cheerio.load(html);
      const title = $("title").first().text().replace(/\s+/g, " ").trim();
      const bodyText = $("body").text().replace(/\s+/g, " ").trim();
      const records = [];
      $("a[href*='/hiroshimacoco/girl/']").each((_, el) => {
        const anchor = $(el);
        const href = new URL(anchor.attr("href"), source).href;
        const name = anchor.text().replace(/\s+/g, " ").trim();
        if (!name || name.length > 40 || /口コミ|プロフィール|詳細/.test(name)) return;
        let node = anchor;
        let context = "";
        for (let depth = 0; depth < 5 && node.length; depth++, node = node.parent()) {
          const candidate = node.text().replace(/\s+/g, " ").trim();
          if (candidate.length >= name.length && candidate.length <= 500) { context = candidate; if (/口コミ/.test(candidate)) break; }
        }
        const countMatch = context.match(/口コミ\s*[:：]?\s*([0-9,]+)\s*件/);
        records.push({ name, href, reviewCount: countMatch ? Number(countMatch[1].replace(/,/g, "")) : null,
          reviewCountExplicit: Boolean(countMatch), context: context.slice(0, 240) });
      });
      const unique = [...new Map(records.map(item => [item.href, item])).values()];
      const activeCount = bodyText.match(/([0-9,]+)人/);
      const pageRange = bodyText.match(/([0-9,]+)件?中?\s*1\s*[〜～-]\s*50/);
      const valid = /広島で評判のお店|広島ココ/.test(title + " " + bodyText) && unique.length >= 20;
      return send(res, 200, { ok: valid, mode: "diagnostic-only", source,
        retrievedAt: new Date().toISOString(), httpStatus: response.status,
        htmlBytes: Buffer.byteLength(html), title,
        activeCastCount: activeCount ? Number(activeCount[1].replace(/,/g, "")) : null,
        pageRange: pageRange ? pageRange[0] : null,
        listedCastCount: unique.length,
        explicitReviewCountCount: unique.filter(item => item.reviewCountExplicit).length,
        records: unique.slice(0, 60),
        note: "一覧ページの明示された口コミ件数のみ抽出。プロフィールや一覧の未表示件数を0件と扱わず、既存データも変更しません。"
      }, origin);
    } catch (error) {
      return send(res, 502, { ok: false, status: "更新未確認", source,
        error: String(error?.message || error),
        note: "取得または構造検証に失敗したため、既存データには触れていません。" }, origin);
    } finally { clearTimeout(timer); }
  }
  // One-time, non-destructive import of the existing Hiroshima 278-store candidate database.
  // The route seeds D1 only when the stores key is absent; it never replaces existing data.
  // Merge audit metadata from the canonical 278-record source into existing D1 stores.
  // Never replace the roster or business fields; preserve every current store record.
  if (pathname === "/api/storage/sync-duplicate-audit" && req.method === "POST") {
    if (!ALLOWED_ORIGINS.has(origin)) return send(res, 403, { ok: false, error: "allowed_app_origin_required" }, origin);
    const storageUrl = process.env.CAST_STORAGE_URL;
    const storageToken = process.env.CAST_STORAGE_API_TOKEN;
    if (!storageUrl || !storageToken) return send(res, 503, { ok: false, error: "storage_not_configured" }, origin);
    try {
      const headers = { authorization: `Bearer ${storageToken}` };
      const existingResponse = await fetch(new URL("/v1/data/stores", storageUrl), { headers, signal: AbortSignal.timeout(15000) });
      const existing = await existingResponse.json();
      if (!existingResponse.ok || !existing.ok || !existing.found || !Array.isArray(existing.value?.records)) {
        return send(res, 502, { ok: false, error: "existing_stores_read_failed" }, origin);
      }
      const sourceUrl = "https://raw.githubusercontent.com/hiromagic0001-ux/hiroshima-cast-ranking/main/switcher/store-database.json";
      const sourceResponse = await fetch(sourceUrl, { signal: AbortSignal.timeout(20000) });
      if (!sourceResponse.ok) return send(res, 502, { ok: false, error: "source_database_unavailable", sourceStatus: sourceResponse.status }, origin);
      const source = await sourceResponse.json();
      if (source.totalCandidates !== 278 || !Array.isArray(source.records) || source.records.length !== 278) {
        return send(res, 409, { ok: false, error: "source_database_validation_failed", count: source.records?.length ?? null }, origin);
      }
      const current = existing.value;
      if (current.records.length !== 278) return send(res, 409, { ok: false, error: "existing_record_count_mismatch", count: current.records.length }, origin);
      const sourceNames = new Set();
      for (const record of source.records) {
        if (!record.name || sourceNames.has(record.name)) return send(res, 409, { ok: false, error: "source_names_not_unique", name: record.name || null }, origin);
        sourceNames.add(record.name);
      }
      const currentByName = new Map();
      for (const record of current.records) {
        if (!record.name || currentByName.has(record.name)) return send(res, 409, { ok: false, error: "existing_names_not_unique", name: record.name || null }, origin);
        currentByName.set(record.name, record);
      }
      const auditFields = ["individualAudit", "batchAudit", "duplicateReview", "duplicateAudit",
        "duplicateGroup", "duplicateRole", "duplicateCanonicalName", "contactReview", "contactReviewDone"];
      let updatedRecords = 0;
      let fieldsSynced = 0;
      const nextRecords = current.records.map(record => {
        const sourceRecord = source.records.find(item => item.name === record.name);
        if (!sourceRecord) return record;
        const merged = { ...record };
        let changed = false;
        for (const field of auditFields) {
          if (Object.prototype.hasOwnProperty.call(sourceRecord, field)) {
            merged[field] = sourceRecord[field];
            changed = true;
            fieldsSynced++;
          }
        }
        if (changed) updatedRecords++;
        return merged;
      });
      if (nextRecords.length !== 278 || currentByName.size !== sourceNames.size) {
        return send(res, 409, { ok: false, error: "record_roster_validation_failed" }, origin);
      }
      const next = {
        ...current,
        records: nextRecords,
        ...(Array.isArray(source.batchAudits) ? { batchAudits: source.batchAudits } : {}),
        ...(source.auditSummary ? { auditSummary: source.auditSummary } : {}),
        ...(source.duplicateAuditSummary ? { duplicateAuditSummary: source.duplicateAuditSummary } : {})
      };
      const writeResponse = await fetch(new URL("/v1/data/stores", storageUrl), {
        method: "PUT",
        headers: { ...headers, "content-type": "application/json" },
        body: JSON.stringify(next),
        signal: AbortSignal.timeout(20000)
      });
      const write = await writeResponse.json();
      if (!writeResponse.ok || !write.ok) return send(res, 502, { ok: false, error: "audit_sync_write_failed", upstreamStatus: writeResponse.status }, origin);
      return send(res, 200, {
        ok: true, updatedKey: "stores", recordsPreserved: current.records.length,
        updatedRecords, fieldsSynced, groupsReviewed: source.duplicateAuditSummary?.groupsReviewed ?? null,
        updatedAt: write.updatedAt,
        note: "278件の店舗レコードと既存の店舗情報は保持し、個別確認・一括確認・重複照合などの監査メモだけを同期しました。"
      }, origin);
    } catch (error) {
      return send(res, 502, { ok: false, error: "audit_sync_failed", detail: String(error?.message || error) }, origin);
    }
  }
  if (pathname === "/api/storage/import-initial-stores" && req.method === "GET") {
    if (origin && !ALLOWED_ORIGINS.has(origin)) return send(res, 403, { ok: false, error: "origin_not_allowed" }, origin);
    const storageUrl = process.env.CAST_STORAGE_URL;
    const storageToken = process.env.CAST_STORAGE_API_TOKEN;
    if (!storageUrl || !storageToken) return send(res, 503, { ok: false, error: "storage_not_configured" }, origin);
    try {
      const headers = { authorization: `Bearer ${storageToken}` };
      const existingResponse = await fetch(new URL("/v1/data/stores", storageUrl), { headers, signal: AbortSignal.timeout(15000) });
      const existing = await existingResponse.json();
      if (!existingResponse.ok || !existing.ok) return send(res, 502, { ok: false, error: "storage_read_before_import_failed", upstreamStatus: existingResponse.status }, origin);
      if (existing.found) return send(res, 200, { ok: true, imported: false, reason: "stores_key_already_exists", existingRecordCount: Array.isArray(existing.value?.records) ? existing.value.records.length : null }, origin);
      const sourceUrl = "https://raw.githubusercontent.com/hiromagic0001-ux/hiroshima-cast-ranking/main/switcher/store-database.json";
      const sourceResponse = await fetch(sourceUrl, { signal: AbortSignal.timeout(20000) });
      if (!sourceResponse.ok) return send(res, 502, { ok: false, error: "source_database_unavailable", sourceStatus: sourceResponse.status }, origin);
      const raw = await sourceResponse.text();
      if (Buffer.byteLength(raw) > 1_500_000) return send(res, 413, { ok: false, error: "source_database_too_large" }, origin);
      let database;
      try { database = JSON.parse(raw); } catch { return send(res, 502, { ok: false, error: "source_database_invalid_json" }, origin); }
      if (!Array.isArray(database.records) || database.records.length !== 278 || database.totalCandidates !== 278) {
        return send(res, 409, { ok: false, error: "source_database_validation_failed", totalCandidates: database.totalCandidates ?? null, recordCount: Array.isArray(database.records) ? database.records.length : null }, origin);
      }
      const writeResponse = await fetch(new URL("/v1/data/stores", storageUrl), {
        method: "PUT", headers: { ...headers, "content-type": "application/json" }, body: JSON.stringify(database), signal: AbortSignal.timeout(20000)
      });
      const write = await writeResponse.json();
      if (!writeResponse.ok || !write.ok) return send(res, 502, { ok: false, error: "store_import_write_failed", upstreamStatus: writeResponse.status, upstreamError: write.error || null }, origin);
      return send(res, 200, { ok: true, imported: true, key: "stores", recordCount: database.records.length, totalCandidates: database.totalCandidates, updatedAt: write.updatedAt, bytes: write.bytes, source: sourceUrl }, origin);
    } catch (error) {
      return send(res, 502, { ok: false, error: "store_import_failed", detail: String(error?.message || error) }, origin);
    }
  }
  // Cloudflare D1 storage bridge. Secrets remain on this server; never expose them to browsers.
  if (pathname === "/api/storage/status" && req.method === "GET") {
    if (origin && !ALLOWED_ORIGINS.has(origin)) return send(res, 403, { ok: false, error: "origin_not_allowed" }, origin);
    const storageUrl = process.env.CAST_STORAGE_URL;
    const storageToken = process.env.CAST_STORAGE_API_TOKEN;
    if (!storageUrl || !storageToken) return send(res, 503, { ok: false, error: "storage_not_configured" }, origin);
    try {
      const healthResponse = await fetch(new URL("/health", storageUrl), { signal: AbortSignal.timeout(10000) });
      const health = await healthResponse.json();
      if (!healthResponse.ok || !health.ok) return send(res, 502, { ok: false, error: "storage_unavailable", health }, origin);
      const summaryResponse = await fetch(new URL("/v1/summary", storageUrl), {
        headers: { authorization: `Bearer ${storageToken}` },
        signal: AbortSignal.timeout(10000)
      });
      const summary = await summaryResponse.json();
      if (!summaryResponse.ok || !summary.ok) return send(res, 502, { ok: false, error: "storage_auth_or_summary_failed", upstreamStatus: summaryResponse.status, upstreamError: summary?.error || "summary_failed" }, origin);
      return send(res, 200, { ok: true, service: health.service, database: health.database, storedKeys: summary.records || [] }, origin);
    } catch (error) {
      return send(res, 502, { ok: false, error: "storage_connection_failed", detail: String(error?.message || error) }, origin);
    }
  }
  // Read-only link audit for the saved three-source ranking. Never writes to D1.
  if (pathname === "/api/stores/check-ranking-links" && ["GET", "POST"].includes(req.method)) {
    if (origin && !ALLOWED_ORIGINS.has(origin)) return send(res, 403, { ok: false, error: "origin_not_allowed" }, origin);
    const storageUrl = process.env.CAST_STORAGE_URL;
    const storageToken = process.env.CAST_STORAGE_API_TOKEN;
    if (!storageUrl || !storageToken) return send(res, 503, { ok: false, error: "storage_not_configured" }, origin);
    if (requestUrl.searchParams.get("refresh") === "1") rankingLinkAuditJob = null;
    if (rankingLinkAuditJob?.status === "running") {
      return send(res, 200, { ok: true, mode: "read-only", status: "running", startedAt: rankingLinkAuditJob.startedAt, note: "検査中です。同じURLを後で再読み込みしてください。保存データは変更していません。" }, origin);
    }
    if (rankingLinkAuditJob?.status === "complete") return send(res, 200, rankingLinkAuditJob.result, origin);
    if (rankingLinkAuditJob?.status === "failed") return send(res, 502, { ok: false, status: "failed", error: rankingLinkAuditJob.error, note: "読み取り専用検査に失敗しました。" }, origin);
    rankingLinkAuditJob = { status: "running", startedAt: new Date().toISOString() };
    void (async () => {
    try {
      const stored = await fetch(new URL("/v1/data/ranking_state", storageUrl), {
        headers: { authorization: `Bearer ${storageToken}` },
        signal: AbortSignal.timeout(15000)
      });
      const payload = await stored.json();
      if (!stored.ok || !payload.ok || !payload.found || !payload.value?.sources) {
        throw new Error("ranking_state_unavailable");
      }
      const allowedHosts = {
        salonowa: new Set(["salonowa.jp", "www.salonowa.jp"]),
        mensesthe_rank: new Set(["mensesthe-rank.jp", "www.mensesthe-rank.jp"]),
        menes_note: new Set(["men-esthe-review.com", "www.men-esthe-review.com"])
      };
      const sourceLabels = { salonowa: "salonowa", mensesthe_rank: "mensesthe_rank", menes_note: "menes_note" };
      const queue = [];
      for (const id of Object.keys(allowedHosts)) {
        const source = payload.value.sources[id];
        const records = Array.isArray(source?.records) ? source.records : [];
        for (const record of records) queue.push({ sourceId: id, sourceLabel: sourceLabels[id], name: record.name || "名称未確認", rank: record.rank ?? null, href: record.href || "" });
      }
      const results = new Array(queue.length);
      let cursor = 0;
      // Keep Salonowa requests slow and honor its Retry-After response when rate-limited.
      let salonowaNextStart = 0;
      let salonowaQueue = Promise.resolve();
      const waitForSalonowaSlot = async () => {
        let release;
        const previous = salonowaQueue;
        salonowaQueue = new Promise(resolve => { release = resolve; });
        await previous;
        const waitMs = Math.max(0, salonowaNextStart - Date.now());
        if (waitMs > 0) await new Promise(resolve => setTimeout(resolve, waitMs));
        salonowaNextStart = Date.now() + 5000;
        release();
      };
      const applySalonowaRateLimit = response => {
        const retryAfter = response.headers.get("retry-after");
        let retryMs = 60000;
        if (retryAfter) {
          const seconds = Number(retryAfter);
          const retryDate = Date.parse(retryAfter);
          if (Number.isFinite(seconds) && retryAfter.trim() !== "") retryMs = seconds * 1000;
          else if (Number.isFinite(retryDate)) retryMs = retryDate - Date.now();
        }
        retryMs = Math.max(5000, Math.min(600000, retryMs));
        salonowaNextStart = Math.max(salonowaNextStart, Date.now() + retryMs);
      };
      const worker = async () => {
        while (true) {
          const index = cursor++;
          if (index >= queue.length) return;
          const item = queue[index];
          if (!item.href) { results[index] = { ...item, status: "リンクなし" }; continue; }
          let url;
          try {
            url = new URL(item.href);
            if (url.protocol !== "https:" || !allowedHosts[item.sourceId].has(url.hostname)) {
              results[index] = { ...item, status: "検査対象外", detail: "許可ドメイン外またはHTTPS以外" };
              continue;
            }
          } catch {
            results[index] = { ...item, status: "URL不正" };
            continue;
          }
          try {
            if (item.sourceId === "salonowa") await waitForSalonowaSlot();
            const response = await fetch(url, {
              method: "GET",
              redirect: "follow",
              headers: { "user-agent": "Mozilla/5.0 (compatible; HiroshimaCastLinkAudit/1.0)", "accept": "text/html,application/xhtml+xml,*/*;q=0.8" },
              signal: AbortSignal.timeout(7000)
            });
            const finalUrl = new URL(response.url || url.href);
            const safeFinal = finalUrl.protocol === "https:" && allowedHosts[item.sourceId].has(finalUrl.hostname);
            const statusCode = response.status;
            if (item.sourceId === "salonowa" && statusCode === 429) applySalonowaRateLimit(response);
            try { await response.body?.cancel(); } catch {}
            let status = "応答エラー";
            if (!safeFinal) status = "転送先要確認";
            else if (statusCode >= 200 && statusCode < 400) status = "応答あり";
            else if ([401, 403, 429].includes(statusCode)) status = "アクセス制限";
            else if ([404, 410].includes(statusCode)) status = "リンク切れ";
            results[index] = { ...item, status, httpStatus: statusCode, finalUrl: safeFinal ? finalUrl.href : null };
          } catch (error) {
            results[index] = { ...item, status: "応答未確認", detail: String(error?.name === "TimeoutError" || error?.name === "AbortError" ? "タイムアウト" : error?.message || error).slice(0, 140) };
          }
        }
      };
      await Promise.all(Array.from({ length: Math.min(8, queue.length) }, () => worker()));
      const groups = Object.keys(allowedHosts).map(id => {
        const rows = results.filter(row => row.sourceId === id);
        const count = status => rows.filter(row => row.status === status).length;
        return {
          sourceId: id, label: sourceLabels[id], total: rows.length,
          linksPresent: rows.filter(row => Boolean(row.href)).length,
          linksMissing: count("リンクなし"),
          reachable: count("応答あり"),
          broken: count("リンク切れ"),
          restricted: count("アクセス制限"),
          unconfirmed: rows.filter(row => ["応答未確認", "応答エラー", "転送先要確認", "検査対象外", "URL不正"].includes(row.status)).length,
          issues: rows.filter(row => row.status !== "応答あり").slice(0, 30).map(({ name, rank, href, status, httpStatus, detail }) => ({ name, rank, href, status, httpStatus: httpStatus ?? null, detail: detail || null }))
        };
      });
      // Emit restricted records one per log line so they can be retrieved safely
      // from Render logs when the full JSON response is not accessible to the operator.
      for (const group of groups) {
        for (const issue of group.issues.filter(item => item.status === "アクセス制限")) {
          console.log(JSON.stringify({
            event: "ranking_link_audit_issue",
            sourceId: group.sourceId,
            name: issue.name,
            rank: issue.rank,
            href: issue.href,
            httpStatus: issue.httpStatus
          }));
        }
      }
      rankingLinkAuditJob = { status: "complete", completedAt: new Date().toISOString(), result: {
        ok: true, mode: "read-only", checkedAt: new Date().toISOString(),
        total: results.length,
        totals: {
          linksPresent: results.filter(row => Boolean(row.href)).length,
          linksMissing: results.filter(row => row.status === "リンクなし").length,
          reachable: results.filter(row => row.status === "応答あり").length,
          broken: results.filter(row => row.status === "リンク切れ").length,
          restricted: results.filter(row => row.status === "アクセス制限").length,
          unconfirmed: results.filter(row => ["応答未確認", "応答エラー", "転送先要確認", "検査対象外", "URL不正"].includes(row.status)).length
        },
        groups,
        note: "読み取り専用検査です。店舗マスター・ランキング保存データは変更していません。アクセス制限はリンク切れと区別しています。"
      }};
    } catch (error) {
      rankingLinkAuditJob = { status: "failed", error: String(error?.message || error) };
    }
    })();
    return send(res, 202, { ok: true, mode: "read-only", status: "started", startedAt: rankingLinkAuditJob.startedAt, note: "検査を開始しました。画面を閉じても構いません。同じURLを後で再読み込みすると結果を表示します。保存データは変更しません。" }, origin);
  }
  // Read/write app datasets through the server-side secret. Browser never receives the D1 token.
  const storageDataPrefix = "/api/storage/data/";
  const storageDataMatch = pathname.startsWith(storageDataPrefix) ? pathname.slice(storageDataPrefix.length).match(/^([a-z_]+)$/) : null;
  if (storageDataMatch && ["GET", "PUT"].includes(req.method)) {
    if (origin && !ALLOWED_ORIGINS.has(origin)) return send(res, 403, { ok: false, error: "origin_not_allowed" }, origin);
    const key = storageDataMatch[1];
    const allowedKeys = new Set(["stores", "casts", "source_status", "ranking_state", "refresh_status", "settings"]);
    if (!allowedKeys.has(key)) return send(res, 400, { ok: false, error: "invalid_key" }, origin);
    const storageUrl = process.env.CAST_STORAGE_URL;
    const storageToken = process.env.CAST_STORAGE_API_TOKEN;
    if (!storageUrl || !storageToken) return send(res, 503, { ok: false, error: "storage_not_configured" }, origin);
    try {
      const options = {
        method: req.method,
        headers: { authorization: `Bearer ${storageToken}` },
        signal: AbortSignal.timeout(15000)
      };
      if (req.method === "PUT") {
        let raw = "";
        for await (const chunk of req) {
          raw += chunk;
          if (raw.length > 2_000_000) return send(res, 413, { ok: false, error: "payload_too_large" }, origin);
        }
        try { JSON.parse(raw); } catch { return send(res, 400, { ok: false, error: "invalid_json" }, origin); }
        options.headers["content-type"] = "application/json";
        options.body = raw;
      }
      const response = await fetch(new URL(`/v1/data/${key}`, storageUrl), options);
      const result = await response.json();
      return send(res, response.status, result, origin);
    } catch (error) {
      return send(res, 502, { ok: false, error: "storage_data_request_failed", detail: String(error?.message || error) }, origin);
    }
  }
  if (pathname === "/api/storage/refresh-runs" && req.method === "POST") {
    if (origin && !ALLOWED_ORIGINS.has(origin)) return send(res, 403, { ok: false, error: "origin_not_allowed" }, origin);
    const storageUrl = process.env.CAST_STORAGE_URL;
    const storageToken = process.env.CAST_STORAGE_API_TOKEN;
    if (!storageUrl || !storageToken) return send(res, 503, { ok: false, error: "storage_not_configured" }, origin);
    let raw = "";
    for await (const chunk of req) {
      raw += chunk;
      if (raw.length > 200000) return send(res, 413, { ok: false, error: "payload_too_large" }, origin);
    }
    let run;
    try { run = JSON.parse(raw); } catch { return send(res, 400, { ok: false, error: "invalid_json" }, origin); }
    if (!run || !["completed", "partial", "failed"].includes(run.status)) {
      return send(res, 400, { ok: false, error: "invalid_refresh_status" }, origin);
    }
    try {
      const response = await fetch(new URL("/v1/refresh-runs", storageUrl), {
        method: "POST",
        headers: { authorization: `Bearer ${storageToken}`, "content-type": "application/json" },
        body: JSON.stringify(run),
        signal: AbortSignal.timeout(10000)
      });
      const result = await response.json();
      return send(res, response.status, result, origin);
    } catch (error) {
      return send(res, 502, { ok: false, error: "storage_write_failed", detail: String(error?.message || error) }, origin);
    }
  }
  if (pathname !== "/api/estama/inspect" || req.method !== "GET") {
    return send(res, 404, { ok: false, error: "not_found" }, origin);
  }
  if (origin && !ALLOWED_ORIGINS.has(origin)) {
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

});
