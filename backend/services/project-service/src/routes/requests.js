const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/knex');
const { authenticate, authorize } = require('../middleware/auth');
const { createError } = require('../utils/errors');

const router = express.Router();

/**
 * POST /api/requests
 * Submit a mentorship request to a specific faculty member.
 * Student only. Must be leader of the group that owns the project.
 *
 * Body: { project_id, faculty_id }
 */
router.post('/', authenticate, authorize('student'), async (req, res, next) => {
  try {
    const { project_id, faculty_id } = req.body;
    if (!project_id || !faculty_id) {
      throw createError(400, 'project_id and faculty_id are required');
    }

    // 1. Verify Project belongs to the student's group
    const project = await db('projects').where({ id: project_id }).first();
    if (!project) throw createError(404, 'Project not found');

    const group = await db('groups').where({ id: project.group_id }).first();
    if (!group || group.leader_id !== req.user.id) {
      throw createError(403, 'Only the group leader of this project can submit a request');
    }

    // 2. Count *accepted* members in group
    const { count: memberCount } = await db('group_members')
      .where({ group_id: group.id, status: 'accepted' })
      .count('student_id as count')
      .first();

    const acceptedCount = Number(memberCount);
    if (acceptedCount < 3 || acceptedCount > 5) {
      throw createError(400, `Your group must have between 3 and 5 **accepted** members to apply. Currently has ${acceptedCount}.`);
    }

    // 3. Ensure group has NOT already secured a mentor
    const acceptedMentors = await db('project_requests')
      .where({ project_id })
      .andWhere({ status: 'accepted' })
      .first();

    if (acceptedMentors) {
      throw createError(400, 'Your group already has an accepted mentor.');
    }

    // 4. Ensure no duplicate pending request to the same faculty
    const existing = await db('project_requests')
      .where({ project_id, faculty_id })
      .first();
    if (existing) throw createError(409, 'Your group has already submitted a request to this faculty');

    // 5. Insert Request
    const requestId = uuidv4();
    await db('project_requests').insert({
      id: requestId,
      project_id,
      faculty_id,
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
 * List all received requests sent to this faculty.
 */
router.get('/faculty', authenticate, authorize('faculty'), async (req, res, next) => {
  try {
    // 1. Fetch the requests
    const requests = await db('project_requests as pr')
      .join('projects as p', 'pr.project_id', 'p.id')
      .join('groups as g', 'p.group_id', 'g.id')
      .join('users as leader', 'g.leader_id', 'leader.id')
      .select(
        'pr.id as request_id',
        'pr.status as request_status',
        'pr.created_at',
        'p.id as project_id',
        'p.title as project_title',
        'p.description as project_description',
        'g.id as group_id',
        'g.name as group_name',
        'leader.name as leader_name'
      )
      .where('pr.faculty_id', req.user.id)
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
 * IMPORTANT: Enforces N:1 faculty-group logic and max_capacity.
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
      const pr = await trx('project_requests').where({ id: reqId }).first();

      if (!pr) throw createError(404, 'Request not found');
      if (pr.faculty_id !== req.user.id) throw createError(403, 'Not your request');
      if (pr.status !== 'pending') throw createError(400, `Request is already ${pr.status}`);

      if (status === 'accepted') {
        const fp = await trx('faculty_profiles').select('max_capacity').where('user_id', req.user.id).first();
        const maxCapacity = fp.max_capacity;

        // Current mentees for this faculty
        const { count: currentMenteeCountStr } = await trx('project_requests')
          .where('faculty_id', req.user.id)
          .andWhere('status', 'accepted')
          .count('id as count')
          .first();

        const currentMentees = Number(currentMenteeCountStr);

        if (currentMentees >= maxCapacity) {
          throw createError(400, `Cannot accept: You have reached your max capacity of ${maxCapacity} mentees.`);
        }

        // Verify the group itself hasn't been scooped by another faculty in the meantime
        const groupBooking = await trx('project_requests')
          .where({ project_id: pr.project_id, status: 'accepted' })
          .first();

        if (groupBooking) {
          throw createError(400, "This group has already accepted a different mentor's request.");
        }

        // 2. Mark this request accepted
        await trx('project_requests').where({ id: reqId }).update({ status: 'accepted', updated_at: trx.fn.now() });

        // 3. Mark the project as in_progress
        await trx('projects').where({ id: pr.project_id }).update({ status: 'in_progress', updated_at: trx.fn.now() });

        // 4. Group is fully booked - reject all their other pending requests out to the world
        await trx('project_requests')
          .where({ project_id: pr.project_id, status: 'pending' })
          .update({ status: 'rejected', updated_at: trx.fn.now() });

        // 5. If faculty reached capacity, reject all other pending requests sent to them
        const newMenteeCount = currentMentees + 1;
        if (newMenteeCount >= maxCapacity) {
          await trx('project_requests')
            .where({ faculty_id: req.user.id, status: 'pending' })
            .update({ status: 'rejected', updated_at: trx.fn.now() });
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
