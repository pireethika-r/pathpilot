const oracledb = require("oracledb");

let pool;

async function initPool() {
  if (pool) return pool;

  pool = await oracledb.createPool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectString: process.env.DB_CONNECT_STRING,
    poolMin: 1,
    poolMax: 5,
    poolIncrement: 1,
  });

  return pool;
}

async function closePool() {
  if (pool) await pool.close(10);
  pool = null;
}

async function withConnection(fn) {
  const p = await initPool();
  let conn;
  try {
    conn = await p.getConnection();
    return await fn(conn);
  } finally {
    if (conn) await conn.close();
  }
}

module.exports = { initPool, closePool, withConnection };