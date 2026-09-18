"use strict";

function renderHistorico() {
  let body;
  if (!state.history.length) {
    body = `<div class="empty-state">Seu histórico vai aparecer aqui conforme os dias forem passando.</div>`;
  } else {
    body = state.history.map(d => {
      const g = state.profile?.daily_goal ?? 21;
      const t = d.total; const pct = g > 0 ? Math.min(100, (t / g) * 100) : 0; const over = t > g;
      const dt = new Date(d.date + 'T12:00:00'); const isToday = d.date === todayKey();
      return `<div class="day-card" data-day="${d.date}">
        <div class="day-date"><div class="d1">${isToday ? 'Hoje' : capitalize(dt.toLocaleDateString('pt-BR', { weekday: 'short' }))}</div><div class="d2">${dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</div></div>
        <div class="day-bar-wrap"><div class="day-bar-track"><div class="day-bar-fill ${over ? 'over' : ''}" style="width:${pct}%"></div></div></div>
        <div class="day-pts" style="color:${over ? 'var(--danger)' : 'var(--ink)'}">${fmtNum(t)} / ${fmtNum(g)}</div>
      </div>
      <div class="day-detail" id="detail-${d.date}" style="display:none">
        ${d.entries.length ? d.entries.map(e => `<div class="day-detail-row"><span>${escapeHtml(e.food_name)}${e.qty !== 1 ? ' ×' + fmtNum(e.qty) : ''}</span><span>${fmtNum(e.points * e.qty)}</span></div>`).join('') : '<div class="day-detail-row"><span>Sem registros</span><span></span></div>'}
      </div>`;
    }).join('');
  }
  return `<div class="panel ${state.tab === 'historico' ? 'active' : ''}" data-panel="historico">${body}</div>`;
}

async function loadHistory() {
  const since = new Date(); since.setDate(since.getDate() - 30);
  const { data, error } = await sb.from('entries').select('*').eq('user_id', state.session.user.id).gte('entry_date', since.toISOString().slice(0, 10)).order('entry_date', { ascending: false });
  if (error) { state.history = []; return; }
  const byDate = {};
  (data || []).forEach(e => {
    if (!byDate[e.entry_date]) byDate[e.entry_date] = { date: e.entry_date, entries: [], total: 0 };
    byDate[e.entry_date].entries.push(e);
    byDate[e.entry_date].total += e.points * e.qty;
  });
  state.history = Object.values(byDate).sort((a, b) => b.date.localeCompare(a.date));
}
