const { createCourse, listCourses, setCourseSkills } = require("../services/courses.service");

async function create(req, res) {
  try {
    const out = await createCourse(req.body);
    res.status(201).json(out);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}

async function list(req, res) {
  try {
    const courses = await listCourses();
    res.json({ courses });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

async function mapSkills(req, res) {
  try {
    const courseId = Number(req.params.courseId);
    const skillIds = req.body.skillIds || [];
    const out = await setCourseSkills(courseId, skillIds);
    res.json(out);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}

module.exports = { create, list, mapSkills };
