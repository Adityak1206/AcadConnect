/**
 * globalTeardown.js — user-service
 * Runs once after all test suites complete.
 * Truncates all tables to leave the test DB clean.
 */
require('dotenv').config({ path: `${__dirname}/../../.env.test` });
const knex = require('knex');

module.exports = async () => {
  const db = knex({
    client: 'pg',
    connection: process.env.TEST_DATABASE_URL,
  });

  await db.raw(`
    TRUNCATE TABLE
      audit_logs,
      project_requests,
      group_members,
      groups,
      projects,
      student_profiles,
      faculty_profiles,
      users
    RESTART IDENTITY CASCADE
  `);

  await db.destroy();
};
