/**
 * Migration 002: Create student_profiles table
 * One-to-one with users (role = 'student').
 * eligibility_status is managed by Admin via the User Service.
 */
exports.up = function (knex) {
  return knex.schema
    .raw(`
      DO $$ BEGIN
        CREATE TYPE eligibility_status AS ENUM ('eligible', 'probation', 'ineligible');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `)
    .then(() =>
      knex.schema.createTable('student_profiles', (table) => {
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
        // skills stored as a Postgres text array
        table.specificType('skills', 'TEXT[]').defaultTo('{}');
        table.text('interests');
        table
          .enu('eligibility_status', ['eligible', 'probation', 'ineligible'], {
            useNative: true,
            existingType: true,
            enumName: 'eligibility_status',
          })
          .notNullable()
          .defaultTo('eligible');
        table.timestamps(true, true);
      })
    );
};

exports.down = function (knex) {
  return knex.schema
    .dropTableIfExists('student_profiles')
    .then(() => knex.raw('DROP TYPE IF EXISTS eligibility_status'));
};
