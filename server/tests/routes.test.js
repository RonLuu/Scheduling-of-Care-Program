import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Set environment variables first
process.env.JWT_SECRET = 'test-secret-key';
process.env.NODE_ENV = 'test';

// Import models
import User from '../models/User.js';
import Organization from '../models/Organization.js';
import PersonWithNeeds from '../models/PersonWithNeeds.js';
import CareNeedItem from '../models/CareNeedItem.js';
import CareTask from '../models/CareTask.js';

let mongoServer;
let app;

// Test data
let testUser, testOrg, testPerson, testToken;

beforeAll(async () => {
  // Setup in-memory MongoDB
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);

  // Create Express app for testing with basic setup
  app = express();
  app.use(express.json());
  
  // Basic auth middleware for testing
  const mockAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = { id: decoded.sub, role: decoded.role, organizationId: decoded.org };
      next();
    } catch (err) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  };

  // Simple auth routes for testing
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { name, email, password, role } = req.body || {};
      if (!name || !email || !password || !role) {
        return res.status(400).json({ error: 'MISSING_FIELDS' });
      }
      if (!['GeneralCareStaff', 'Family', 'PoA', 'Admin'].includes(role)) {
        return res.status(400).json({ error: 'INVALID_ROLE' });
      }

      const exists = await User.findOne({ email });
      if (exists) return res.status(409).json({ error: 'EMAIL_EXISTS' });

      const passwordHash = await bcrypt.hash(password, 10);
      const user = await User.create({ name, email, passwordHash, role });

      const jwtToken = jwt.sign(
        { sub: user._id, role: user.role, org: user.organizationId },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      res.status(201).json({
        user: {
          id: user._id,
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          organizationId: user.organizationId,
        },
        session: { jwt: jwtToken, expiresIn: 3600 },
      });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email: email.toLowerCase(), isActive: true });
      if (!user) return res.status(401).json({ error: 'INVALID_CREDENTIALS' });
      
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) return res.status(401).json({ error: 'INVALID_CREDENTIALS' });

      const jwtToken = jwt.sign(
        { sub: user._id, role: user.role, org: user.organizationId },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      res.json({
        session: { jwt: jwtToken, expiresIn: 3600 },
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          organizationId: user.organizationId,
        },
      });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  app.get('/api/auth/me', mockAuth, async (req, res) => {
    try {
      const user = await User.findById(req.user.id).lean();
      if (!user) return res.status(404).json({ error: 'USER_NOT_FOUND' });
      
      res.json({
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          organizationId: user.organizationId,
        },
      });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  // Organization routes
  app.get('/api/organizations', mockAuth, async (req, res) => {
    try {
      const organizations = await Organization.find().lean();
      res.json(organizations);
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  app.post('/api/organizations', mockAuth, async (req, res) => {
    try {
      if (req.user.role !== 'Admin') {
        return res.status(403).json({ error: 'Forbidden' });
      }
      
      const org = await Organization.create(req.body);
      res.status(201).json(org);
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  // PersonWithNeeds routes
  app.get('/api/person-with-needs', mockAuth, async (req, res) => {
    try {
      const query = req.user.organizationId ? { organizationId: req.user.organizationId } : {};
      const persons = await PersonWithNeeds.find(query).lean();
      res.json(persons);
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  app.post('/api/person-with-needs', mockAuth, async (req, res) => {
    try {
      const personData = {
        ...req.body,
        organizationId: req.user.organizationId,
      };
      const person = await PersonWithNeeds.create(personData);
      res.status(201).json(person);
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  app.get('/api/person-with-needs/:id', mockAuth, async (req, res) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ error: 'Invalid ID format' });
      }
      
      const person = await PersonWithNeeds.findById(req.params.id).lean();
      if (!person) return res.status(404).json({ error: 'Person not found' });
      
      res.json(person);
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  // CareNeedItem routes
  app.get('/api/care-need-items', mockAuth, async (req, res) => {
    try {
      const query = {};
      if (req.query.personId) query.personId = req.query.personId;
      if (req.user.organizationId) query.organizationId = req.user.organizationId;
      
      const items = await CareNeedItem.find(query).lean();
      res.json(items);
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  app.post('/api/care-need-items', mockAuth, async (req, res) => {
    try {
      const itemData = {
        ...req.body,
        organizationId: req.user.organizationId,
      };
      const item = await CareNeedItem.create(itemData);
      res.status(201).json(item);
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  app.put('/api/care-need-items/:id', mockAuth, async (req, res) => {
    try {
      const item = await CareNeedItem.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true }
      );
      if (!item) return res.status(404).json({ error: 'Item not found' });
      
      res.json(item);
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  app.delete('/api/care-need-items/:id', mockAuth, async (req, res) => {
    try {
      const item = await CareNeedItem.findByIdAndDelete(req.params.id);
      if (!item) return res.status(404).json({ error: 'Item not found' });
      
      res.json({ message: 'Item deleted successfully' });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  // CareTask routes
  app.get('/api/care-tasks', mockAuth, async (req, res) => {
    try {
      const query = {};
      if (req.query.status) query.status = req.query.status;
      if (req.query.personId) query.personId = req.query.personId;
      if (req.user.organizationId) query.organizationId = req.user.organizationId;
      
      const tasks = await CareTask.find(query).lean();
      res.json(tasks);
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  app.post('/api/care-tasks', mockAuth, async (req, res) => {
    try {
      const taskData = {
        ...req.body,
        organizationId: req.user.organizationId,
      };
      const task = await CareTask.create(taskData);
      res.status(201).json(task);
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  app.put('/api/care-tasks/:id', mockAuth, async (req, res) => {
    try {
      const task = await CareTask.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true }
      );
      if (!task) return res.status(404).json({ error: 'Task not found' });
      
      res.json(task);
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  // Clear all collections
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany();
  }

  // Create test data
  testOrg = await Organization.create({
    name: 'Test Organization',
    address: '123 Test St',
  });

  const passwordHash = await bcrypt.hash('password123', 10);
  testUser = await User.create({
    name: 'Test User',
    email: 'test@example.com',
    passwordHash,
    role: 'Admin',
    organizationId: testOrg._id,
  });

  testPerson = await PersonWithNeeds.create({
    name: 'Test Person',
    organizationId: testOrg._id,
  });

  // Generate valid JWT token
  testToken = jwt.sign(
    { sub: testUser._id, role: testUser.role, org: testUser.organizationId },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
});

describe('Authentication Routes', () => {
  describe('POST /api/auth/register', () => {
    test('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'New User',
          email: 'newuser@example.com',
          password: 'password123',
          role: 'GeneralCareStaff',
        });

      expect(response.status).toBe(201);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe('newuser@example.com');
      expect(response.body.session.jwt).toBeDefined();
    });

    test('should return 400 for missing fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'New User',
          email: 'newuser@example.com',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('MISSING_FIELDS');
    });

    test('should return 409 for existing email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Duplicate User',
          email: 'test@example.com', // Already exists
          password: 'password123',
          role: 'Family',
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('EMAIL_EXISTS');
    });

    test('should return 400 for invalid role', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Invalid Role User',
          email: 'invalid@example.com',
          password: 'password123',
          role: 'InvalidRole',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('INVALID_ROLE');
    });
  });

  describe('POST /api/auth/login', () => {
    test('should login successfully with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(200);
      expect(response.body.session.jwt).toBeDefined();
      expect(response.body.user.email).toBe('test@example.com');
    });

    test('should return 401 for invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword',
        });

      expect(response.status).toBe(401);
    });

    test('should return 401 for non-existent user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/auth/me', () => {
    test('should return user info with valid JWT', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(200);
      expect(response.body.user.email).toBe('test@example.com');
      expect(response.body.user.name).toBe('Test User');
    });

    test('should return 401 without JWT', async () => {
      const response = await request(app)
        .get('/api/auth/me');

      expect(response.status).toBe(401);
    });

    test('should return 401 with invalid JWT', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });
  });
});

describe('Organization Routes', () => {
  describe('GET /api/organizations', () => {
    test('should get all organizations with valid auth', async () => {
      const response = await request(app)
        .get('/api/organizations')
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    test('should return 401 without auth', async () => {
      const response = await request(app)
        .get('/api/organizations');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/organizations', () => {
    test('should create organization as Admin', async () => {
      const response = await request(app)
        .post('/api/organizations')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          name: 'New Organization',
          address: '456 New St',
        });

      expect(response.status).toBe(201);
      expect(response.body.name).toBe('New Organization');
    });

    test('should return 403 for non-Admin users', async () => {
      // Create non-admin user token
      const staffToken = jwt.sign(
        { sub: testUser._id, role: 'GeneralCareStaff', org: testOrg._id },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .post('/api/organizations')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          name: 'Should Fail',
          address: '789 Fail St',
        });

      expect(response.status).toBe(403);
    });
  });
});

describe('PersonWithNeeds Routes', () => {
  describe('GET /api/person-with-needs', () => {
    test('should get all persons for organization', async () => {
      const response = await request(app)
        .get('/api/person-with-needs')
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    test('should return 401 without auth', async () => {
      const response = await request(app)
        .get('/api/person-with-needs');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/person-with-needs', () => {
    test('should create person with valid data', async () => {
      const response = await request(app)
        .post('/api/person-with-needs')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          name: 'New Person',
          dateOfBirth: '1950-01-01',
          mobilePhone: '0412345678',
        });

      expect(response.status).toBe(201);
      expect(response.body.name).toBe('New Person');
      expect(response.body.organizationId).toBe(testOrg._id.toString());
    });

    test('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/person-with-needs')
        .set('Authorization', `Bearer ${testToken}`)
        .send({}); // Missing name

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/person-with-needs/:id', () => {
    test('should get specific person by ID', async () => {
      const response = await request(app)
        .get(`/api/person-with-needs/${testPerson._id}`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Test Person');
    });

    test('should return 404 for non-existent person', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/person-with-needs/${fakeId}`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(404);
    });

    test('should return 400 for invalid ID format', async () => {
      const response = await request(app)
        .get('/api/person-with-needs/invalid-id')
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(400);
    });
  });
});

describe('CareNeedItem Routes', () => {
  let testCareItem;

  beforeEach(async () => {
    testCareItem = await CareNeedItem.create({
      personId: testPerson._id,
      organizationId: testOrg._id,
      name: 'Test Care Item',
      category: 'Healthcare',
      frequency: {
        intervalType: 'Daily',
      },
    });
  });

  describe('GET /api/care-need-items', () => {
    test('should get all care need items', async () => {
      const response = await request(app)
        .get('/api/care-need-items')
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    test('should filter by personId', async () => {
      const response = await request(app)
        .get(`/api/care-need-items?personId=${testPerson._id}`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(200);
      expect(response.body[0].personId).toBe(testPerson._id.toString());
    });
  });

  describe('POST /api/care-need-items', () => {
    test('should create care need item', async () => {
      const response = await request(app)
        .post('/api/care-need-items')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          personId: testPerson._id,
          name: 'New Care Item',
          category: 'Medication',
          frequency: {
            intervalType: 'Weekly',
            intervalValue: 2,
          },
        });

      expect(response.status).toBe(201);
      expect(response.body.name).toBe('New Care Item');
      expect(response.body.frequency.intervalType).toBe('Weekly');
    });

    test('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/care-need-items')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          personId: testPerson._id,
          // Missing name and category
        });

      expect(response.status).toBe(400);
    });
  });

  describe('PUT /api/care-need-items/:id', () => {
    test('should update care need item', async () => {
      const response = await request(app)
        .put(`/api/care-need-items/${testCareItem._id}`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          name: 'Updated Care Item',
          category: 'Updated Category',
        });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Updated Care Item');
    });

    test('should return 404 for non-existent item', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .put(`/api/care-need-items/${fakeId}`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          name: 'Should Fail',
        });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/care-need-items/:id', () => {
    test('should delete care need item', async () => {
      const response = await request(app)
        .delete(`/api/care-need-items/${testCareItem._id}`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(200);
      
      // Verify deletion
      const checkResponse = await request(app)
        .get(`/api/care-need-items/${testCareItem._id}`)
        .set('Authorization', `Bearer ${testToken}`);
      
      expect(checkResponse.status).toBe(404);
    });
  });
});

describe('CareTask Routes', () => {
  let testCareItem, testCareTask;

  beforeEach(async () => {
    testCareItem = await CareNeedItem.create({
      personId: testPerson._id,
      organizationId: testOrg._id,
      name: 'Task Care Item',
      category: 'Daily',
      frequency: {
        intervalType: 'Daily',
      },
    });

    testCareTask = await CareTask.create({
      personId: testPerson._id,
      organizationId: testOrg._id,
      careNeedItemId: testCareItem._id,
      title: 'Test Task',
      dueDate: new Date('2024-01-15'),
      status: 'Scheduled',
    });
  });

  describe('GET /api/care-tasks', () => {
    test('should get all care tasks', async () => {
      const response = await request(app)
        .get('/api/care-tasks')
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    test('should filter by status', async () => {
      const response = await request(app)
        .get('/api/care-tasks?status=Scheduled')
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(200);
      expect(response.body[0].status).toBe('Scheduled');
    });

    test('should filter by personId', async () => {
      const response = await request(app)
        .get(`/api/care-tasks?personId=${testPerson._id}`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(200);
      expect(response.body[0].personId).toBe(testPerson._id.toString());
    });
  });

  describe('POST /api/care-tasks', () => {
    test('should create care task', async () => {
      const response = await request(app)
        .post('/api/care-tasks')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          personId: testPerson._id,
          careNeedItemId: testCareItem._id,
          title: 'New Task',
          dueDate: '2024-02-01',
          scheduleType: 'AllDay',
        });

      expect(response.status).toBe(201);
      expect(response.body.title).toBe('New Task');
      expect(response.body.status).toBe('Scheduled');
    });
  });

  describe('PUT /api/care-tasks/:id', () => {
    test('should update care task status', async () => {
      const response = await request(app)
        .put(`/api/care-tasks/${testCareTask._id}`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          status: 'Completed',
          completedAt: new Date(),
          completedByUserId: testUser._id,
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('Completed');
    });
  });
});

describe('Error Handling', () => {
  test('should handle missing Authorization header', async () => {
    const response = await request(app)
      .get('/api/organizations');

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Unauthorized');
  });

  test('should handle invalid Authorization header format', async () => {
    const response = await request(app)
      .get('/api/organizations')
      .set('Authorization', 'InvalidFormat');

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Unauthorized');
  });

  test('should handle invalid JWT token', async () => {
    const response = await request(app)
      .get('/api/organizations')
      .set('Authorization', 'Bearer invalid-token');

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Invalid token');
  });

  test('should handle invalid MongoDB ObjectId', async () => {
    const response = await request(app)
      .get('/api/person-with-needs/invalid-id')
      .set('Authorization', `Bearer ${testToken}`);

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid ID format');
  });
});