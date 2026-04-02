/**
 * Migration 010: Update project_requests for groups
 * 1. Drops 'student_id' column
 * 2. Adds 'group_id' column
 * 3. Updates unique constraint
 */
exports.up = function (knex) {
  return knex.schema.table('project_requests', (table) => {
    // Drop old constraint and column
    table.dropUnique(['project_id', 'student_id']);
    table.dropColumn('student_id');

    // Add new group_id column
    table
      .uuid('group_id')
      .notNullable()
      .references('id')
      .inTable('groups')
      .onDelete('CASCADE');

    // New constraint: A group can only apply to a project once
    table.unique(['project_id', 'group_id']);
  });
};

exports.down = function (knex) {
  return knex.schema.table('project_requests', (table) => {
    table.dropUnique(['project_id', 'group_id']);
    table.dropColumn('group_id');

    table
      .uuid('student_id')
      .notNullable() // This might fail down migration if rows exist without it, but fine for now
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');

    table.unique(['project_id', 'student_id']);
  });
};
