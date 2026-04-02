/**
 * Migration 003: Create faculty_profiles table
 * One-to-one with users (role = 'faculty').
 *
 * NOTE: There is NO current_mentees column.
 * The mentee count and list are always derived at query time by joining
 * project_requests (status='accepted') through projects.faculty_id.
 * This ensures consistency and prevents counter drift.
 *
 * Capacity check query (used in Project Service):
 *   SELECT COUNT(*) FROM project_requests pr
 *   JOIN projects p ON pr.project_id = p.id
 *   WHERE p.faculty_id = $1 AND pr.status = 'accepted';
 */
exports.up = function (knex) {
  return knex.schema.createTable('faculty_profiles', (table) => {
    table
      .uuid('id')
      .primary()
      .defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('user_id')
      .notNullable()
      .unique()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    // research_areas stored as a Postgres text array for easy querying
    table.specificType('research_areas', 'TEXT[]').defaultTo('{}');
    table.integer('max_capacity').notNullable().defaultTo(3);
    table.timestamps(true, true);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('faculty_profiles');
};
