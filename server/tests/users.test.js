import request from 'supertest';
import app from '../src/app.js';
import { describeDb, connectTestDb, disconnectTestDb } from './setup.js';

describeDb('Users Integration Tests (Database)', () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  let tokenA = '';
  let tokenB = '';

  const userA = {
    name: 'User Alpha',
    username: 'user_alpha',
    email: 'alpha@example.com',
    password: 'Password123'
  };

  const userB = {
    name: 'User Beta',
    username: 'user_beta',
    email: 'beta@example.com',
    password: 'Password123'
  };

  it('sets up users for integration tests', async () => {
    const resA = await request(app).post('/api/auth/register').send(userA);
    expect(resA.status).toBe(201);
    expect(resA.body.success).toBe(true);
    tokenA = resA.body.data.accessToken;

    const resB = await request(app).post('/api/auth/register').send(userB);
    expect(resB.status).toBe(201);
    expect(resB.body.success).toBe(true);
    tokenB = resB.body.data.accessToken;
  });

  it('get me: returns 200 UserMe envelope', async () => {
    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.username).toBe(userA.username);
    expect(res.body.data.email).toBe(userA.email);
    expect(res.body.data.passwordHash).toBeUndefined();
    expect(res.body.data.tokenVersion).toBeUndefined();
  });

  it('update profile: successfully updates name and bio, returns 200 UserMe', async () => {
    const res = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        name: 'Alpha Prime',
        bio: 'Indie game asset creator'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Alpha Prime');
    expect(res.body.data.bio).toBe('Indie game asset creator');
  });

  it('username conflict: returns 409 CONFLICT envelope when username is already taken', async () => {
    const res = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        username: userB.username
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('CONFLICT');
    expect(res.body.error.message).toBe('Username is taken');
  });

  it('password change: successfully updates password, returns 200 envelope and message', async () => {
    const res = await request(app)
      .patch('/api/users/me/password')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        currentPassword: userA.password,
        newPassword: 'BrandNewPassword999'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeNull();
    expect(res.body.message).toContain('Password updated');
  });

  it('become creator: changes role from buyer to creator, returns 200 envelope', async () => {
    const res = await request(app)
      .post('/api/users/me/become-creator')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.role).toBe('creator');
    expect(res.body.message).toContain('You are now a creator!');
  });

  it('public profile 404: returns 404 NOT_FOUND envelope for non-existent username', async () => {
    const res = await request(app).get('/api/users/non_existent_creator_xyz');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(res.body.error.message).toBe('Creator not found');
  });

  it('public profile 200: returns 200 UserPublic and stats envelope for valid creator', async () => {
    const res = await request(app).get(`/api/users/${userA.username}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.username).toBe(userA.username);
    expect(res.body.data.user.email).toBeUndefined(); // Email must not be leaked in public profile
    expect(res.body.data.stats).toHaveProperty('assetCount');
    expect(res.body.data.stats).toHaveProperty('totalSales');
    expect(res.body.data.stats).toHaveProperty('totalDownloads');
    expect(res.body.data.stats).toHaveProperty('avgRating');
  });
});
