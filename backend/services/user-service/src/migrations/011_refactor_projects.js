/**
 * Migration 011: Refactor projects to be owned by student groups.
 * 
 * 1. TRUNCATE existing projects and requests (since ownership paradigm swapped).
 * 2. `projects` table: drop `faculty_id`, add `group_id`.
 * 3. `project_requests` table: drop `group_id` and `snippet`, add `faculty_id`.
 */
exports.up = async function (knex) {
  // Truncate to avoid NOT NULL violations on existing test data
  await knex.raw('TRUNCATE TABLE projects CASCADE');
  await knex.raw('TRUNCATE TABLE project_requests CASCADE');

  // Modify projects table
  await knex.schema.alterTable('projects', (table) => {
    table.dropColumn('faculty_id');
    table
      .uuid('group_id')
      .notNullable()
      .references('id')
      .inTable('groups')
      .onDelete('CASCADE');
  });

  // Modify project_requests table
  await knex.schema.alterTable('project_requests', (table) => {
    table.dropUnique(['project_id', 'group_id']);
    table.dropColumn('group_id');
    table.dropColumn('snippet');

    table
      .uuid('faculty_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');

    // Make feedback_ref longer or text type to hold potentially larger results just in case
    // (though MongoDB ObjectId is standard string length, we keep it as is).

    // New constraint: A project can only have one request sent strictly to the same faculty
    table.unique(['project_id', 'faculty_id']);
  });
};

exports.down = async function (knex) {
  await knex.raw('TRUNCATE TABLE projects CASCADE');
  await knex.raw('TRUNCATE TABLE project_requests CASCADE');

  await knex.schema.alterTable('project_requests', (table) => {
    table.dropUnique(['project_id', 'faculty_id']);
    table.dropColumn('faculty_id');

    table.text('snippet').notNullable().defaultTo('default pitch');
    table
      .uuid('group_id')
      .notNullable()
      .references('id')
      .inTable('groups')
      .onDelete('CASCADE');

    table.unique(['project_id', 'group_id']);
  });

  await knex.schema.alterTable('projects', (table) => {
    table.dropColumn('group_id');
    table
      .uuid('faculty_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
  });
};
