/**
 * Migration 006: Create progress table (Milestones)
 * Faculty create milestones for accepted projects.
 * Students receive real-time WebSocket notifications on updates (Step 6).
 */
exports.up = function (knex) {
  return knex.schema.createTable('progress', (table) => {
    table
      .uuid('id')
      .primary()
      .defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('project_id')
      .notNullable()
      .references('id')
      .inTable('projects')
      .onDelete('CASCADE');
    table.string('title', 255).notNullable();
    table.text('description');
    table.date('due_date').nullable();
    table.boolean('completed').notNullable().defaultTo(false);
    table.timestamps(true, true);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('progress');
};
