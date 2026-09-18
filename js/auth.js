"use strict";

function renderAuth() {
  viewerBox.innerHTML = '';
  appEl.innerHTML = `
    <div class="auth-card">
      <div class="auth-tabs">
        <div class="auth-tab ${state.authMode === 'login' ? 'active' : ''}" data-mode="login">Entrar</div>
        <div class="auth-tab ${state.authMode === 'signup' ? 'active' : ''}" data-mode="signup">Criar conta</div>
      </div>
      ${state.authError ? `<div class="auth-error">${escapeHtml(state.authError)}</div>` : ''}
      <div class="auth-field"><label>E-mail</label><input type="email" id="authEmail" autocomplete="email"></div>
      <div class="auth-field"><label>Senha</label><input type="password" id="authPass" autocomplete="${state.authMode === 'login' ? 'current-password' : 'new-password'}"></div>
      <button class="btn btn-primary" id="authSubmit" ${state.busy ? 'disabled' : ''}>${state.busy ? 'Aguarde…' : (state.authMode === 'login' ? 'Entrar' : 'Criar conta')}</button>
      <div class="auth-hint">${state.authMode === 'login' ? 'Ainda não tem conta? Toque em "Criar conta".' : 'Depois de criar a conta, confirme o e-mail se seu projeto Supabase exigir isso.'}</div>
    </div>`;
  appEl.querySelectorAll('[data-mode]').forEach(t => t.addEventListener('click', () => { state.authMode = t.dataset.mode; state.authError = ''; renderAuth(); }));
  document.getElementById('authSubmit').addEventListener('click', submitAuth);
  [document.getElementById('authEmail'), document.getElementById('authPass')].forEach(el => el.addEventListener('keydown', e => { if (e.key === 'Enter') submitAuth(); }));
}

async function submitAuth() {
  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPass').value;
  if (!email || !password) { state.authError = 'Preencha e-mail e senha.'; renderAuth(); return; }
  state.busy = true; state.authError = ''; renderAuth();
  try {
    if (state.authMode === 'login') {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } else {
      const { error } = await sb.auth.signUp({ email, password });
      if (error) throw error;
    }
  } catch (err) {
    state.busy = false; state.authError = translateAuthError(err.message); renderAuth(); return;
  }
  state.busy = false;
}

function translateAuthError(msg) {
  if (/invalid login credentials/i.test(msg)) return 'E-mail ou senha incorretos.';
  if (/already registered/i.test(msg)) return 'Esse e-mail já tem uma conta. Tente entrar.';
  if (/password/i.test(msg) && /6/i.test(msg)) return 'A senha precisa ter pelo menos 6 caracteres.';
  return msg;
}
