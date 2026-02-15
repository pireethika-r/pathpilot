const { withConnection } = require("../db/oraclePool");

async function createCourse(course) {
  const { title, description, levelName, price, durationHours, createdBy } = course;

  if (!title || title.trim().length < 3) throw new Error("Course title is required (min 3 chars)");

  return await withConnection(async (conn) => {
    const result = await conn.execute(
      `INSERT INTO COURSES (TITLE, DESCRIPTION, LEVEL_NAME, PRICE, DURATION_HOURS, IS_ACTIVE, CREATED_BY)
       VALUES (:title, :description, :levelName, :price, :durationHours, 1, :createdBy)
       RETURNING COURSE_ID INTO :courseId`,
      {
        title: title.trim(),
        description: description || null,
        levelName: levelName || "Beginner",
        price: Number(price || 0),
        durationHours: Number(durationHours || 1),
        createdBy: createdBy ? Number(createdBy) : null,
        courseId: { dir: require("oracledb").BIND_OUT, type: require("oracledb").NUMBER },
      },
      { autoCommit: true }
    );

    return { courseId: result.outBinds.courseId[0] };
  });
}

async function listCourses() {
  return await withConnection(async (conn) => {
    const res = await conn.execute(
      `SELECT COURSE_ID, TITLE, LEVEL_NAME, PRICE, DURATION_HOURS, IS_ACTIVE, CREATED_AT
       FROM COURSES
       ORDER BY CREATED_AT DESC`
    );
    return res.rows.map((r) => ({
      courseId: r[0],
      title: r[1],
      level: r[2],
      price: Number(r[3]),
      durationHours: Number(r[4]),
      isActive: r[5] === 1,
      createdAt: r[6],
    }));
  });
}

async function setCourseSkills(courseId, skillIds = []) {
  if (!Number.isInteger(courseId) || courseId <= 0) throw new Error("Invalid courseId");

  const unique = [...new Set(skillIds.map(Number))].filter((x) => Number.isInteger(x) && x > 0);

  return await withConnection(async (conn) => {
    // remove old mappings then insert new
    await conn.execute(`DELETE FROM COURSE_SKILLS WHERE COURSE_ID = :courseId`, { courseId });

    for (const skillId of unique) {
      await conn.execute(
        `INSERT INTO COURSE_SKILLS (COURSE_ID, SKILL_ID) VALUES (:courseId, :skillId)`,
        { courseId, skillId }
      );
    }
    await conn.commit();
    return { courseId, mappedSkills: unique.length };
  });
}

module.exports = { createCourse, listCourses, setCourseSkills };