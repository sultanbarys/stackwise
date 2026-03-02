/* ============================================
   STACKWISE — BILLING PAGE LOGIC
   Session guard, subscription display,
   plan selection, Stripe checkout.
   ============================================ */
(function () {
  'use strict';

  var authState = { user: null, session: null };
  var subState  = { status: 'free', plan: null, priceId: null, periodEnd: null, hasCustomer: false };

  // ---- DOM refs ----
  var billingLoading  = document.getElementById('billing-loading');
  var billingContent  = document.getElementById('billing-content');
  var billingSuccess  = document.getElementById('billing-success');
  var billingCanceled = document.getElementById('billing-canceled');
  var billingError    = document.getElementById('billing-error');
  var billingErrorText = document.getElementById('billing-error-text');
  var planName        = document.getElementById('billing-plan-name');
  var statusBadge     = document.getElementById('billing-status-badge');
  var planDetail      = document.getElementById('billing-plan-detail');
  var billingActions  = document.getElementById('billing-actions');
  var plansSection    = document.getElementById('billing-plans-section');

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
    checkUrlParams();
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
  }


  // ============================================
  //  CHECK URL PARAMS (success/canceled)
  // ============================================
  function checkUrlParams() {
    var params = new URLSearchParams(window.location.search);

    if (params.get('success') === '1' || params.get('checkout') === 'success') {
      if (billingSuccess) billingSuccess.hidden = false;
      // Clean URL
      var url = new URL(window.location.href);
      url.searchParams.delete('success');
      url.searchParams.delete('checkout');
      window.history.replaceState({}, '', url.toString());
    }

    if (params.get('canceled') === '1' || params.get('checkout') === 'cancel') {
      if (billingCanceled) billingCanceled.hidden = false;
      var url2 = new URL(window.location.href);
      url2.searchParams.delete('canceled');
      url2.searchParams.delete('checkout');
      window.history.replaceState({}, '', url2.toString());
    }
  }


  // ============================================
  //  CHECK SUBSCRIPTION (server-side verified)
  // ============================================
  function checkSubscription() {
    var token = authState.session.access_token;

    fetch(window.STACKWISE.API_BASE + '/subscription-status', {
      method: 'GET',
      headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(function (res) { return res.json(); })
    .then(function (data) {
      subState.status = data.status || 'free';
      subState.plan = data.plan || null;
      subState.priceId = data.price_id || null;
      subState.periodEnd = data.current_period_end || null;
      subState.hasCustomer = data.has_customer || false;
      renderBilling();
    })
    .catch(function () {
      // Fallback: direct Supabase query
      window.supabaseClient
        .from('subscriptions')
        .select('status, plan, price_id, current_period_end, stripe_customer_id')
        .eq('user_id', authState.user.id)
        .maybeSingle()
        .then(function (result) {
          if (result.data) {
            subState.status = result.data.status || 'free';
            subState.plan = result.data.plan || null;
            subState.priceId = result.data.price_id || null;
            subState.periodEnd = result.data.current_period_end || null;
            subState.hasCustomer = !!result.data.stripe_customer_id;
          }
          renderBilling();
        })
        .catch(function () {
          renderBilling();
        });
    });
  }


  // ============================================
  //  RENDER BILLING
  // ============================================
  function renderBilling() {
    if (billingLoading) billingLoading.hidden = true;
    if (billingContent) billingContent.hidden = false;

    var isActive = subState.status === 'active' || subState.status === 'trialing';
    var isCanceled = subState.status === 'canceled';
    var isPastDue = subState.status === 'past_due';

    // Plan name
    if (planName) {
      if (isActive) {
        planName.textContent = getPlanLabel(subState.plan || subState.priceId);
      } else {
        planName.textContent = 'Free';
      }
    }

    // Status badge
    if (statusBadge) {
      if (isActive) {
        statusBadge.innerHTML = '<span class="billing-plan-card__status billing-plan-card__status--active">● Active</span>';
      } else if (isCanceled) {
        statusBadge.innerHTML = '<span class="billing-plan-card__status billing-plan-card__status--canceled">● Canceled</span>';
      } else if (isPastDue) {
        statusBadge.innerHTML = '<span class="billing-plan-card__status billing-plan-card__status--past_due">● Past due</span>';
      } else {
        statusBadge.innerHTML = '<span class="billing-plan-card__status billing-plan-card__status--free">● Free</span>';
      }
    }

    // Plan detail
    if (planDetail) {
      if (isActive && subState.periodEnd) {
        var d = new Date(subState.periodEnd);
        planDetail.textContent = 'Renews on ' + d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      } else if (isCanceled) {
        planDetail.textContent = 'Your subscription has been canceled. You can re-subscribe below.';
      } else if (isPastDue) {
        planDetail.textContent = 'Your payment is past due. Please update your payment method.';
      } else {
        planDetail.textContent = 'You\'re on the free plan. Upgrade to unlock all features.';
      }
    }

    // Actions
    if (billingActions) {
      billingActions.innerHTML = '';
      if (isActive) {
        var btnDash = document.createElement('a');
        btnDash.href = 'app.html';
        btnDash.className = 'btn btn--primary btn--sm';
        btnDash.textContent = 'Go to dashboard';
        billingActions.appendChild(btnDash);
      } else {
        var btnUpgrade = document.createElement('a');
        btnUpgrade.href = '#billing-plans-section';
        btnUpgrade.className = 'btn btn--primary btn--sm';
        btnUpgrade.textContent = 'Upgrade now';
        btnUpgrade.addEventListener('click', function (e) {
          e.preventDefault();
          if (plansSection) plansSection.scrollIntoView({ behavior: 'smooth' });
        });
        billingActions.appendChild(btnUpgrade);
      }
    }

    // Show/hide plans section
    if (plansSection) {
      plansSection.hidden = isActive;
    }

    // Mark current plan
    if (isActive && subState.priceId) {
      document.querySelectorAll('.billing-plan').forEach(function (el) {
        var btn = el.querySelector('[data-plan]');
        if (btn) {
          var planPriceId = window.STACKWISE.STRIPE_PRICES[btn.dataset.plan];
          if (planPriceId === subState.priceId) {
            el.classList.add('billing-plan--current');
            btn.disabled = true;
            btn.textContent = 'Current plan';
          }
        }
      });
    }
  }

  function getPlanLabel(value) {
    if (!value) return 'Active';
    var v = String(value).toLowerCase();
    if (v.indexOf('starter') !== -1) return 'Starter';
    if (v.indexOf('growth') !== -1) return 'Growth';
    if (v.indexOf('pro') !== -1) return 'Pro';
    return 'Active';
  }


  // ============================================
  //  STRIPE CHECKOUT
  // ============================================
  function startCheckout(planKey) {
    var priceId = window.STACKWISE.STRIPE_PRICES[planKey];
    if (!priceId || priceId.indexOf('REPLACE') !== -1) {
      showError('Stripe is not configured yet. Please contact support.');
      return;
    }

    var token = authState.session.access_token;

    // Disable all plan buttons
    document.querySelectorAll('[data-plan]').forEach(function (btn) {
      btn.disabled = true;
      if (btn.dataset.plan === planKey) {
        btn.textContent = 'Redirecting…';
      }
    });

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
        showError(data.error || 'Could not start checkout. Please try again.');
        resetPlanButtons();
      }
    })
    .catch(function () {
      showError('Network error. Please check your connection and try again.');
      resetPlanButtons();
    });
  }

  function resetPlanButtons() {
    var labels = { starter_monthly: 'Choose Starter', growth_monthly: 'Choose Growth', pro_monthly: 'Choose Pro' };
    document.querySelectorAll('[data-plan]').forEach(function (btn) {
      btn.disabled = false;
      if (labels[btn.dataset.plan]) btn.textContent = labels[btn.dataset.plan];
    });
  }

  function showError(msg) {
    if (billingError && billingErrorText && msg) {
      billingErrorText.textContent = msg;
      billingError.hidden = false;
    }
  }

  // Bind plan buttons
  document.querySelectorAll('[data-plan]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      startCheckout(btn.dataset.plan);
    });
  });


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
