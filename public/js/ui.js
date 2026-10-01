function showToast(message) {
  const t = document.createElement('div');
  t.textContent = message;
  t.style.cssText = 'position:fixed;bottom:24px;right:24px;background:#2B2118;color:#FDCB07;padding:12px 20px;border-radius:12px;font-weight:600;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,.3)';
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2500);
}

document.addEventListener('click', (e) => {
  const btn = e.target.closest('button, a');
  if (!btn) return;
  const text = btn.textContent;
  if (/add to cart/i.test(text)) showToast('Added to cart ✓');
  else if (/remove/i.test(text)) showToast('Removed from cart');
});

(async function () {
  const slot = document.getElementById('authSlot');
  if (!slot || typeof initAuth !== 'function') return;
  try {
    await initAuth();
    const session = await getSession();
    if (session) {
      const name = (session.user.user_metadata && session.user.user_metadata.full_name) || session.user.email;
      const span = document.createElement('span');
      span.textContent = 'Hi, ' + name.split(' ')[0];
      const out = document.createElement('button');
      out.textContent = 'Sign out';
      out.className = 'ml-3 underline';
      out.onclick = signOutUser;
      slot.append(span, out);
    } else {
      const btn = document.createElement('button');
      btn.textContent = 'Sign in';
      btn.className = 'bg-[#FDCB07] text-black font-bold px-4 py-1 rounded-full';
      btn.onclick = () => supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.href },
      });
      slot.append(btn);
    }
  } catch (err) { console.error(err); }
})();