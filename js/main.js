"use strict";

// ---------- MAIN APP RENDER ----------
function render() {
  if (!state.session) { renderAuth(); return; }

  viewerBox.innerHTML = `<span>${escapeHtml(state.profile?.email || '')}${state.isAdmin ? ' · admin' : ''}</span><button id="logoutBtn">sair</button>`;

  const goal = state.profile?.daily_goal ?? 21;
  const total = state.entries.reduce((s, e) => s + e.points * e.qty, 0);
  const pct = goal > 0 ? Math.min(100, (total / goal) * 100) : 0;
  const over = total > goal;
  const r = 44, circ = 2 * Math.PI * r, offset = circ - (pct / 100) * circ;

  let html = `
  <div class="hero">
    <div class="ring-wrap"><svg viewBox="0 0 100 100">
      <circle class="ring-track" cx="50" cy="50" r="${r}"></circle>
      <circle class="ring-fill" cx="50" cy="50" r="${r}" stroke="${over ? 'var(--danger)' : 'var(--accent)'}" stroke-dasharray="${circ}" stroke-dashoffset="${offset}"></circle>
    </svg><div class="ring-center"><div class="ring-num">${fmtNum(total)}</div><div class="ring-den">de ${fmtNum(goal)}</div></div></div>
    <div class="hero-info">
      <div class="hero-date">${capitalize(new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }))}</div>
      <div class="hero-status ${over ? 'over' : 'ok'}">${over ? fmtNum(total - goal) + ' pontos acima da meta' : fmtNum(goal - total) + ' pontos restantes hoje'}</div>
      <div class="goal-edit"><span>Meta diária:</span><input type="number" min="0" step="0.5" id="goalInput" value="${goal}"><button id="goalSaveBtn">salvar</button></div>
    </div>
  </div>
  <div class="tabs">${tabBtn('hoje', 'Hoje')}${tabBtn('historico', 'Histórico')}${tabBtn('alimentos', 'Alimentos')}${state.isAdmin ? tabBtn('usuarios', 'Usuários') : ''}</div>
  <div id="panels">${renderHoje()}${renderHistorico()}${renderAlimentos()}${state.isAdmin ? renderUsuarios() : ''}</div>`;

  appEl.innerHTML = html;
  attachHandlers();
  document.getElementById('logoutBtn').addEventListener('click', () => sb.auth.signOut());
}

function tabBtn(key, label) { return `<button class="tab-btn ${state.tab === key ? 'active' : ''}" data-tab="${key}">${label}</button>`; }

// ---------- event wiring ----------
function attachHandlers() {
  appEl.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => { state.tab = b.dataset.tab; state.adminOpen = false; state.editingFoodId = null; render(); }));

  const goalBtn = document.getElementById('goalSaveBtn');
  if (goalBtn) goalBtn.addEventListener('click', async () => {
    const val = parseFloat(document.getElementById('goalInput').value);
    if (!isNaN(val) && val >= 0) await saveGoal(val);
  });

  const openAddBtn = document.getElementById('openAddBtn');
  if (openAddBtn) openAddBtn.addEventListener('click', renderAddFoodPanel);

  appEl.querySelectorAll('[data-remove-entry]').forEach(b => b.addEventListener('click', () => removeEntry(b.dataset.removeEntry)));

  appEl.querySelectorAll('[data-day]').forEach(card => card.addEventListener('click', () => {
    const box = document.getElementById('detail-' + card.dataset.day);
    if (box) box.style.display = box.style.display === 'none' ? 'block' : 'none';
  }));

  const searchInput = document.getElementById('foodSearchInput');
  if (searchInput) searchInput.addEventListener('input', () => { state.foodQuery = searchInput.value; render(); refocus('foodSearchInput'); });
  appEl.querySelectorAll('[data-cat]').forEach(c => c.addEventListener('click', () => { state.foodCat = c.dataset.cat; render(); }));

  const toggleAdmin = document.getElementById('toggleAdminForm');
  if (toggleAdmin) toggleAdmin.addEventListener('click', () => {
    state.adminOpen = !state.adminOpen; state.editingFoodId = null; state.formName = ''; state.formPoints = ''; state.formCategory = CATEGORIES[0]; render();
  });

  const saveFoodBtn = document.getElementById('saveFoodBtn');
  if (saveFoodBtn) saveFoodBtn.addEventListener('click', saveFood);

  appEl.querySelectorAll('[data-edit-food]').forEach(b => b.addEventListener('click', () => startEditFood(b.dataset.editFood)));
  appEl.querySelectorAll('[data-ask-delete]').forEach(b => b.addEventListener('click', () => { state.confirmDeleteId = b.dataset.askDelete; render(); }));
  appEl.querySelectorAll('[data-cancel-delete]').forEach(b => b.addEventListener('click', () => { state.confirmDeleteId = null; render(); }));
  appEl.querySelectorAll('[data-confirm-delete]').forEach(b => b.addEventListener('click', () => deleteFood(b.dataset.confirmDelete)));

  if (state.isAdmin) attachAdminHandlers();
}

function refocus(id) { const el = document.getElementById(id); if (el) { el.focus(); const v = el.value; el.value = ''; el.value = v; } }

// ---------- profile / goal ----------
async function loadProfile() {
  let { data } = await sb.from('profiles').select('*').eq('id', state.session.user.id).maybeSingle();
  if (!data) {
    // fallback in case the signup trigger hasn't run yet
    const ins = await sb.from('profiles').insert({ id: state.session.user.id, email: state.session.user.email }).select().maybeSingle();
    data = ins.data;
  }
  state.profile = data;
  state.isAdmin = data?.role === 'admin';
}

async function saveGoal(val) {
  const { error } = await sb.from('profiles').update({ daily_goal: val }).eq('id', state.session.user.id);
  if (error) { console.error(error); return; }
  state.profile = { ...state.profile, daily_goal: val };
  render();
}

// ---------- load everything, then boot ----------
async function loadAll() {
  await Promise.all([loadFoods(), loadProfile()]);
  await Promise.all([loadToday(), loadHistory()]);
  if (state.isAdmin) await loadUsers();
  render();
}

if (sb) {
  sb.auth.onAuthStateChange((event, session) => {
    state.session = session;
    if (session) { loadAll(); } else { render(); }
  });
  sb.auth.getSession().then(({ data }) => { state.session = data.session; if (state.session) loadAll(); else render(); });
}