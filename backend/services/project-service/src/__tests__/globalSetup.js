/**
 * globalSetup.js — project-service
 * Runs once before all test suites. Connects to the test DB,
 * runs all migrations to ensure schema is up-to-date.
 */
require('dotenv').config({ path: `${__dirname}/../../.env.test` });
const knex = require('knex');
const path = require('path');

module.exports = async () => {
  // Absolute anchor: go up from src/__tests__ → src → project-service → services → backend
  // then across to services/user-service/src/migrations
  const migrationsDir = path.join(
    __dirname,          // .../project-service/src/__tests__
    '..', '..', '..', // .../backend/services
    'user-service', 'src', 'migrations'
  );

  const db = knex({
    client: 'pg',
    connection: process.env.TEST_DATABASE_URL,
    migrations: {
      directory: migrationsDir,
      tableName: 'knex_migrations',
    },
  });

  await db.migrate.latest();
  await db.destroy();
};
