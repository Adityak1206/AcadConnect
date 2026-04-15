const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/knex');
const { authenticate, authorize } = require('../middleware/auth');
const { createError } = require('../utils/errors');

const router = express.Router();

/**
 * GET /api/projects
 * List all projects (open). Anyone authenticating can see them.
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const projects = await db('projects as p')
      .join('groups as g', 'p.group_id', 'g.id')
      .select(
        'p.id',
        'p.title',
        'p.description',
        'p.status',
        'p.created_at',
        'g.name as group_name'
      )
      .orderBy('p.created_at', 'desc');

    res.status(200).json({ projects });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/projects/:id
 * Get details for a specific project.
 */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const project = await db('projects as p')
      .join('groups as g', 'p.group_id', 'g.id')
      .select(
        'p.id',
        'p.group_id',
        'p.title',
        'p.description',
        'p.status',
        'p.created_at',
        'g.name as group_name'
      )
      .where('p.id', req.params.id)
      .first();

    if (!project) throw createError(404, 'Project not found');

    res.status(200).json({ project });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/projects
 * Create a new open project. Must be a student and leader of the group.
 * Group must have 3-5 accepted members.
 *
 * Body: { title, description, group_id }
 */
router.post('/', authenticate, authorize('student'), async (req, res, next) => {
  try {
    const { title, description, group_id } = req.body;
    if (!title || !description || !group_id) {
      throw createError(400, 'title, description, and group_id are required');
    }

    // Ensure the group exists and the user is the leader
    const group = await db('groups').where({ id: group_id }).first();
    if (!group) throw createError(404, 'Group not found');
    if (group.leader_id !== req.user.id) throw createError(403, 'Only the group leader can create a project for the group');

    // Count *accepted* members
    const { count: memberCount } = await db('group_members')
      .where({ group_id, status: 'accepted' })
      .count('student_id as count')
      .first();

    const acceptedCount = Number(memberCount);
    if (acceptedCount < 3 || acceptedCount > 5) {
      throw createError(400, `Your group must have between 3 and 5 **accepted** members to create a project. Currently has ${acceptedCount}.`);
    }

    const projectId = uuidv4();
    await db('projects').insert({
      id: projectId,
      group_id: group_id,
      title,
      description,
      status: 'proposal_drafting',
    });

    res.status(201).json({
      message: 'Project created successfully',
      project: { id: projectId, title, group_id, status: 'proposal_drafting' },
    });
  } catch (err) {
    next(err);
  }
});

const AI_FEEDBACK_URL = process.env.AI_FEEDBACK_SERVICE_URL || 'http://localhost:8001';

/**
 * POST /api/projects/:id/ai-feedback
 * Let a student ping the AI service for real-time feedback on their project pitch.
 */
router.post('/:id/ai-feedback', authenticate, authorize('student'), async (req, res, next) => {
  try {
    const project = await db('projects').where({ id: req.params.id }).first();
    if (!project) throw createError(404, 'Project not found');
    
    const group = await db('groups').where({ id: project.group_id }).first();
    if (group.leader_id !== req.user.id) throw createError(403, 'Only the group leader can trigger feedback');

    // Forward the description payload to python service synchronously
    const response = await fetch(`${AI_FEEDBACK_URL}/feedback/generate-sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_title: project.title,
        project_description: project.description
      })
    });

    if (!response.ok) {
      throw createError(500, 'AI Feedback service returned an error');
    }

    const aiData = await response.json();
    res.status(200).json(aiData);
  } catch (err) {
    console.error('[project-service] AI Feedback Error:', err);
    next(err);
  }
});

/**
 * PUT /api/projects/:id/milestone
 * Advances the project milestone manually.
 * Allows students to progress to final_submission, and faculty to mark as completed.
 * Body: { status: 'midpoint_submission' | 'final_submission' | 'completed' }
 */
router.put('/:id/milestone', authenticate, async (req, res, next) => {
  try {
    const { status } = req.body;
    const project = await db('projects').where({ id: req.params.id }).first();
    if (!project) throw createError(404, 'Project not found');

    const validMilestones = ['proposal_drafting', 'faculty_review', 'active_research', 'midpoint_submission', 'final_submission', 'completed'];
    if (!validMilestones.includes(status)) throw createError(400, 'Invalid milestone');

    const isStudent = req.user.role === 'student';
    const isFaculty = req.user.role === 'faculty';

    if (isStudent) {
      // student can only change if they are group leader
      const group = await db('groups').where({ id: project.group_id }).first();
      if (group.leader_id !== req.user.id) throw createError(403, 'Only group leader can advance milestones');
      if (status === 'completed') throw createError(403, 'Students cannot mark a project as completed');
      
      // Prevent regression to earlier states manually via this endpoint (handled programmatically by requests instead)
      if (['proposal_drafting', 'faculty_review', 'active_research'].includes(status)) {
        throw createError(400, `Students cannot manually regress or advance to ${status} via this endpoint`);
      }
    } else if (isFaculty) {
      // check if faculty is official mentor (accepted request)
      const mentor = await db('project_requests').where({ project_id: project.id, faculty_id: req.user.id, status: 'accepted' }).first();
      if (!mentor) throw createError(403, 'Only the designated faculty mentor can advance this project');
    } else {
       throw createError(403, 'Unauthorized');
    }

    await db('projects').where({ id: project.id }).update({ status, updated_at: db.fn.now() });
    res.status(200).json({ message: `Project milestone advanced to ${status}` });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
