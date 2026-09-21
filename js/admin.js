"use strict";

async function apiAdmin(action, extra = {}) {
  const { data: sessData } = await sb.auth.getSession();
  const token = sessData?.session?.access_token;
  const res = await fetch('/api/admin-users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify({ action, ...extra })
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Erro desconhecido');
  return json;
}

async function loadUsers() {
  state.usersLoading = true;
  try {
    const { users } = await apiAdmin('list');
    state.users = users || [];
  } catch (err) {
    console.error(err);
    state.usersLoadError = err.message;
    state.users = [];
  }
  state.usersLoading = false;
}

function renderUsuarios() {
  let body;
  if (state.usersLoading) {
    body = `<div class="empty-state">Carregando contas…</div>`;
  } else if (state.usersLoadError) {
    body = `<div class="empty-state">Não foi possível carregar as contas.<br><span style="font-size:12px">${escapeHtml(state.usersLoadError)}</span></div>`;
  } else if (!state.users.length) {
    body = `<div class="empty-state">Nenhuma conta encontrada.</div>`;
  } else {
    body = state.users.map(u => {
      const isMe = state.session && u.id === state.session.user.id;
      const editingPw = state.passwordEditId === u.id;
      const confirmingDelete = state.confirmDeleteUserId === u.id;
      return `<div class="user-card">
        <div class="user-row-top">
          <div class="user-email">${escapeHtml(u.email)}${isMe ? ' <span class="you-tag">(você)</span>' : ''}</div>
          <div class="user-badges">
            <span class="badge ${u.email_confirmed ? 'badge-ok' : 'badge-pending'}">${u.email_confirmed ? 'confirmado' : 'pendente'}</span>
            <span class="badge ${u.role === 'admin' ? 'badge-admin' : 'badge-user'}">${u.role === 'admin' ? 'admin' : 'usuário'}</span>
          </div>
        </div>
        <div class="user-meta">Criado em ${new Date(u.created_at).toLocaleDateString('pt-BR')}</div>
        ${editingPw ? `
          <div class="user-pw-edit">
            <input type="password" id="pwInput-${u.id}" placeholder="Nova senha (mín. 6 caracteres)">
            <button class="btn btn-primary" data-save-password="${u.id}">Salvar</button>
            <button class="btn btn-ghost" data-cancel-password="${u.id}">Cancelar</button>
          </div>` : `
          <div class="user-actions">
            ${!u.email_confirmed ? `<button class="btn btn-ghost" data-confirm-email="${u.id}">Confirmar e-mail</button>` : ''}
            <button class="btn btn-ghost" data-open-password="${u.id}">Definir senha</button>
            ${!isMe ? `<button class="btn btn-ghost" data-toggle-role="${u.id}" data-current-role="${u.role}">${u.role === 'admin' ? 'Tornar usuário' : 'Tornar admin'}</button>` : ''}
            ${!isMe ? (confirmingDelete
              ? `<span class="confirm-row"><button class="confirm-yes" data-confirm-delete-user="${u.id}">Excluir conta</button><button class="confirm-no" data-cancel-delete-user="${u.id}">Cancelar</button></span>`
              : `<button class="icon-btn danger" data-ask-delete-user="${u.id}" title="Excluir conta">${iconTrash()}</button>`) : ''}
          </div>`}
      </div>`;
    }).join('');
  }
  return `<div class="panel ${state.tab === 'usuarios' ? 'active' : ''}" data-panel="usuarios">
    <div class="section-title">Todas as contas (${state.users.length})</div>
    ${body}
  </div>`;
}

function attachAdminHandlers() {
  appEl.querySelectorAll('[data-confirm-email]').forEach(b => b.addEventListener('click', () => confirmEmail(b.dataset.confirmEmail)));
  appEl.querySelectorAll('[data-open-password]').forEach(b => b.addEventListener('click', () => { state.passwordEditId = b.dataset.openPassword; render(); }));
  appEl.querySelectorAll('[data-cancel-password]').forEach(b => b.addEventListener('click', () => { state.passwordEditId = null; render(); }));
  appEl.querySelectorAll('[data-save-password]').forEach(b => b.addEventListener('click', () => savePassword(b.dataset.savePassword)));
  appEl.querySelectorAll('[data-toggle-role]').forEach(b => b.addEventListener('click', () => toggleRole(b.dataset.toggleRole, b.dataset.currentRole)));
  appEl.querySelectorAll('[data-ask-delete-user]').forEach(b => b.addEventListener('click', () => { state.confirmDeleteUserId = b.dataset.askDeleteUser; render(); }));
  appEl.querySelectorAll('[data-cancel-delete-user]').forEach(b => b.addEventListener('click', () => { state.confirmDeleteUserId = null; render(); }));
  appEl.querySelectorAll('[data-confirm-delete-user]').forEach(b => b.addEventListener('click', () => deleteUserAccount(b.dataset.confirmDeleteUser)));
}

async function confirmEmail(id) {
  try { await apiAdmin('confirmEmail', { userId: id }); await loadUsers(); render(); }
  catch (err) { alert('Erro: ' + err.message); }
}

async function toggleRole(id, currentRole) {
  const newRole = currentRole === 'admin' ? 'user' : 'admin';
  try { await apiAdmin('setRole', { userId: id, role: newRole }); await loadUsers(); render(); }
  catch (err) { alert('Erro: ' + err.message); }
}

async function savePassword(id) {
  const input = document.getElementById('pwInput-' + id);
  const pw = input ? input.value : '';
  if (!pw || pw.length < 6) { alert('A senha precisa ter pelo menos 6 caracteres.'); return; }
  try {
    await apiAdmin('setPassword', { userId: id, password: pw });
    state.passwordEditId = null;
    render();
    alert('Senha atualizada com sucesso.');
  } catch (err) { alert('Erro: ' + err.message); }
}

async function deleteUserAccount(id) {
  try { await apiAdmin('deleteUser', { userId: id }); state.confirmDeleteUserId = null; await loadUsers(); render(); }
  catch (err) { alert('Erro: ' + err.message); }
}
