/**
 * Authorization Page JavaScript
 * Handles form submission and user interactions for OAuth authorization flow
 */

(function() {
  'use strict';

  const authorizeForm = document.getElementById('authorizeForm');
  const allowBtn = document.querySelector('.btn-allow');
  const denyBtn = document.querySelector('.btn-deny');

  // Scope descriptions for common OAuth scopes
  const scopeDescriptions = {
    'profile': 'Access your basic profile information',
    'email': 'Access your email address',
    'openid': 'Authenticate using OpenID Connect',
    'read': 'Read access to your data',
    'write': 'Write access to your data',
    'offline_access': 'Access your data even when you are offline'
  };

  /**
   * Handle form submission
   */
  function handleSubmit(event) {
    const action = event.submitter ? event.submitter.value : 'deny';

    if (action === 'allow') {
      // Show loading state on allow button
      if (allowBtn) {
        allowBtn.classList.add('loading');
        allowBtn.disabled = true;
      }
    } else {
      // Show loading state on deny button
      if (denyBtn) {
        denyBtn.textContent = 'Denying...';
        denyBtn.disabled = true;
      }
    }

    // Allow form to submit normally
  }

  /**
   * Validate the authorization request parameters
   */
  function validateParams() {
    const params = new URLSearchParams(window.location.search);
    const requiredParams = ['client_id', 'redirect_uri', 'response_type'];

    for (const param of requiredParams) {
      if (!document.querySelector(`input[name="${param}"]`)?.value) {
        console.warn(`Missing required parameter: ${param}`);
      }
    }

    // Check for PKCE parameters
    const codeChallenge = document.querySelector('input[name="code_challenge"]');
    if (codeChallenge?.value) {
      console.log('PKCE flow detected');
    }
  }

  /**
   * Handle keyboard shortcuts
   */
  function handleKeyboard(event) {
    // Allow with Enter key when form is focused
    if (event.key === 'Enter' && event.target.tagName !== 'BUTTON') {
      event.preventDefault();
      if (allowBtn) {
        allowBtn.click();
      }
    }

    // Deny with Escape key
    if (event.key === 'Escape') {
      event.preventDefault();
      if (denyBtn) {
        denyBtn.click();
      }
    }
  }

  /**
   * Initialize the page
   */
  function init() {
    if (authorizeForm) {
      authorizeForm.addEventListener('submit', handleSubmit);
    }

    // Add keyboard event listener
    document.addEventListener('keydown', handleKeyboard);

    // Validate parameters on load
    validateParams();

    // Log authorization request details for debugging
    console.log('Authorization request loaded');
    console.log('Client ID:', document.querySelector('input[name="client_id"]')?.value);
    console.log('Redirect URI:', document.querySelector('input[name="redirect_uri"]')?.value);
    console.log('Response Type:', document.querySelector('input[name="response_type"]')?.value);
    console.log('Scope:', document.querySelector('input[name="scope"]')?.value);
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();