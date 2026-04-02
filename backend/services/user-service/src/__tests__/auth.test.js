/**
 * auth.test.js — Tests 1–11
 * POST /api/auth/register  &  POST /api/auth/login
 */
jest.setTimeout(30000);
require('dotenv').config({ path: `${__dirname}/../../.env.test` });

const request = require('supertest');
const { app, cleanDb, createStudent } = require('./helpers');

afterEach(cleanDb);

// ─────────────────────────────────────────────────────────────────
describe('POST /api/auth/register', () => {
  // Test 1
  it('registers a student and returns user + token', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Alice',
      email: 'alice@test.com',
      password: 'password123',
      role: 'student',
    });
    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ name: 'Alice', email: 'alice@test.com', role: 'student' });
    expect(res.body.token).toBeDefined();
  });

  // Test 2
  it('registers a faculty and auto-creates faculty_profile with max_capacity=3', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Prof Bob',
      email: 'bob@test.com',
      password: 'password123',
      role: 'faculty',
    });
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('faculty');
    expect(res.body.token).toBeDefined();

    // Verify faculty_profile row via GET /api/users/me
    const meRes = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${res.body.token}`);
    expect(meRes.body.profile.max_capacity).toBe(3);
  });

  // Test 3
  it('registers an admin (no profile row)', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Admin Charlie',
      email: 'charlie@test.com',
      password: 'password123',
      role: 'admin',
    });
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('admin');

    const meRes = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${res.body.token}`);
    expect(meRes.body.profile).toBeNull();
  });

  // Test 4
  it('returns 400 when required fields are missing', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Incomplete',
      email: 'incomplete@test.com',
      // missing password and role
    });
    expect(res.status).toBe(400);
  });

  // Test 5
  it('returns 400 for invalid role value', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Invalid',
      email: 'invalid@test.com',
      password: 'password123',
      role: 'teacher',
    });
    expect(res.status).toBe(400);
  });

  // Test 6
  it('returns 400 for password shorter than 8 characters', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Short',
      email: 'short@test.com',
      password: 'abc',
      role: 'student',
    });
    expect(res.status).toBe(400);
  });

  // Test 7
  it('returns 409 for duplicate email', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'First',
      email: 'dup@test.com',
      password: 'password123',
      role: 'student',
    });
    const res = await request(app).post('/api/auth/register').send({
      name: 'Second',
      email: 'dup@test.com',
      password: 'password123',
      role: 'student',
    });
    expect(res.status).toBe(409);
  });
});

// ─────────────────────────────────────────────────────────────────
describe('POST /api/auth/login', () => {
  // Test 8
  it('returns 200 with JWT and user object for valid credentials', async () => {
    await createStudent({ email: 'login@test.com', password: 'password123' });
    const res = await request(app).post('/api/auth/login').send({
      email: 'login@test.com',
      password: 'password123',
    });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user).toMatchObject({ email: 'login@test.com', role: 'student' });
  });

  // Test 9
  it('returns 401 for wrong password', async () => {
    await createStudent({ email: 'wrongpass@test.com', password: 'password123' });
    const res = await request(app).post('/api/auth/login').send({
      email: 'wrongpass@test.com',
      password: 'wrongpassword',
    });
    expect(res.status).toBe(401);
  });

  // Test 10
  it('returns 401 for non-existent email', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'nobody@test.com',
      password: 'password123',
    });
    expect(res.status).toBe(401);
  });

  // Test 11
  it('returns 400 when email or password is missing', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'only@test.com' });
    expect(res.status).toBe(400);
  });
});
