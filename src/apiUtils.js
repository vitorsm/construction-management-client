/**
 * Handles authentication errors (401, 403) by removing token and redirecting to login
 */
export const handleAuthError = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('selectedProject');
  window.location.href = '/login';
};

/**
 * Checks if response is unauthorized/forbidden and handles it
 */
export const checkAuthError = (response) => {
  if (response.status === 401 || response.status === 403) {
    handleAuthError();
    return true;
  }
  return false;
};

