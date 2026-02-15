const {
  runRecommendation,
  getSkillGap,
  getRecommendedCoursesForGap,
} = require("../services/recommendation.service");

async function run(req, res) {
  try {
    const studentId = Number(req.body.studentId);
    const topN = req.body.topN ? Number(req.body.topN) : 5;

    const data = await runRecommendation(studentId, topN);
    res.json(data);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}

async function skillGap(req, res) {
  try {
    const studentId = Number(req.query.studentId);
    const careerId = Number(req.params.careerId);

    const gap = await getSkillGap(studentId, careerId);
    res.json(gap);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}

async function recommendedCourses(req, res) {
  try {
    // You can pass missingSkillIds directly OR compute from careerId+studentId
    const missingSkillIds = req.body.missingSkillIds || [];
    const courses = await getRecommendedCoursesForGap(missingSkillIds.map(Number));
    res.json({ courses });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}

module.exports = { run, skillGap, recommendedCourses };