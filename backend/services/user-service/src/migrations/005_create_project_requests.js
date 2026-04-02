/**
 * Migration 005: Create project_requests table
 * A student's mentorship request for a specific project, including their
 * 200-word snippet. feedback_ref stores the MongoDB document ID returned
 * by the AI Feedback Service (Step 4).
 */
exports.up = function (knex) {
  return knex.schema
    .raw(`
      DO $$ BEGIN
        CREATE TYPE request_status AS ENUM ('pending', 'accepted', 'rejected');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `)
    .then(() =>
      knex.schema.createTable('project_requests', (table) => {
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
        table
          .uuid('student_id')
          .notNullable()
          .references('id')
          .inTable('users')
          .onDelete('CASCADE');
        // The student's 200-word project idea (snippet)
        table.text('snippet').notNullable();
        table
          .enu('status', ['pending', 'accepted', 'rejected'], {
            useNative: true,
            existingType: true,
            enumName: 'request_status',
          })
          .notNullable()
          .defaultTo('pending');
        // Cross-DB reference: MongoDB ObjectId of the AI feedback document
        table.string('feedback_ref', 255).nullable();
        // Ensure a student can only have one active request per project
        table.unique(['project_id', 'student_id']);
        table.timestamps(true, true);
      })
    );
};

exports.down = function (knex) {
  return knex.schema
    .dropTableIfExists('project_requests')
    .then(() => knex.raw('DROP TYPE IF EXISTS request_status'));
};
