/**
 * helpers.js — user-service test utilities
 *
 * Provides reusable factory functions and a DB cleanup helper used
 * across all user-service test suites.
 */
require('dotenv').config({ path: `${__dirname}/../../.env.test` });

const request = require('supertest');
const app = require('../index');
const knex = require('knex');

// ─── Shared DB Instance ──────────────────────────────────────────
const db = knex({
  client: 'pg',
  connection: process.env.TEST_DATABASE_URL,
});

// ─── Cleanup ─────────────────────────────────────────────────────
/**
 * Truncates all tables between tests to ensure isolation.
 * Call inside afterEach or afterAll within each describe block.
 */
const cleanDb = async () => {
  await db.raw(`
    TRUNCATE TABLE
      audit_logs,
      project_requests,
      group_members,
      groups,
      projects,
      student_profiles,
      faculty_profiles,
      users
    RESTART IDENTITY CASCADE
  `);
};

// ─── User Factories ───────────────────────────────────────────────
/**
 * Registers a student and returns { user, token }.
 */
const createStudent = async (overrides = {}) => {
  const defaults = {
    name: 'Test Student',
    email: `student_${Date.now()}@test.com`,
    password: 'password123',
    role: 'student',
  };
  const payload = { ...defaults, ...overrides };
  const res = await request(app).post('/api/auth/register').send(payload);
  if (res.status !== 201) throw new Error(`createStudent failed: ${JSON.stringify(res.body)}`);
  return { user: res.body.user, token: res.body.token };
};

/**
 * Registers a faculty member and returns { user, token }.
 */
const createFaculty = async (overrides = {}) => {
  const defaults = {
    name: 'Test Faculty',
    email: `faculty_${Date.now()}@test.com`,
    password: 'password123',
    role: 'faculty',
  };
  const payload = { ...defaults, ...overrides };
  const res = await request(app).post('/api/auth/register').send(payload);
  if (res.status !== 201) throw new Error(`createFaculty failed: ${JSON.stringify(res.body)}`);
  return { user: res.body.user, token: res.body.token };
};

/**
 * Registers an admin and returns { user, token }.
 */
const createAdmin = async (overrides = {}) => {
  const defaults = {
    name: 'Test Admin',
    email: `admin_${Date.now()}@test.com`,
    password: 'password123',
    role: 'admin',
  };
  const payload = { ...defaults, ...overrides };
  const res = await request(app).post('/api/auth/register').send(payload);
  if (res.status !== 201) throw new Error(`createAdmin failed: ${JSON.stringify(res.body)}`);
  return { user: res.body.user, token: res.body.token };
};

/**
 * Returns a Bearer auth header string for use with supertest .set().
 */
const authHeader = (token) => ({ Authorization: `Bearer ${token}` });

module.exports = { app, db, cleanDb, createStudent, createFaculty, createAdmin, authHeader };
