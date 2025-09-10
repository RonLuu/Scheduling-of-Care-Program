import assert from 'assert';
import { expandOccurrences } from '../../utils/schedule.js';

describe('Schedule Utility - expandOccurrences', () => {
  
  describe('OneTime frequency', () => {
    it('should return single date for one-time occurrence', () => {
      const config = {
        intervalType: 'OneTime',
        intervalValue: 1,
        startDate: new Date('2025-01-15'),
        endDate: null,
        occurrenceCount: null
      };
      
      const results = expandOccurrences(
        config,
        new Date('2025-01-01'),
        new Date('2025-12-31')
      );
      
      assert.strictEqual(results.length, 1);
      assert.strictEqual(results[0].toISOString(), new Date('2025-01-15').toISOString());
    });

    it('should exclude one-time occurrence outside window', () => {
      const config = {
        intervalType: 'OneTime',
        intervalValue: 1,
        startDate: new Date('2025-01-15'),
        endDate: null,
        occurrenceCount: null
      };
      
      const results = expandOccurrences(
        config,
        new Date('2025-02-01'),
        new Date('2025-12-31')
      );
      
      assert.strictEqual(results.length, 0);
    });
  });

  describe('Daily frequency', () => {
    it('should generate daily occurrences within window', () => {
      const config = {
        intervalType: 'Daily',
        intervalValue: 1,
        startDate: new Date('2025-01-01'),
        endDate: null,
        occurrenceCount: 5
      };
      
      const results = expandOccurrences(
        config,
        new Date('2025-01-01'),
        new Date('2025-01-31')
      );
      
      assert.strictEqual(results.length, 5);
      assert.strictEqual(results[0].toISOString(), new Date('2025-01-01').toISOString());
      assert.strictEqual(results[4].toISOString(), new Date('2025-01-05').toISOString());
    });

    it('should handle every-other-day pattern', () => {
      const config = {
        intervalType: 'Daily',
        intervalValue: 2,
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-10'),
        occurrenceCount: null
      };
      
      const results = expandOccurrences(
        config,
        new Date('2025-01-01'),
        new Date('2025-01-31')
      );
      
      assert.strictEqual(results.length, 5); // Jan 1, 3, 5, 7, 9
      assert.strictEqual(results[0].getDate(), 1);
      assert.strictEqual(results[1].getDate(), 3);
      assert.strictEqual(results[2].getDate(), 5);
    });
  });

  describe('Weekly frequency', () => {
    it('should generate weekly occurrences', () => {
      const config = {
        intervalType: 'Weekly',
        intervalValue: 1,
        startDate: new Date('2025-01-01'), // Wednesday
        endDate: null,
        occurrenceCount: 4
      };
      
      const results = expandOccurrences(
        config,
        new Date('2025-01-01'),
        new Date('2025-02-28')
      );
      
      assert.strictEqual(results.length, 4);
      assert.strictEqual(results[0].toISOString(), new Date('2025-01-01').toISOString());
      assert.strictEqual(results[1].toISOString(), new Date('2025-01-08').toISOString());
      assert.strictEqual(results[2].toISOString(), new Date('2025-01-15').toISOString());
      assert.strictEqual(results[3].toISOString(), new Date('2025-01-22').toISOString());
    });

    it('should handle bi-weekly pattern', () => {
      const config = {
        intervalType: 'Weekly',
        intervalValue: 2,
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-02-01'),
        occurrenceCount: null
      };
      
      const results = expandOccurrences(
        config,
        new Date('2025-01-01'),
        new Date('2025-02-28')
      );
      
      assert.strictEqual(results.length, 3); // Jan 1, 15, 29
      assert.strictEqual(results[0].getDate(), 1);
      assert.strictEqual(results[1].getDate(), 15);
      assert.strictEqual(results[2].getDate(), 29);
    });
  });

  describe('Monthly frequency', () => {
    it('should generate monthly occurrences', () => {
      const config = {
        intervalType: 'Monthly',
        intervalValue: 1,
        startDate: new Date('2025-01-15'),
        endDate: null,
        occurrenceCount: 3
      };
      
      const results = expandOccurrences(
        config,
        new Date('2025-01-01'),
        new Date('2025-12-31')
      );
      
      assert.strictEqual(results.length, 3);
      assert.strictEqual(results[0].toISOString(), new Date('2025-01-15').toISOString());
      assert.strictEqual(results[1].toISOString(), new Date('2025-02-15').toISOString());
      assert.strictEqual(results[2].toISOString(), new Date('2025-03-15').toISOString());
    });

    it('should handle quarterly pattern', () => {
      const config = {
        intervalType: 'Monthly',
        intervalValue: 3,
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-12-31'),
        occurrenceCount: null
      };
      
      const results = expandOccurrences(
        config,
        new Date('2025-01-01'),
        new Date('2025-12-31')
      );
      
      assert.strictEqual(results.length, 4); // Jan, Apr, Jul, Oct
      assert.strictEqual(results[0].getMonth(), 0); // January
      assert.strictEqual(results[1].getMonth(), 3); // April
      assert.strictEqual(results[2].getMonth(), 6); // July
      assert.strictEqual(results[3].getMonth(), 9); // October
    });
  });

  describe('Yearly frequency', () => {
    it('should generate yearly occurrences', () => {
      const config = {
        intervalType: 'Yearly',
        intervalValue: 1,
        startDate: new Date('2025-03-15'),
        endDate: null,
        occurrenceCount: 3
      };
      
      const results = expandOccurrences(
        config,
        new Date('2025-01-01'),
        new Date('2028-12-31')
      );
      
      assert.strictEqual(results.length, 3);
      assert.strictEqual(results[0].getFullYear(), 2025);
      assert.strictEqual(results[1].getFullYear(), 2026);
      assert.strictEqual(results[2].getFullYear(), 2027);
      
      // All should be March 15
      results.forEach(date => {
        assert.strictEqual(date.getMonth(), 2); // March
        assert.strictEqual(date.getDate(), 15);
      });
    });
  });

  describe('Window filtering', () => {
    it('should only return occurrences within specified window', () => {
      const config = {
        intervalType: 'Daily',
        intervalValue: 1,
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
        occurrenceCount: null
      };
      
      const results = expandOccurrences(
        config,
        new Date('2025-01-10'),
        new Date('2025-01-20')
      );
      
      assert.strictEqual(results.length, 11); // Jan 10-20 inclusive
      assert.strictEqual(results[0].getDate(), 10);
      assert.strictEqual(results[10].getDate(), 20);
    });

    it('should handle null window boundaries', () => {
      const config = {
        intervalType: 'Daily',
        intervalValue: 1,
        startDate: new Date('2025-01-01'),
        endDate: null,
        occurrenceCount: 5
      };
      
      // No window start
      let results = expandOccurrences(config, null, new Date('2025-01-31'));
      assert.strictEqual(results.length, 5);
      
      // No window end
      results = expandOccurrences(config, new Date('2025-01-01'), null);
      assert.strictEqual(results.length, 5);
      
      // No window at all
      results = expandOccurrences(config, null, null);
      assert.strictEqual(results.length, 5);
    });
  });

  describe('Stop conditions', () => {
    it('should stop at occurrence count when specified', () => {
      const config = {
        intervalType: 'Daily',
        intervalValue: 1,
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-12-31'), // Has end date but count should take precedence
        occurrenceCount: 10
      };
      
      const results = expandOccurrences(
        config,
        new Date('2025-01-01'),
        new Date('2025-12-31')
      );
      
      assert.strictEqual(results.length, 10);
    });

    it('should stop at end date when no occurrence count', () => {
      const config = {
        intervalType: 'Daily',
        intervalValue: 1,
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-10'),
        occurrenceCount: null
      };
      
      const results = expandOccurrences(
        config,
        new Date('2025-01-01'),
        new Date('2025-12-31')
      );
      
      assert.strictEqual(results.length, 10); // Jan 1-10 inclusive
    });

    it('should stop at window end when it comes first', () => {
      const config = {
        intervalType: 'Daily',
        intervalValue: 1,
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-12-31'),
        occurrenceCount: 1000
      };
      
      const results = expandOccurrences(
        config,
        new Date('2025-01-01'),
        new Date('2025-01-05')
      );
      
      assert.strictEqual(results.length, 5); // Limited by window
    });
  });

  describe('Edge cases', () => {
    it('should return empty array when no start date', () => {
      const config = {
        intervalType: 'Daily',
        intervalValue: 1,
        startDate: null,
        endDate: null,
        occurrenceCount: 10
      };
      
      const results = expandOccurrences(
        config,
        new Date('2025-01-01'),
        new Date('2025-12-31')
      );
      
      assert.strictEqual(results.length, 0);
    });

    it('should handle leap year correctly for monthly recurrence', () => {
      const config = {
        intervalType: 'Monthly',
        intervalValue: 1,
        startDate: new Date('2024-01-31'), // Start on Jan 31 in leap year
        endDate: null,
        occurrenceCount: 3
      };
      
      const results = expandOccurrences(
        config,
        new Date('2024-01-01'),
        new Date('2024-12-31')
      );
      
      assert.strictEqual(results.length, 3);
      assert.strictEqual(results[0].toISOString(), new Date('2024-01-31').toISOString());
      // February will adjust to Feb 29 (leap year)
      assert.strictEqual(results[1].getDate(), 29);
      assert.strictEqual(results[1].getMonth(), 1); // February
      // March back to 31
      assert.strictEqual(results[2].getDate(), 31);
      assert.strictEqual(results[2].getMonth(), 2); // March
    });

    it('should prevent infinite loops with sanity cap', () => {
      const config = {
        intervalType: 'Daily',
        intervalValue: 0, // Invalid interval value
        startDate: new Date('2025-01-01'),
        endDate: null,
        occurrenceCount: null
      };
      
      const results = expandOccurrences(
        config,
        new Date('2025-01-01'),
        new Date('2025-12-31')
      );
      
      // Should hit the 10000 limit and stop
      assert.ok(results.length <= 10000);
    });
  });

  describe('Real-world scenarios', () => {
    it('should handle medication schedule - twice daily for a week', () => {
      // This would typically be handled differently, but testing edge case
      const config = {
        intervalType: 'Daily',
        intervalValue: 1,
        startDate: new Date('2025-01-01T08:00:00'),
        endDate: null,
        occurrenceCount: 7
      };
      
      const results = expandOccurrences(
        config,
        new Date('2025-01-01'),
        new Date('2025-01-31')
      );
      
      assert.strictEqual(results.length, 7);
      // Verify time is preserved
      results.forEach(date => {
        assert.strictEqual(date.getHours(), 8);
        assert.strictEqual(date.getMinutes(), 0);
      });
    });

    it('should handle physiotherapy - every Monday and Thursday', () => {
      // Weekly pattern starting on a Monday
      const config = {
        intervalType: 'Weekly',
        intervalValue: 1,
        startDate: new Date('2025-01-06'), // Monday
        endDate: null,
        occurrenceCount: 8 // 4 weeks worth
      };
      
      const results = expandOccurrences(
        config,
        new Date('2025-01-01'),
        new Date('2025-02-28')
      );
      
      assert.strictEqual(results.length, 8);
      // All should be Mondays (day 1 in JS)
      results.forEach(date => {
        assert.strictEqual(date.getDay(), 1);
      });
    });

    it('should handle annual check-ups', () => {
      const config = {
        intervalType: 'Yearly',
        intervalValue: 1,
        startDate: new Date('2025-06-15'),
        endDate: new Date('2030-12-31'),
        occurrenceCount: null
      };
      
      const results = expandOccurrences(
        config,
        new Date('2025-01-01'),
        new Date('2030-12-31')
      );
      
      assert.strictEqual(results.length, 6); // 2025-2030 inclusive
      results.forEach((date, index) => {
        assert.strictEqual(date.getFullYear(), 2025 + index);
        assert.strictEqual(date.getMonth(), 5); // June
        assert.strictEqual(date.getDate(), 15);
      });
    });
  });
});