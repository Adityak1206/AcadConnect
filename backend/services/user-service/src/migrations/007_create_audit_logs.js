/**
 * Migration 007: Create audit_logs table
 * Records all admin actions (eligibility changes, user management).
 * Append-only — no updates or deletes.
 */
exports.up = function (knex) {
  return knex.schema.createTable('audit_logs', (table) => {
    table
      .uuid('id')
      .primary()
      .defaultTo(knex.raw('gen_random_uuid()'));
    // The admin who performed the action
    table
      .uuid('admin_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    // The user the action was performed on (optional for system-wide actions)
    table
      .uuid('target_user_id')
      .nullable()
      .references('id')
      .inTable('users')
      .onDelete('SET NULL');
    table.string('action', 255).notNullable(); // e.g. 'ELIGIBILITY_CHANGE'
    // JSON payload: stores before/after values
    table.jsonb('details').defaultTo('{}');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('audit_logs');
};
