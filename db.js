require("dotenv").config();

const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "praise_checkin",
  waitForConnections: true,
  connectionLimit: 10,
  timezone: "Z"
});

function toMysqlDateTime(value) {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString().slice(0, 23).replace("T", " ");
}

function fromMysqlDateTime(value) {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  const text = String(value);
  if (text.includes("T")) {
    return text.endsWith("Z") ? text : `${text}Z`;
  }
  return `${text.replace(" ", "T")}Z`;
}

module.exports = {
  pool,
  toMysqlDateTime,
  fromMysqlDateTime
};
