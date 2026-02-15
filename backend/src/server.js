require("dotenv").config();
const app = require("./app");
const { initPool, closePool } = require("./db/oraclePool");

const PORT = process.env.PORT || 5000;

async function start() {
  await initPool();
  app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
}

start();

// Graceful shutdown
process.on("SIGINT", async () => {
  await closePool();
  process.exit(0);
});