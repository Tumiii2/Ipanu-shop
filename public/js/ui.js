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
  if (!slot) return;

  function renderAuth(session) {
    var user = session && session.user;
    var metadata = user && user.user_metadata || {};
    var rawName = user && (metadata.full_name || metadata.name || (user.email && user.email.split('@')[0]));
    var firstName = rawName ? rawName.trim().split(/\s+/)[0] : 'Guest';
    var row = document.createElement('div');
    row.className = 'auth-row';

    var avatar = document.createElement('span');
    avatar.className = 'auth-avatar';
    avatar.setAttribute('aria-hidden', 'true');
    avatar.textContent = firstName.charAt(0).toUpperCase() || 'G';

    var greeting = document.createElement('span');
    greeting.className = 'auth-hi';
    greeting.textContent = 'Hi, ' + firstName;

    var action = document.createElement('button');
    action.className = user ? 'auth-btn' : 'auth-btn auth-btn-solid';
    action.textContent = user ? 'Sign out' : 'Sign in with Google';
    action.addEventListener('click', function () {
      var handler = user
        ? (typeof signOutUser === 'function' ? signOutUser : null)
        : (typeof signInWithGoogle === 'function' ? signInWithGoogle : null);
      if (typeof handler === 'function') {
        Promise.resolve(handler()).catch(function (error) { console.error(error); });
      }
    });

    row.append(avatar, greeting, action);
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
  } catch (error) {
    console.error(error);
    renderGuest();
  }
})();