"use strict";

function renderAlimentos() {
  const q = state.foodQuery.trim().toLowerCase();
  let list = state.foods.filter(f => (!q || f.name.toLowerCase().includes(q)) && (state.foodCat === 'Todos' || f.category === state.foodCat))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  const chips = ['Todos', ...CATEGORIES].map(c => `<div class="chip ${state.foodCat === c ? 'active' : ''}" data-cat="${escapeHtml(c)}">${c}</div>`).join('');

  let adminBlock = '';
  if (state.isAdmin) {
    adminBlock = `
    <div class="admin-toggle"><span class="section-title" style="margin:0">Gerenciar lista (admin)</span>
      <button class="btn btn-ghost" id="toggleAdminForm">${state.adminOpen ? 'Fechar' : (state.editingFoodId ? 'Editando…' : '+ Novo alimento')}</button></div>
    <div class="admin-form ${state.adminOpen ? 'open' : ''}" id="adminForm">
      <div class="field-row"><div class="grow"><label class="field-label">Nome do alimento</label>
        <input type="text" id="foodNameInput" placeholder="Ex: Peito de frango grelhado (100g)" value="${escapeHtml(state.formName || '')}"></div></div>
      <div class="field-row">
        <div style="width:110px"><label class="field-label">Pontos</label><input type="number" step="0.5" min="0" id="foodPointsInput" value="${state.formPoints ?? ''}"></div>
        <div class="grow"><label class="field-label">Categoria</label><select id="foodCategoryInput">${CATEGORIES.map(c => `<option value="${c}" ${state.formCategory === c ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
      </div>
      <button class="btn btn-primary" id="saveFoodBtn">${state.editingFoodId ? 'Salvar alterações' : 'Adicionar à lista'}</button>
    </div>`;
  }

  let rows = !list.length ? `<div class="empty-state">Nenhum alimento encontrado.</div>` : list.map(f => {
    if (state.isAdmin && state.editingFoodId === f.id) return '';
    const isConfirming = state.confirmDeleteId === f.id;
    return `<div class="food-row"><div class="food-main"><div class="food-name">${escapeHtml(f.name)}</div><div class="food-cat">${escapeHtml(f.category)}</div></div>
      <div class="food-pts">${fmtNum(f.points)} pts</div>
      ${state.isAdmin ? (isConfirming
        ? `<div class="confirm-row"><button class="confirm-yes" data-confirm-delete="${f.id}">Excluir</button><button class="confirm-no" data-cancel-delete="${f.id}">Cancelar</button></div>`
        : `<button class="icon-btn" data-edit-food="${f.id}">${iconEdit()}</button><button class="icon-btn danger" data-ask-delete="${f.id}">${iconTrash()}</button>`) : ''}
    </div>`;
  }).join('');

  return `<div class="panel ${state.tab === 'alimentos' ? 'active' : ''}" data-panel="alimentos">${adminBlock}
    <div class="search-box">${iconSearch()}<input type="text" id="foodSearchInput" placeholder="Buscar alimento…" value="${escapeHtml(state.foodQuery)}"></div>
    <div class="chip-row">${chips}</div>${rows}</div>`;
}

function startEditFood(id) {
  const f = state.foods.find(x => x.id === id); if (!f) return;
  state.editingFoodId = id; state.adminOpen = true; state.formName = f.name; state.formPoints = f.points; state.formCategory = f.category; render();
}

async function saveFood() {
  const name = (document.getElementById('foodNameInput').value || '').trim();
  const points = parseFloat(document.getElementById('foodPointsInput').value);
  const category = document.getElementById('foodCategoryInput').value;
  if (!name || isNaN(points) || points < 0) return;
  if (state.editingFoodId) {
    const { error } = await sb.from('foods').update({ name, points, category }).eq('id', state.editingFoodId);
    if (error) { console.error(error); return; }
  } else {
    const { error } = await sb.from('foods').insert({ name, points, category });
    if (error) { console.error(error); return; }
  }
  state.adminOpen = false; state.editingFoodId = null; state.formName = ''; state.formPoints = ''; state.formCategory = CATEGORIES[0];
  await loadFoods(); render();
}

async function deleteFood(id) {
  const { error } = await sb.from('foods').delete().eq('id', id);
  if (error) { console.error(error); return; }
  state.confirmDeleteId = null; await loadFoods(); render();
}

async function loadFoods() {
  const { data, error } = await sb.from('foods').select('*');
  if (!error) state.foods = data || [];
}
