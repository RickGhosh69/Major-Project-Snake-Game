import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 4173);

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8"
};

function resolvePath(urlPath) {
  const normalized = urlPath === "/" ? "/index.html" : urlPath;
  const filePath = path.normalize(path.join(rootDir, normalized));

  if (!filePath.startsWith(rootDir)) {
    return null;
  }

  return filePath;
}

const server = http.createServer(async (request, response) => {
  const filePath = resolvePath(request.url || "/");

  if (!filePath || !existsSync(filePath)) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  const fileStats = await stat(filePath);
  if (fileStats.isDirectory()) {
    response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Directory listing is disabled");
    return;
  }

  const extension = path.extname(filePath);
  response.writeHead(200, {
    "Content-Type": contentTypes[extension] || "application/octet-stream"
  });
  createReadStream(filePath).pipe(response);
});

server.listen(port, () => {
  console.log(`Snake server running at http://127.0.0.1:${port}`);
});
