const router = require("express").Router();
const controller = require("../controllers/recommendations.controller");

// Run recommendation
router.post("/run", controller.run);

// Get skill gap for a career: /api/recommendations/skill-gap/12?studentId=5
router.get("/skill-gap/:careerId", controller.skillGap);

// Get courses for missing skills (POST with body missingSkillIds)
router.post("/recommended-courses", controller.recommendedCourses);

module.exports = router;