// Utility functions for handling NULL values in quarterly breakdowns

/**
 * Format quarterly value for display
 * @param value - The value from API (can be string, null, or undefined)
 * @returns Formatted string for display
 */
export const formatQuarterValue = (value: string | null | undefined): string => {
  // If value is null, undefined, or empty string, show "N/A"
  if (value === null || value === undefined || value === '') {
    return 'N/A';
  }
  
  // If value is explicitly "N/A", show "N/A"
  if (value === 'N/A') {
    return 'N/A';
  }
  
  // If value is "0" or "0.00", show "0.00"
  if (value === '0' || value === '0.00') {
    return '0.00';
  }
  
  // Try to parse as number and format with 2 decimal places
  const num = parseFloat(value);
  if (!isNaN(num)) {
    // Handle 0 specifically to ensure consistent formatting
    if (num === 0) {
      return '0.00';
    }
    return num.toFixed(2);
  }
  
  // Fallback to original value
  return value;
};

/**
 * Format quarterly value for input field
 * @param value - The value from API (can be string, null, or undefined)
 * @returns String for input field (empty string for null)
 */
export const formatQuarterValueForInput = (value: string | null | undefined): string => {
  // If value is null, undefined, or "N/A", return empty string for input
  if (value === null || value === undefined || value === '' || value === 'N/A') {
    return '';
  }
  
  // Return the original value
  return value;
};

/**
 * Check if a quarterly value is effectively NULL/N/A
 * @param value - The value from API
 * @returns Boolean indicating if value should be treated as NULL
 */
export const isQuarterValueNull = (value: string | null | undefined): boolean => {
  return value === null || value === undefined || value === '' || value === 'N/A';
};

/**
 * Check if a quarterly value is explicitly zero
 * @param value - The value from API
 * @returns Boolean indicating if value should be treated as zero
 */
export const isQuarterValueZero = (value: string | null | undefined): boolean => {
  if (value === null || value === undefined || value === '' || value === 'N/A') {
    return false;
  }
  const num = parseFloat(value);
  return !isNaN(num) && num === 0;
};

/**
 * Convert input value to API format
 * @param value - The value from input field
 * @returns Value to send to API (null for empty, string for numbers)
 */
export const convertInputToAPIValue = (value: string | null | undefined): string | null => {
  // If value is empty string, null, or undefined, return null for API
  if (value === '' || value === null || value === undefined) {
    return null;
  }
  
  // If value is "N/A", return null for API
  if (value === 'N/A') {
    return null;
  }
  
  // Try to parse as number to validate
  const num = parseFloat(value);
  if (!isNaN(num)) {
    // Return the original string value (API will handle conversion)
    return value;
  }
  
  // Fallback to original value
  return value;
};
