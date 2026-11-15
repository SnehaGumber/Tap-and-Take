'use strict';

const { app, API, request, createUserAndToken } = require('./helpers');

describe('Authentication', () => {
  it('registers a customer, hashes the password and returns a JWT', async () => {
    const response = await request(app).post(`${API}/auth/register`).send({
      name: 'Priya Nair',
      email: 'priya@test.dev',
      password: 'Password123',
    });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.token).toBeTruthy();
    expect(response.body.data.user.role).toBe('customer');
    // The password must never be returned by the API.
    expect(response.body.data.user.password).toBeUndefined();

    const { User } = require('../src/models');
    const stored = await User.findOne({ email: 'priya@test.dev' }).select('+password');
    expect(stored.password).not.toBe('Password123');
    expect(stored.password.startsWith('$2')).toBe(true);
  });

  it('rejects a weak password with a 422 validation error', async () => {
    const response = await request(app)
      .post(`${API}/auth/register`)
      .send({ name: 'Weak', email: 'weak@test.dev', password: 'abc' });

    expect(response.status).toBe(422);
    expect(response.body.errors.length).toBeGreaterThan(0);
  });

  it('rejects a duplicate email with 409', async () => {
    const payload = { name: 'Dup User', email: 'dup@test.dev', password: 'Password123' };
    await request(app).post(`${API}/auth/register`).send(payload);
    const response = await request(app).post(`${API}/auth/register`).send(payload);

    expect(response.status).toBe(409);
  });

  it('logs in with valid credentials and rejects invalid ones', async () => {
    await request(app)
      .post(`${API}/auth/register`)
      .send({ name: 'Login User', email: 'login@test.dev', password: 'Password123' });

    const ok = await request(app)
      .post(`${API}/auth/login`)
      .send({ email: 'login@test.dev', password: 'Password123' });
    expect(ok.status).toBe(200);
    expect(ok.body.data.token).toBeTruthy();

    const bad = await request(app)
      .post(`${API}/auth/login`)
      .send({ email: 'login@test.dev', password: 'WrongPassword1' });
    expect(bad.status).toBe(401);
    expect(bad.body.message).toBe('Invalid email or password.');
  });

  it('blocks protected routes without a token and allows them with one', async () => {
    const unauth = await request(app).get(`${API}/users/profile`);
    expect(unauth.status).toBe(401);

    const { token, user } = await createUserAndToken({ email: 'profile@test.dev' });
    const authed = await request(app)
      .get(`${API}/users/profile`)
      .set('Authorization', `Bearer ${token}`);

    expect(authed.status).toBe(200);
    expect(authed.body.data.user.email).toBe(user.email);
  });

  it('rejects a tampered token', async () => {
    const response = await request(app)
      .get(`${API}/users/profile`)
      .set('Authorization', 'Bearer not.a.real.token');
    expect(response.status).toBe(401);
  });

  it('changes the password and invalidates the old one', async () => {
    const { user, token } = await createUserAndToken({ email: 'pwd@test.dev' });

    const changed = await request(app)
      .patch(`${API}/users/password`)
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'Password123', newPassword: 'BrandNew456' });
    expect(changed.status).toBe(200);

    const oldLogin = await request(app)
      .post(`${API}/auth/login`)
      .send({ email: user.email, password: 'Password123' });
    expect(oldLogin.status).toBe(401);

    const newLogin = await request(app)
      .post(`${API}/auth/login`)
      .send({ email: user.email, password: 'BrandNew456' });
    expect(newLogin.status).toBe(200);
  });
});
