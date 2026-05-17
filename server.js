const http = require("http");
const fs = require("fs/promises");
const path = require("path");
const { pool, toMysqlDateTime, fromMysqlDateTime } = require("./db");

const START_PORT = 3000;
const MAX_PORT = 3010;
const HOST = "127.0.0.1";
const ROOT = __dirname;

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

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

function normalizeTask(task) {
  return {
    id: String(task.id),
    name: task.name || "",
    target: Number(task.target) || 1,
    totalTarget: task.totalTarget ?? null,
    unit: task.unit || "个",
    progress: Number(task.progress) || 0,
    archived: Boolean(task.archived),
    completedAt: task.completedAt || null,
    archivedAt: task.archivedAt || null,
    frequency: {
      type: task.frequency?.type || "daily",
      weeklyDays: Number(task.frequency?.weeklyDays) || 1
    },
    logs: Array.isArray(task.logs) ? task.logs : [],
    createdAt: task.createdAt || new Date().toISOString(),
    updatedAt: task.updatedAt || new Date().toISOString()
  };
}

async function getTasks() {
  const [taskRows] = await pool.query(`
    SELECT
      id,
      name,
      target,
      total_target,
      unit,
      progress,
      archived,
      frequency_type,
      weekly_days,
      completed_at,
      archived_at,
      created_at,
      updated_at
    FROM tasks
    ORDER BY created_at ASC
  `);
  const [logRows] = await pool.query(`
    SELECT
      task_id,
      date,
      amount,
      timestamp_ms,
      created_at
    FROM checkin_logs
    ORDER BY timestamp_ms ASC
  `);
  const logsByTask = new Map();

  logRows.forEach((row) => {
    const logs = logsByTask.get(row.task_id) || [];
    logs.push({
      date: row.date instanceof Date ? row.date.toISOString().slice(0, 10) : String(row.date).slice(0, 10),
      amount: Number(row.amount),
      timestamp: Number(row.timestamp_ms),
      createdAt: fromMysqlDateTime(row.created_at)
    });
    logsByTask.set(row.task_id, logs);
  });

  return taskRows.map((row) => ({
    id: row.id,
    name: row.name,
    target: Number(row.target),
    totalTarget: row.total_target === null ? null : Number(row.total_target),
    unit: row.unit,
    progress: Number(row.progress),
    archived: Boolean(row.archived),
    completedAt: fromMysqlDateTime(row.completed_at),
    archivedAt: fromMysqlDateTime(row.archived_at),
    frequency: {
      type: row.frequency_type,
      weeklyDays: Number(row.weekly_days)
    },
    logs: logsByTask.get(row.id) || [],
    createdAt: fromMysqlDateTime(row.created_at),
    updatedAt: fromMysqlDateTime(row.updated_at)
  }));
}

async function replaceTasks(tasks) {
  const normalizedTasks = tasks.map(normalizeTask);
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    await connection.query("DELETE FROM checkin_logs");
    await connection.query("DELETE FROM tasks");

    for (const task of normalizedTasks) {
      await connection.query(
        `
          INSERT INTO tasks (
            id,
            name,
            target,
            total_target,
            unit,
            progress,
            archived,
            frequency_type,
            weekly_days,
            completed_at,
            archived_at,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          task.id,
          task.name,
          task.target,
          task.totalTarget,
          task.unit,
          task.progress,
          task.archived ? 1 : 0,
          task.frequency.type,
          task.frequency.weeklyDays,
          toMysqlDateTime(task.completedAt),
          toMysqlDateTime(task.archivedAt),
          toMysqlDateTime(task.createdAt),
          toMysqlDateTime(task.updatedAt)
        ]
      );

      for (const log of task.logs) {
        await connection.query(
          `
            INSERT INTO checkin_logs (
              task_id,
              date,
              amount,
              timestamp_ms,
              created_at
            )
            VALUES (?, ?, ?, ?, ?)
          `,
          [
            task.id,
            log.date,
            Number(log.amount) || 0,
            Number(log.timestamp) || Date.parse(log.createdAt) || Date.now(),
            toMysqlDateTime(log.createdAt)
          ]
        );
      }
    }

    await connection.commit();
    return normalizedTasks;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function handleApi(request, response) {
  if (request.method === "GET" && request.url === "/api/tasks") {
    const tasks = await getTasks();
    send(response, 200, JSON.stringify({ tasks }, null, 2));
    return;
  }

  if (request.method === "POST" && request.url === "/api/tasks") {
    const body = await readJsonBody(request);
    const tasks = Array.isArray(body.tasks) ? body.tasks : [];
    const savedTasks = await replaceTasks(tasks);
    send(response, 200, JSON.stringify({ tasks: savedTasks }, null, 2));
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
