const http = require("http");
const fs = require("fs/promises");
const path = require("path");

const START_PORT = 3000;
const MAX_PORT = 3010;
const HOST = "127.0.0.1";
const ROOT = __dirname;
const DATA_FILE = path.join(ROOT, "data.json");

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

async function ensureDataFile() {
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, JSON.stringify({ tasks: [] }, null, 2));
  }
}

async function readJsonBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }
  const text = Buffer.concat(chunks).toString("utf8");
  return text ? JSON.parse(text) : {};
}

function send(response, statusCode, body, contentType = "application/json; charset=utf-8") {
  response.writeHead(statusCode, {
    "Content-Type": contentType,
    "Cache-Control": "no-store"
  });
  response.end(body);
}

async function handleApi(request, response) {
  await ensureDataFile();

  if (request.method === "GET" && request.url === "/api/tasks") {
    const data = await fs.readFile(DATA_FILE, "utf8");
    send(response, 200, data);
    return;
  }

  if (request.method === "POST" && request.url === "/api/tasks") {
    const body = await readJsonBody(request);
    const tasks = Array.isArray(body.tasks) ? body.tasks : [];
    const data = JSON.stringify({ tasks }, null, 2);
    await fs.writeFile(DATA_FILE, data);
    send(response, 200, data);
    return;
  }

  send(response, 404, JSON.stringify({ error: "Not found" }));
}

async function handleStatic(request, response) {
  const url = new URL(request.url, `http://${HOST}`);
  const pathname = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  const filePath = path.normalize(path.join(ROOT, pathname));

  if (!filePath.startsWith(ROOT)) {
    send(response, 403, "Forbidden", "text/plain; charset=utf-8");
    return;
  }

  try {
    const content = await fs.readFile(filePath);
    const contentType = mimeTypes[path.extname(filePath)] || "application/octet-stream";
    send(response, 200, content, contentType);
  } catch {
    send(response, 404, "Not found", "text/plain; charset=utf-8");
  }
}

function createServer() {
  return http.createServer(async (request, response) => {
    try {
      if (request.url.startsWith("/api/")) {
        await handleApi(request, response);
        return;
      }

      await handleStatic(request, response);
    } catch (error) {
      send(response, 500, JSON.stringify({ error: error.message }));
    }
  });
}

function listen(port) {
  const server = createServer();

  server.once("error", (error) => {
    if (error.code === "EADDRINUSE" && port < MAX_PORT) {
      listen(port + 1);
      return;
    }
    throw error;
  });

  server.listen(port, HOST, () => {
    console.log(`夸夸打卡器已启动：http://${HOST}:${port}`);
  });
}

listen(START_PORT);
