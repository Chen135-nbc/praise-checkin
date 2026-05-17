const fs = require("fs/promises");
const path = require("path");
const { pool, toMysqlDateTime } = require("./db");

const DATA_FILE = path.join(__dirname, "data.json");

function normalizeFrequency(frequency) {
  const type = frequency?.type || "daily";
  const weeklyDays = Math.min(Math.max(Number(frequency?.weeklyDays) || 1, 1), 7);
  if (type === "weekly") {
    return { type: "weekly", weeklyDays: 1 };
  }
  if (type === "custom") {
    return { type: "custom", weeklyDays };
  }
  return { type: "daily", weeklyDays: 1 };
}

function normalizeTotalTarget(value) {
  const totalTarget = Number(value);
  return Number.isInteger(totalTarget) && totalTarget > 0 ? totalTarget : null;
}

function normalizeTask(task) {
  const now = new Date().toISOString();
  return {
    id: String(task.id),
    name: task.name || "",
    target: Number(task.target) || 1,
    totalTarget: normalizeTotalTarget(task.totalTarget),
    unit: task.unit || "个",
    progress: Number(task.progress) || 0,
    archived: Boolean(task.archived),
    completedAt: task.completedAt || null,
    archivedAt: task.archivedAt || null,
    frequency: normalizeFrequency(task.frequency),
    logs: Array.isArray(task.logs) ? task.logs : [],
    createdAt: task.createdAt || now,
    updatedAt: task.updatedAt || now
  };
}

async function migrate() {
  const raw = await fs.readFile(DATA_FILE, "utf8");
  const data = JSON.parse(raw);
  const tasks = Array.isArray(data.tasks) ? data.tasks.map(normalizeTask) : [];
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    await connection.query("DELETE FROM checkin_logs");
    await connection.query("DELETE FROM tasks");

    for (const task of tasks) {
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
    console.log(`已迁移 ${tasks.length} 个任务到 MySQL。`);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
    await pool.end();
  }
}

migrate().catch((error) => {
  console.error("迁移失败：", error.message);
  process.exitCode = 1;
});
