const router = require("express").Router();
const controller = require("../controllers/admin.courses.controller");

// Admin course CRUD (minimal)
router.post("/", controller.create);
router.get("/", controller.list);

// map skills to a course
router.post("/:courseId/skills", controller.mapSkills);

module.exports = router;