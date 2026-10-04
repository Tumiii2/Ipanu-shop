(function () {
  var btn = document.getElementById('menu-toggle');
  var nav = document.getElementById('primary-navigation');
  var overlay = document.getElementById('navigation-overlay');
  if (!btn || !nav || !overlay) return;

  function closeMenu() {
    nav.classList.remove('nav-open');
    btn.classList.remove('is-open');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-label', 'Menu');
    overlay.classList.remove('is-visible');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('menu-open');
  }

  function openMenu() {
    nav.classList.add('nav-open');
    btn.classList.add('is-open');
    btn.setAttribute('aria-expanded', 'true');
    btn.setAttribute('aria-label', 'Close menu');
    overlay.classList.add('is-visible');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('menu-open');
  }

  btn.addEventListener('click', function () {
    if (btn.getAttribute('aria-expanded') === 'true') closeMenu();
    else openMenu();
  });

  overlay.addEventListener('click', closeMenu);
  nav.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', closeMenu);
  });

  var mobileCart = document.querySelector('.mobile-cart');
  if (mobileCart) mobileCart.addEventListener('click', closeMenu);

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') closeMenu();
  });

  window.addEventListener('resize', function () {
    if (window.innerWidth >= 768) closeMenu();
  });
})();

(async function () {
  const slot = document.getElementById('authSlot');
  if (typeof updateCartCount === 'function') updateCartCount();
  var authForm = document.getElementById('authForm');
  var authError = document.getElementById('authError');
  var authSubmitButtons = authForm ? authForm.querySelectorAll('button[type="submit"]') : [];

  function friendlyAuthError(error, isSignup) {
    var message = error && error.message ? error.message.toLowerCase() : '';
    if (message.includes('email not confirmed') || message.includes('confirm your email')) {
      return isSignup
        ? 'Please check your email to confirm your account, then log in.'
        : 'Please check your email to confirm your account';
    }
    if (message.includes('invalid login credentials') || message.includes('invalid password')) return 'Wrong email or password';
    if (message.includes('already registered') || message.includes('already exists')) return 'An account with this email already exists. Try logging in.';
    if (message.includes('invalid email')) return 'Enter a valid email address.';
    if (message.includes('password') && (message.includes('short') || message.includes('at least'))) return 'Your password must be at least 6 characters.';
    return 'We could not complete sign-in. Please check your details and try again.';
  }

  function showAuthError(message) {
    authError.textContent = message;
    authError.classList.remove('hidden');
  }

  function finishAuth() {
    window.location.href = getAuthRedirectPage();
  }

  if (authForm && authError) {
    authForm.addEventListener('submit', async function (event) {
      event.preventDefault();
      authError.textContent = '';
      authError.classList.add('hidden');
      var email = authForm.elements.email.value.trim();
      var password = authForm.elements.password.value;
      var mode = event.submitter && event.submitter.value || 'login';
      authSubmitButtons.forEach(function (button) { button.disabled = true; });

      try {
        if (typeof supabaseClient === 'undefined' || !supabaseClient) await initAuth();
        if (mode === 'signup') {
          var signup = await signUpWithEmail(email, password);
          if (signup.error) {
            showAuthError(friendlyAuthError(signup.error, true));
            return;
          }
          if (signup.data && signup.data.session) {
            finishAuth();
            return;
          }
          var signupLogin = await signInWithEmail(email, password);
          if (signupLogin.error) {
            showAuthError(friendlyAuthError(signupLogin.error, true));
            return;
          }
          if (signupLogin.data && signupLogin.data.session) {
            finishAuth();
            return;
          }
          showAuthError('Please check your email to confirm your account, then log in.');
          return;
        }

        var login = await signInWithEmail(email, password);
        if (login.error) {
          showAuthError(friendlyAuthError(login.error, false));
          return;
        }
        if (login.data && login.data.session) {
          finishAuth();
          return;
        }
        showAuthError('We could not complete sign-in. Please try again.');
      } catch (error) {
        showAuthError(friendlyAuthError(error, mode === 'signup'));
      } finally {
        authSubmitButtons.forEach(function (button) { button.disabled = false; });
      }
    });

    var googleButton = document.getElementById('authGoogleBtn');
    googleButton.addEventListener('click', async function () {
      authError.textContent = '';
      authError.classList.add('hidden');
      googleButton.disabled = true;
      try {
        if (typeof supabaseClient === 'undefined' || !supabaseClient) await initAuth();
        await signInWithGoogle();
      } catch (error) {
        showAuthError(friendlyAuthError(error, false));
        googleButton.disabled = false;
      }
    });
  }

  if (!slot) return;

  function renderAuth(session) {
    var user = session && session.user;
    var metadata = user && user.user_metadata || {};
    var rawName = user && (metadata.full_name || metadata.name || (user.email && user.email.split('@')[0]));
    var firstName = rawName ? rawName.trim().split(/\s+/)[0] : 'Guest';
    var row = document.createElement('div');
    row.className = 'auth-row';

    if (user) {
      var avatar = document.createElement('span');
      avatar.className = 'auth-avatar';
      avatar.setAttribute('aria-hidden', 'true');
      avatar.textContent = firstName.charAt(0).toUpperCase() || 'G';

      var greeting = document.createElement('span');
      greeting.className = 'auth-hi';
      greeting.textContent = 'Hi, ' + firstName;

      var signOut = document.createElement('button');
      signOut.type = 'button';
      signOut.className = 'auth-btn';
      signOut.textContent = 'Sign out';
      signOut.addEventListener('click', function () {
        signOutUser().catch(function (error) { console.error(error); });
      });
      row.append(avatar, greeting, signOut);
    } else {
      var signIn = document.createElement('a');
      var currentPage = window.location.pathname.split('/').pop() || 'index.html';
      if (!/^[a-z0-9_-]+\.html$/i.test(currentPage)) currentPage = 'index.html';
      signIn.href = 'login.html?redirect=' + encodeURIComponent(currentPage);
      signIn.className = 'auth-btn auth-btn-solid';
      signIn.textContent = 'Sign in';
      row.append(signIn);
    }
    slot.replaceChildren(row);
  }

  function renderGuest() {
    renderAuth(null);
  }

  if (typeof initAuth !== 'function' || typeof getSession !== 'function') {
    renderGuest();
    return;
  }

  try {
    await initAuth();
    const session = await getSession();
    renderAuth(session);
    if (typeof syncCartFromServer === 'function') {
      syncCartFromServer().catch(function (error) { console.error(error); });
    }
  } catch (error) {
    console.error(error);
    renderGuest();
  }
})();