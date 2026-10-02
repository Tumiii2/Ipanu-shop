(function () {
  var btn = document.getElementById('menu-toggle');
  var nav = document.querySelector('header nav');
  if (!btn || !nav) return;
  btn.addEventListener('click', function () {
    var open = nav.classList.toggle('nav-open');
    btn.classList.toggle('is-open', open);
    btn.setAttribute('aria-expanded', open);
  });
})();

(async function () {
  const slot = document.getElementById('authSlot');
  if (!slot || typeof initAuth !== 'function') return;
  try {
    await initAuth();
    const session = await getSession();
    if (session) {
      const meta = session.user.user_metadata || {};
      const name = (meta.full_name || session.user.email || '').split(' ')[0];
      const hi = document.createElement('span');
      hi.className = 'auth-hi';
      hi.textContent = 'Hi, ' + name;
      const out = document.createElement('button');
      out.className = 'auth-btn';
      out.textContent = 'Sign out';
      out.onclick = signOutUser;
      slot.append(hi, out);
    } else {
      const btn = document.createElement('button');
      btn.className = 'auth-btn auth-btn-solid';
      btn.textContent = 'Sign in';
      btn.onclick = () => supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.href },
      });
      slot.append(btn);
    }
  } catch (err) { console.error(err); }
})();