/**
 * Application configuration
 * Centralizes access to environment variables and provides defaults
 */

// Detect the correct API URL based on the current URL
const getDefaultApiUrl = () => {
  // When running in a browser
  if (typeof window !== 'undefined') {
    // In development mode, use a relative URL to leverage the Vite proxy
    const isDevelopment = import.meta.env.DEV;
    
    if (isDevelopment) {
      // This will go through the Vite proxy which is configured in vite.config.ts
      return '';
    }
    
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    const port = window.location.port;
    
    // Use the same origin (host+port) for API requests to work through our proxy
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      // Use the same origin without specifying a different port
      return `${protocol}//${hostname}${port ? ':' + port : ''}`;
    }
    
    // For localhost, use the standard development URL
    return 'http://localhost:7081';
  }
  
  // Default fallback for server-side rendering or non-browser environments
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
  
  // IMPORTANT: Always use direct path without modifications for progress endpoints
  // This fixes issues with external connections
  if (normalizedPath.startsWith('/api/progress/') || normalizedPath.startsWith('/progress/')) {
    return `${API_URL}${normalizedPath}`;
  }
  
  // For all other paths, ensure they have /api prefix
  if (normalizedPath.startsWith('/api/')) {
    return `${API_URL}${normalizedPath}`;
  }
  
  return `${API_URL}/api${normalizedPath}`;
}; 