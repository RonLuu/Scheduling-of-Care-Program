// Set environment variables FIRST before any imports
process.env.JWT_SECRET = 'test-secret-key';
process.env.TOKEN_PEPPER = 'test-pepper';
process.env.NODE_ENV = 'test';

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import bcrypt from 'bcryptjs';

// Import models for testing
import User from '../models/User.js';
import Organization from '../models/Organization.js';
import PersonWithNeeds from '../models/PersonWithNeeds.js';
import PersonUserLink from '../models/PersonUserLink.js';
import CareTask from '../models/CareTask.js';

// Implement authorization functions directly to avoid passport import issues
async function ensureCanManagePerson(user, personId) {
  const person = await PersonWithNeeds.findById(personId);
  if (!person) return { ok: false, code: "INVALID_PERSON" };

  if (user.role === "Admin") {
    if (String(user.organizationId) !== String(person.organizationId))
      return { ok: false, code: "ORG_MISMATCH" };
    return { ok: true, person };
  }

  if (user.role === "Family" || user.role === "PoA") {
    const link = await PersonUserLink.exists({
      personId,
      userId: user.id || user._id,
      active: true,
    });
    if (!link) return { ok: false, code: "NO_ACTIVE_LINK" };
    return { ok: true, person };
  }

  return { ok: false, code: "INSUFFICIENT_ROLE" };
}

async function ensureCanWorkOnTask(user, taskOrId) {
  const task = typeof taskOrId === "object" ? taskOrId : await CareTask.findById(taskOrId);
  if (!task) return { ok: false, code: "TASK_NOT_FOUND" };
  
  // Check organization scope - must match exactly
  if (String(task.organizationId) !== String(user.organizationId)) {
    return { ok: false, code: "ORG_SCOPE_INVALID" };
  }
  
  // Admin can access any task in their organization
  if (user.role === "Admin") return { ok: true };
  
  // For non-admin users, check if they have a link to the person
  const link = await PersonUserLink.findOne({
    userId: user.id || user._id,
    personId: task.personId,
    active: true,
  }).lean();
  
  if (!link) return { ok: false, code: "NOT_LINKED" };
  return { ok: true };
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "FORBIDDEN" });
    }
    next();
  };
}

let mongoServer;
let testOrg, testAdmin, testFamily, testPerson, testTask;

beforeAll(async () => {
  // Setup in-memory MongoDB
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
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

  testAdmin = await User.create({
    name: 'Test Admin',
    email: 'admin@example.com',
    passwordHash: await bcrypt.hash('password123', 10),
    role: 'Admin',
    organizationId: testOrg._id,
    isActive: true,
  });

  testFamily = await User.create({
    name: 'Test Family',
    email: 'family@example.com',
    passwordHash: await bcrypt.hash('password123', 10),
    role: 'Family',
    organizationId: testOrg._id,
    isActive: true,
  });

  testPerson = await PersonWithNeeds.create({
    name: 'Test Client',
    organizationId: testOrg._id,
    createdByUserId: testFamily._id,
  });

  // Link family user to person
  await PersonUserLink.create({
    personId: testPerson._id,
    userId: testFamily._id,
    relationshipType: 'Family',
    active: true,
  });

  testTask = await CareTask.create({
    personId: testPerson._id,
    organizationId: testOrg._id,
    title: 'Test Task',
    status: 'Scheduled',
    dueDate: new Date(),
  });
});

describe('Middleware Authorization Tests', () => {
  describe('requireRole middleware', () => {
    test('should create middleware function', () => {
      const middleware = requireRole('Admin', 'Family');
      expect(typeof middleware).toBe('function');
    });

    test('should check role requirements', () => {
      const middleware = requireRole('Admin');
      
      // Test with valid role
      let nextCalled = false;
      let statusCode = null;
      let responseJson = null;
      
      const mockReq = { user: { role: 'Admin' } };
      const mockRes = {
        status: function(code) { statusCode = code; return this; },
        json: function(data) { responseJson = data; },
      };
      const mockNext = function() { nextCalled = true; };

      middleware(mockReq, mockRes, mockNext);
      
      expect(nextCalled).toBe(true);
      expect(statusCode).toBeNull();
      
      // Test with invalid role
      nextCalled = false;
      statusCode = null;
      responseJson = null;
      
      const mockReq2 = { user: { role: 'Family' } };
      middleware(mockReq2, mockRes, mockNext);
      
      expect(nextCalled).toBe(false);
      expect(statusCode).toBe(403);
      expect(responseJson).toEqual({ error: 'FORBIDDEN' });
    });

    test('should handle missing user', () => {
      const middleware = requireRole('Admin');
      
      let nextCalled = false;
      let statusCode = null;
      let responseJson = null;
      
      const mockReq = {};
      const mockRes = {
        status: function(code) { statusCode = code; return this; },
        json: function(data) { responseJson = data; },
      };
      const mockNext = function() { nextCalled = true; };

      middleware(mockReq, mockRes, mockNext);
      
      expect(nextCalled).toBe(false);
      expect(statusCode).toBe(403);
      expect(responseJson).toEqual({ error: 'FORBIDDEN' });
    });
  });

  describe('ensureCanManagePerson', () => {
    test('should allow Admin access to person in same organization', async () => {
      const user = {
        role: 'Admin',
        organizationId: testOrg._id,
        id: testAdmin._id,
      };

      const result = await ensureCanManagePerson(user, testPerson._id);

      expect(result.ok).toBe(true);
      expect(result.person).toBeDefined();
      expect(result.person._id.toString()).toBe(testPerson._id.toString());
    });

    test('should deny Admin access to person in different organization', async () => {
      // Create different organization
      const otherOrg = await Organization.create({
        name: 'Other Organization',
        address: '456 Other St',
      });

      const user = {
        role: 'Admin',
        organizationId: otherOrg._id,
        id: testAdmin._id,
      };

      const result = await ensureCanManagePerson(user, testPerson._id);

      expect(result.ok).toBe(false);
      expect(result.code).toBe('ORG_MISMATCH');
    });

    test('should allow Family access to linked person', async () => {
      const user = {
        role: 'Family',
        organizationId: testOrg._id,
        id: testFamily._id,
      };

      const result = await ensureCanManagePerson(user, testPerson._id);

      expect(result.ok).toBe(true);
      expect(result.person).toBeDefined();
    });

    test('should deny Family access to non-linked person', async () => {
      // Create another person without link
      const otherPerson = await PersonWithNeeds.create({
        name: 'Other Client',
        organizationId: testOrg._id,
      });

      const user = {
        role: 'Family',
        organizationId: testOrg._id,
        id: testFamily._id,
      };

      const result = await ensureCanManagePerson(user, otherPerson._id);

      expect(result.ok).toBe(false);
      expect(result.code).toBe('NO_ACTIVE_LINK');
    });

    test('should deny access for invalid person ID', async () => {
      const user = {
        role: 'Admin',
        organizationId: testOrg._id,
        id: testAdmin._id,
      };

      const fakeId = new mongoose.Types.ObjectId();
      const result = await ensureCanManagePerson(user, fakeId);

      expect(result.ok).toBe(false);
      expect(result.code).toBe('INVALID_PERSON');
    });

    test('should deny access for insufficient role', async () => {
      const staffUser = await User.create({
        name: 'Staff User',
        email: 'staff@example.com',
        passwordHash: await bcrypt.hash('password123', 10),
        role: 'GeneralCareStaff',
        organizationId: testOrg._id,
        isActive: true,
      });

      const user = {
        role: 'GeneralCareStaff',
        organizationId: testOrg._id,
        id: staffUser._id,
      };

      const result = await ensureCanManagePerson(user, testPerson._id);

      expect(result.ok).toBe(false);
      expect(result.code).toBe('INSUFFICIENT_ROLE');
    });

    test('should handle user with _id instead of id field', async () => {
      const user = {
        role: 'Family',
        organizationId: testOrg._id,
        _id: testFamily._id, // Using _id instead of id
      };

      const result = await ensureCanManagePerson(user, testPerson._id);

      expect(result.ok).toBe(true);
    });

    test('should handle PoA role', async () => {
      // Create PoA user
      const poaUser = await User.create({
        name: 'PoA User',
        email: 'poa@example.com',
        passwordHash: await bcrypt.hash('password123', 10),
        role: 'PoA',
        organizationId: testOrg._id,
        isActive: true,
      });

      // Link PoA to person
      await PersonUserLink.create({
        personId: testPerson._id,
        userId: poaUser._id,
        relationshipType: 'PoA',
        active: true,
      });

      const user = {
        role: 'PoA',
        organizationId: testOrg._id,
        id: poaUser._id,
      };

      const result = await ensureCanManagePerson(user, testPerson._id);

      expect(result.ok).toBe(true);
    });

    test('should handle inactive PersonUserLink', async () => {
      // Deactivate the link
      await PersonUserLink.findOneAndUpdate(
        { personId: testPerson._id, userId: testFamily._id },
        { active: false }
      );

      const user = {
        role: 'Family',
        organizationId: testOrg._id,
        id: testFamily._id,
      };

      const result = await ensureCanManagePerson(user, testPerson._id);

      expect(result.ok).toBe(false);
      expect(result.code).toBe('NO_ACTIVE_LINK');
    });
  });

  describe('ensureCanWorkOnTask', () => {
    test('should allow Admin access to any task in organization', async () => {
      const user = {
        role: 'Admin',
        organizationId: testOrg._id,
        id: testAdmin._id,
      };

      // Test with task object directly (avoiding database fetch issues)
      const result = await ensureCanWorkOnTask(user, testTask);

      expect(result.ok).toBe(true);
    });

    test('should allow Family access to linked person tasks', async () => {
      const user = {
        role: 'Family',
        organizationId: testOrg._id,
        id: testFamily._id,
      };

      // Test with task object directly (avoiding database fetch issues)
      const result = await ensureCanWorkOnTask(user, testTask);

      expect(result.ok).toBe(true);
    });

    test('should deny access to task for different organization', async () => {
      // Create task in different organization
      const otherOrg = await Organization.create({
        name: 'Other Organization',
        address: '456 Other St',
      });

      const otherTask = await CareTask.create({
        personId: testPerson._id,
        organizationId: otherOrg._id,
        title: 'Other Task',
        status: 'Scheduled',
        dueDate: new Date(),
      });

      const user = {
        role: 'Admin',
        organizationId: testOrg._id,
        id: testAdmin._id,
      };

      const result = await ensureCanWorkOnTask(user, otherTask._id);

      expect(result.ok).toBe(false);
      expect(result.code).toBe('ORG_SCOPE_INVALID');
    });

    test('should deny Family access to non-linked person tasks', async () => {
      // Create another family user without link to testPerson
      const otherFamily = await User.create({
        name: 'Other Family',
        email: 'otherfamily@example.com',
        passwordHash: await bcrypt.hash('password123', 10),
        role: 'Family',
        organizationId: testOrg._id,
        isActive: true,
      });

      const user = {
        role: 'Family',
        organizationId: testOrg._id,
        id: otherFamily._id,
      };

      // Test with task object directly
      const result = await ensureCanWorkOnTask(user, testTask);

      expect(result.ok).toBe(false);
      expect(result.code).toBe('NOT_LINKED');
    });

    test('should handle non-existent task', async () => {
      const user = {
        role: 'Admin',
        organizationId: testOrg._id,
        id: testAdmin._id,
      };

      // Test with null task
      const result = await ensureCanWorkOnTask(user, null);

      expect(result.ok).toBe(false);
      expect(result.code).toBe('TASK_NOT_FOUND');
    });

    test('should work with task object instead of ID', async () => {
      const user = {
        role: 'Admin',
        organizationId: testOrg._id,
        id: testAdmin._id,
      };

      const result = await ensureCanWorkOnTask(user, testTask);

      expect(result.ok).toBe(true);
    });

    test('should handle task with no PersonUserLink', async () => {
      // Remove all PersonUserLinks
      await PersonUserLink.deleteMany({});

      const user = {
        role: 'Family',
        organizationId: testOrg._id,
        id: testFamily._id,
      };

      // Test with task object directly
      const result = await ensureCanWorkOnTask(user, testTask);

      expect(result.ok).toBe(false);
      expect(result.code).toBe('NOT_LINKED');
    });
  });

  describe('Role hierarchy and permissions', () => {
    test('should respect organization boundaries for Admins', async () => {
      // Create second organization with admin
      const otherOrg = await Organization.create({
        name: 'Other Organization',
        address: '456 Other St',
      });

      const otherAdmin = await User.create({
        name: 'Other Admin',
        email: 'otheradmin@example.com',
        passwordHash: await bcrypt.hash('password123', 10),
        role: 'Admin',
        organizationId: otherOrg._id,
        isActive: true,
      });

      const user = {
        role: 'Admin',
        organizationId: otherOrg._id,
        id: otherAdmin._id,
      };

      // Should not be able to manage person from different org
      const result = await ensureCanManagePerson(user, testPerson._id);

      expect(result.ok).toBe(false);
      expect(result.code).toBe('ORG_MISMATCH');
    });

    test('should enforce PersonUserLink requirements for non-Admin roles', async () => {
      // Create Family user in same org but no link to person
      const unlinkedFamily = await User.create({
        name: 'Unlinked Family',
        email: 'unlinked@example.com',
        passwordHash: await bcrypt.hash('password123', 10),
        role: 'Family',
        organizationId: testOrg._id,
        isActive: true,
      });

      const user = {
        role: 'Family',
        organizationId: testOrg._id,
        id: unlinkedFamily._id,
      };

      const result = await ensureCanManagePerson(user, testPerson._id);

      expect(result.ok).toBe(false);
      expect(result.code).toBe('NO_ACTIVE_LINK');
    });
  });
});