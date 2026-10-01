let supabaseClient = null;

async function initAuth() {
  const res = await fetch('/api/config');
  const cfg = await res.json();
  supabaseClient = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
  return supabaseClient;
}

async function signInWithGoogle() {
  await supabaseClient.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin + '/checkout.html' },
  });
}

async function signOutUser() {
  await supabaseClient.auth.signOut();
  window.location.reload();
}

async function getSession() {
  const { data } = await supabaseClient.auth.getSession();
  return data.session;
}