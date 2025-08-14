import {
  generateBookingReference,
  parseBookingReference,
  validateBookingReference,
} from '@/app/lib/booking/reference';

describe('Booking Reference Utilities', () => {
  beforeEach(() => {
    // Reset any mocks and use real timers by default
    jest.useRealTimers();
  });

  afterEach(() => {
    // Clean up after each test
    jest.useRealTimers();
  });

  describe('generateBookingReference', () => {
    it('should generate reference with correct format NCB-YYYYMMDD-XXXXXX', () => {
      // Arrange & Act
      const reference = generateBookingReference();

      // Assert
      expect(reference).toMatch(/^NCB-\d{8}-[A-Z0-9]{6}$/);
    });

    it('should include current date in reference when no date provided', () => {
      // Arrange
      const mockDate = new Date('2025-08-14T12:00:00Z');
      jest.useFakeTimers();
      jest.setSystemTime(mockDate);

      // Act
      const reference = generateBookingReference();

      // Assert
      expect(reference).toMatch(/^NCB-20250814-[A-Z0-9]{6}$/);
    });

    it('should use provided date in reference format', () => {
      // Arrange
      const providedDate = new Date('2024-12-25T15:30:00Z');

      // Act
      const reference = generateBookingReference(providedDate);

      // Assert
      expect(reference).toMatch(/^NCB-20241225-[A-Z0-9]{6}$/);
    });

    it('should generate unique references on multiple calls', () => {
      // Arrange & Act
      const reference1 = generateBookingReference();
      const reference2 = generateBookingReference();
      const reference3 = generateBookingReference();

      // Assert
      expect(reference1).not.toBe(reference2);
      expect(reference1).not.toBe(reference3);
      expect(reference2).not.toBe(reference3);
    });

    it('should handle edge case of date rollover at midnight', () => {
      // Arrange - Set time to 23:59:59 on Dec 31st
      const newYearEve = new Date('2024-12-31T23:59:59Z');
      jest.useFakeTimers();
      jest.setSystemTime(newYearEve);

      // Act
      const reference = generateBookingReference();

      // Assert
      expect(reference).toMatch(/^NCB-20241231-[A-Z0-9]{6}$/);

      // Advance to new year
      jest.setSystemTime(new Date('2025-01-01T00:00:00Z'));
      const newYearReference = generateBookingReference();
      expect(newYearReference).toMatch(/^NCB-20250101-[A-Z0-9]{6}$/);
    });

    it('should generate 6-character random suffix', () => {
      // Arrange & Act
      const reference = generateBookingReference();
      const suffixMatch = reference.match(/[A-Z0-9]{6}$/);

      // Assert
      expect(suffixMatch).not.toBeNull();
      expect(suffixMatch![0]).toHaveLength(6);
    });

    it('should only use uppercase letters and numbers in suffix', () => {
      // Arrange & Act
      const references = Array.from({ length: 20 }, () => generateBookingReference());
      
      // Assert
      references.forEach(reference => {
        const suffix = reference.split('-')[2];
        expect(suffix).toMatch(/^[A-Z0-9]{6}$/);
        expect(suffix).not.toMatch(/[a-z]/); // No lowercase
        expect(suffix).not.toMatch(/[^A-Z0-9]/); // No special chars
      });
    });

    it('should handle leap year dates correctly', () => {
      // Arrange
      const leapYearDate = new Date('2024-02-29T12:00:00Z');

      // Act
      const reference = generateBookingReference(leapYearDate);

      // Assert
      expect(reference).toMatch(/^NCB-20240229-[A-Z0-9]{6}$/);
    });

    it('should handle timezone differences consistently', () => {
      // Arrange - Create dates in different timezones for same day
      const utcDate = new Date('2025-08-14T12:00:00Z');
      const timezoneDate = new Date('2025-08-14T22:00:00-10:00'); // Same UTC time, different timezone

      // Act
      const utcReference = generateBookingReference(utcDate);
      const timezoneReference = generateBookingReference(timezoneDate);

      // Assert - Both should have same date part
      const utcDatePart = utcReference.split('-')[1];
      const timezoneDatePart = timezoneReference.split('-')[1];
      expect(utcDatePart).toBe(timezoneDatePart);
    });
  });

  describe('parseBookingReference', () => {
    it('should parse valid reference correctly', () => {
      // Arrange
      const validReference = 'NCB-20250814-A1B2C3';

      // Act
      const result = parseBookingReference(validReference);

      // Assert
      expect(result).toEqual({
        prefix: 'NCB',
        date: '20250814',
        suffix: 'A1B2C3',
        parsedDate: new Date('2025-08-14'),
        isValid: true
      });
    });

    it('should extract date part correctly and convert to Date object', () => {
      // Arrange
      const reference = 'NCB-20241225-XYZ123';

      // Act
      const result = parseBookingReference(reference);

      // Assert
      expect(result.date).toBe('20241225');
      expect(result.parsedDate).toEqual(new Date('2024-12-25'));
    });

    it('should extract suffix correctly', () => {
      // Arrange
      const reference = 'NCB-20250101-9Z8Y7X';

      // Act
      const result = parseBookingReference(reference);

      // Assert
      expect(result.suffix).toBe('9Z8Y7X');
    });

    it('should throw error for invalid format - wrong prefix', () => {
      // Arrange
      const invalidReference = 'XYZ-20250814-A1B2C3';

      // Act & Assert
      expect(() => parseBookingReference(invalidReference)).toThrow('Invalid booking reference format');
    });

    it('should throw error for invalid format - wrong date format', () => {
      // Arrange
      const invalidReference = 'NCB-2025814-A1B2C3'; // Missing digit in date

      // Act & Assert
      expect(() => parseBookingReference(invalidReference)).toThrow('Invalid booking reference format');
    });

    it('should throw error for invalid format - wrong suffix length', () => {
      // Arrange
      const invalidReference = 'NCB-20250814-A1B2C'; // Only 5 characters in suffix

      // Act & Assert
      expect(() => parseBookingReference(invalidReference)).toThrow('Invalid booking reference format');
    });

    it('should handle malformed references gracefully', () => {
      // Arrange
      const malformedReferences = [
        'NCB-20250814', // Missing suffix
        '20250814-A1B2C3', // Missing prefix
        'NCB20250814A1B2C3', // No separators
        'NCB-20250814-A1B2C3-EXTRA', // Too many parts
        '', // Empty string
        'INVALID'
      ];

      // Act & Assert
      malformedReferences.forEach(ref => {
        expect(() => parseBookingReference(ref)).toThrow('Invalid booking reference format');
      });
    });

    it('should validate date component is valid calendar date', () => {
      // Arrange
      const invalidDateReference = 'NCB-20250230-A1B2C3'; // Feb 30th doesn't exist

      // Act & Assert
      expect(() => parseBookingReference(invalidDateReference)).toThrow('Invalid date in booking reference');
    });

    it('should handle leap year validation correctly', () => {
      // Arrange
      const validLeapYear = 'NCB-20240229-A1B2C3'; // Valid leap year date
      const invalidLeapYear = 'NCB-20230229-A1B2C3'; // Invalid, 2023 not leap year

      // Act & Assert
      expect(() => parseBookingReference(validLeapYear)).not.toThrow();
      expect(() => parseBookingReference(invalidLeapYear)).toThrow('Invalid date in booking reference');
    });

    it('should validate each component matches expected pattern', () => {
      // Arrange
      const invalidComponents = [
        'ncb-20250814-A1B2C3', // Lowercase prefix
        'NCB-20250814-a1b2c3', // Lowercase suffix
        'NCB-20250814-A1B2C!', // Special character in suffix
        'NCB-20250814-A1 2C3', // Space in suffix
      ];

      // Act & Assert
      invalidComponents.forEach(ref => {
        expect(() => parseBookingReference(ref)).toThrow('Invalid booking reference format');
      });
    });
  });

  describe('validateBookingReference', () => {
    it('should return true for valid references', () => {
      // Arrange
      const validReferences = [
        'NCB-20250814-A1B2C3',
        'NCB-20241225-XYZ123',
        'NCB-20240229-9Z8Y7X', // Leap year
        'NCB-20230101-000000',
        'NCB-20251231-ZZZZZZ'
      ];

      // Act & Assert
      validReferences.forEach(ref => {
        expect(validateBookingReference(ref)).toBe(true);
      });
    });

    it('should return false for invalid format', () => {
      // Arrange
      const invalidReferences = [
        'XYZ-20250814-A1B2C3', // Wrong prefix
        'NCB-2025814-A1B2C3', // Wrong date format
        'NCB-20250814-A1B2C', // Wrong suffix length
        'ncb-20250814-A1B2C3', // Lowercase prefix
        'NCB-20250814-a1b2c3', // Lowercase suffix
      ];

      // Act & Assert
      invalidReferences.forEach(ref => {
        expect(validateBookingReference(ref)).toBe(false);
      });
    });

    it('should validate prefix is exactly NCB', () => {
      // Arrange
      const invalidPrefixes = [
        'ABC-20250814-A1B2C3',
        'ncb-20250814-A1B2C3',
        'Ncb-20250814-A1B2C3',
        'NCB1-20250814-A1B2C3',
        'NCBA-20250814-A1B2C3'
      ];

      // Act & Assert
      invalidPrefixes.forEach(ref => {
        expect(validateBookingReference(ref)).toBe(false);
      });
    });

    it('should validate date format is YYYYMMDD', () => {
      // Arrange
      const invalidDateFormats = [
        'NCB-2025814-A1B2C3', // 7 digits
        'NCB-202508140-A1B2C3', // 9 digits
        'NCB-25081401-A1B2C3', // Wrong year format
        'NCB-20251301-A1B2C3', // Invalid month
        'NCB-20250832-A1B2C3', // Invalid day
        'NCB-20250230-A1B2C3', // Feb 30th
        'NCB-abcd1234-A1B2C3', // Letters in date
      ];

      // Act & Assert
      invalidDateFormats.forEach(ref => {
        expect(validateBookingReference(ref)).toBe(false);
      });
    });

    it('should validate suffix is exactly 6 alphanumeric characters', () => {
      // Arrange
      const invalidSuffixes = [
        'NCB-20250814-A1B2C', // 5 characters
        'NCB-20250814-A1B2C34', // 7 characters
        'NCB-20250814-A1B2C!', // Special character
        'NCB-20250814-A1 2C3', // Space
        'NCB-20250814-a1b2c3', // Lowercase
        'NCB-20250814-A1B2C-', // Hyphen
      ];

      // Act & Assert
      invalidSuffixes.forEach(ref => {
        expect(validateBookingReference(ref)).toBe(false);
      });
    });

    it('should handle edge cases with null, undefined, and empty strings', () => {
      // Arrange
      const edgeCases = [null, undefined, '', '   ', '\t\n'];

      // Act & Assert
      edgeCases.forEach(ref => {
        expect(validateBookingReference(ref as any)).toBe(false);
      });
    });

    it('should handle references that are too short or too long', () => {
      // Arrange
      const incorrectLengths = [
        'NCB', // Too short
        'NCB-20250814-A1B2C3-EXTRA-PARTS', // Too long
        'NCB-20250814-A1B2C3EXTRA', // No separator, too long
        'N-20250814-A1B2C3', // Prefix too short
      ];

      // Act & Assert
      incorrectLengths.forEach(ref => {
        expect(validateBookingReference(ref)).toBe(false);
      });
    });

    it('should handle special characters and unicode', () => {
      // Arrange
      const specialCharReferences = [
        'NCB-20250814-A1B2C€', // Euro symbol
        'NCB-20250814-A1B2Cñ', // Accented character
        'NCB-20250814-A1B2C🔥', // Emoji
        'NCB-20250814-A1B2C\\', // Backslash
        'NCB-20250814-A1B2C/', // Forward slash
      ];

      // Act & Assert
      specialCharReferences.forEach(ref => {
        expect(validateBookingReference(ref)).toBe(false);
      });
    });

    it('should validate against current business rules', () => {
      // Arrange - Test future dates and past dates
      const futureReference = 'NCB-20991231-A1B2C3'; // Far future
      const pastReference = 'NCB-19001231-A1B2C3'; // Far past
      const currentYearReference = 'NCB-20250814-A1B2C3'; // Current year

      // Act & Assert
      expect(validateBookingReference(futureReference)).toBe(true); // Should allow future bookings
      expect(validateBookingReference(pastReference)).toBe(true); // Should allow past references for historical data
      expect(validateBookingReference(currentYearReference)).toBe(true);
    });
  });

  describe('Integration Tests', () => {
    it('should generate reference that passes validation', () => {
      // Arrange & Act
      const reference = generateBookingReference();

      // Assert
      expect(validateBookingReference(reference)).toBe(true);
    });

    it('should generate reference that can be parsed correctly', () => {
      // Arrange
      const testDate = new Date('2025-08-14');

      // Act
      const reference = generateBookingReference(testDate);
      const parsed = parseBookingReference(reference);

      // Assert
      expect(parsed.prefix).toBe('NCB');
      expect(parsed.date).toBe('20250814');
      expect(parsed.suffix).toHaveLength(6);
      expect(parsed.parsedDate).toEqual(testDate);
      expect(parsed.isValid).toBe(true);
    });

    it('should maintain consistency across generate-validate-parse cycle', () => {
      // Arrange
      const testDates = [
        new Date('2025-01-01'),
        new Date('2025-08-14'),
        new Date('2025-12-31'),
        new Date('2024-02-29'), // Leap year
      ];

      // Act & Assert
      testDates.forEach(date => {
        const reference = generateBookingReference(date);
        expect(validateBookingReference(reference)).toBe(true);
        
        const parsed = parseBookingReference(reference);
        expect(parsed.parsedDate).toEqual(date);
        expect(parsed.isValid).toBe(true);
      });
    });

    it('should handle high-frequency generation without collisions in short time', () => {
      // Arrange
      const numberOfReferences = 100;
      const references = new Set<string>();

      // Act
      for (let i = 0; i < numberOfReferences; i++) {
        const reference = generateBookingReference();
        references.add(reference);
        expect(validateBookingReference(reference)).toBe(true);
      }

      // Assert - All references should be unique
      expect(references.size).toBe(numberOfReferences);
    });

    it('should generate references that are database-safe as unique keys', () => {
      // Arrange & Act
      const references = Array.from({ length: 50 }, () => generateBookingReference());

      // Assert
      references.forEach(reference => {
        expect(reference).toHaveLength(17); // NCB-YYYYMMDD-XXXXXX = 17 chars
        expect(reference).toMatch(/^[A-Z0-9-]+$/); // Only safe characters
        expect(validateBookingReference(reference)).toBe(true);
      });

      // All should be unique
      const uniqueReferences = new Set(references);
      expect(uniqueReferences.size).toBe(references.length);
    });
  });

  describe('Error Handling Edge Cases', () => {
    it('should handle invalid Date objects in generation', () => {
      // Arrange
      const invalidDate = new Date('invalid');

      // Act & Assert
      expect(() => generateBookingReference(invalidDate)).toThrow('Invalid date provided');
    });

    it('should handle extreme dates gracefully', () => {
      // Arrange
      const extremeDates = [
        new Date('1900-01-01'), // Very old date
        new Date('2099-12-31'), // Far future date
        new Date(0), // Unix epoch
      ];

      // Act & Assert
      extremeDates.forEach(date => {
        expect(() => generateBookingReference(date)).not.toThrow();
        const reference = generateBookingReference(date);
        expect(validateBookingReference(reference)).toBe(true);
      });
    });

    it('should provide meaningful error messages for parsing failures', () => {
      // Arrange
      const testCases = [
        { ref: 'INVALID', expectedError: 'Invalid booking reference format' },
        { ref: 'NCB-20250230-A1B2C3', expectedError: 'Invalid date in booking reference' },
        { ref: 'NCB-20250814-ABC', expectedError: 'Invalid booking reference format' },
        { ref: '', expectedError: 'Invalid booking reference format' },
      ];

      // Act & Assert
      testCases.forEach(({ ref, expectedError }) => {
        expect(() => parseBookingReference(ref)).toThrow(expectedError);
      });
    });
  });
});