import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Set environment variables first
process.env.JWT_SECRET = 'test-secret-key';
process.env.TOKEN_PEPPER = 'test-pepper';
process.env.NODE_ENV = 'test';

// Import utility functions
import * as scheduleUtils from '../utils/schedule.js';
import * as tokenUtils from '../utils/token.js';
import * as jwtUtils from '../utils/jwt.js';
import { configureCloudinary } from '../utils/cloudinary.js';

// Import models for testing
import User from '../models/User.js';
import Organization from '../models/Organization.js';
import PersonWithNeeds from '../models/PersonWithNeeds.js';
import Token from '../models/Token.js';

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

describe('Schedule Utils', () => {
  describe('expandOccurrences', () => {
    test('should handle OneTime occurrences', () => {
      const params = {
        intervalType: 'OneTime',
        intervalValue: 1,
        startDate: new Date('2024-01-15'),
        endDate: null,
        occurrenceCount: null,
      };
      
      const windowStart = new Date('2024-01-01');
      const windowEnd = new Date('2024-01-31');
      
      const results = scheduleUtils.expandOccurrences(params, windowStart, windowEnd);
      
      expect(results).toHaveLength(1);
      expect(results[0]).toEqual(new Date('2024-01-15'));
    });

    test('should handle Daily occurrences', () => {
      const params = {
        intervalType: 'Daily',
        intervalValue: 2, // Every 2 days
        startDate: new Date('2024-01-01'),
        endDate: null,
        occurrenceCount: 5,
      };
      
      const windowStart = new Date('2024-01-01');
      const windowEnd = new Date('2024-01-15');
      
      const results = scheduleUtils.expandOccurrences(params, windowStart, windowEnd);
      
      expect(results).toHaveLength(5);
      expect(results[0]).toEqual(new Date('2024-01-01'));
      expect(results[1]).toEqual(new Date('2024-01-03'));
      expect(results[2]).toEqual(new Date('2024-01-05'));
      expect(results[3]).toEqual(new Date('2024-01-07'));
      expect(results[4]).toEqual(new Date('2024-01-09'));
    });

    test('should handle Weekly occurrences', () => {
      const params = {
        intervalType: 'Weekly',
        intervalValue: 1,
        startDate: new Date('2024-01-01'), // Monday
        endDate: new Date('2024-01-21'),
        occurrenceCount: null,
      };
      
      const windowStart = new Date('2024-01-01');
      const windowEnd = new Date('2024-01-31');
      
      const results = scheduleUtils.expandOccurrences(params, windowStart, windowEnd);
      
      expect(results).toHaveLength(3);
      expect(results[0]).toEqual(new Date('2024-01-01'));
      expect(results[1]).toEqual(new Date('2024-01-08'));
      expect(results[2]).toEqual(new Date('2024-01-15'));
    });

    test('should handle Monthly occurrences', () => {
      const params = {
        intervalType: 'Monthly',
        intervalValue: 1,
        startDate: new Date('2024-01-15'),
        endDate: null,
        occurrenceCount: 3,
      };
      
      const windowStart = new Date('2024-01-01');
      const windowEnd = new Date('2024-12-31');
      
      const results = scheduleUtils.expandOccurrences(params, windowStart, windowEnd);
      
      expect(results).toHaveLength(3);
      expect(results[0]).toEqual(new Date('2024-01-15'));
      expect(results[1]).toEqual(new Date('2024-02-15'));
      expect(results[2]).toEqual(new Date('2024-03-15'));
    });

    test('should handle Yearly occurrences', () => {
      const params = {
        intervalType: 'Yearly',
        intervalValue: 1,
        startDate: new Date('2024-06-15'),
        endDate: null,
        occurrenceCount: 2,
      };
      
      const windowStart = new Date('2024-01-01');
      const windowEnd = new Date('2026-12-31');
      
      const results = scheduleUtils.expandOccurrences(params, windowStart, windowEnd);
      
      expect(results).toHaveLength(2);
      expect(results[0]).toEqual(new Date('2024-06-15'));
      expect(results[1]).toEqual(new Date('2025-06-15'));
    });

    test('should return empty array for JustPurchase', () => {
      const params = {
        intervalType: 'JustPurchase',
        intervalValue: 1,
        startDate: new Date('2024-01-15'),
        endDate: null,
        occurrenceCount: null,
      };
      
      const results = scheduleUtils.expandOccurrences(params, null, null);
      
      expect(results).toHaveLength(0);
    });

    test('should handle window filtering', () => {
      const params = {
        intervalType: 'Daily',
        intervalValue: 1,
        startDate: new Date('2024-01-01'),
        endDate: null,
        occurrenceCount: 10,
      };
      
      const windowStart = new Date('2024-01-05');
      const windowEnd = new Date('2024-01-07');
      
      const results = scheduleUtils.expandOccurrences(params, windowStart, windowEnd);
      
      expect(results).toHaveLength(3);
      expect(results[0]).toEqual(new Date('2024-01-05'));
      expect(results[1]).toEqual(new Date('2024-01-06'));
      expect(results[2]).toEqual(new Date('2024-01-07'));
    });

    test('should handle invalid interval types', () => {
      const params = {
        intervalType: 'InvalidType',
        intervalValue: 1,
        startDate: new Date('2024-01-01'),
        endDate: null,
        occurrenceCount: 5,
      };
      
      const results = scheduleUtils.expandOccurrences(params, null, null);
      
      expect(results).toHaveLength(0);
    });

    test('should handle missing startDate', () => {
      const params = {
        intervalType: 'Daily',
        intervalValue: 1,
        startDate: null,
        endDate: null,
        occurrenceCount: 5,
      };
      
      const results = scheduleUtils.expandOccurrences(params, null, null);
      
      expect(results).toHaveLength(0);
    });

    test('should respect occurrence count limit', () => {
      const params = {
        intervalType: 'Daily',
        intervalValue: 1,
        startDate: new Date('2024-01-01'),
        endDate: null,
        occurrenceCount: 3,
      };
      
      const windowStart = new Date('2024-01-01');
      const windowEnd = new Date('2024-01-31'); // Large window
      
      const results = scheduleUtils.expandOccurrences(params, windowStart, windowEnd);
      
      expect(results).toHaveLength(3); // Limited by occurrenceCount
    });

    test('should respect end date', () => {
      const params = {
        intervalType: 'Daily',
        intervalValue: 1,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-05'),
        occurrenceCount: null,
      };
      
      const windowStart = new Date('2024-01-01');
      const windowEnd = new Date('2024-01-31');
      
      const results = scheduleUtils.expandOccurrences(params, windowStart, windowEnd);
      
      expect(results).toHaveLength(5); // Jan 1-5
      expect(results[4]).toEqual(new Date('2024-01-05'));
    });

    test('should handle bi-weekly intervals', () => {
      const params = {
        intervalType: 'Weekly',
        intervalValue: 2, // Every 2 weeks
        startDate: new Date('2024-01-01'),
        endDate: null,
        occurrenceCount: 4,
      };
      
      const results = scheduleUtils.expandOccurrences(params, null, null);
      
      expect(results).toHaveLength(4);
      expect(results[0]).toEqual(new Date('2024-01-01'));
      expect(results[1]).toEqual(new Date('2024-01-15')); // 2 weeks later
      expect(results[2]).toEqual(new Date('2024-01-29')); // 4 weeks later
    });

    test('should prevent infinite loops with safety cap', () => {
      const params = {
        intervalType: 'Daily',
        intervalValue: 1,
        startDate: new Date('2024-01-01'),
        endDate: null,
        occurrenceCount: null, // No limit
      };
      
      // Very large window that could cause infinite loop
      const windowStart = new Date('2024-01-01');
      const windowEnd = new Date('2030-01-01');
      
      const results = scheduleUtils.expandOccurrences(params, windowStart, windowEnd);
      
      // Should be capped at 10000 to prevent infinite loop
      expect(results.length).toBeLessThanOrEqual(10000);
    });
  });
});

describe('Token Utils', () => {
  describe('randomCode', () => {
    test('should generate code with default parameters', () => {
      const code = tokenUtils.randomCode();
      
      expect(code).toMatch(/^INV-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    });

    test('should generate code with custom parameters', () => {
      const code = tokenUtils.randomCode('FAM', 2, 3);
      
      expect(code).toMatch(/^FAM-[A-Z2-9]{3}-[A-Z2-9]{3}$/);
    });

    test('should not include ambiguous characters', () => {
      // Generate many codes to increase chance of catching ambiguous characters
      for (let i = 0; i < 100; i++) {
        const code = tokenUtils.randomCode('TEST', 10, 10);
        expect(code).not.toMatch(/[OI01]/);
      }
    });

    test('should generate unique codes', () => {
      const codes = new Set();
      
      // Generate 1000 codes and check they're all unique
      for (let i = 0; i < 1000; i++) {
        const code = tokenUtils.randomCode();
        expect(codes.has(code)).toBe(false);
        codes.add(code);
      }
      
      expect(codes.size).toBe(1000);
    });

    test('should handle edge cases', () => {
      // Test with minimal parameters
      const code1 = tokenUtils.randomCode('A', 1, 1);
      expect(code1).toMatch(/^A-[A-Z2-9]$/);
      
      // Test with empty prefix
      const code2 = tokenUtils.randomCode('', 2, 2);
      expect(code2).toMatch(/^-[A-Z2-9]{2}-[A-Z2-9]{2}$/);
    });
  });

  describe('hashToken', () => {
    test('should hash token consistently', () => {
      const plainToken = 'TEST-TOKEN-123';
      const hash1 = tokenUtils.hashToken(plainToken);
      const hash2 = tokenUtils.hashToken(plainToken);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA256 hex string length
    });

    test('should produce different hashes for different tokens', () => {
      const hash1 = tokenUtils.hashToken('TOKEN-1');
      const hash2 = tokenUtils.hashToken('TOKEN-2');
      
      expect(hash1).not.toBe(hash2);
    });

    test('should use pepper in hashing', () => {
      const plainToken = 'TEST-TOKEN';
      const originalPepper = process.env.TOKEN_PEPPER;
      
      // Change pepper temporarily
      process.env.TOKEN_PEPPER = 'different-pepper';
      const hash1 = tokenUtils.hashToken(plainToken);
      
      process.env.TOKEN_PEPPER = 'another-pepper';
      const hash2 = tokenUtils.hashToken(plainToken);
      
      // Restore original pepper
      process.env.TOKEN_PEPPER = originalPepper;
      
      expect(hash1).not.toBe(hash2);
    });

    test('should handle empty and special characters', () => {
      const emptyHash = tokenUtils.hashToken('');
      const specialHash = tokenUtils.hashToken('!@#$%^&*()');
      const unicodeHash = tokenUtils.hashToken('🔑💎🎯');
      
      expect(emptyHash).toHaveLength(64);
      expect(specialHash).toHaveLength(64);
      expect(unicodeHash).toHaveLength(64);
      
      // Should all be different
      expect(emptyHash).not.toBe(specialHash);
      expect(specialHash).not.toBe(unicodeHash);
    });
  });

  describe('verifyTokenString', () => {
    let testToken;

    beforeEach(async () => {
      const plainToken = tokenUtils.randomCode('TEST');
      const tokenHash = tokenUtils.hashToken(plainToken);
      
      testToken = await Token.create({
        type: 'FAMILY_TOKEN',
        tokenHash,
        organizationId: testOrg._id,
        personIds: [testPerson._id],
        issuerId: testUser._id,
        expiresAt: new Date(Date.now() + 86400000), // 1 day from now
        maxUses: 5,
        uses: 0,
      });
      
      testToken.plainToken = plainToken; // Store for testing
    });

    test('should verify valid token', async () => {
      const verified = await tokenUtils.verifyTokenString(testToken.plainToken);
      
      expect(verified).toBeTruthy();
      expect(verified._id).toEqual(testToken._id);
      expect(verified.type).toBe('FAMILY_TOKEN');
    });

    test('should reject invalid token string', async () => {
      const verified = await tokenUtils.verifyTokenString('INVALID-TOKEN');
      
      expect(verified).toBeNull();
    });

    test('should reject null/undefined token', async () => {
      const verified1 = await tokenUtils.verifyTokenString(null);
      const verified2 = await tokenUtils.verifyTokenString(undefined);
      const verified3 = await tokenUtils.verifyTokenString('');
      
      expect(verified1).toBeNull();
      expect(verified2).toBeNull();
      expect(verified3).toBeNull();
    });

    test('should reject revoked token', async () => {
      await Token.findByIdAndUpdate(testToken._id, { revoked: true });
      
      const verified = await tokenUtils.verifyTokenString(testToken.plainToken);
      
      expect(verified).toBeNull();
    });

    test('should reject expired token', async () => {
      await Token.findByIdAndUpdate(testToken._id, { 
        expiresAt: new Date(Date.now() - 86400000) // 1 day ago
      });
      
      const verified = await tokenUtils.verifyTokenString(testToken.plainToken);
      
      expect(verified).toBeNull();
    });

    test('should reject token that exceeded max uses', async () => {
      await Token.findByIdAndUpdate(testToken._id, { uses: 5, maxUses: 5 });
      
      const verified = await tokenUtils.verifyTokenString(testToken.plainToken);
      
      expect(verified).toBeNull();
    });

    test('should reject token with no person IDs', async () => {
      await Token.findByIdAndUpdate(testToken._id, { personIds: [] });
      
      const verified = await tokenUtils.verifyTokenString(testToken.plainToken);
      
      expect(verified).toBeNull();
    });

    test('should handle token with whitespace', async () => {
      const verified = await tokenUtils.verifyTokenString(`  ${testToken.plainToken}  `);
      
      expect(verified).toBeTruthy(); // Should trim whitespace
    });

    test('should verify token usage tracking', async () => {
      // Token starts with 0 uses
      const verified1 = await tokenUtils.verifyTokenString(testToken.plainToken);
      expect(verified1.uses).toBe(0);
      
      // Update uses and verify again
      await Token.findByIdAndUpdate(testToken._id, { uses: 3 });
      const verified2 = await tokenUtils.verifyTokenString(testToken.plainToken);
      expect(verified2.uses).toBe(3);
      
      // Should still be valid since uses < maxUses
      expect(verified2).toBeTruthy();
    });
  });

  describe('TYPE_TO_ROLE mapping', () => {
    test('should have correct role mappings', () => {
      expect(tokenUtils.TYPE_TO_ROLE.FAMILY_TOKEN).toBe('Family');
      expect(tokenUtils.TYPE_TO_ROLE.MANAGER_TOKEN).toBe('Admin');
      expect(tokenUtils.TYPE_TO_ROLE.STAFF_TOKEN).toBe('GeneralCareStaff');
    });

    test('should handle all token types', () => {
      const tokenTypes = ['FAMILY_TOKEN', 'MANAGER_TOKEN', 'STAFF_TOKEN'];
      
      tokenTypes.forEach(type => {
        expect(tokenUtils.TYPE_TO_ROLE[type]).toBeDefined();
        expect(typeof tokenUtils.TYPE_TO_ROLE[type]).toBe('string');
      });
    });

    test('should return undefined for invalid token types', () => {
      expect(tokenUtils.TYPE_TO_ROLE.INVALID_TOKEN).toBeUndefined();
      expect(tokenUtils.TYPE_TO_ROLE['']).toBeUndefined();
    });
  });
});

describe('JWT Utils', () => {
  describe('signSession', () => {
    test('should create valid JWT token', () => {
      const user = { _id: testUser._id };
      const token = jwtUtils.signSession(user);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts: header.payload.signature
    });

    test('should include user ID in payload', () => {
      const user = { _id: testUser._id };
      const token = jwtUtils.signSession(user);
      
      // Decode JWT payload (without verification for testing)
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      
      expect(payload.id).toBe(testUser._id.toString());
    });

    test('should set expiration to 7 days', () => {
      const user = { _id: testUser._id };
      const token = jwtUtils.signSession(user);
      
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      
      expect(payload.exp).toBeDefined();
      expect(payload.iat).toBeDefined();
      expect(payload.exp - payload.iat).toBe(7 * 24 * 60 * 60); // 7 days in seconds
    });

    test('should handle different user ID formats', () => {
      const stringId = testUser._id.toString();
      const objectId = testUser._id;
      
      const token1 = jwtUtils.signSession({ _id: stringId });
      const token2 = jwtUtils.signSession({ _id: objectId });
      
      const payload1 = JSON.parse(Buffer.from(token1.split('.')[1], 'base64').toString());
      const payload2 = JSON.parse(Buffer.from(token2.split('.')[1], 'base64').toString());
      
      expect(payload1.id).toBe(payload2.id);
    });

    test('should create different tokens for different users', () => {
      const user1 = { _id: testUser._id };
      const user2 = { _id: new mongoose.Types.ObjectId() };
      
      const token1 = jwtUtils.signSession(user1);
      const token2 = jwtUtils.signSession(user2);
      
      expect(token1).not.toBe(token2);
      
      const payload1 = JSON.parse(Buffer.from(token1.split('.')[1], 'base64').toString());
      const payload2 = JSON.parse(Buffer.from(token2.split('.')[1], 'base64').toString());
      
      expect(payload1.id).not.toBe(payload2.id);
    });

    test('should use environment JWT secret', () => {
      const originalSecret = process.env.JWT_SECRET;
      const user = { _id: testUser._id };
      
      // Test with different secret
      process.env.JWT_SECRET = 'different-secret';
      const token1 = jwtUtils.signSession(user);
      
      process.env.JWT_SECRET = 'another-secret';
      const token2 = jwtUtils.signSession(user);
      
      // Restore original secret
      process.env.JWT_SECRET = originalSecret;
      
      // Different secrets should produce different tokens (different signatures)
      expect(token1).not.toBe(token2);
    });
  });
});

describe('Cloudinary Utils', () => {
  describe('configureCloudinary', () => {
    test('should throw error when environment variables are missing', () => {
      const originalEnv = {
        CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
        CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
        CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
      };
      
      // Clear environment variables
      delete process.env.CLOUDINARY_CLOUD_NAME;
      delete process.env.CLOUDINARY_API_KEY;
      delete process.env.CLOUDINARY_API_SECRET;
      
      expect(() => {
        configureCloudinary();
      }).toThrow('Missing Cloudinary env vars');
      
      // Restore environment
      Object.keys(originalEnv).forEach(key => {
        if (originalEnv[key]) {
          process.env[key] = originalEnv[key];
        }
      });
    });

    test('should configure cloudinary when all env vars are present', () => {
      const originalEnv = {
        CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
        CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
        CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
      };
      
      // Set test environment variables
      process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud';
      process.env.CLOUDINARY_API_KEY = 'test-key';
      process.env.CLOUDINARY_API_SECRET = 'test-secret';
      
      expect(() => {
        const cloudinary = configureCloudinary();
        expect(cloudinary).toBeDefined();
      }).not.toThrow();
      
      // Restore environment
      Object.keys(originalEnv).forEach(key => {
        if (originalEnv[key]) {
          process.env[key] = originalEnv[key];
        } else {
          delete process.env[key];
        }
      });
    });

    test('should throw error when only some env vars are present', () => {
      const originalEnv = {
        CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
        CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
        CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
      };
      
      // Set only some environment variables
      process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud';
      process.env.CLOUDINARY_API_KEY = 'test-key';
      delete process.env.CLOUDINARY_API_SECRET;
      
      expect(() => {
        configureCloudinary();
      }).toThrow('Missing Cloudinary env vars');
      
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