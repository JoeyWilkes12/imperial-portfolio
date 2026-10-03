import { createReadStream, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const port = Number(process.env.PORT || 4314);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error("PORT must be a whole number between 1 and 65535.");
  process.exit(1);
}
const types = {
  ".css": "text/css; charset=utf-8",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".pdf": "application/pdf",
  ".svg": "image/svg+xml",
  ".html": "text/html; charset=utf-8",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8"
};

const server = createServer((request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host}`);
  let pathname = decodeURIComponent(url.pathname);
  let target = normalize(join(root, pathname));

  if (!target.startsWith(normalize(root))) {
    response.writeHead(403).end("Forbidden");
    return;
  }

  try {
    if (pathname.endsWith("/") || statSync(target).isDirectory()) target = join(target, "index.html");
    const metadata = statSync(target);
    response.writeHead(200, {
      "Content-Type": types[extname(target)] || "application/octet-stream",
      "Content-Length": metadata.size,
      "Cache-Control": "no-store"
    });
    if (request.method === "HEAD") response.end();
    else createReadStream(target).pipe(response);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Not found");
  }
});
server.on("error", error => {
  console.error(error.code === "EADDRINUSE"
    ? `Port ${port} is already in use. Stop the existing preview or choose another port: PORT=4414 npm run serve`
    : error.message);
  process.exit(1);
});
server.listen(port, "127.0.0.1", () => {
  console.log(`Imperial 3.0 at http://127.0.0.1:${port}`);
});
