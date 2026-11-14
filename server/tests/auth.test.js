import request from 'supertest';
import app from '../src/app.js';
import { describeDb, connectTestDb, disconnectTestDb } from './setup.js';

describeDb('Auth Integration Tests (Database)', () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  const testUser = {
    name: 'Atlas Tester',
    username: 'atlas_tester',
    email: 'atlas@example.com',
    password: 'Password123'
  };

  let authCookie = '';
  let accessToken = '';

  it('register: successfully registers a new user, returns 201 envelope and sets pf_rt cookie', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('user');
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data.user.email).toBe(testUser.email);
    expect(res.body.data.user.username).toBe(testUser.username);
    expect(res.body.data.user.passwordHash).toBeUndefined();
    expect(res.body.data.user.tokenVersion).toBeUndefined();

    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies[0]).toContain('pf_rt=');
    authCookie = cookies[0];
    accessToken = res.body.data.accessToken;
  });

  it('duplicate email: returns 409 CONFLICT error envelope', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Another User',
        username: 'different_user',
        email: testUser.email,
        password: 'Password123'
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('CONFLICT');
    expect(res.body.error.details).toEqual([
      { path: 'email', message: 'Email is already registered' }
    ]);
  });

  it('invalid body: returns 400 VALIDATION_ERROR envelope with details', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'A',
        username: 'INVALID-NAME!',
        email: 'invalid-email',
        password: 'weak'
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(Array.isArray(res.body.error.details)).toBe(true);
  });

  it('login by email: returns 200 success envelope, user, accessToken and cookie', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        identifier: testUser.email,
        password: testUser.password
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(testUser.email);
    expect(typeof res.body.data.accessToken).toBe('string');
    expect(res.headers['set-cookie']).toBeDefined();
    authCookie = res.headers['set-cookie'][0];
  });

  it('login by username: returns 200 success envelope', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        identifier: testUser.username,
        password: testUser.password
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.username).toBe(testUser.username);
  });

  it('wrong password: returns 401 INVALID_CREDENTIALS error envelope', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        identifier: testUser.username,
        password: 'WrongPassword999'
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('refresh with cookie: returns 200 success envelope and rotates pf_rt cookie', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', [authCookie]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.data.accessToken).toBe('string');
    expect(res.body.data.user.username).toBe(testUser.username);
    expect(res.headers['set-cookie']).toBeDefined();
    authCookie = res.headers['set-cookie'][0];
    accessToken = res.body.data.accessToken;
  });

  it('logout invalidates refresh: logs out and subsequent refresh fails with 401 UNAUTHORIZED', async () => {
    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body.success).toBe(true);
    expect(logoutRes.body.data).toBeNull();
    expect(logoutRes.body.message).toBe('Logged out');

    // Attempting refresh with previous cookie must now fail
    const refreshRes = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', [authCookie]);

    expect(refreshRes.status).toBe(401);
    expect(refreshRes.body.success).toBe(false);
    expect(refreshRes.body.error.code).toBe('UNAUTHORIZED');
  });

  it('protected route without token: returns 401 UNAUTHORIZED error envelope', async () => {
    const res = await request(app).get('/api/users/me');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });
});
