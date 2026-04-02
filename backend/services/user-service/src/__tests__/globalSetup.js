/**
 * globalSetup.js — user-service
 * Runs once before all test suites. Connects to the test DB,
 * runs all migrations to ensure schema is up-to-date.
 */
require('dotenv').config({ path: `${__dirname}/../../.env.test` });
const knex = require('knex');

module.exports = async () => {
  const db = knex({
    client: 'pg',
    connection: process.env.TEST_DATABASE_URL,
    migrations: {
      directory: `${__dirname}/../migrations`,
      tableName: 'knex_migrations',
    },
  });

  await db.migrate.latest();
  await db.destroy();
};
