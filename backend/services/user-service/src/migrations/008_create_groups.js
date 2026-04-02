/**
 * Migration 008: Create groups table
 */
exports.up = function (knex) {
  return knex.schema.createTable('groups', (table) => {
    table
      .uuid('id')
      .primary()
      .defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name', 255).notNullable();
    table
      .uuid('leader_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    table.timestamps(true, true);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists('groups');
};
