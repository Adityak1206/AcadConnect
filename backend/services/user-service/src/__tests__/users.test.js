/**
 * users.test.js — Tests 12–24
 * GET /api/users/me  &  PUT /api/users/me
 */
jest.setTimeout(30000);
require('dotenv').config({ path: `${__dirname}/../../.env.test` });

const request = require('supertest');
const { app, cleanDb, createStudent, createFaculty, authHeader } = require('./helpers');

afterEach(cleanDb);

// ─────────────────────────────────────────────────────────────────
describe('GET /api/users/me', () => {
  // Test 12
  it('student sees profile with skills, interests, eligibility_status', async () => {
    const { token } = await createStudent();
    const res = await request(app).get('/api/users/me').set(authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body.role).toBe('student');
    expect(res.body.profile).toMatchObject({
      skills: expect.any(Array),
      eligibility_status: 'eligible',
    });
    expect('interests' in res.body.profile).toBe(true);
  });

  // Test 13
  it('faculty sees profile with research_areas, max_capacity, mentee_count', async () => {
    const { token } = await createFaculty();
    const res = await request(app).get('/api/users/me').set(authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body.role).toBe('faculty');
    expect(res.body.profile).toMatchObject({
      research_areas: expect.any(Array),
      max_capacity: 3,
      mentee_count: 0,
    });
  });

  // Test 14
  it('admin sees base user fields only (no profile)', async () => {
    const { token } = await createStudent({ role: 'admin' });
    const res = await request(app).get('/api/users/me').set(authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body.role).toBe('admin');
    expect(res.body.profile).toBeNull();
  });

  // Test 15
  it('returns 401 when no JWT is provided', async () => {
    const res = await request(app).get('/api/users/me');
    expect(res.status).toBe(401);
  });

  // Test 16
  it('returns 401 for an invalid/expired JWT', async () => {
    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', 'Bearer this.is.not.valid');
    expect(res.status).toBe(401);
  });
});

// ─────────────────────────────────────────────────────────────────
describe('PUT /api/users/me', () => {
  // Test 17
  it('student can update skills and interests', async () => {
    const { token } = await createStudent();
    const res = await request(app)
      .put('/api/users/me')
      .set(authHeader(token))
      .send({ skills: ['Python', 'ML'], interests: 'AI Research' });
    expect(res.status).toBe(200);

    // Verify changes persisted
    const me = await request(app).get('/api/users/me').set(authHeader(token));
    expect(me.body.profile.skills).toEqual(['Python', 'ML']);
    expect(me.body.profile.interests).toBe('AI Research');
  });

  // Test 18
  it('student can update their name', async () => {
    const { token } = await createStudent({ name: 'Old Name' });
    const res = await request(app)
      .put('/api/users/me')
      .set(authHeader(token))
      .send({ name: 'New Name' });
    expect(res.status).toBe(200);

    const me = await request(app).get('/api/users/me').set(authHeader(token));
    expect(me.body.name).toBe('New Name');
  });

  // Test 19
  it('faculty can update research_areas and max_capacity', async () => {
    const { token } = await createFaculty();
    const res = await request(app)
      .put('/api/users/me')
      .set(authHeader(token))
      .send({ research_areas: ['NLP', 'Vision'], max_capacity: 5 });
    expect(res.status).toBe(200);

    const me = await request(app).get('/api/users/me').set(authHeader(token));
    expect(me.body.profile.research_areas).toEqual(['NLP', 'Vision']);
    expect(me.body.profile.max_capacity).toBe(5);
  });

  // Test 20
  it('faculty can update only name without touching profile', async () => {
    const { token } = await createFaculty({ name: 'Prof Old' });
    const res = await request(app)
      .put('/api/users/me')
      .set(authHeader(token))
      .send({ name: 'Prof New' });
    expect(res.status).toBe(200);

    const me = await request(app).get('/api/users/me').set(authHeader(token));
    expect(me.body.name).toBe('Prof New');
    expect(me.body.profile.max_capacity).toBe(3); // unchanged
  });

  // Test 21
  it('returns 400 when student sends skills as non-array', async () => {
    const { token } = await createStudent();
    const res = await request(app)
      .put('/api/users/me')
      .set(authHeader(token))
      .send({ skills: 'Python' });
    expect(res.status).toBe(400);
  });

  // Test 22
  it('returns 400 when faculty sends max_capacity as 0', async () => {
    const { token } = await createFaculty();
    const res = await request(app)
      .put('/api/users/me')
      .set(authHeader(token))
      .send({ max_capacity: 0 });
    expect(res.status).toBe(400);
  });

  // Test 23
  it('returns 400 when faculty sends research_areas as string', async () => {
    const { token } = await createFaculty();
    const res = await request(app)
      .put('/api/users/me')
      .set(authHeader(token))
      .send({ research_areas: 'NLP' });
    expect(res.status).toBe(400);
  });

  // Test 24
  it('returns 401 for unauthenticated request', async () => {
    const res = await request(app).put('/api/users/me').send({ name: 'Hacker' });
    expect(res.status).toBe(401);
  });
});
