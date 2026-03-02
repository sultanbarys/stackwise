/* ============================================
   STACKWISE — AUTH PAGE LOGIC
   State machine: login | signup | forgot | confirm | reset
   Single Supabase client from config.js
   ============================================ */
(function () {
  'use strict';

  // ---- STATE MACHINE ----
  var currentPanel = 'login';
  var isSubmitting = false;

  // ---- DOM REFS ----
  var tabs   = document.querySelectorAll('.auth-tab');
  var tabBar = document.getElementById('auth-tabs');
  var panels = {
    login:   document.getElementById('panel-login'),
    signup:  document.getElementById('panel-signup'),
    confirm: document.getElementById('panel-confirm'),
    forgot:  document.getElementById('panel-forgot'),
    reset:   document.getElementById('panel-reset')
  };

  var loginForm        = document.getElementById('login-form');
  var signupForm       = document.getElementById('signup-form');
  var forgotForm       = document.getElementById('forgot-form');
  var resetForm        = document.getElementById('reset-form');
  var confirmEmailAddr = document.getElementById('confirm-email-addr');
  var confirmMessage   = document.getElementById('confirm-message');

  // ============================================
  //  REDIRECT IF ALREADY LOGGED IN
  // ============================================
  function checkExistingSession() {
    if (!window.supabaseClient) return;
    window.supabaseClient.auth.getSession().then(function (result) {
      if (result.data && result.data.session) {
        window.location.replace('try.html');
      }
    });
  }

  // ============================================
  //  DETECT RECOVERY / RESET MODE
  // ============================================
  function detectResetMode() {
    var params = new URLSearchParams(window.location.search);
    var hash   = window.location.hash;
    var tab    = params.get('tab');

    // Supabase recovery flow: URL has type=recovery in hash or search
    if (tab === 'reset' || hash.indexOf('type=recovery') !== -1 || params.get('type') === 'recovery') {
      showPanel('reset');
      return;
    }

    if (tab === 'signup') {
      showPanel('signup');
      return;
    }

    if (tab === 'forgot') {
      showPanel('forgot');
      return;
    }

    // Default
    showPanel('login');
  }

  // ============================================
  //  PANEL SWITCHING (state machine)
  // ============================================
  function showPanel(name) {
    currentPanel = name;

    Object.keys(panels).forEach(function (key) {
      if (!panels[key]) return;
      if (key === name) {
        panels[key].classList.remove('auth-panel--hidden');
      } else {
        panels[key].classList.add('auth-panel--hidden');
      }
    });

    // Update tab appearance
    tabs.forEach(function (t) {
      var isActive = t.dataset.tab === name;
      t.classList.toggle('auth-tab--active', isActive);
      t.setAttribute('aria-selected', String(isActive));
    });

    // Show/hide tabs (only for login/signup)
    if (tabBar) {
      tabBar.style.display = (name === 'login' || name === 'signup') ? '' : 'none';
      tabBar.setAttribute('data-active', name === 'signup' ? 'signup' : 'login');
    }

    // Clear all errors when switching
    ['login', 'signup', 'forgot', 'reset'].forEach(clearErrors);
  }

  // Tab clicks
  tabs.forEach(function (t) {
    t.addEventListener('click', function () {
      showPanel(t.dataset.tab);
    });
  });

  // data-switch-tab buttons
  document.querySelectorAll('[data-switch-tab]').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      showPanel(btn.dataset.switchTab);
    });
  });

  // Forgot password link
  var forgotBtn = document.getElementById('forgot-password-btn');
  if (forgotBtn) {
    forgotBtn.addEventListener('click', function () {
      showPanel('forgot');
    });
  }


  // ============================================
  //  SHOW / HIDE PASSWORD
  // ============================================
  document.querySelectorAll('.auth-toggle-pw').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var targetId = btn.dataset.target;
      var input = document.getElementById(targetId);
      if (!input) return;
      var isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      btn.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
      var showIcon = btn.querySelector('.pw-icon--show');
      var hideIcon = btn.querySelector('.pw-icon--hide');
      if (showIcon) showIcon.style.display = isPassword ? 'none' : '';
      if (hideIcon) hideIcon.style.display = isPassword ? '' : 'none';
    });
  });


  // ============================================
  //  VALIDATION HELPERS
  // ============================================
  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function showFieldError(fieldId, message) {
    var errorEl = document.getElementById(fieldId + '-error');
    var inputEl = document.getElementById(fieldId);
    if (errorEl) { errorEl.textContent = message; errorEl.hidden = false; }
    if (inputEl) { inputEl.classList.add('auth-input--error'); }
  }

  function showBanner(prefix, message) {
    if (!message) return; // Never show empty error banners
    var banner = document.getElementById(prefix + '-error-banner');
    var text   = document.getElementById(prefix + '-error-text');
    if (banner) banner.hidden = false;
    if (text)   text.textContent = message;
  }

  function hideBanner(prefix) {
    var banner = document.getElementById(prefix + '-error-banner');
    if (banner) banner.hidden = true;
  }

  function clearErrors(prefix) {
    hideBanner(prefix);
    var panel = document.getElementById('panel-' + prefix);
    if (!panel) return;
    panel.querySelectorAll('.auth-field-error').forEach(function (el) { el.hidden = true; el.textContent = ''; });
    panel.querySelectorAll('.auth-input').forEach(function (el) { el.classList.remove('auth-input--error'); });
  }

  // Clear field error + form banner on input
  document.querySelectorAll('.auth-input').forEach(function (input) {
    input.addEventListener('input', function () {
      input.classList.remove('auth-input--error');
      var errEl = document.getElementById(input.id + '-error');
      if (errEl) { errEl.hidden = true; errEl.textContent = ''; }
      // Also hide the form-level error banner for this panel
      var panel = input.closest('.auth-panel');
      if (panel) {
        var banner = panel.querySelector('.auth-error-banner');
        if (banner) banner.hidden = true;
      }
    });
  });


  // ============================================
  //  LOADING STATE
  // ============================================
  function setLoading(btnId, loading) {
    isSubmitting = loading;
    var btn = document.getElementById(btnId);
    if (!btn) return;
    var textEl    = btn.querySelector('.auth-btn__text');
    var spinnerEl = btn.querySelector('.auth-btn__spinner');
    btn.disabled = loading;
    if (textEl)    textEl.style.opacity = loading ? '0' : '1';
    if (spinnerEl) spinnerEl.hidden = !loading;
  }


  // ============================================
  //  LOGIN
  // ============================================
  if (loginForm) {
    loginForm.addEventListener('submit', function (e) {
      e.preventDefault();
      if (isSubmitting) return;
      if (!window.supabaseClient) {
        showBanner('login', 'Authentication service is not available.');
        return;
      }

      clearErrors('login');
      var email    = document.getElementById('login-email').value.trim();
      var password = document.getElementById('login-password').value;
      var valid = true;

      if (!email) { showFieldError('login-email', 'Email is required'); valid = false; }
      else if (!isValidEmail(email)) { showFieldError('login-email', 'Enter a valid email address'); valid = false; }

      if (!password) { showFieldError('login-password', 'Password is required'); valid = false; }
      else if (password.length < 8) { showFieldError('login-password', 'Password must be at least 8 characters'); valid = false; }

      if (!valid) return;

      setLoading('login-submit', true);

      window.supabaseClient.auth.signInWithPassword({ email: email, password: password })
        .then(function (result) {
          setLoading('login-submit', false);
          if (result.error) { showBanner('login', result.error.message); return; }
          window.location.replace('try.html');
        })
        .catch(function () {
          setLoading('login-submit', false);
          showBanner('login', 'Something went wrong. Please try again.');
        });
    });
  }


  // ============================================
  //  SIGNUP
  // ============================================
  if (signupForm) {
    signupForm.addEventListener('submit', function (e) {
      e.preventDefault();
      if (isSubmitting) return;
      if (!window.supabaseClient) {
        showBanner('signup', 'Authentication service is not available.');
        return;
      }

      clearErrors('signup');
      var email    = document.getElementById('signup-email').value.trim();
      var password = document.getElementById('signup-password').value;
      var confirm  = document.getElementById('signup-confirm').value;
      var valid = true;

      if (!email) { showFieldError('signup-email', 'Email is required'); valid = false; }
      else if (!isValidEmail(email)) { showFieldError('signup-email', 'Enter a valid email address'); valid = false; }

      if (!password) { showFieldError('signup-password', 'Password is required'); valid = false; }
      else if (password.length < 8) { showFieldError('signup-password', 'Password must be at least 8 characters'); valid = false; }

      if (!confirm) { showFieldError('signup-confirm', 'Please confirm your password'); valid = false; }
      else if (password !== confirm) { showFieldError('signup-confirm', 'Passwords do not match'); valid = false; }

      if (!valid) return;

      setLoading('signup-submit', true);

      window.supabaseClient.auth.signUp({
        email: email,
        password: password,
        options: {
          emailRedirectTo: window.STACKWISE.URLS.authCallback
        }
      }).then(function (result) {
        setLoading('signup-submit', false);
        if (result.error) { showBanner('signup', result.error.message); return; }

        // Email confirmation required
        if (result.data.user && !result.data.session) {
          if (confirmEmailAddr) confirmEmailAddr.textContent = email;
          if (confirmMessage) confirmMessage.innerHTML = 'We sent a confirmation link to <strong>' + email + '</strong>. Click it to activate your account.';
          showPanel('confirm');
          return;
        }

        // Auto-confirmed
        if (result.data.session) {
          window.location.replace('try.html');
        }
      }).catch(function () {
        setLoading('signup-submit', false);
        showBanner('signup', 'Something went wrong. Please try again.');
      });
    });
  }


  // ============================================
  //  FORGOT PASSWORD
  // ============================================
  if (forgotForm) {
    forgotForm.addEventListener('submit', function (e) {
      e.preventDefault();
      if (isSubmitting) return;
      if (!window.supabaseClient) {
        showBanner('forgot', 'Authentication service is not available.');
        return;
      }

      clearErrors('forgot');
      var email = document.getElementById('forgot-email').value.trim();

      if (!email) { showFieldError('forgot-email', 'Email is required'); return; }
      if (!isValidEmail(email)) { showFieldError('forgot-email', 'Enter a valid email address'); return; }

      setLoading('forgot-submit', true);

      window.supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: window.STACKWISE.URLS.auth + '?tab=reset'
      }).then(function (result) {
        setLoading('forgot-submit', false);
        if (result.error) { showBanner('forgot', result.error.message); return; }
        if (confirmEmailAddr) confirmEmailAddr.textContent = email;
        if (confirmMessage) confirmMessage.innerHTML = 'We sent a password reset link to <strong>' + email + '</strong>. Check your inbox.';
        showPanel('confirm');
      }).catch(function () {
        setLoading('forgot-submit', false);
        showBanner('forgot', 'Something went wrong. Please try again.');
      });
    });
  }


  // ============================================
  //  RESET PASSWORD (set new password)
  // ============================================
  if (resetForm) {
    resetForm.addEventListener('submit', function (e) {
      e.preventDefault();
      if (isSubmitting) return;
      if (!window.supabaseClient) {
        showBanner('reset', 'Authentication service is not available.');
        return;
      }

      clearErrors('reset');
      var password = document.getElementById('reset-password').value;
      var confirm  = document.getElementById('reset-confirm').value;
      var valid = true;

      if (!password) { showFieldError('reset-password', 'Password is required'); valid = false; }
      else if (password.length < 8) { showFieldError('reset-password', 'Password must be at least 8 characters'); valid = false; }

      if (!confirm) { showFieldError('reset-confirm', 'Please confirm your password'); valid = false; }
      else if (password !== confirm) { showFieldError('reset-confirm', 'Passwords do not match'); valid = false; }

      if (!valid) return;

      setLoading('reset-submit', true);

      window.supabaseClient.auth.updateUser({ password: password })
        .then(function (result) {
          setLoading('reset-submit', false);
          if (result.error) { showBanner('reset', result.error.message); return; }
          // Password updated — redirect to try page
          window.location.replace('try.html');
        })
        .catch(function () {
          setLoading('reset-submit', false);
          showBanner('reset', 'Something went wrong. Please try again.');
        });
    });
  }


  // ============================================
  //  GOOGLE OAUTH
  // ============================================
  function handleGoogleAuth() {
    if (!window.supabaseClient) return;
    window.supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.STACKWISE.URLS.authCallback
      }
    }).then(function (result) {
      if (result.error) {
        // Show error in whichever panel is active
        var prefix = currentPanel === 'signup' ? 'signup' : 'login';
        showBanner(prefix, result.error.message || 'Google sign-in failed. Make sure the Google provider is enabled in Supabase.');
      }
    });
  }

  var googleLoginBtn  = document.getElementById('google-login-btn');
  var googleSignupBtn = document.getElementById('google-signup-btn');
  if (googleLoginBtn)  googleLoginBtn.addEventListener('click', handleGoogleAuth);
  if (googleSignupBtn) googleSignupBtn.addEventListener('click', handleGoogleAuth);


  // ============================================
  //  KEYBOARD: Escape = go back to login
  // ============================================
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && (currentPanel === 'forgot' || currentPanel === 'confirm')) {
      showPanel('login');
    }
  });


  // ============================================
  //  LISTEN FOR AUTH STATE CHANGES (recovery)
  // ============================================
  if (window.supabaseClient) {
    window.supabaseClient.auth.onAuthStateChange(function (event, session) {
      if (event === 'PASSWORD_RECOVERY') {
        showPanel('reset');
      }
    });
  }


  // ============================================
  //  INIT
  // ============================================
  checkExistingSession();
  detectResetMode();

})();
