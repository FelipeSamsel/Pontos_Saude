"use strict";

function renderHoje() {
  const entries = state.entries;
  let rows = !entries.length
    ? `<div class="empty-state">Nenhum alimento adicionado ainda hoje.<br>Toque em "Adicionar alimento" para começar.</div>`
    : `<div class="entry-list">` + entries.map(e => `
      <div class="entry-row">
        <div class="entry-name">${escapeHtml(e.food_name)} <span class="entry-qty">${e.qty !== 1 ? '× ' + fmtNum(e.qty) : ''}</span></div>
        <div class="entry-pts">${fmtNum(e.points * e.qty)}</div>
        <button class="entry-del" data-remove-entry="${e.id}">${iconTrash()}</button>
      </div>`).join('') + `</div>`;
  return `<div class="panel ${state.tab === 'hoje' ? 'active' : ''}" data-panel="hoje">${rows}
    <button class="btn btn-primary" id="openAddBtn">${iconPlus()} Adicionar alimento</button>
    <div id="addFoodPanel"></div></div>`;
}

function renderAddFoodPanel() {
  const container = document.getElementById('addFoodPanel'); if (!container) return;
  const q = addPanelState.query.trim().toLowerCase();
  const list = state.foods.filter(f => !q || f.name.toLowerCase().includes(q)).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')).slice(0, 40);
  container.innerHTML = `<div style="margin-top:14px"><div class="search-box">${iconSearch()}<input type="text" id="apSearch" placeholder="Buscar na lista de alimentos…" value="${escapeHtml(addPanelState.query)}"></div>
    <div id="apList">${list.length ? list.map(foodPickRow).join('') : '<div class="empty-state">Nenhum alimento encontrado. Peça ao admin para cadastrar.</div>'}</div></div>`;
  const s = document.getElementById('apSearch'); s.focus();
  s.addEventListener('input', () => { addPanelState.query = s.value; renderAddFoodPanel(); refocusEl(document.getElementById('apSearch')); });
  container.querySelectorAll('[data-qty-minus]').forEach(b => b.addEventListener('click', () => stepQty(b.dataset.qtyMinus, -1)));
  container.querySelectorAll('[data-qty-plus]').forEach(b => b.addEventListener('click', () => stepQty(b.dataset.qtyPlus, 1)));
  container.querySelectorAll('[data-pick-food]').forEach(b => b.addEventListener('click', () => confirmAddEntry(b.dataset.pickFood)));
}

function refocusEl(el) { if (!el) return; const v = el.value; el.value = ''; el.value = v; }

function stepQty(id, delta) {
  const cur = addPanelState.qty[id] ?? 1;
  addPanelState.qty[id] = Math.max(0.5, Math.round((cur + delta * 0.5) * 2) / 2);
  renderAddFoodPanel();
}

function foodPickRow(f) {
  const q = addPanelState.qty[f.id] ?? 1;
  return `<div class="food-row"><div class="food-main"><div class="food-name">${escapeHtml(f.name)}</div><div class="food-cat">${escapeHtml(f.category)} · ${fmtNum(f.points)} pts/un.</div></div>
    <div class="qty-stepper"><button data-qty-minus="${f.id}">−</button><input type="text" readonly value="${fmtNum(q)}"><button data-qty-plus="${f.id}">+</button></div>
    <button class="icon-btn" style="color:var(--accent)" data-pick-food="${f.id}">${iconPlus()}</button></div>`;
}

async function confirmAddEntry(foodId) {
  const f = state.foods.find(x => x.id === foodId); if (!f) return;
  const qty = addPanelState.qty[foodId] ?? 1;
  const { data, error } = await sb.from('entries').insert({
    user_id: state.session.user.id, food_id: f.id, food_name: f.name, points: f.points, qty, entry_date: todayKey()
  }).select().single();
  if (error) { console.error(error); return; }
  state.entries = [...state.entries, data];
  document.getElementById('addFoodPanel').innerHTML = '';
  addPanelState = { query: '', qty: {} };
  render();
}

async function removeEntry(id) {
  const { error } = await sb.from('entries').delete().eq('id', id);
  if (error) { console.error(error); return; }
  state.entries = state.entries.filter(e => e.id !== id);
  render();
}

async function loadToday() {
  const { data, error } = await sb.from('entries').select('*').eq('user_id', state.session.user.id).eq('entry_date', todayKey());
  if (!error) state.entries = data || [];
}
