const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/knex');
const { authenticate, authorize } = require('../middleware/auth');
const { createError } = require('../utils/errors');

const router = express.Router();

/**
 * POST /api/requests
 * Submit a mentorship request. Student only. Must be leader of a group
 * with 3-5 accepted members.
 *
 * Body: { project_id, group_id, snippet }
 */
router.post('/', authenticate, authorize('student'), async (req, res, next) => {
  try {
    const { project_id, group_id, snippet } = req.body;
    if (!project_id || !group_id || !snippet) {
      throw createError(400, 'project_id, group_id, and snippet are required');
    }

    // ── Enforce 200-word limit ──────────────────────────────
    const wordCount = snippet.trim().split(/\s+/).length;
    if (wordCount > 200) {
      throw createError(400, `Snippet exceeds 200 words. Current count: ${wordCount}`);
    }

    // ── Group validation ────────────────────────────────────
    const group = await db('groups').where({ id: group_id }).first();
    if (!group) throw createError(404, 'Group not found');
    if (group.leader_id !== req.user.id) throw createError(403, 'Only the group leader can submit a request');

    // Count *accepted* members
    const { count: memberCount } = await db('group_members')
      .where({ group_id, status: 'accepted' })
      .count('student_id as count')
      .first();

    const acceptedCount = Number(memberCount);
    if (acceptedCount < 3 || acceptedCount > 5) {
      throw createError(400, `Your group must have between 3 and 5 **accepted** members to apply. Currently has ${acceptedCount}.`);
    }

    // ── Pre-checks on Project ───────────────────────────────
    const project = await db('projects').where({ id: project_id }).first();
    if (!project) throw createError(404, 'Project not found');
    if (project.status === 'closed') throw createError(400, 'This project is closed to new requests');

    // Check duplicate request from this group
    const existing = await db('project_requests')
      .where({ project_id, group_id })
      .first();
    if (existing) throw createError(409, 'Your group has already submitted a request for this project');

    // ── Insert Request ──────────────────────────────────────
    const requestId = uuidv4();
    await db('project_requests').insert({
      id: requestId,
      project_id,
      group_id,
      snippet,
      status: 'pending',
    });

    res.status(201).json({
      message: 'Request submitted successfully',
      request_id: requestId,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/requests/faculty
 * List all received requests for all of this faculty's projects.
 * Returns the group details instead of a single student.
 */
router.get('/faculty', authenticate, authorize('faculty'), async (req, res, next) => {
  try {
    // 1. Fetch the requests
    const requests = await db('project_requests as pr')
      .join('projects as p', 'pr.project_id', 'p.id')
      .join('groups as g', 'pr.group_id', 'g.id')
      .join('users as leader', 'g.leader_id', 'leader.id')
      .select(
        'pr.id as request_id',
        'pr.snippet',
        'pr.status as request_status',
        'pr.created_at',
        'p.id as project_id',
        'p.title as project_title',
        'g.id as group_id',
        'g.name as group_name',
        'leader.name as leader_name'
      )
      .where('p.faculty_id', req.user.id)
      .orderBy('pr.created_at', 'desc');

    // 2. Attach members to each request
    for (const reqObj of requests) {
      const members = await db('group_members as gm')
        .join('users as u', 'gm.student_id', 'u.id')
        .select('u.name', 'u.email')
        .where('gm.group_id', reqObj.group_id)
        .andWhere('gm.status', 'accepted');
      reqObj.members = members;
    }

    res.status(200).json({ requests });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/requests/:id/status
 * Accept or reject a student's request. Faculty only.
 * IMPORTANT: Enforces max_capacity and auto-closes projects.
 *
 * Body: { status: 'accepted' | 'rejected' }
 */
router.put('/:id/status', authenticate, authorize('faculty'), async (req, res, next) => {
  try {
    const { status } = req.body;
    const reqId = req.params.id;
    if (!['accepted', 'rejected'].includes(status)) {
      throw createError(400, "status must be 'accepted' or 'rejected'");
    }

    await db.transaction(async (trx) => {
      // 1. Get request and verify faculty ownership
      const pr = await trx('project_requests as pr')
        .join('projects as p', 'pr.project_id', 'p.id')
        .select('pr.status', 'p.faculty_id', 'p.id as project_id')
        .where('pr.id', reqId)
        .first();

      if (!pr) throw createError(404, 'Request not found');
      if (pr.faculty_id !== req.user.id) throw createError(403, 'Not your project');
      if (pr.status !== 'pending') throw createError(400, `Request is already ${pr.status}`);

      // 2. Capacity Auto-Closure Logic for Accepts
      if (status === 'accepted') {
        const fp = await trx('faculty_profiles').select('max_capacity').where('user_id', req.user.id).first();
        const maxCapacity = fp.max_capacity;

        // Count *current* accepted mentees across ALL this faculty's projects
        const { count: currentMenteeCountStr } = await trx('project_requests as pr_sub')
          .join('projects as p_sub', 'pr_sub.project_id', 'p_sub.id')
          .where('p_sub.faculty_id', req.user.id)
          .andWhere('pr_sub.status', 'accepted')
          .count('pr_sub.id as count')
          .first();

        const currentMentees = Number(currentMenteeCountStr);

        if (currentMentees >= maxCapacity) {
          throw createError(400, `Cannot accept: You have reached your max capacity of ${maxCapacity} mentees.`);
        }

        // 3. Update request to accepted
        await trx('project_requests').where({ id: reqId }).update({ status: 'accepted', updated_at: trx.fn.now() });

        // 4. Update the project status to 'in_progress'
        await trx('projects').where({ id: pr.project_id }).update({ status: 'in_progress', updated_at: trx.fn.now() });

        // 5. If this acceptance hits the limit, mark ALL their open projects as 'closed'
        const newMenteeCount = currentMentees + 1;
        if (newMenteeCount >= maxCapacity) {
          await trx('projects')
            .where({ faculty_id: req.user.id, status: 'open' })
            .update({ status: 'closed', updated_at: trx.fn.now() });
        }

      } else {
        // Just rejecting
        await trx('project_requests').where({ id: reqId }).update({ status: 'rejected', updated_at: trx.fn.now() });
      }
    });

    res.status(200).json({ message: `Request successfully ${status}` });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
