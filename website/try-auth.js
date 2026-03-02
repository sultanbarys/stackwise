/* ============================================
   STACKWISE — TRY PAGE AUTH INTEGRATION
   No modal — auth is handled by /auth.html.
   This file manages: header UI, guest overlay,
   paywall, profile fetch, logout.
   ============================================ */
(function () {
  'use strict';

  var authState   = { user: null, session: null };
  var profileState = { subscription_status: 'free' };

  // ---- Toast ----
  function showToast(message, type) {
    type = type || 'info';
    var container = document.getElementById('toast-container');
    if (!container) return;
    var toast = document.createElement('div');
    toast.className = 'toast toast--' + type;
    toast.textContent = message;
    container.appendChild(toast);
    requestAnimationFrame(function () { toast.classList.add('toast--visible'); });
    setTimeout(function () {
      toast.classList.remove('toast--visible');
      setTimeout(function () { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 300);
    }, 4000);
  }

  // ============================================
  //  HEADER UI
  // ============================================
  function updateUI() {
    var isLoggedIn = !!authState.user;
    var email = isLoggedIn ? (authState.user.email || '') : '';

    var navAuthOut = document.getElementById('nav-auth-out');
    var navAuthIn  = document.getElementById('nav-auth-in');
    var navUserEmail = document.getElementById('nav-user-email');
    if (navAuthOut) navAuthOut.hidden = isLoggedIn;
    if (navAuthIn)  navAuthIn.hidden = !isLoggedIn;
    if (navUserEmail) navUserEmail.textContent = email;

    var mobileAuthOut = document.getElementById('mobile-auth-out');
    var mobileAuthIn  = document.getElementById('mobile-auth-in');
    var mobileUserEmail = document.getElementById('mobile-user-email');
    if (mobileAuthOut) mobileAuthOut.hidden = isLoggedIn;
    if (mobileAuthIn)  mobileAuthIn.hidden = !isLoggedIn;
    if (mobileUserEmail) mobileUserEmail.textContent = email;

    document.body.classList.toggle('is-guest', !isLoggedIn);
    document.body.classList.toggle('is-logged-in', isLoggedIn);

    // Guest overlay visibility
    var guestOverlay = document.getElementById('guest-overlay');
    var resultsSection = document.getElementById('try-results');
    if (guestOverlay) {
      guestOverlay.hidden = isLoggedIn || !resultsSection || resultsSection.hidden;
    }

    updatePaywall();
  }


  // ============================================
  //  PAYWALL
  // ============================================
  function updatePaywall() {
    var isPro = profileState.subscription_status === 'active';
    var isLoggedIn = !!authState.user;

    var upgradeBanner = document.getElementById('upgrade-banner');
    if (upgradeBanner) {
      upgradeBanner.hidden = !isLoggedIn || isPro;
    }

    var btnSave = document.getElementById('btn-save');
    if (btnSave) {
      if (!isLoggedIn) {
        btnSave.disabled = true;
        btnSave.title = 'Log in to save results';
      } else if (!isPro) {
        btnSave.disabled = true;
        btnSave.title = 'Upgrade to Pro to save results';
      } else {
        btnSave.disabled = false;
        btnSave.title = '';
      }
    }

    var btnMagicLink = document.getElementById('btn-magic-link');
    if (btnMagicLink) btnMagicLink.style.display = isLoggedIn ? 'none' : '';

    var gateForm = document.getElementById('gate-form');
    var gateSuccess = document.getElementById('gate-success');
    if (isLoggedIn && gateForm) gateForm.style.display = 'none';
    if (isLoggedIn && gateSuccess) gateSuccess.hidden = true;
  }


  // ============================================
  //  FETCH PROFILE (server-side verified)
  // ============================================
  function fetchProfile() {
    if (!authState.user || !authState.session) return;

    var token = authState.session.access_token;
    fetch(window.STACKWISE.API_BASE + '/subscription-status', {
      method: 'GET',
      headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(function (res) { return res.json(); })
    .then(function (data) {
      if (data && (data.status === 'active' || data.status === 'trialing')) {
        profileState.subscription_status = 'active';
      } else {
        profileState.subscription_status = 'free';
      }
      updatePaywall();
    })
    .catch(function () {
      // Fallback: direct Supabase query
      window.supabaseClient
        .from('subscriptions')
        .select('status')
        .eq('user_id', authState.user.id)
        .maybeSingle()
        .then(function (result) {
          if (result.data && (result.data.status === 'active' || result.data.status === 'trialing')) {
            profileState.subscription_status = 'active';
          } else {
            profileState.subscription_status = 'free';
          }
          updatePaywall();
        })
        .catch(function () {
          updatePaywall();
        });
    });
  }

  // ============================================
  //  GUEST OVERLAY observer
  // ============================================
  var resultsEl = document.getElementById('try-results');
  if (resultsEl) {
    var observer = new MutationObserver(function () {
      var guestOverlay = document.getElementById('guest-overlay');
      if (guestOverlay) {
        guestOverlay.hidden = !!authState.user || resultsEl.hidden;
      }
    });
    observer.observe(resultsEl, { attributes: true, attributeFilter: ['hidden'] });
  }


  // ============================================
  //  BIND BUTTONS
  // ============================================
  function bindButtons() {
    // Logout
    ['btn-header-logout', 'btn-mobile-logout'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) {
        el.addEventListener('click', function () {
          window.supabaseClient.auth.signOut().then(function () {
            showToast('Logged out', 'info');
          });
        });
      }
    });

    // Overlay signup link
    var btnOverlaySignup = document.getElementById('btn-overlay-signup');
    if (btnOverlaySignup) {
      btnOverlaySignup.addEventListener('click', function () {
        window.location.href = 'auth.html?tab=signup';
      });
    }

    // Pricing buttons
    ['btn-pricing-free', 'btn-pricing-pro', 'btn-pricing-team', 'btn-upgrade'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) {
        el.addEventListener('click', function () {
          if (!authState.user) {
            window.location.href = 'auth.html?tab=signup';
            return;
          }
          window.location.href = 'billing.html';
        });
      }
    });
  }


  // ============================================
  //  INIT
  // ============================================
  function init() {
    if (!window.supabaseClient) {
      updateUI();
      bindButtons();
      return;
    }

    window.supabaseClient.auth.getSession().then(function (result) {
      if (result.data && result.data.session) {
        authState.session = result.data.session;
        authState.user = result.data.session.user;
        fetchProfile();
      }
      updateUI();
      bindButtons();
    }).catch(function () {
      updateUI();
      bindButtons();
    });

    window.supabaseClient.auth.onAuthStateChange(function (event, session) {
      if (session) {
        authState.session = session;
        authState.user = session.user;
        fetchProfile();
      } else {
        authState.session = null;
        authState.user = null;
        profileState.subscription_status = 'free';
      }
      updateUI();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
