exports.up = async function(knex) {
  // 1. Create the new ENUM type
  await knex.raw("CREATE TYPE project_milestone AS ENUM ('proposal_drafting', 'faculty_review', 'active_research', 'midpoint_submission', 'final_submission', 'completed')");

  // 2. Drop the old default constraint
  await knex.raw("ALTER TABLE projects ALTER COLUMN status DROP DEFAULT");

  // 3. Alter the column to the new enum type and securely map old data inline
  await knex.raw(`
    ALTER TABLE projects 
    ALTER COLUMN status TYPE project_milestone 
    USING CASE 
      WHEN status::text = 'open' THEN 'proposal_drafting'::project_milestone
      WHEN status::text = 'in_progress' THEN 'active_research'::project_milestone
      WHEN status::text = 'closed' THEN 'completed'::project_milestone
      ELSE 'proposal_drafting'::project_milestone
    END
  `);

  // 4. Restore the appropriate defaulting logic
  await knex.raw("ALTER TABLE projects ALTER COLUMN status SET DEFAULT 'proposal_drafting'");

  // 5. Delete the old artifact type
  await knex.raw("DROP TYPE project_status");
};

exports.down = async function(knex) {
  // Recreation in reverse
  await knex.raw("CREATE TYPE project_status AS ENUM ('open', 'in_progress', 'closed')");
  await knex.raw("ALTER TABLE projects ALTER COLUMN status DROP DEFAULT");

  // Re-map compatible states
  await knex('projects').where({ status: 'proposal_drafting' }).update({ status: 'open' });
  await knex('projects').where({ status: 'active_research' }).update({ status: 'in_progress' });
  await knex('projects').where({ status: 'completed' }).update({ status: 'closed' });
  // Aggressively flush other milestones to open to prevent casting crash
  await knex('projects').whereNotIn('status', ['open', 'in_progress', 'closed']).update({ status: 'open' });

  await knex.raw("ALTER TABLE projects ALTER COLUMN status TYPE project_status USING status::text::project_status");
  await knex.raw("ALTER TABLE projects ALTER COLUMN status SET DEFAULT 'open'");
  await knex.raw("DROP TYPE project_milestone");
};
