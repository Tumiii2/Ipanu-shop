let supabaseClient = null;
let supabaseInitPromise = null;

async function initAuth() {
  if (supabaseClient) return supabaseClient;
  if (!supabaseInitPromise) {
    supabaseInitPromise = (async function () {
      const res = await fetch('/api/config');
      const cfg = await res.json();
      supabaseClient = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
      return supabaseClient;
    })();
  }
  try {
    return await supabaseInitPromise;
  } catch (error) {
    supabaseInitPromise = null;
    throw error;
  }
}

function getAuthRedirectPage() {
  const requestedPage = new URLSearchParams(window.location.search).get('redirect');
  return requestedPage && /^[a-z0-9_-]+\.html$/i.test(requestedPage) ? requestedPage : 'index.html';
}

async function signInWithGoogle() {
  if (!supabaseClient) await initAuth();
  const { data, error } = await supabaseClient.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin + '/' + getAuthRedirectPage() },
  });
  if (error) throw error;
  return { data, error };
}

async function signUpWithEmail(email, password) {
  try {
    const { data, error } = await supabaseClient.auth.signUp({ email, password });
    if (!error && data && data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      window.dispatchEvent(new Event('paws:duplicate-email-signup'));
      return { data, error: { message: 'An account already exists' } };
    }
    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
}

async function signInWithEmail(email, password) {
  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
}

async function signOutUser() {
  await supabaseClient.auth.signOut();
  window.location.reload();
}

async function getSession() {
  const { data } = await supabaseClient.auth.getSession();
  return data.session;
}

function initializePasswordToggles() {
  document.querySelectorAll('[data-password-toggle]').forEach(function (button) {
    const input = document.getElementById(button.getAttribute('aria-controls'));
    if (!input) return;
    const eyeIcon = button.querySelector('[data-eye-icon]');
    const eyeOffIcon = button.querySelector('[data-eye-off-icon]');

    button.addEventListener('click', function () {
      const showPassword = input.type === 'password';
      input.type = showPassword ? 'text' : 'password';
      button.setAttribute('aria-label', showPassword ? 'Hide password' : 'Show password');
      if (eyeIcon) eyeIcon.classList.toggle('hidden', !showPassword);
      if (eyeOffIcon) eyeOffIcon.classList.toggle('hidden', showPassword);
    });
  });
}

function initializeLoginButtons() {
  const form = document.getElementById('authForm');
  if (!form || typeof form.requestSubmit !== 'function') return;

  form.querySelectorAll('[data-auth-submit]').forEach(function (button) {
    button.addEventListener('click', function () {
      button.type = 'submit';
      try {
        form.requestSubmit(button);
      } finally {
        button.type = 'button';
      }
    });
  });
}

function initializeForgotPassword() {
  const link = document.getElementById('forgotPasswordLink');
  const panel = document.getElementById('forgotPasswordPanel');
  const form = document.getElementById('resetRequestForm');
  const status = document.getElementById('resetRequestStatus');
  if (!link || !panel || !form || !status) return;

  link.addEventListener('click', function (event) {
    event.preventDefault();
    panel.classList.toggle('hidden');
    if (!panel.classList.contains('hidden')) {
      const loginEmail = document.getElementById('authEmail');
      const resetEmail = form.querySelector('[name="email"]');
      if (loginEmail && loginEmail.value && !resetEmail.value) resetEmail.value = loginEmail.value;
      resetEmail.focus();
    }
  });

  const emailInput = form.querySelector('[name="email"]');
  const button = form.querySelector('button[type="button"]');
  button.addEventListener('click', async function () {
    const email = emailInput.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      status.classList.remove('text-green-700');
      status.classList.add('text-red-700');
      status.textContent = 'Please enter a valid email';
      emailInput.focus();
      return;
    }
    status.textContent = '';
    button.disabled = true;
    try {
      if (!supabaseClient) await initAuth();
      const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/reset-password.html',
      });
      if (error) throw error;
      status.classList.remove('text-red-700');
      status.classList.add('text-green-700');
      status.textContent = "If an account exists for that email, we've sent a reset link.";
    } catch (error) {
      const message = error && error.message ? error.message.toLowerCase() : '';
      status.classList.remove('text-green-700');
      status.classList.add('text-red-700');
      status.textContent = error && (error.status === 429 || /too many|rate limit/.test(message))
        ? 'Too many attempts, please wait a few minutes'
        : "We couldn't send a reset link. Please try again.";
    } finally {
      button.disabled = false;
    }
  });
  emailInput.addEventListener('keydown', function (event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      button.click();
    }
  });
}

function initializePasswordRecovery() {
  const form = document.getElementById('resetPasswordForm');
  const fields = document.getElementById('resetPasswordFields');
  const status = document.getElementById('resetPasswordStatus');
  const expired = document.getElementById('expiredResetLink');
  if (!form || !fields || !status || !expired) return;

  function showExpiredLink() {
    status.classList.add('hidden');
    fields.classList.add('hidden');
    expired.classList.remove('hidden');
  }

  (async function () {
    try {
      if (!supabaseClient) await initAuth();
      if (await getSession()) {
        status.classList.add('hidden');
        fields.classList.remove('hidden');
      } else {
        showExpiredLink();
      }
    } catch (error) {
      showExpiredLink();
    }
  })();

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    const password = form.elements.password.value;
    const confirmation = form.elements.confirmPassword.value;
    status.classList.remove('hidden', 'text-green-700');
    status.classList.add('text-red-700');
    if (password !== confirmation) {
      status.textContent = 'Your passwords do not match.';
      return;
    }

    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    try {
      if (!supabaseClient) await initAuth();
      if (!await getSession()) {
        showExpiredLink();
        return;
      }
      const { error } = await supabaseClient.auth.updateUser({ password: password });
      if (error) throw error;
      fields.classList.add('hidden');
      status.classList.remove('text-red-700');
      status.classList.add('text-green-700');
      status.textContent = 'Password updated';
      window.setTimeout(function () { window.location.href = 'login.html'; }, 2000);
    } catch (error) {
      status.textContent = 'We could not update your password. Please try again.';
    } finally {
      button.disabled = false;
    }
  });
}

initializePasswordToggles();
initializeLoginButtons();
initializeForgotPassword();
initializePasswordRecovery();