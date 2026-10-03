import { readFileSync, statSync } from "node:fs";
import { dirname, join, normalize, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const htmlFiles = ["index.html", "projects/index.html", "writing/index.html", "about/index.html", "contact/index.html"];
const hrefPattern = /href="([^"]+)"/g;
const failures = [];
const external = new Set();

for (const file of htmlFiles) {
  const sourcePath = join(root, file);
  const html = readFileSync(sourcePath, "utf8");
  const base = new URL(file, "https://imperial.local/");
  for (const match of html.matchAll(hrefPattern)) {
    const href = match[1];
    if (/^(mailto:|tel:|data:|javascript:)/.test(href)) continue;
    const url = new URL(href, base);
    if (url.origin !== base.origin) {
      external.add(url.href);
      continue;
    }

    let target = decodeURIComponent(url.pathname.replace(/^\//, ""));
    if (!target || target.endsWith("/")) target += "index.html";
    const targetPath = normalize(join(root, target));
    try {
      if (!statSync(targetPath).isFile()) failures.push(`${file}: ${href} is not a file`);
    } catch {
      failures.push(`${file}: ${href} is missing (${relative(root, targetPath)})`);
      continue;
    }

    if (url.hash && extnameSafe(targetPath) === ".html") {
      const targetHtml = readFileSync(targetPath, "utf8");
      const id = decodeURIComponent(url.hash.slice(1));
      const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (!new RegExp(`id=["']${escaped}["']`).test(targetHtml)) failures.push(`${file}: ${href} has no matching id`);
    }
  }
}

for (const url of external) {
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: { "user-agent": "Mozilla/5.0 ImperialLinkCheck/2.0", "accept": "text/html,application/pdf;q=0.9,*/*;q=0.8" },
      signal: AbortSignal.timeout(30000)
    });
    if (response.status >= 400) failures.push(`${url} returned ${response.status}`);
    else console.log(`external ${response.status} ${url}`);
    await response.body?.cancel();
  } catch (error) {
    failures.push(`${url} failed: ${error.message}`);
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`Checked ${htmlFiles.length} pages and ${external.size} external destinations.`);

function extnameSafe(pathname) {
  const index = pathname.lastIndexOf(".");
  return index === -1 ? "" : pathname.slice(index);
}
