const { withConnection } = require("../db/oraclePool");

/**
 * Weighted match:
 * match% = (sum(weights of skills student has) / sum(all weights for that career)) * 100
 */
async function runRecommendation(studentId, topN = 5) {
  if (!Number.isInteger(studentId) || studentId <= 0) {
    throw new Error("Invalid studentId");
  }

  return await withConnection(async (conn) => {
    // 1) Fetch student skills
    const studentSkillsRes = await conn.execute(
      `SELECT SKILL_ID FROM STUDENT_SKILLS WHERE STUDENT_ID = :studentId`,
      { studentId }
    );
    const studentSkillIds = new Set(studentSkillsRes.rows.map((r) => r[0]));

    // If no skills, still return careers with 0% (optional)
    // 2) Fetch all active careers
    const careersRes = await conn.execute(
      `SELECT CAREER_ID, TITLE, DESCRIPTION, CATEGORY
       FROM CAREERS
       WHERE IS_ACTIVE = 1`
    );

    // 3) For each career, fetch required skills + weights
    const results = [];
    for (const row of careersRes.rows) {
      const careerId = row[0];
      const title = row[1];
      const description = row[2];
      const category = row[3];

      const reqRes = await conn.execute(
        `SELECT SKILL_ID, WEIGHT
         FROM CAREER_SKILLS
         WHERE CAREER_ID = :careerId`,
        { careerId }
      );

      const req = reqRes.rows.map((r) => ({ skillId: r[0], weight: r[1] }));
      const totalWeight = req.reduce((s, x) => s + x.weight, 0);

      let matchedWeight = 0;
      for (const { skillId, weight } of req) {
        if (studentSkillIds.has(skillId)) matchedWeight += weight;
      }

      const matchPercent =
        totalWeight === 0 ? 0 : Math.round((matchedWeight / totalWeight) * 10000) / 100;

      results.push({
        careerId,
        title,
        description,
        category,
        matchPercent,
      });
    }

    // 4) Sort desc and take topN
    results.sort((a, b) => b.matchPercent - a.matchPercent);
    const top = results.slice(0, Math.max(1, Math.min(20, topN)));

    // 5) Log results (evidence)
    const logRes = await conn.execute(
      `INSERT INTO RECOMMENDATION_LOGS (STUDENT_ID) VALUES (:studentId)
       RETURNING LOG_ID INTO :logId`,
      {
        studentId,
        logId: { dir: require("oracledb").BIND_OUT, type: require("oracledb").NUMBER },
      },
      { autoCommit: false }
    );

    const logId = logRes.outBinds.logId[0];

    for (const item of top) {
      await conn.execute(
        `INSERT INTO RECOMMENDATION_RESULTS (LOG_ID, CAREER_ID, MATCH_PERCENT)
         VALUES (:logId, :careerId, :matchPercent)`,
        { logId, careerId: item.careerId, matchPercent: item.matchPercent },
        { autoCommit: false }
      );
    }

    await conn.commit();

    return { logId, studentId, recommendations: top };
  });
}

async function getSkillGap(studentId, careerId) {
  if (!Number.isInteger(studentId) || studentId <= 0) throw new Error("Invalid studentId");
  if (!Number.isInteger(careerId) || careerId <= 0) throw new Error("Invalid careerId");

  return await withConnection(async (conn) => {
    const studentSkillsRes = await conn.execute(
      `SELECT SKILL_ID FROM STUDENT_SKILLS WHERE STUDENT_ID = :studentId`,
      { studentId }
    );
    const studentSkillIds = new Set(studentSkillsRes.rows.map((r) => r[0]));

    const gapRes = await conn.execute(
      `SELECT cs.SKILL_ID, s.NAME, cs.WEIGHT
       FROM CAREER_SKILLS cs
       JOIN SKILLS s ON s.SKILL_ID = cs.SKILL_ID
       WHERE cs.CAREER_ID = :careerId
       ORDER BY cs.WEIGHT DESC`,
      { careerId }
    );

    const missing = [];
    for (const r of gapRes.rows) {
      const skillId = r[0];
      const name = r[1];
      const weight = r[2];
      if (!studentSkillIds.has(skillId)) {
        missing.push({ skillId, name, weight });
      }
    }

    return { studentId, careerId, missingSkills: missing };
  });
}

async function getRecommendedCoursesForGap(missingSkillIds = []) {
  if (!Array.isArray(missingSkillIds)) throw new Error("missingSkillIds must be an array");

  if (missingSkillIds.length === 0) return [];

  return await withConnection(async (conn) => {
    // Find active courses that teach any missing skill
    // Order by how many missing skills the course covers
    const binds = {};
    const inList = missingSkillIds
      .map((id, idx) => {
        binds[`s${idx}`] = id;
        return `:s${idx}`;
      })
      .join(",");

    const res = await conn.execute(
      `SELECT c.COURSE_ID, c.TITLE, c.LEVEL_NAME, c.PRICE, c.DURATION_HOURS,
              COUNT(*) AS COVER_COUNT
       FROM COURSES c
       JOIN COURSE_SKILLS cs ON cs.COURSE_ID = c.COURSE_ID
       WHERE c.IS_ACTIVE = 1
         AND cs.SKILL_ID IN (${inList})
       GROUP BY c.COURSE_ID, c.TITLE, c.LEVEL_NAME, c.PRICE, c.DURATION_HOURS
       ORDER BY COVER_COUNT DESC, c.PRICE ASC`,
      binds
    );

    return res.rows.map((r) => ({
      courseId: r[0],
      title: r[1],
      level: r[2],
      price: Number(r[3]),
      durationHours: Number(r[4]),
      coversMissingSkillsCount: r[5],
    }));
  });
}

module.exports = { runRecommendation, getSkillGap, getRecommendedCoursesForGap };