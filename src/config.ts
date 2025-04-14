/**
 * Application configuration
 * Centralizes access to environment variables and provides defaults
 */

// API URL from environment variables with fallback to localhost for development
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:7081';

// Other configuration variables can be added here
export const DEFAULT_LANGUAGE = 'en';
export const APP_NAME = 'Dance Beat Analyzer';

// Export a function to get full API paths
export const getApiPath = (path: string): string => {
  // Make sure path starts with / and remove any double slashes
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_URL}${normalizedPath}`;
}; 