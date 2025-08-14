/**
 * Booking reference utility functions for generating, parsing, and validating
 * booking references in the format NCB-YYYYMMDD-XXXXXX
 */

/**
 * Generate a unique booking reference
 * @param date - Optional date to use, defaults to current date
 * @returns Booking reference in format NCB-YYYYMMDD-XXXXXX
 * @throws Error if provided date is invalid
 */
export function generateBookingReference(date?: Date): string {
  // Use provided date or current date
  const targetDate = date || new Date();
  
  // Validate the date
  if (isNaN(targetDate.getTime())) {
    throw new Error('Invalid date provided');
  }
  
  // Format date as YYYYMMDD using UTC timezone for consistency
  const year = targetDate.getUTCFullYear().toString();
  const month = (targetDate.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = targetDate.getUTCDate().toString().padStart(2, '0');
  const dateStr = `${year}${month}${day}`;
  
  // Generate 6-character random suffix (uppercase letters and numbers)
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let suffix = '';
  for (let i = 0; i < 6; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return `NCB-${dateStr}-${suffix}`;
}

/**
 * Parse a booking reference string into its components
 * @param reference - Booking reference to parse
 * @returns Object with prefix, date, suffix, parsedDate, and isValid properties
 * @throws Error if reference format is invalid or date is invalid
 */
export function parseBookingReference(reference: string): {
  prefix: string;
  date: string;
  suffix: string;
  parsedDate: Date;
  isValid: boolean;
} {
  // Basic format validation
  if (!reference || typeof reference !== 'string') {
    throw new Error('Invalid booking reference format');
  }
  
  // Split by hyphens and validate structure
  const parts = reference.split('-');
  if (parts.length !== 3) {
    throw new Error('Invalid booking reference format');
  }
  
  const [prefix, dateStr, suffix] = parts;
  
  // Validate prefix
  if (prefix !== 'NCB') {
    throw new Error('Invalid booking reference format');
  }
  
  // Validate date format (must be exactly 8 digits)
  if (!/^\d{8}$/.test(dateStr)) {
    throw new Error('Invalid booking reference format');
  }
  
  // Validate suffix format (must be exactly 6 alphanumeric uppercase characters)
  if (!/^[A-Z0-9]{6}$/.test(suffix)) {
    throw new Error('Invalid booking reference format');
  }
  
  // Parse and validate the date
  const year = parseInt(dateStr.substring(0, 4), 10);
  const month = parseInt(dateStr.substring(4, 6), 10);
  const day = parseInt(dateStr.substring(6, 8), 10);
  
  // Create date in UTC to match test expectations
  const parsedDate = new Date(Date.UTC(year, month - 1, day));
  
  // Check if the date components match (this catches invalid dates like Feb 30)
  // Use UTC methods to match the expected behavior
  if (
    parsedDate.getUTCFullYear() !== year ||
    parsedDate.getUTCMonth() !== month - 1 ||
    parsedDate.getUTCDate() !== day
  ) {
    throw new Error('Invalid date in booking reference');
  }
  
  return {
    prefix,
    date: dateStr,
    suffix,
    parsedDate,
    isValid: true
  };
}

/**
 * Validate if a booking reference has the correct format
 * @param reference - Booking reference to validate
 * @returns true if valid, false otherwise
 */
export function validateBookingReference(reference: string | null | undefined): boolean {
  try {
    // Handle null, undefined, empty strings
    if (!reference || typeof reference !== 'string' || reference.trim() === '') {
      return false;
    }
    
    // Use parseBookingReference for comprehensive validation
    parseBookingReference(reference);
    return true;
  } catch {
    return false;
  }
}