/**
 * Login Page JavaScript
 * Handles form submission and validation for the login flow
 */

(function() {
  'use strict';

  const loginForm = document.getElementById('loginForm');
  const loginBtn = document.querySelector('.btn-login');
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');

  /**
   * Validate form inputs
   * @returns {boolean} Whether the form is valid
   */
  function validateForm() {
    let isValid = true;
    const username = usernameInput?.value.trim();
    const password = passwordInput?.value;

    // Clear previous error states
    clearErrors();

    // Validate username
    if (!username) {
      showError(usernameInput, 'Username is required');
      isValid = false;
    } else if (username.length < 3) {
      showError(usernameInput, 'Username must be at least 3 characters');
      isValid = false;
    }

    // Validate password
    if (!password) {
      showError(passwordInput, 'Password is required');
      isValid = false;
    } else if (password.length < 6) {
      showError(passwordInput, 'Password must be at least 6 characters');
      isValid = false;
    }

    return isValid;
  }

  /**
   * Show error for a specific input
   * @param {HTMLElement} input - The input element
   * @param {string} message - Error message
   */
  function showError(input, message) {
    if (!input) return;

    input.classList.add('error');
    input.setAttribute('aria-invalid', 'true');

    // Create error message element if not exists
    let errorEl = input.parentElement.querySelector('.input-error');
    if (!errorEl) {
      errorEl = document.createElement('span');
      errorEl.className = 'input-error';
      input.parentElement.appendChild(errorEl);
    }
    errorEl.textContent = message;
  }

  /**
   * Clear all error states
   */
  function clearErrors() {
    const inputs = document.querySelectorAll('.form-group input');
    inputs.forEach(input => {
      input.classList.remove('error');
      input.removeAttribute('aria-invalid');
    });

    const errorEls = document.querySelectorAll('.input-error');
    errorEls.forEach(el => el.remove());
  }

  /**
   * Handle form submission
   * @param {Event} event - Submit event
   */
  function handleSubmit(event) {
    if (!validateForm()) {
      event.preventDefault();
      return;
    }

    // Show loading state
    if (loginBtn) {
      loginBtn.classList.add('loading');
      loginBtn.disabled = true;
    }

    // Allow form to submit normally
  }

  /**
   * Handle input focus for better UX
   */
  function handleInputFocus(event) {
    const input = event.target;
    if (input.classList.contains('error')) {
      input.classList.remove('error');
      const errorEl = input.parentElement.querySelector('.input-error');
      if (errorEl) {
        errorEl.remove();
      }
    }
  }

  /**
   * Initialize the page
   */
  function init() {
    if (loginForm) {
      loginForm.addEventListener('submit', handleSubmit);
    }

    // Add focus listeners to clear errors
    if (usernameInput) {
      usernameInput.addEventListener('focus', handleInputFocus);
    }
    if (passwordInput) {
      passwordInput.addEventListener('focus', handleInputFocus);
    }

    // Focus on username input if empty
    if (usernameInput && !usernameInput.value) {
      usernameInput.focus();
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();