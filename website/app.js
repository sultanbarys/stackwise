/* ============================================
   STACKWISE — APP / DASHBOARD LOGIC
   Session guard, subscription check, paywall,
   Stripe checkout integration.
   ============================================ */
(function () {
  'use strict';

  var authState = { user: null, session: null };
  var subState  = { status: 'free', plan: null, periodEnd: null };

  // ---- DOM refs ----
  var dashLoading   = document.getElementById('dash-loading');
  var dashContent   = document.getElementById('dash-content');
  var dashGreeting  = document.getElementById('dash-greeting');
  var dashPlanName  = document.getElementById('dash-plan-name');
  var dashPlanDetail = document.getElementById('dash-plan-detail');
  var dashSubPanel  = document.getElementById('dash-sub-panel');
  var paywall       = document.getElementById('paywall');
  var btnUpgrade    = document.getElementById('btn-upgrade-plan');
  var checkoutBanner = document.getElementById('checkout-success');

  // Nav refs
  var navAuthOut = document.getElementById('nav-auth-out');
  var navAuthIn  = document.getElementById('nav-auth-in');
  var navEmail   = document.getElementById('nav-user-email');
  var mobileAuthOut = document.getElementById('mobile-auth-out');
  var mobileAuthIn  = document.getElementById('mobile-auth-in');


  // ============================================
  //  SESSION GUARD
  // ============================================
  function guardSession() {
    if (!window.supabaseClient) {
      window.location.replace('auth.html');
      return;
    }

    window.supabaseClient.auth.getSession().then(function (result) {
      if (!result.data || !result.data.session) {
        window.location.replace('auth.html?tab=login');
        return;
      }
      authState.session = result.data.session;
      authState.user = result.data.session.user;
      onSessionReady();
    }).catch(function () {
      window.location.replace('auth.html?tab=login');
    });
  }


  // ============================================
  //  ON SESSION READY
  // ============================================
  function onSessionReady() {
    updateNavUI();
    checkSubscription();
    checkCheckoutSuccess();
  }


  // ============================================
  //  NAV UI UPDATE
  // ============================================
  function updateNavUI() {
    var isLoggedIn = !!authState.user;
    var email = isLoggedIn ? (authState.user.email || '') : '';

    if (navAuthOut) navAuthOut.hidden = isLoggedIn;
    if (navAuthIn)  navAuthIn.hidden = !isLoggedIn;
    if (navEmail)   navEmail.textContent = email;

    if (mobileAuthOut) mobileAuthOut.hidden = isLoggedIn;
    if (mobileAuthIn)  mobileAuthIn.hidden = !isLoggedIn;

    if (dashGreeting) {
      var name = email.split('@')[0] || 'there';
      dashGreeting.textContent = 'Welcome back, ' + name;
    }
  }


  // ============================================
  //  CHECK SUBSCRIPTION (server-side verified)
  // ============================================
  function checkSubscription() {
    // Primary: server-side verification via /api/subscription-status
    var token = authState.session.access_token;
    fetch(window.STACKWISE.API_BASE + '/subscription-status', {
      method: 'GET',
      headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(function (res) { return res.json(); })
    .then(function (data) {
      if (data && (data.status === 'active' || data.status === 'trialing')) {
        subState.status = data.status;
        subState.plan = data.plan || data.price_id;
        subState.periodEnd = data.current_period_end;
      }
      renderDashboard();
    })
    .catch(function () {
      // Fallback: direct Supabase query (works offline / if API is down)
      window.supabaseClient
        .from('subscriptions')
        .select('status, plan, price_id, current_period_end')
        .eq('user_id', authState.user.id)
        .maybeSingle()
        .then(function (result) {
          if (result.data && (result.data.status === 'active' || result.data.status === 'trialing')) {
            subState.status = result.data.status;
            subState.plan = result.data.plan || result.data.price_id;
            subState.periodEnd = result.data.current_period_end;
          }
          renderDashboard();
        })
        .catch(function () {
          renderDashboard();
        });
    });
  }


  // ============================================
  //  RENDER DASHBOARD
  // ============================================
  function renderDashboard() {
    if (dashLoading) dashLoading.hidden = true;
    if (dashContent) dashContent.hidden = false;

    var isActive = subState.status === 'active' || subState.status === 'trialing';

    if (dashPlanName) {
      dashPlanName.textContent = isActive ? getPlanLabel(subState.plan) : 'Free';
    }

    if (dashPlanDetail) {
      if (isActive && subState.periodEnd) {
        var d = new Date(subState.periodEnd);
        dashPlanDetail.textContent = 'Renews ' + d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      } else {
        dashPlanDetail.textContent = 'Limited to sample data';
      }
    }

    if (btnUpgrade) {
      btnUpgrade.style.display = isActive ? 'none' : '';
    }

    // Show/hide manage billing link
    var btnManageBilling = document.getElementById('btn-manage-billing');
    if (btnManageBilling) {
      btnManageBilling.style.display = isActive ? '' : 'none';
    }

    if (paywall) {
      paywall.hidden = isActive;
    }

    // Block upload card for free users
    var cardUpload = document.getElementById('card-upload');
    var btnUploadCsv = document.getElementById('btn-upload-csv');
    if (!isActive && btnUploadCsv) {
      btnUploadCsv.addEventListener('click', function (e) {
        e.preventDefault();
        if (paywall) {
          paywall.hidden = false;
          paywall.scrollIntoView({ behavior: 'smooth' });
        }
      });
    }
  }

  function getPlanLabel(priceId) {
    if (!priceId) return 'Active';
    if (priceId.indexOf('starter') !== -1) return 'Starter';
    if (priceId.indexOf('growth') !== -1) return 'Growth';
    if (priceId.indexOf('pro') !== -1) return 'Pro';
    return 'Active';
  }


  // ============================================
  //  STRIPE CHECKOUT
  // ============================================
  function startCheckout(planKey) {
    var priceId = window.STACKWISE.STRIPE_PRICES[planKey];
    if (!priceId || priceId.indexOf('REPLACE') !== -1) {
      alert('Stripe is not configured yet. Set your price IDs in config.js.');
      return;
    }

    var token = authState.session.access_token;

    fetch(window.STACKWISE.API_BASE + '/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({ priceId: priceId })
    })
    .then(function (res) { return res.json(); })
    .then(function (data) {
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Could not create checkout session.');
      }
    })
    .catch(function () {
      alert('Network error. Please try again.');
    });
  }

  // Bind plan buttons
  document.querySelectorAll('[data-plan]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      startCheckout(btn.dataset.plan);
    });
  });

  // Upgrade button -> scroll to paywall
  if (btnUpgrade) {
    btnUpgrade.addEventListener('click', function (e) {
      e.preventDefault();
      if (paywall) {
        paywall.hidden = false;
        paywall.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }


  // ============================================
  //  CHECKOUT SUCCESS DETECTION
  // ============================================
  function checkCheckoutSuccess() {
    var params = new URLSearchParams(window.location.search);
    if (params.get('checkout') === 'success' && checkoutBanner) {
      checkoutBanner.hidden = false;
      // Clean URL
      var url = new URL(window.location.href);
      url.searchParams.delete('checkout');
      window.history.replaceState({}, '', url.toString());
    }
  }


  // ============================================
  //  LOGOUT
  // ============================================
  function bindLogout() {
    ['btn-header-logout', 'btn-mobile-logout'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) {
        el.addEventListener('click', function () {
          window.supabaseClient.auth.signOut().then(function () {
            window.location.replace('auth.html');
          });
        });
      }
    });
  }


  // ============================================
  //  AUTH STATE LISTENER
  // ============================================
  function listenAuthChanges() {
    if (!window.supabaseClient) return;
    window.supabaseClient.auth.onAuthStateChange(function (event, session) {
      if (!session) {
        window.location.replace('auth.html');
      } else {
        authState.session = session;
        authState.user = session.user;
        updateNavUI();
      }
    });
  }


  // ============================================
  //  INIT
  // ============================================
  guardSession();
  bindLogout();
  listenAuthChanges();

})();
