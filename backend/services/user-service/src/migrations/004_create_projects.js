/**
 * Migration 004: Create projects table
 * Owned by a faculty member. Status transitions:
 *   open → in_progress (when first request is accepted)
 *   in_progress → closed (when faculty hits maxCapacity)
 */
exports.up = function (knex) {
  return knex.schema
    .raw(`
      DO $$ BEGIN
        CREATE TYPE project_status AS ENUM ('open', 'in_progress', 'closed');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `)
    .then(() =>
      knex.schema.createTable('projects', (table) => {
        table
          .uuid('id')
          .primary()
          .defaultTo(knex.raw('gen_random_uuid()'));
        table
          .uuid('faculty_id')
          .notNullable()
          .references('id')
          .inTable('users')
          .onDelete('CASCADE');
        table.string('title', 255).notNullable();
        table.text('description');
        table
          .enu('status', ['open', 'in_progress', 'closed'], {
            useNative: true,
            existingType: true,
            enumName: 'project_status',
          })
          .notNullable()
          .defaultTo('open');
        table.timestamps(true, true);
      })
    );
};

exports.down = function (knex) {
  return knex.schema
    .dropTableIfExists('projects')
    .then(() => knex.raw('DROP TYPE IF EXISTS project_status'));
};
