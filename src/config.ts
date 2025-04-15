/**
 * Application configuration
 * Centralizes access to environment variables and provides defaults
 */

// Detect the correct API URL based on the current URL
const getDefaultApiUrl = () => {
  // When running in a browser
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    
    // If we're not on localhost, use the same hostname but with the backend port
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return `${protocol}//${hostname}:7081`;
    }
  }
  
  // Default fallback for localhost development
  return 'http://localhost:7081';
};

// API URL from environment variables with custom fallback
export const API_URL = import.meta.env.VITE_API_URL || getDefaultApiUrl();

// Log the API URL being used
console.log(`Using API URL: ${API_URL}`);

// Other configuration variables can be added here
export const DEFAULT_LANGUAGE = 'en';
export const APP_NAME = 'Dance Beat Analyzer';

// Export a function to get full API paths
export const getApiPath = (path: string): string => {
  // Make sure path starts with / and remove any double slashes
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  // If path already includes /api, don't add it again
  if (normalizedPath.startsWith('/api/')) {
    // Just use the plain endpoint with API_URL
    return `${API_URL}${normalizedPath.substring(4)}`;
  }
  
  return `${API_URL}${normalizedPath}`;
}; 