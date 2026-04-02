const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/knex');
const { authenticate, authorize } = require('../middleware/auth');
const { createError } = require('../utils/errors');

const router = express.Router();

/**
 * POST /api/groups
 * Creates a new student group and sends pending invites to members.
 * Enforces 3-5 members (including the leader).
 * Student only.
 *
 * Body: { name: "Team Alpha", member_emails: ["bob@uni.edu", "charlie@uni.edu"] }
 */
router.post('/', authenticate, authorize('student'), async (req, res, next) => {
  try {
    const { name, member_emails } = req.body;
    const leaderId = req.user.id;

    if (!name || !member_emails || !Array.isArray(member_emails)) {
      throw createError(400, 'name and member_emails (array) are required');
    }

    // Include the leader in the count
    const totalMembers = member_emails.length + 1;
    if (totalMembers < 3 || totalMembers > 5) {
      throw createError(400, `A group must have 3 to 5 members. You provided ${member_emails.length} invites.`);
    }

    // You cannot invite yourself
    if (member_emails.includes(req.user.email)) {
      throw createError(400, 'Do not include your own email in member_emails.');
    }

    const groupId = uuidv4();

    await db.transaction(async (trx) => {
      // 1. Verify all member emails exist and are students
      const invitees = await trx('users')
        .select('id', 'email')
        .whereIn('email', member_emails)
        .andWhere('role', 'student');

      if (invitees.length !== member_emails.length) {
        const foundEmails = invitees.map(u => u.email);
        const missing = member_emails.filter(e => !foundEmails.includes(e));
        throw createError(404, `The following emails do not belong to registered students: ${missing.join(', ')}`);
      }

      // 2. Create the group
      await trx('groups').insert({
        id: groupId,
        name,
        leader_id: leaderId,
      });

      // 3. Add the leader as an 'accepted' member
      const membersToInsert = [
        { group_id: groupId, student_id: leaderId, status: 'accepted' }
      ];

      // 4. Add the rest as 'pending'
      for (const invitee of invitees) {
        membersToInsert.push({
          group_id: groupId,
          student_id: invitee.id,
          status: 'pending'
        });
      }

      await trx('group_members').insert(membersToInsert);
    });

    res.status(201).json({
      message: 'Group created and invites sent',
      group_id: groupId,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/groups/:id/accept-invite
 * Accepts a pending invite for the authenticated student.
 */
router.put('/:id/accept-invite', authenticate, authorize('student'), async (req, res, next) => {
  try {
    const groupId = req.params.id;
    const studentId = req.user.id;

    // Verify invite exists and is pending
    const membership = await db('group_members')
      .where({ group_id: groupId, student_id: studentId })
      .first();

    if (!membership) throw createError(404, 'You are not invited to this group');
    if (membership.status === 'accepted') throw createError(400, 'You have already accepted this invite');

    await db('group_members')
      .where({ group_id: groupId, student_id: studentId })
      .update({ status: 'accepted', updated_at: db.fn.now() });

    res.status(200).json({ message: 'Invite accepted successfully' });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/groups/me
 * Lists all groups the student belongs to or is invited to.
 */
router.get('/me', authenticate, authorize('student'), async (req, res, next) => {
  try {
    const groups = await db('group_members as gm')
      .join('groups as g', 'gm.group_id', 'g.id')
      .join('users as leader', 'g.leader_id', 'leader.id')
      .select(
        'g.id as group_id',
        'g.name',
        'leader.name as leader_name',
        'gm.status as my_status',
        'g.created_at'
      )
      .where('gm.student_id', req.user.id);

    // For each group, fetch all members
    for (let grp of groups) {
      const members = await db('group_members as gm')
        .join('users as u', 'gm.student_id', 'u.id')
        .select('u.name', 'u.email', 'gm.status')
        .where('gm.group_id', grp.group_id);
      grp.members = members;
    }

    res.status(200).json({ groups });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
