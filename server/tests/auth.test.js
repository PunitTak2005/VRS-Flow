// Set test environment variables before loading anything
process.env.USE_MOCK_DB = 'true';
process.env.JWT_SECRET = 'test_secret_123';

const request = require('supertest');
const app = require('../src/app');
const { dbStore } = require('../src/models/mockDb');

describe('🔑 Authentication API Endpoints', () => {
  beforeEach(() => {
    // Clear mock db arrays
    dbStore.User = [];
    dbStore.Volunteer = [];
  });

  test('POST /api/auth/register - Should register a new volunteer', async () => {
    const payload = {
      name: 'Test Volunteer',
      email: 'testvol@example.com',
      password: 'Password123!',
      phoneNumber: '555-9999',
      dob: '1995-10-10',
      gender: 'male',
      street: '123 Test St',
      city: 'Test City',
      state: 'TS',
      country: 'TestLand',
      pincode: '12345',
      emergencyName: 'Emergency Person',
      emergencyRelation: 'Friend',
      emergencyPhone: '555-8888',
      preferredCategory: 'Environment',
      termsAccepted: true
    };

    const res = await request(app)
      .post('/api/auth/register')
      .send(payload);

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe('testvol@example.com');
  });

  test('POST /api/auth/login - Should fail with incorrect password', async () => {
    // First register a user
    const signupPayload = {
      name: 'Test Volunteer',
      email: 'testvol2@example.com',
      password: 'Password123!',
      phoneNumber: '555-9999',
      dob: '1995-10-10',
      gender: 'male',
      street: '123 Test St',
      city: 'Test City',
      state: 'TS',
      country: 'TestLand',
      pincode: '12345',
      emergencyName: 'Emergency Person',
      emergencyRelation: 'Friend',
      emergencyPhone: '555-8888',
      preferredCategory: 'Environment',
      termsAccepted: true
    };

    await request(app).post('/api/auth/register').send(signupPayload);

    // Try log in with incorrect password
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'testvol2@example.com', password: 'WrongPassword' });

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('GET /api/auth/me - Should fetch profile when authorized with JWT', async () => {
    const signupPayload = {
      name: 'Authorized Volunteer',
      email: 'authorized@example.com',
      password: 'Password123!',
      phoneNumber: '555-9999',
      dob: '1995-10-10',
      gender: 'male',
      street: '123 Test St',
      city: 'Test City',
      state: 'TS',
      country: 'TestLand',
      pincode: '12345',
      emergencyName: 'Emergency Person',
      emergencyRelation: 'Friend',
      emergencyPhone: '555-8888',
      preferredCategory: 'Environment',
      termsAccepted: true
    };

    const signupRes = await request(app).post('/api/auth/register').send(signupPayload);
    const token = signupRes.body.token;

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.name).toBe('Authorized Volunteer');
  });
});
