import { createReadStream, readFileSync, readdirSync, statSync } from "node:fs";
import { mkdtemp, readFile, rm, mkdir, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const run = promisify(execFile);
const internalOnly = process.argv.includes("--internal-only");
const liveSite = process.argv.includes("--live-site");
const siteUrl = new URL("https://joeywilkes12.github.io/imperial-portfolio/");
const concurrency = Math.min(8, Math.max(1, Number(process.env.LINK_CONCURRENCY) || 4));
const ignoredDirectories = new Set([".git", "node_modules", "output", "test-results", "playwright-report"]);
const mime = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml",
  ".pdf": "application/pdf", ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xml": "application/xml; charset=utf-8", ".txt": "text/plain; charset=utf-8"
};
const checks = [];
const failures = [];
const internal = new Map();
const external = new Map();
const skipped = [];
const pages = [];

function htmlFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    if (entry.isSymbolicLink() || ignoredDirectories.has(entry.name)) return [];
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return htmlFiles(path);
    return entry.isFile() && entry.name.endsWith(".html") ? [path] : [];
  });
}
function decodeHtml(value) {
  return value.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, value) => String.fromCodePoint(Number(value)))
    .replace(/&#x([0-9a-f]+);/gi, (_, value) => String.fromCodePoint(parseInt(value, 16)));
}
function escapeRegExp(value) { return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
function recordFailure(check, error) {
  check.passed = false;
  check.error = error;
  failures.push(`${check.url}: ${error}`);
}
function recordDestination(map, url, reference) {
  const record = map.get(url) || { url, references: [] };
  record.references.push(reference);
  map.set(url, record);
}

const server = createServer((request, response) => {
  try {
    const url = new URL(request.url, "http://localhost");
    let target = resolve(root, "." + decodeURIComponent(url.pathname));
    if (target !== root && !target.startsWith(root + sep)) {
      response.writeHead(403).end("Forbidden"); return;
    }
    if (statSync(target).isDirectory()) target = join(target, "index.html");
    const metadata = statSync(target);
    if (!metadata.isFile()) { response.writeHead(404).end("Not found"); return; }
    response.writeHead(200, { "Content-Type": mime[extname(target)] || "application/octet-stream", "Content-Length": metadata.size });
    createReadStream(target).pipe(response);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Not found");
  }
});
await new Promise((accept, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", accept); });
const origin = `http://127.0.0.1:${server.address().port}`;
const curlDir = await mkdtemp(join(tmpdir(), "imperial-links-"));

try {
  for (const file of htmlFiles(root)) {
    const path = relative(root, file).split(sep).join("/");
    const html = readFileSync(file, "utf8");
    const title = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1];
    const heading = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
    const canonical = html.match(/<link\b(?=[^>]*\brel=["']canonical["'])[^>]*\bhref=["']([^"']+)["'][^>]*>/i)?.[1];
    pages.push({ path, title: title ? decodeHtml(title.replace(/<[^>]*>/g, "").trim()) : null });
    const base = new URL(path, origin + "/");
    recordDestination(internal, base.href, { page: path, attribute: "page", expectedTitle: title ? decodeHtml(title.replace(/<[^>]*>/g, "").trim()) : null, expectedHeading: heading ? decodeHtml(heading.replace(/<[^>]*>/g, "").trim()) : null });
    // Inspect HTML tag attributes; script text or JSON-LD URLs are not hyperlinks.
    for (const tag of html.matchAll(/<[a-z][^>]*>/gi)) {
      const tagName = tag[0].match(/^<([a-z][a-z0-9-]*)/i)?.[1].toLowerCase();
      for (const match of tag[0].matchAll(/\b(href|src)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi)) {
        const value = decodeHtml(match[2] ?? match[3] ?? match[4]);
        const reference = { page: path, element: tagName, attribute: match[1].toLowerCase(), value };
        if (/^(mailto:|tel:|data:)/i.test(value)) { skipped.push(reference); continue; }
        if (!value || value === "#" || /^javascript:/i.test(value)) {
          const check = { kind: "markup", url: `${path}: ${value}`, references: [reference] };
          recordFailure(check, "Empty or nonfunctional destination"); checks.push(check); continue;
        }
        try {
          const url = new URL(value, base);
          if (!["http:", "https:"].includes(url.protocol)) {
            const check = { kind: "markup", url: value, references: [reference] };
            recordFailure(check, `Unsupported URL scheme ${url.protocol}`); checks.push(check); continue;
          }
          if (url.origin === origin) recordDestination(internal, url.href, reference);
          else if (url.origin === siteUrl.origin && url.pathname.startsWith(siteUrl.pathname)) {
            // The release's own absolute URLs resolve against this build before deployment.
            const local = new URL(url.pathname.slice(siteUrl.pathname.length) + url.search + url.hash, origin + "/");
            recordDestination(internal, local.href, { ...reference, publishedUrl: url.href });
            if (liveSite) recordDestination(external, url.href, reference);
          } else recordDestination(external, url.href, reference);
        } catch (error) {
          const check = { kind: "markup", url: value, references: [reference] };
          recordFailure(check, error.message); checks.push(check);
        }
      }
    }
    if (!title || !heading) {
      const check = { kind: "page-content", url: base.href, references: [{ page: path }] };
      recordFailure(check, "Page needs a title and an H1"); checks.push(check);
    }
    const expectedCanonical = new URL(path.replace(/index\.html$/, ""), siteUrl).href;
    const canonicalCheck = { kind: "canonical", url: canonical ? decodeHtml(canonical) : base.href, expectedUrl: expectedCanonical, references: [{ page: path }], passed: true };
    if (!canonical || decodeHtml(canonical) !== expectedCanonical) recordFailure(canonicalCheck, "Canonical URL does not match this page's published route");
    checks.push(canonicalCheck);
    if (canonical && decodeHtml(canonical) === expectedCanonical) {
      const expectedHeading = heading ? decodeHtml(heading.replace(/<[^>]*>/g, "").trim()) : null;
      const local = new URL(path.replace(/index\.html$/, ""), origin + "/");
      recordDestination(internal, local.href, { page: path, attribute: "page", publishedUrl: expectedCanonical, expectedTitle: pages.at(-1).title, expectedHeading });
      if (liveSite) {
        const record = external.get(expectedCanonical);
        if (record) { record.expectedTitle = pages.at(-1).title; record.expectedHeading = expectedHeading; }
      }
    }
  }

  for (const destination of internal.values()) {
    const check = { kind: "internal", ...destination, passed: true };
    try {
      const url = new URL(destination.url);
      const response = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(15000) });
      check.status = response.status;
      check.finalUrl = response.url;
      check.contentType = response.headers.get("content-type");
      const body = Buffer.from(await response.arrayBuffer());
      if (!response.ok) recordFailure(check, `HTTP ${response.status}`);
      else if (check.contentType?.includes("text/html")) {
        const html = body.toString("utf8");
        const actualTitle = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1];
        check.title = actualTitle ? decodeHtml(actualTitle.replace(/<[^>]*>/g, "").trim()) : null;
        const expected = destination.references.find(reference => reference.attribute === "page");
        if (!check.title || (expected?.expectedTitle && check.title !== expected.expectedTitle)) recordFailure(check, "Response title does not match the destination page");
        if (expected?.expectedHeading && !decodeHtml(html).includes(expected.expectedHeading)) recordFailure(check, "Response omits the expected page heading");
        if (url.hash) {
          const id = decodeURIComponent(url.hash.slice(1));
          check.fragment = id;
          if (!new RegExp(`\\b(?:id|name)\\s*=\\s*["']${escapeRegExp(id)}["']`).test(html)) recordFailure(check, `Missing fragment #${id}`);
        }
      } else if (url.pathname.endsWith(".pdf")) {
        if (!check.contentType?.includes("application/pdf") || body.subarray(0, 5).toString() !== "%PDF-") recordFailure(check, "PDF does not have the expected MIME type and signature");
      } else if (url.pathname.endsWith(".docx")) {
        if (!check.contentType?.includes("application/vnd.openxmlformats-officedocument.wordprocessingml.document") || body.subarray(0, 2).toString() !== "PK") recordFailure(check, "Word file does not have the expected MIME type and ZIP signature");
      }
    } catch (error) { recordFailure(check, error.message); }
    checks.push(check);
  }

  const destinations = [...external.values()];
  let next = 0;
  async function worker() {
    while (next < destinations.length) {
      const index = next++;
      const destination = destinations[index];
      if (internalOnly) { skipped.push({ ...destination, reason: "--internal-only; external verification pending" }); continue; }
      const headerFile = join(curlDir, `headers-${index}`);
      const bodyFile = destination.expectedTitle ? join(curlDir, `body-${index}`) : "/dev/null";
      const check = { kind: "external", ...destination, passed: true };
      try {
        const result = await run("curl", ["--location", "--silent", "--show-error", "--max-redirs", "10", "--connect-timeout", "15", "--max-time", "45", "--user-agent", "Mozilla/5.0", "--output", bodyFile, "--dump-header", headerFile, "--write-out", "%{json}", destination.url], { maxBuffer: 1024 * 1024 });
        const stats = JSON.parse(result.stdout);
        check.status = stats.http_code;
        check.finalUrl = stats.url_effective;
        check.redirectCount = stats.num_redirects;
        check.contentType = stats.content_type;
        const headers = await readFile(headerFile, "utf8");
        check.redirectChain = headers.split(/\r?\n\r?\n/).filter(block => /^HTTP\//.test(block)).map(block => ({
          status: Number(block.match(/^HTTP\/\S+\s+(\d+)/)?.[1]),
          location: block.match(/^location:\s*(.+)$/im)?.[1].trim() || null
        })).filter(block => block.status !== 0);
        if (stats.http_code < 200 || stats.http_code >= 400) recordFailure(check, `HTTP ${stats.http_code}`);
        if (check.redirectChain.some(block => block.status >= 400)) recordFailure(check, "A response in the redirect chain returned an error");
        if (destination.expectedTitle && check.passed) {
          const html = await readFile(bodyFile, "utf8");
          const title = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1];
          check.title = title ? decodeHtml(title.replace(/<[^>]*>/g, "").trim()) : null;
          if (check.title !== destination.expectedTitle) recordFailure(check, "Published page title does not match this release");
          if (destination.expectedHeading && !decodeHtml(html).includes(destination.expectedHeading)) recordFailure(check, "Published page omits the expected heading");
        }
      } catch (error) { recordFailure(check, error.stderr?.trim() || error.message); }
      checks.push(check);
      console.log(`${check.passed ? "PASS" : "FAIL"} ${check.status || "ERROR"} ${destination.url}`);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, destinations.length) }, worker));
} finally {
  await new Promise(accept => server.close(accept));
  await rm(curlDir, { recursive: true, force: true });
}

const report = {
  site: "Imperial 3.0", checkedAt: new Date().toISOString(), mode: internalOnly ? "internal-only" : liveSite ? "postpublish" : "prepublish",
  complete: !internalOnly, publishedSiteChecked: liveSite && !internalOnly, passed: failures.length === 0, pageCount: pages.length,
  internalCount: internal.size, externalCount: external.size, concurrency,
  pages, checks: checks.sort((a, b) => a.url.localeCompare(b.url)), skipped, failures
};
await mkdir(join(root, "output/playwright"), { recursive: true });
await writeFile(join(root, "output/playwright/links.json"), JSON.stringify(report, null, 2) + "\n");
console.log(`Checked ${pages.length} pages, ${internal.size} internal destinations, and ${internalOnly ? "0 of " : ""}${external.size} external destinations. Report: output/playwright/links.json`);
if (failures.length) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
}
