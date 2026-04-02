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
      .join('users as u', 'p.faculty_id', 'u.id')
      .select(
        'p.id',
        'p.title',
        'p.description',
        'p.status',
        'p.created_at',
        'u.name as faculty_name'
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
      .join('users as u', 'p.faculty_id', 'u.id')
      .select(
        'p.id',
        'p.faculty_id',
        'p.title',
        'p.description',
        'p.status',
        'p.created_at',
        'u.name as faculty_name'
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
 * Create a new open project. Must be faculty.
 *
 * Body: { title, description }
 */
router.post('/', authenticate, authorize('faculty'), async (req, res, next) => {
  try {
    const { title, description } = req.body;
    if (!title || !description) {
      throw createError(400, 'title and description are required');
    }

    const projectId = uuidv4();
    await db('projects').insert({
      id: projectId,
      faculty_id: req.user.id,
      title,
      description,
      status: 'open',
    });

    res.status(201).json({
      message: 'Project created successfully',
      project: { id: projectId, title, status: 'open' },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
