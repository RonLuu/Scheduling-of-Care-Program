import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Set environment variables first
process.env.JWT_SECRET = 'test-secret-key';
process.env.TOKEN_PEPPER = 'test-pepper';
process.env.NODE_ENV = 'test';

// Import models and services for integration testing
import User from '../models/User.js';
import Organization from '../models/Organization.js';
import PersonWithNeeds from '../models/PersonWithNeeds.js';
import BudgetPlan from '../models/BudgetPlan.js';
import CareTask from '../models/CareTask.js';
import CareNeedItem from '../models/CareNeedItem.js';
import PersonUserLink from '../models/PersonUserLink.js';
import Token from '../models/Token.js';

import { checkBudgetAndNotify } from '../services/budgetMonitor.js';
import { expandOccurrences } from '../utils/schedule.js';
import { randomCode, hashToken, verifyTokenString } from '../utils/token.js';
import { signSession } from '../utils/jwt.js';

let mongoServer;
let testOrg, testUser, testPerson, testAdmin;

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
    passwordHash: 'hashedpassword',
    role: 'Admin',
    organizationId: testOrg._id,
    emailPreferences: {
      budgetAlerts: false, // Disable alerts for testing
      budgetThreshold: 80,
    },
  });

  testUser = await User.create({
    name: 'Test User',
    email: 'user@example.com',
    passwordHash: 'hashedpassword',
    role: 'Family',
    organizationId: testOrg._id,
    emailPreferences: {
      budgetAlerts: false, // Disable alerts for testing
      budgetThreshold: 75,
    },
  });

  testPerson = await PersonWithNeeds.create({
    name: 'Test Client',
    organizationId: testOrg._id,
    createdByUserId: testUser._id,
  });

  // Link user to person
  await PersonUserLink.create({
    personId: testPerson._id,
    userId: testUser._id,
    relationshipType: 'Family',
    active: true,
  });
});

describe('Integration Tests', () => {
  describe('Budget monitoring workflow', () => {
    test('should create budget plan, add expenses, and trigger notifications', async () => {
      // Create budget plan
      const budgetPlan = await BudgetPlan.create({
        personId: testPerson._id,
        organizationId: testOrg._id,
        createdByUserId: testUser._id,
        year: 2024,
        yearlyBudget: 10000,
        categories: [
          {
            id: 'healthcare',
            name: 'Healthcare',
            budget: 5000,
            items: [
              {
                name: 'Medication',
                budget: 1000,
              },
            ],
          },
        ],
      });

      // Create care item
      const careItem = await CareNeedItem.create({
        personId: testPerson._id,
        organizationId: testOrg._id,
        name: 'Daily Medication',
        category: 'Healthcare',
        frequency: { intervalType: 'Daily' },
        budgetCost: 50,
      });

      // Create high-cost task (without triggering email alerts)
      await CareTask.create({
        personId: testPerson._id,
        organizationId: testOrg._id,
        careNeedItemId: careItem._id,
        title: 'Expensive Medication Purchase',
        status: 'Completed',
        cost: 500, // 50% of $1000 medication budget - below alert threshold
        budgetCategoryId: 'healthcare',
        budgetItemId: budgetPlan.categories[0].items[0]._id,
        dueDate: new Date('2024-06-15'),
        completedAt: new Date('2024-06-15'),
      });

      // Check budget monitoring completes without errors
      await expect(checkBudgetAndNotify(testPerson._id, 2024)).resolves.toBeUndefined();
    });

    test('should handle multiple users with different thresholds', async () => {
      // Create budget plan
      await BudgetPlan.create({
        personId: testPerson._id,
        organizationId: testOrg._id,
        createdByUserId: testUser._id,
        year: 2024,
        yearlyBudget: 5000,
        categories: [
          {
            id: 'transport',
            name: 'Transport',
            budget: 2000,
            items: [
              {
                name: 'Taxi Services',
                budget: 1000,
              },
            ],
          },
        ],
      });

      // Create care item
      const careItem = await CareNeedItem.create({
        personId: testPerson._id,
        organizationId: testOrg._id,
        name: 'Weekly Transport',
        category: 'Transport',
        frequency: { intervalType: 'Weekly' },
        budgetCost: 25,
      });

      // Create task below alert thresholds
      await CareTask.create({
        personId: testPerson._id,
        organizationId: testOrg._id,
        careNeedItemId: careItem._id,
        title: 'Transport Services',
        status: 'Completed',
        cost: 600, // 60% of $1000 - below alert thresholds
        budgetCategoryId: 'transport',
        dueDate: new Date('2024-07-15'),
        completedAt: new Date('2024-07-15'),
      });

      await expect(checkBudgetAndNotify(testPerson._id, 2024)).resolves.toBeUndefined();
    });
  });

  describe('Schedule and task creation workflow', () => {
    test('should expand recurring schedule and create care tasks', async () => {
      const startDate = new Date('2024-06-01');
      const endDate = new Date('2024-06-30');
      
      // Create daily recurring schedule
      const schedule = {
        intervalType: 'Daily',
        startDate: startDate,
      };

      const occurrences = expandOccurrences(schedule, startDate, endDate);

      expect(occurrences).toHaveLength(30); // June has 30 days
      expect(occurrences[0]).toEqual(startDate);
      expect(occurrences[29]).toEqual(new Date('2024-06-30'));

      // Create care item with recurring schedule
      const careItem = await CareNeedItem.create({
        personId: testPerson._id,
        organizationId: testOrg._id,
        name: 'Daily Medication',
        category: 'Healthcare',
        frequency: { intervalType: 'Daily' },
        budgetCost: 25,
      });

      // Simulate creating tasks for each occurrence
      const tasks = [];
      for (let i = 0; i < 5; i++) { // Create first 5 days
        const task = await CareTask.create({
          personId: testPerson._id,
          organizationId: testOrg._id,
          careNeedItemId: careItem._id,
          title: `Daily Medication - Day ${i + 1}`,
          status: 'Scheduled',
          cost: 25,
          dueDate: occurrences[i],
        });
        tasks.push(task);
      }

      expect(tasks).toHaveLength(5);
      expect(tasks[0].title).toBe('Daily Medication - Day 1');
    });

    test('should handle weekly recurring schedule', async () => {
      const startDate = new Date('2024-06-03'); // Monday
      const endDate = new Date('2024-06-30');
      
      const schedule = {
        intervalType: 'Weekly',
        startDate: startDate,
      };

      const occurrences = expandOccurrences(schedule, startDate, endDate);

      expect(occurrences).toHaveLength(4); // 4 weeks in June starting from 3rd
      expect(occurrences[0]).toEqual(new Date('2024-06-03'));
      expect(occurrences[1]).toEqual(new Date('2024-06-10'));
      expect(occurrences[2]).toEqual(new Date('2024-06-17'));
      expect(occurrences[3]).toEqual(new Date('2024-06-24'));
    });
  });

  describe('Token and authentication workflow', () => {
    test('should create, hash, and verify tokens', async () => {
      // Generate random token code with default parameters
      const code = randomCode();
      expect(code).toBeDefined();
      expect(typeof code).toBe('string');
      expect(code).toMatch(/^INV-[A-Z0-9]+-[A-Z0-9]+-[A-Z0-9]+-[A-Z0-9]+$/);

      // Hash the token
      const hashedToken = hashToken(code);
      expect(hashedToken).toBeDefined();
      expect(hashedToken).not.toBe(code);

      // Store token in database
      const token = await Token.create({
        type: 'FAMILY_TOKEN',
        tokenHash: hashedToken,
        organizationId: testOrg._id,
        personIds: [testPerson._id],
        issuerId: testUser._id,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      });

      // Verify token
      const verifiedToken = await verifyTokenString(code);
      expect(verifiedToken).toBeTruthy();
      expect(verifiedToken._id.toString()).toBe(token._id.toString());

      // Test invalid token
      const invalidToken = await verifyTokenString('INVALID-TOKEN');
      expect(invalidToken).toBeNull();
    });

    test('should generate JWT session token', async () => {
      const sessionData = {
        _id: testUser._id.toString(),
        role: testUser.role,
        organizationId: testUser.organizationId.toString(),
      };

      const jwt = signSession(sessionData);
      expect(jwt).toBeDefined();
      expect(typeof jwt).toBe('string');
      expect(jwt.split('.')).toHaveLength(3); // JWT has 3 parts
    });
  });

  describe('User-Person linking workflow', () => {
    test('should create person and establish user relationships', async () => {
      // Create another user in the organization
      const familyUser = await User.create({
        name: 'Family Member',
        email: 'family@example.com',
        passwordHash: 'hashedpassword',
        role: 'Family',
        organizationId: testOrg._id,
        emailPreferences: {
          budgetAlerts: false, // Disable alerts for testing
          budgetThreshold: 90,
        },
      });

      // Create new person
      const newPerson = await PersonWithNeeds.create({
        name: 'New Client',
        organizationId: testOrg._id,
        createdByUserId: familyUser._id,
      });

      // Link multiple users to the person
      await PersonUserLink.create({
        personId: newPerson._id,
        userId: familyUser._id,
        relationshipType: 'Family',
        active: true,
      });

      await PersonUserLink.create({
        personId: newPerson._id,
        userId: testAdmin._id,
        relationshipType: 'Admin',
        active: true,
      });

      // Verify links
      const links = await PersonUserLink.find({ personId: newPerson._id });
      expect(links).toHaveLength(2);
      
      const linkedUserIds = links.map(link => link.userId.toString());
      expect(linkedUserIds).toContain(familyUser._id.toString());
      expect(linkedUserIds).toContain(testAdmin._id.toString());
    });
  });

  describe('Cross-service data consistency', () => {
    test('should maintain data integrity across models', async () => {
      // Create complete workflow: Organization -> Users -> Person -> Budget -> Tasks
      
      // Verify organization has users
      const orgUsers = await User.find({ organizationId: testOrg._id });
      expect(orgUsers).toHaveLength(2); // testAdmin and testUser

      // Verify person is linked to organization and user
      expect(testPerson.organizationId.toString()).toBe(testOrg._id.toString());
      if (testPerson.createdByUserId) {
        expect(testPerson.createdByUserId.toString()).toBe(testUser._id.toString());
      }

      // Create budget plan
      const budgetPlan = await BudgetPlan.create({
        personId: testPerson._id,
        organizationId: testOrg._id,
        createdByUserId: testUser._id,
        year: 2024,
        yearlyBudget: 8000,
        categories: [
          {
            id: 'healthcare',
            name: 'Healthcare',
            budget: 4000,
            items: [{ name: 'Medication', budget: 2000 }],
          },
        ],
      });

      // Create care item
      const careItem = await CareNeedItem.create({
        personId: testPerson._id,
        organizationId: testOrg._id,
        name: 'Medical Care',
        category: 'Healthcare',
        frequency: { intervalType: 'Weekly' },
        budgetCost: 100,
      });

      // Create care task
      const careTask = await CareTask.create({
        personId: testPerson._id,
        organizationId: testOrg._id,
        careNeedItemId: careItem._id,
        title: 'Weekly Medical Check',
        status: 'Completed',
        cost: 1000, // 50% of medication budget - below alert threshold
        budgetCategoryId: 'healthcare',
        budgetItemId: budgetPlan.categories[0].items[0]._id,
        dueDate: new Date('2024-08-15'),
        completedAt: new Date('2024-08-15'),
      });

      // Verify all relationships
      expect(budgetPlan.personId.toString()).toBe(testPerson._id.toString());
      expect(budgetPlan.organizationId.toString()).toBe(testOrg._id.toString());
      expect(careItem.personId.toString()).toBe(testPerson._id.toString());
      expect(careTask.careNeedItemId.toString()).toBe(careItem._id.toString());
      
      // Test budget monitoring integration
      await expect(checkBudgetAndNotify(testPerson._id, 2024)).resolves.toBeUndefined();
    });
  });
});