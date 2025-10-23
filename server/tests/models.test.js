import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User from '../models/User.js';
import Organization from '../models/Organization.js';
import CareNeedItem from '../models/CareNeedItem.js';
import PersonWithNeeds from '../models/PersonWithNeeds.js';
import ShiftAllocation from '../models/ShiftAllocation.js';
import AccessRequest from '../models/AccessRequest.js';
import BudgetPlan from '../models/BudgetPlan.js';
import CareTask from '../models/CareTask.js';
import Comment from '../models/Comment.js';
import FileUpload from '../models/FileUpload.js';
import PersonUserLink from '../models/PersonUserLink.js';
import ReceiptBucket from '../models/ReceiptBucket.js';
import Token from '../models/Token.js';

let mongoServer;

// Setup in-memory MongoDB instance
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

// Clear all collections after each test
afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany();
  }
});

describe('User Model Tests', () => {
  test('should create a new user successfully', async () => {
    const validUser = {
      name: 'John Doe',
      email: 'john@example.com',
      passwordHash: 'hashedpassword123',
      role: 'Admin',
    };

    const user = new User(validUser);
    const savedUser = await user.save();

    expect(savedUser._id).toBeDefined();
    expect(savedUser.name).toBe(validUser.name);
    expect(savedUser.email).toBe(validUser.email);
    expect(savedUser.role).toBe(validUser.role);
    expect(savedUser.isActive).toBe(true);
  });

  test('should fail to create user without required fields', async () => {
    const userWithoutRequired = new User({
      name: 'John Doe',
    });

    let err;
    try {
      await userWithoutRequired.save();
    } catch (error) {
      err = error;
    }

    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors.email).toBeDefined();
    expect(err.errors.passwordHash).toBeDefined();
  });

  test('should enforce unique email constraint', async () => {
    const userData = {
      name: 'User One',
      email: 'unique@example.com',
      passwordHash: 'hash123',
      role: 'GeneralCareStaff',
    };

    const user1 = new User(userData);
    await user1.save();

    const user2 = new User({
      ...userData,
      name: 'User Two',
    });

    let err;
    try {
      await user2.save();
    } catch (error) {
      err = error;
    }

    expect(err).toBeDefined();
    expect(err.code).toBe(11000); // MongoDB duplicate key error code
  });

  test('should validate role enum values', async () => {
    const userWithInvalidRole = new User({
      name: 'Invalid User',
      email: 'invalid@example.com',
      passwordHash: 'hash123',
      role: 'InvalidRole',
    });

    let err;
    try {
      await userWithInvalidRole.save();
    } catch (error) {
      err = error;
    }

    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors.role).toBeDefined();
  });

  test('should handle emergency contacts properly', async () => {
    const userWithContacts = new User({
      name: 'Emergency User',
      email: 'emergency@example.com',
      passwordHash: 'hash123',
      role: 'Family',
      emergencyContacts: [
        { name: 'Contact One', phone: '123-456-7890' },
        { name: 'Contact Two', phone: '098-765-4321' },
      ],
    });

    const savedUser = await userWithContacts.save();
    expect(savedUser.emergencyContacts).toHaveLength(2);
    expect(savedUser.emergencyContacts[0].name).toBe('Contact One');
    expect(savedUser.emergencyContacts[1].phone).toBe('098-765-4321');
  });
});

describe('Organization Model Tests', () => {
  test('should create a new organization successfully', async () => {
    const validOrg = {
      name: 'Test Organization',
      address: '123 Main St',
    };

    const org = new Organization(validOrg);
    const savedOrg = await org.save();

    expect(savedOrg._id).toBeDefined();
    expect(savedOrg.name).toBe(validOrg.name);
    expect(savedOrg.address).toBe(validOrg.address);
    expect(savedOrg.active).toBe(true);
  });

  test('should have default shift settings', async () => {
    const org = new Organization({
      name: 'Default Shifts Org',
    });

    const savedOrg = await org.save();

    expect(savedOrg.shiftSettings.morning.startTime).toBe('07:00');
    expect(savedOrg.shiftSettings.morning.endTime).toBe('16:00');
    expect(savedOrg.shiftSettings.afternoon.startTime).toBe('15:30');
    expect(savedOrg.shiftSettings.evening.isOvernight).toBe(true);
  });

  test('should get shift times method works correctly', async () => {
    const org = new Organization({
      name: 'Shift Times Org',
    });

    const savedOrg = await org.save();
    const morningShift = savedOrg.getShiftTimes('morning');

    expect(morningShift).toBeDefined();
    expect(morningShift.startTime).toBe('07:00');
    expect(morningShift.endTime).toBe('16:00');
    expect(morningShift.enabled).toBe(true);
  });

  test('should allow custom shift settings', async () => {
    const org = new Organization({
      name: 'Custom Shifts Org',
      shiftSettings: {
        morning: {
          startTime: '08:00',
          endTime: '17:00',
          enabled: false,
        },
      },
    });

    const savedOrg = await org.save();
    expect(savedOrg.shiftSettings.morning.startTime).toBe('08:00');
    expect(savedOrg.shiftSettings.morning.enabled).toBe(false);
  });
});

describe('CareNeedItem Model Tests', () => {
  let testOrg;
  let testPerson;

  // Setup test data
  beforeEach(async () => {
    testOrg = await Organization.create({
      name: 'Test Org for Care Items',
    });

    testPerson = await PersonWithNeeds.create({
      name: 'Test Person',
      organizationId: testOrg._id,
    });
  });

  test('should create a care need item successfully', async () => {
    const careItem = new CareNeedItem({
      personId: testPerson._id,
      organizationId: testOrg._id,
      name: 'Daily Medication',
      category: 'Healthcare',
      frequency: {
        intervalType: 'Daily',
      },
    });

    const savedItem = await careItem.save();

    expect(savedItem._id).toBeDefined();
    expect(savedItem.name).toBe('Daily Medication');
    expect(savedItem.category).toBe('Healthcare');
    expect(savedItem.frequency.intervalType).toBe('Daily');
    expect(savedItem.status).toBe('Active');
  });

  test('should validate frequency enum values', async () => {
    const invalidItem = new CareNeedItem({
      personId: testPerson._id,
      organizationId: testOrg._id,
      name: 'Invalid Frequency Item',
      category: 'Test',
      frequency: {
        intervalType: 'InvalidFrequency',
      },
    });

    let err;
    try {
      await invalidItem.save();
    } catch (error) {
      err = error;
    }

    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors['frequency.intervalType']).toBeDefined();
  });
});

describe('ShiftAllocation Model Tests', () => {
  let testOrg;
  let testUser;
  let testPerson;

  // Create required entities for shift tests
  beforeEach(async () => {
    testOrg = await Organization.create({
      name: 'Test Org for Shifts',
    });

    testUser = await User.create({
      name: 'Test Staff',
      email: 'staff@example.com',
      passwordHash: 'hash123',
      role: 'GeneralCareStaff',
      organizationId: testOrg._id,
    });

    testPerson = await PersonWithNeeds.create({
      name: 'Test Client',
      organizationId: testOrg._id,
    });
  });

  test('should create a shift allocation successfully', async () => {
    const startTime = new Date('2024-01-15T07:00:00');
    const endTime = new Date('2024-01-15T16:00:00');
    
    const shift = new ShiftAllocation({
      organizationId: testOrg._id,
      staffUserId: testUser._id,
      personId: testPerson._id,
      shiftType: 'morning',
      start: startTime,
      end: endTime,
      notes: 'Morning shift test',
    });

    const savedShift = await shift.save();

    expect(savedShift._id).toBeDefined();
    expect(savedShift.shiftType).toBe('morning');
    expect(savedShift.start).toEqual(startTime);
    expect(savedShift.end).toEqual(endTime);
    expect(savedShift.getDurationHours()).toBe(9); // Verify duration calculation
  });

  test('should validate shift type enum', async () => {
    const invalidShift = new ShiftAllocation({
      organizationId: testOrg._id,
      staffUserId: testUser._id,
      personId: testPerson._id,
      shiftType: 'invalid_shift',
      start: new Date(),
      end: new Date(),
    });

    let err;
    try {
      await invalidShift.save();
    } catch (error) {
      err = error;
    }

    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors.shiftType).toBeDefined();
  });
});

describe('PersonWithNeeds Model Tests', () => {
  let testOrg;

  beforeEach(async () => {
    testOrg = await Organization.create({
      name: 'Test Org for Person',
    });
  });

  test('should create a person with needs successfully', async () => {
    const person = new PersonWithNeeds({
      name: 'Jane Smith',
      organizationId: testOrg._id,
      dateOfBirth: new Date('1950-05-15'),
      mobilePhone: '0412345678',
      sex: 'Female',
      address: {
        street: '123 Main St',
        suburb: 'Sydney',
        state: 'NSW',
        postcode: '2000',
      },
    });

    const savedPerson = await person.save();

    expect(savedPerson._id).toBeDefined();
    expect(savedPerson.name).toBe('Jane Smith');
    expect(savedPerson.address.state).toBe('NSW');
    expect(savedPerson.address.postcode).toBe('2000');
  });

  test('should validate postcode format', async () => {
    const invalidPerson = new PersonWithNeeds({
      name: 'Invalid Postcode',
      address: {
        postcode: '12345', // Should be 4 digits
      },
    });

    let err;
    try {
      await invalidPerson.save();
    } catch (error) {
      err = error;
    }

    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors['address.postcode']).toBeDefined();
  });
});

describe('AccessRequest Model Tests', () => {
  let testOrg, testUser, testToken, testPerson;

  beforeEach(async () => {
    testOrg = await Organization.create({
      name: 'Test Org for Access',
    });

    testUser = await User.create({
      name: 'Requester',
      email: 'requester@example.com',
      passwordHash: 'hash123',
      role: 'Family',
      organizationId: testOrg._id,
    });

    testPerson = await PersonWithNeeds.create({
      name: 'Test Person',
      organizationId: testOrg._id,
    });

    testToken = await Token.create({
      type: 'FAMILY_TOKEN',
      tokenHash: 'hash_unique_' + Date.now(),
      organizationId: testOrg._id,
      personIds: [testPerson._id],
      issuerId: testUser._id,
      expiresAt: new Date(Date.now() + 86400000),
    });
  });

  test('should create access request successfully', async () => {
    const request = new AccessRequest({
      requesterId: testUser._id,
      requesterEmail: testUser.email,
      requesterRole: 'Family',
      tokenId: testToken._id,
      tokenType: 'FAMILY_TOKEN',
      organizationId: testOrg._id,
      personIds: [testPerson._id],
      issuerId: testUser._id,
      message: 'Please approve',
    });

    const savedRequest = await request.save();

    expect(savedRequest._id).toBeDefined();
    expect(savedRequest.status).toBe('Pending');
    expect(savedRequest.tokenType).toBe('FAMILY_TOKEN');
  });

  test('should validate status enum', async () => {
    const invalidRequest = new AccessRequest({
      requesterId: testUser._id,
      requesterRole: 'Family',
      tokenId: testToken._id,
      tokenType: 'FAMILY_TOKEN',
      personIds: [testPerson._id],
      issuerId: testUser._id,
      status: 'InvalidStatus',
    });

    let err;
    try {
      await invalidRequest.save();
    } catch (error) {
      err = error;
    }

    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors.status).toBeDefined();
  });
});

describe('BudgetPlan Model Tests', () => {
  let testOrg, testUser, testPerson;

  beforeEach(async () => {
    testOrg = await Organization.create({
      name: 'Test Org for Budget',
    });

    testUser = await User.create({
      name: 'Budget Creator',
      email: 'budget@example.com',
      passwordHash: 'hash123',
      role: 'Admin',
      organizationId: testOrg._id,
    });

    testPerson = await PersonWithNeeds.create({
      name: 'Budget Person',
      organizationId: testOrg._id,
    });
  });

  test('should create budget plan successfully', async () => {
    const budgetPlan = new BudgetPlan({
      personId: testPerson._id,
      organizationId: testOrg._id,
      createdByUserId: testUser._id,
      year: 2024,
      yearlyBudget: 50000.50,
      categories: [
        {
          id: 'healthcare',
          name: 'Healthcare',
          budget: 20000,
          emoji: '🏥',
          items: [
            {
              name: 'Medication',
              budget: 5000,
            },
          ],
        },
      ],
    });

    const savedPlan = await budgetPlan.save();

    expect(savedPlan._id).toBeDefined();
    expect(savedPlan.yearlyBudget).toBe(50000.50);
    expect(savedPlan.categories).toHaveLength(1);
    expect(savedPlan.categories[0].items).toHaveLength(1);
    expect(savedPlan.status).toBe('Draft');
  });

  test('should enforce unique constraint per person per year', async () => {
    await BudgetPlan.create({
      personId: testPerson._id,
      organizationId: testOrg._id,
      createdByUserId: testUser._id,
      year: 2024,
      yearlyBudget: 10000,
    });

    const duplicate = new BudgetPlan({
      personId: testPerson._id,
      organizationId: testOrg._id,
      createdByUserId: testUser._id,
      year: 2024,
      yearlyBudget: 20000,
    });

    let err;
    try {
      await duplicate.save();
    } catch (error) {
      err = error;
    }

    expect(err).toBeDefined();
    expect(err.code).toBe(11000); // Duplicate key error
  });
});

describe('CareTask Model Tests', () => {
  let testOrg, testPerson, testCareItem, testUser;

  beforeEach(async () => {
    testOrg = await Organization.create({
      name: 'Test Org for Tasks',
    });

    testPerson = await PersonWithNeeds.create({
      name: 'Task Person',
      organizationId: testOrg._id,
    });

    testUser = await User.create({
      name: 'Task Staff',
      email: 'taskstaff@example.com',
      passwordHash: 'hash123',
      role: 'GeneralCareStaff',
      organizationId: testOrg._id,
    });

    testCareItem = await CareNeedItem.create({
      personId: testPerson._id,
      organizationId: testOrg._id,
      name: 'Daily Task Item',
      category: 'Healthcare',
      frequency: {
        intervalType: 'Daily',
      },
    });
  });

  test('should create care task successfully', async () => {
    const task = new CareTask({
      personId: testPerson._id,
      organizationId: testOrg._id,
      careNeedItemId: testCareItem._id,
      title: 'Morning Medication',
      dueDate: new Date('2024-01-15'),
      scheduleType: 'Timed',
      startAt: new Date('2024-01-15T08:00:00'),
      endAt: new Date('2024-01-15T08:30:00'),
      assignedToUserId: testUser._id,
      expectedCost: 25.75,
    });

    const savedTask = await task.save();

    expect(savedTask._id).toBeDefined();
    expect(savedTask.title).toBe('Morning Medication');
    expect(savedTask.status).toBe('Scheduled');
    expect(savedTask.expectedCost).toBe(25.75);
  });

  test('should validate status enum', async () => {
    const invalidTask = new CareTask({
      personId: testPerson._id,
      title: 'Invalid Status Task',
      status: 'InvalidStatus',
    });

    let err;
    try {
      await invalidTask.save();
    } catch (error) {
      err = error;
    }

    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors.status).toBeDefined();
  });
});

describe('Comment Model Tests', () => {
  let testUser, testCareItem, testCareTask, testPerson, testOrg;

  beforeEach(async () => {
    testOrg = await Organization.create({
      name: 'Test Org for Comments',
    });

    testUser = await User.create({
      name: 'Commenter',
      email: 'commenter@example.com',
      passwordHash: 'hash123',
      role: 'GeneralCareStaff',
      organizationId: testOrg._id,
    });

    testPerson = await PersonWithNeeds.create({
      name: 'Comment Person',
      organizationId: testOrg._id,
    });

    testCareItem = await CareNeedItem.create({
      personId: testPerson._id,
      organizationId: testOrg._id,
      name: 'Item for Comments',
      category: 'General',
      frequency: {
        intervalType: 'Daily',
      },
    });

    testCareTask = await CareTask.create({
      personId: testPerson._id,
      organizationId: testOrg._id,
      careNeedItemId: testCareItem._id,
      title: 'Task for Comments',
    });
  });

  test('should create comment for care task', async () => {
    const comment = new Comment({
      careTaskId: testCareTask._id,
      authorUserId: testUser._id,
      text: 'Task completed successfully',
    });

    const savedComment = await comment.save();

    expect(savedComment._id).toBeDefined();
    expect(savedComment.text).toBe('Task completed successfully');
    expect(savedComment.edited).toBe(false);
  });

  test('should create comment for care need item', async () => {
    const comment = new Comment({
      careNeedItemId: testCareItem._id,
      authorUserId: testUser._id,
      text: 'Item needs updating',
    });

    const savedComment = await comment.save();

    expect(savedComment._id).toBeDefined();
    expect(savedComment.careNeedItemId).toEqual(testCareItem._id);
  });

  test('should require at least one scope reference', async () => {
    const invalidComment = new Comment({
      authorUserId: testUser._id,
      text: 'Orphaned comment',
    });

    let err;
    try {
      await invalidComment.save();
    } catch (error) {
      err = error;
    }

    expect(err).toBeDefined();
    expect(err.message).toContain('Comment must reference either a task or a care need item');
  });
});

describe('FileUpload Model Tests', () => {
  let testUser, testCareTask, testBucket, testPerson, testOrg;

  beforeEach(async () => {
    testOrg = await Organization.create({
      name: 'Test Org for Files',
    });

    testUser = await User.create({
      name: 'Uploader',
      email: 'uploader@example.com',
      passwordHash: 'hash123',
      role: 'Admin',
      organizationId: testOrg._id,
    });

    testPerson = await PersonWithNeeds.create({
      name: 'File Person',
      organizationId: testOrg._id,
    });

    testCareTask = await CareTask.create({
      personId: testPerson._id,
      organizationId: testOrg._id,
      title: 'Task for Files',
    });

    testBucket = await ReceiptBucket.create({
      personId: testPerson._id,
      year: 2024,
      month: 1,
      title: 'January 2024 Receipts',
    });
  });

  test('should create file upload for care task', async () => {
    const file = new FileUpload({
      scope: 'CareTask',
      targetId: testCareTask._id,
      uploadedByUserId: testUser._id,
      filename: 'receipt.pdf',
      fileType: 'application/pdf',
      urlOrPath: '/uploads/receipt.pdf',
      size: 1024,
      description: 'Medical receipt',
    });

    const savedFile = await file.save();

    expect(savedFile._id).toBeDefined();
    expect(savedFile.scope).toBe('CareTask');
    expect(savedFile.filename).toBe('receipt.pdf');
    expect(savedFile.size).toBe(1024);
  });

  test('should create shared file with bucket', async () => {
    const file = new FileUpload({
      scope: 'Shared',
      targetId: testBucket._id,
      bucketId: testBucket._id,
      uploadedByUserId: testUser._id,
      filename: 'shared-receipt.jpg',
      fileType: 'image/jpeg',
      urlOrPath: '/uploads/shared-receipt.jpg',
      effectiveDate: new Date('2024-01-15'),
    });

    const savedFile = await file.save();

    expect(savedFile._id).toBeDefined();
    expect(savedFile.scope).toBe('Shared');
    expect(savedFile.bucketId).toEqual(testBucket._id);
  });

  test('should validate scope enum', async () => {
    const invalidFile = new FileUpload({
      scope: 'InvalidScope',
      targetId: testCareTask._id,
      uploadedByUserId: testUser._id,
      filename: 'test.pdf',
      urlOrPath: '/uploads/test.pdf',
    });

    let err;
    try {
      await invalidFile.save();
    } catch (error) {
      err = error;
    }

    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors.scope).toBeDefined();
  });
});

describe('PersonUserLink Model Tests', () => {
  let testOrg, testUser, testPerson;

  beforeEach(async () => {
    testOrg = await Organization.create({
      name: 'Test Org for Links',
    });

    testUser = await User.create({
      name: 'Link User',
      email: 'linkuser@example.com',
      passwordHash: 'hash123',
      role: 'GeneralCareStaff',
      organizationId: testOrg._id,
    });

    testPerson = await PersonWithNeeds.create({
      name: 'Link Person',
      organizationId: testOrg._id,
    });
  });

  test('should create person-user link successfully', async () => {
    const link = new PersonUserLink({
      personId: testPerson._id,
      userId: testUser._id,
      relationshipType: 'GeneralCareStaff',
      active: true,
      startAt: new Date('2024-01-01'),
      notes: 'Primary caregiver',
    });

    const savedLink = await link.save();

    expect(savedLink._id).toBeDefined();
    expect(savedLink.relationshipType).toBe('GeneralCareStaff');
    expect(savedLink.active).toBe(true);
    expect(savedLink.notes).toBe('Primary caregiver');
  });

  test('should enforce unique person-user combination', async () => {
    await PersonUserLink.create({
      personId: testPerson._id,
      userId: testUser._id,
      relationshipType: 'GeneralCareStaff',
    });

    const duplicate = new PersonUserLink({
      personId: testPerson._id,
      userId: testUser._id,
      relationshipType: 'Family', // Different type but same person-user
    });

    let err;
    try {
      await duplicate.save();
    } catch (error) {
      err = error;
    }

    expect(err).toBeDefined();
    expect(err.code).toBe(11000); // Duplicate key error
  });
});

describe('ReceiptBucket Model Tests', () => {
  let testPerson, testOrg;

  beforeEach(async () => {
    testOrg = await Organization.create({
      name: 'Test Org for Buckets',
    });

    testPerson = await PersonWithNeeds.create({
      name: 'Bucket Person',
      organizationId: testOrg._id,
    });
  });

  test('should create receipt bucket successfully', async () => {
    const bucket = new ReceiptBucket({
      personId: testPerson._id,
      year: 2024,
      month: 7,
      title: 'July 2024 Receipts',
      notes: 'Medical and pharmacy receipts',
    });

    const savedBucket = await bucket.save();

    expect(savedBucket._id).toBeDefined();
    expect(savedBucket.year).toBe(2024);
    expect(savedBucket.month).toBe(7);
    expect(savedBucket.title).toBe('July 2024 Receipts');
  });

  test('should validate month range', async () => {
    const invalidBucket = new ReceiptBucket({
      personId: testPerson._id,
      year: 2024,
      month: 13, // Invalid month
    });

    let err;
    try {
      await invalidBucket.save();
    } catch (error) {
      err = error;
    }

    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors.month).toBeDefined();
  });

  test('should enforce unique person-year-month combination', async () => {
    await ReceiptBucket.create({
      personId: testPerson._id,
      year: 2024,
      month: 3,
    });

    const duplicate = new ReceiptBucket({
      personId: testPerson._id,
      year: 2024,
      month: 3,
    });

    let err;
    try {
      await duplicate.save();
    } catch (error) {
      err = error;
    }

    expect(err).toBeDefined();
    expect(err.code).toBe(11000); // Duplicate key error
  });
});

describe('Token Model Tests', () => {
  let testOrg, testUser, testPerson;

  beforeEach(async () => {
    testOrg = await Organization.create({
      name: 'Test Org for Tokens',
    });

    testUser = await User.create({
      name: 'Token Issuer',
      email: 'issuer@example.com',
      passwordHash: 'hash123',
      role: 'Admin',
      organizationId: testOrg._id,
    });

    testPerson = await PersonWithNeeds.create({
      name: 'Token Person',
      organizationId: testOrg._id,
    });
  });

  test('should create token successfully', async () => {
    const token = new Token({
      type: 'FAMILY_TOKEN',
      tokenHash: 'unique_hash_' + Date.now(),
      organizationId: testOrg._id,
      personIds: [testPerson._id],
      issuerId: testUser._id,
      note: 'Family access token',
      expiresAt: new Date(Date.now() + 86400000), // 1 day from now
      maxUses: 5,
    });

    const savedToken = await token.save();

    expect(savedToken._id).toBeDefined();
    expect(savedToken.type).toBe('FAMILY_TOKEN');
    expect(savedToken.maxUses).toBe(5);
    expect(savedToken.uses).toBe(0);
    expect(savedToken.revoked).toBe(false);
  });

  test('should validate token type enum', async () => {
    const invalidToken = new Token({
      type: 'INVALID_TOKEN',
      tokenHash: 'hash_' + Date.now(),
      expiresAt: new Date(Date.now() + 86400000),
    });

    let err;
    try {
      await invalidToken.save();
    } catch (error) {
      err = error;
    }

    expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
    expect(err.errors.type).toBeDefined();
  });

  test('should enforce unique token hash', async () => {
    const hash = 'duplicate_hash_' + Date.now();
    
    await Token.create({
      type: 'MANAGER_TOKEN',
      tokenHash: hash,
      organizationId: testOrg._id,
      expiresAt: new Date(Date.now() + 86400000),
    });

    const duplicate = new Token({
      type: 'STAFF_TOKEN',
      tokenHash: hash, // Same hash
      organizationId: testOrg._id,
      expiresAt: new Date(Date.now() + 86400000),
    });

    let err;
    try {
      await duplicate.save();
    } catch (error) {
      err = error;
    }

    expect(err).toBeDefined();
    expect(err.code).toBe(11000); // Duplicate key error
  });
});