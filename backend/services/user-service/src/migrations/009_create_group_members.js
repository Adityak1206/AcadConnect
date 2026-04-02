/**
 * Migration 009: Create group_members table
 * Tracks which students belong to which groups.
 */
exports.up = function (knex) {
  return knex.schema
    .raw(`
      DO $$ BEGIN
        CREATE TYPE group_member_status AS ENUM ('pending', 'accepted');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `)
    .then(() =>
      knex.schema.createTable('group_members', (table) => {
        table
          .uuid('group_id')
          .notNullable()
          .references('id')
          .inTable('groups')
          .onDelete('CASCADE');
        table
          .uuid('student_id')
          .notNullable()
          .references('id')
          .inTable('users')
          .onDelete('CASCADE');
        table
          .enu('status', ['pending', 'accepted'], {
            useNative: true,
            existingType: true,
            enumName: 'group_member_status',
          })
          .notNullable()
          .defaultTo('pending');
        table.primary(['group_id', 'student_id']);
        table.timestamps(true, true);
      })
    );
};

exports.down = function (knex) {
  return knex.schema
    .dropTableIfExists('group_members')
    .then(() => knex.raw('DROP TYPE IF EXISTS group_member_status'));
};
