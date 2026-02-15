const express = require("express");
const cors = require("cors");

const healthRoutes = require("./routes/health.routes");
const recoRoutes = require("./routes/recommendations.routes");
const adminCourseRoutes = require("./routes/admin.courses.routes");

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/health", healthRoutes);
app.use("/api/recommendations", recoRoutes);
app.use("/api/admin/courses", adminCourseRoutes);

module.exports = app;