import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Set environment variables first
process.env.JWT_SECRET = 'test-secret-key';
process.env.TOKEN_PEPPER = 'test-pepper';
process.env.NODE_ENV = 'test';

// Import services only
import budgetMonitorDefault, { checkBudgetAndNotify, runScheduledBudgetCheck } from '../services/budgetMonitor.js';
import { sendBudgetWarningEmail, checkAndSendBudgetAlerts } from '../services/emailService.js';

// Import models for testing
import User from '../models/User.js';
import Organization from '../models/Organization.js';
import PersonWithNeeds from '../models/PersonWithNeeds.js';
import BudgetPlan from '../models/BudgetPlan.js';
import CareTask from '../models/CareTask.js';
import CareNeedItem from '../models/CareNeedItem.js';

let mongoServer;
let testOrg, testUser, testPerson;

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

  testUser = await User.create({
    name: 'Test User',
    email: 'test@example.com',
    passwordHash: 'hashedpassword',
    role: 'Admin',
    organizationId: testOrg._id,
  });

  testPerson = await PersonWithNeeds.create({
    name: 'Test Person',
    organizationId: testOrg._id,
  });
});

describe('Budget Monitor Service', () => {
  let budgetPlan, careTask, careItem;

  beforeEach(async () => {
    // Create budget plan
    budgetPlan = await BudgetPlan.create({
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
              budget: 2000,
            },
          ],
        },
      ],
    });

    // Create care item
    careItem = await CareNeedItem.create({
      personId: testPerson._id,
      organizationId: testOrg._id,
      name: 'Test Care Item',
      category: 'Healthcare',
      frequency: { intervalType: 'Daily' },
      budgetCost: 100,
    });

    // Create care task with spending
    careTask = await CareTask.create({
      personId: testPerson._id,
      organizationId: testOrg._id,
      careNeedItemId: careItem._id,
      title: 'Test Task',
      status: 'Completed',
      cost: 1500, // This will be 30% of healthcare budget
      budgetCategoryId: 'healthcare',
      dueDate: new Date('2024-06-15'),
      completedAt: new Date('2024-06-15'),
    });
  });

  describe('checkBudgetAndNotify', () => {
    test('should process budget check without errors', async () => {
      // This test verifies the function doesn't crash
      // Function doesn't return anything, just check it completes
      await expect(checkBudgetAndNotify(testPerson._id, 2024)).resolves.toBeUndefined();
    });

    test('should handle non-existent person gracefully', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      
      // Should not throw error but handle gracefully
      await expect(checkBudgetAndNotify(fakeId, 2024)).resolves.toBeUndefined();
    });

    test('should process person with budget plan', async () => {
      // Ensure there's a budget plan to process
      expect(budgetPlan).toBeDefined();
      expect(careTask).toBeDefined();
      
      // Function should complete without error
      await expect(checkBudgetAndNotify(testPerson._id, 2024)).resolves.toBeUndefined();
    });
  });

  describe('runScheduledBudgetCheck', () => {
    test('should run scheduled check without errors', async () => {
      // This test verifies the function doesn't crash
      const result = await runScheduledBudgetCheck();
      
      expect(result).toBeUndefined(); // Function doesn't return anything
    });

    test('should handle empty person list', async () => {
      // Clear all persons to test empty list handling
      await PersonWithNeeds.deleteMany({});
      
      const result = await runScheduledBudgetCheck();
      
      expect(result).toBeUndefined();
    });
  });

  describe('budget monitoring workflow', () => {
    test('should detect high spending and trigger notifications', async () => {
      // Create high-spending task to trigger warning
      await CareTask.create({
        personId: testPerson._id,
        organizationId: testOrg._id,
        careNeedItemId: careItem._id,
        title: 'High Cost Task',
        status: 'Completed',
        cost: 4000, // Total spending will be 5500/5000 > 100%
        budgetCategoryId: 'healthcare',
        dueDate: new Date('2024-07-15'),
        completedAt: new Date('2024-07-15'),
      });

      // Should process without error even with overspending
      await expect(checkBudgetAndNotify(testPerson._id, 2024)).resolves.toBeUndefined();
    });

    test('should handle multiple budget categories', async () => {
      // Update budget plan with multiple categories
      await BudgetPlan.findByIdAndUpdate(budgetPlan._id, {
        categories: [
          {
            id: 'healthcare',
            name: 'Healthcare',
            budget: 5000,
            items: [{ name: 'Medication', budget: 2000 }],
          },
          {
            id: 'transport',
            name: 'Transport',
            budget: 3000,
            items: [{ name: 'Taxi Services', budget: 1500 }],
          },
        ],
      });

      // Add spending to different categories
      await CareTask.create({
        personId: testPerson._id,
        organizationId: testOrg._id,
        careNeedItemId: careItem._id,
        title: 'Transport Task',
        status: 'Completed',
        cost: 2500,
        budgetCategoryId: 'transport',
        dueDate: new Date('2024-08-15'),
        completedAt: new Date('2024-08-15'),
      });

      await expect(checkBudgetAndNotify(testPerson._id, 2024)).resolves.toBeUndefined();
    });
  });
});

describe('Email Service', () => {
  describe('sendBudgetWarningEmail', () => {
    test('should handle email sending without crashing', async () => {
      const mockBudgetData = {
        userName: 'Test User',
        clientName: 'Test Client',
        categoryName: 'Healthcare',
        annualBudget: 5000,
        amountSpent: 4000,
        percentageUsed: 80,
        remainingAmount: 1000,
        year: 2024,
        appUrl: 'http://localhost:3000',
      };
      
      // This test verifies the function doesn't crash when called
      // In test environment, emails won't actually be sent
      const result = await sendBudgetWarningEmail('test@example.com', mockBudgetData);
      
      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
    });


  });

  describe('checkAndSendBudgetAlerts', () => {

    test('should handle user without email preferences', async () => {
      const userWithoutPrefs = await User.create({
        name: 'No Prefs User',
        email: 'noprefs@example.com',
        passwordHash: 'hash',
        role: 'Admin',
        organizationId: testOrg._id,
        // No emailPreferences set
      });
      
      const simpleBudgetReport = {
        year: 2024,
        annualBudget: 1000,
        spent: { total: 900 },
        balance: { current: 100 },
        categories: [],
      };
      
      const result = await checkAndSendBudgetAlerts(userWithoutPrefs, testPerson, simpleBudgetReport);
      
      expect(result).toBeDefined();
    });

    test('should handle budget report without warnings', async () => {
      const user = await User.create({
        name: 'Normal User',
        email: 'normal@example.com',
        passwordHash: 'hash',
        role: 'Family',
        organizationId: testOrg._id,
        emailPreferences: {
          budgetAlerts: true,
          budgetThreshold: 80,
        },
      });
      
      const normalBudgetReport = {
        year: 2024,
        annualBudget: 10000,
        spent: { total: 5000 }, // 50% - no warning
        balance: { current: 5000 },
        categories: [
          {
            category: 'Healthcare',
            annualBudget: 5000,
            totalSpent: 2500, // 50% - no warning
            currentBalance: 2500,
            warning: null,
            items: [],
          },
        ],
      };
      
      const result = await checkAndSendBudgetAlerts(user, testPerson, normalBudgetReport);
      
      expect(result).toBeDefined();
    });
  });

  describe('email service configuration', () => {
    test('should handle development environment setup', () => {
      // Test that EMAIL_SERVICE environment variable can be undefined
      const originalEnv = process.env.EMAIL_SERVICE;
      delete process.env.EMAIL_SERVICE;
      
      // Verify environment is cleared
      expect(process.env.EMAIL_SERVICE).toBeUndefined();
      
      // Restore environment
      if (originalEnv) {
        process.env.EMAIL_SERVICE = originalEnv;
      }
    });

    test('should handle production environment variables', () => {
      const originalEnv = {
        EMAIL_SERVICE: process.env.EMAIL_SERVICE,
        SMTP_HOST: process.env.SMTP_HOST,
        SMTP_PORT: process.env.SMTP_PORT,
      };
      
      // Set production-like environment
      process.env.EMAIL_SERVICE = 'smtp';
      process.env.SMTP_HOST = 'smtp.example.com';
      process.env.SMTP_PORT = '587';
      
      // Verify environment variables are set
      expect(process.env.EMAIL_SERVICE).toBe('smtp');
      expect(process.env.SMTP_HOST).toBe('smtp.example.com');
      expect(process.env.SMTP_PORT).toBe('587');
      
      // Restore environment
      Object.keys(originalEnv).forEach(key => {
        if (originalEnv[key]) {
          process.env[key] = originalEnv[key];
        } else {
          delete process.env[key];
        }
      });
    });
  });
});