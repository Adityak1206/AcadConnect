/**
 * Migration 001: Create users table
 * Core identity table for all roles: student, faculty, admin
 */
exports.up = function (knex) {
  return knex.schema
    .raw('CREATE EXTENSION IF NOT EXISTS "pgcrypto"') // enables gen_random_uuid()
    .then(() =>
      knex.schema.createTable('users', (table) => {
        table
          .uuid('id')
          .primary()
          .defaultTo(knex.raw('gen_random_uuid()'));
        table.string('name', 255).notNullable();
        table.string('email', 255).notNullable().unique();
        table.string('password_hash', 255).notNullable();
        table
          .enu('role', ['student', 'faculty', 'admin'], {
            useNative: true,
            enumName: 'user_role',
          })
          .notNullable();
        table.timestamps(true, true); // created_at, updated_at
      })
    );
};

exports.down = function (knex) {
  return knex.schema
    .dropTableIfExists('users')
    .then(() => knex.raw('DROP TYPE IF EXISTS user_role'));
};
