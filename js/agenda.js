// ══════════════════════════════════════════════════
// AGENDA.JS — Agenda de Pagamentos
// Grid de meses → detalhe do mês (igual ao Relatórios)
// ══════════════════════════════════════════════════

// ── Marks de pago para assinaturas e fixos (localStorage) ──
function _agendaMarkKey(monthKey, type, id) {
  return `${monthKey}:${type}:${id}`;
}

function _agendaGetMarks() {
  try { return JSON.parse(localStorage.getItem('fin_agenda_marks') || '{}'); } catch { return {}; }
}

function _agendaSetMark(monthKey, type, id, paid) {
  const marks = _agendaGetMarks();
  const key   = _agendaMarkKey(monthKey, type, id);
  if (paid) marks[key] = today();
  else       delete marks[key];
  localStorage.setItem('fin_agenda_marks', JSON.stringify(marks));
}

// Toggle pago para qualquer item da agenda
async function toggleAgendaItemPaid(type, id, monthKey, bankName) {
  if (type === 'boleto') {
    await toggleBoletoPaid(id, bankName, monthKey);
    return; // toggleBoletoPaid já chama renderAgenda()
  }
  const marks  = _agendaGetMarks();
  const key    = _agendaMarkKey(monthKey, type, id);
  const isPaid = !marks[key];
  _agendaSetMark(monthKey, type, id, isPaid);
  renderAgenda();
  showToast(isPaid ? '✓ Marcado como pago' : 'Marcado como pendente');
}

// Toggle expansão de linha na agenda
function _agendaToggleRow(itemKey) {
  if (!S._agendaExpanded) S._agendaExpanded = {};
  S._agendaExpanded[itemKey] = !S._agendaExpanded[itemKey];
  renderAgenda();
}

// ── Constrói data YYYY-MM-DD a partir do mês e de um dia ──
function _agendaBuildDate(m, day) {
  const mn  = MONTH_NUM[m.label] || 1;
  const yr  = parseInt(m.year);
  const pad = n => String(n).padStart(2, '0');
  return `${yr}-${pad(mn)}-${pad(day || 1)}`;
}

// ── Monta lista de itens para um monthKey ──
function _agendaItemsForMonth(monthKey) {
  const m = S.months.find(x => x.key === monthKey);
  if (!m) return [];

  const marks   = _agendaGetMarks();
  const allE    = m.banks.flatMap(b => b.entries.map(e => ({ ...e, bankName: b.name })));
  const boletos = allE.filter(e => e.type === 'boleto');
  const recL    = S.recurrents[monthKey] || [];
  // Apenas assinaturas mensais que o usuário paga (owner !== 'other')
  const subs    = (S.subscriptions || []).filter(s =>
    s.cycle === 'mensal' &&
    (s.owner || 'mine') !== 'other' &&
    isSubActiveInMonth(s, monthKey)
  );

  const items = [];

  // Boletos — paid vem do próprio registro
  boletos.forEach(bl => {
    items.push({
      type:     'boleto',
      id:       String(bl.id),
      bankName: bl.bankName,
      desc:     bl.desc,
      amount:   bl.amount,
      date:     bl.date || '',
      note:     bl.note || '',
      paid:     bl.paid || false,
    });
  });

  // Assinaturas mensais — data construída do dia de vencimento + mês
  subs.forEach(s => {
    const amount = calcMySubPart(s) || s.amount || 0;
    items.push({
      type:   'sub',
      id:     String(s.id),
      desc:   s.name,
      amount,
      date:   _agendaBuildDate(m, s.day),
      note:   s.bank ? `banco: ${s.bank}` : '',
      paid:   !!marks[_agendaMarkKey(monthKey, 'sub', String(s.id))],
      subRef: s,  // referência para navegar
    });
  });

  // Contas fixas — data construída do dia + mês
  recL.forEach(r => {
    items.push({
      type:   'rec',
      id:     String(r.id),
      desc:   r.desc,
      amount: r.amount || 0,
      date:   _agendaBuildDate(m, r.day),
      note:   '',
      paid:   !!marks[_agendaMarkKey(monthKey, 'rec', String(r.id))],
    });
  });

  items.sort((a, b) => (a.date || '9999') < (b.date || '9999') ? -1 : 1);
  return items;
}

// ── Entrada principal ──
function renderAgenda() {
  const el = document.getElementById('agendaContent');
  if (!el) return;

  if (S._agendaMonth) {
    _renderAgendaMonth(el, S._agendaMonth);
  } else {
    _renderAgendaGrid(el);
  }
}

// ── Grid de meses (tela inicial) ──
function _renderAgendaGrid(el) {
  if (!S.months.length) {
    el.innerHTML = '<div class="empty" style="padding:40px 20px">Nenhum mês cadastrado.</div>';
    return;
  }

  const todayStr = today();
  const years    = [...new Set(S.months.map(m => +m.year))].sort((a, b) => b - a);

  if (!S._agendaYear || !years.includes(S._agendaYear)) {
    S._agendaYear = years[0];
  }

  const yearTabs = years.map(y =>
    `<div class="itab ${y === S._agendaYear ? 'active' : ''}" onclick="S._agendaYear=${y};renderAgenda()">${y}</div>`
  ).join('');

  const mths = [...S.months].filter(m => +m.year === S._agendaYear).reverse();

  const cards = mths.map(m => {
    const items        = _agendaItemsForMonth(m.key);
    const totalAll     = items.reduce((s, i) => s + i.amount, 0);
    const pendingItems = items.filter(i => !i.paid);
    const overdueItems = pendingItems.filter(i => i.date && i.date < todayStr);
    const pendingTotal = pendingItems.reduce((s, i) => s + i.amount, 0);
    const paidTotal    = totalAll - pendingTotal;
    const allPaid      = items.length > 0 && pendingItems.length === 0;

    const statusColor = !items.length   ? 'var(--text3)'
      : allPaid                         ? 'var(--green)'
      : overdueItems.length             ? 'var(--red)'
      :                                   'var(--orange)';

    const statusLabel = !items.length   ? 'sem itens'
      : allPaid                         ? '✓ tudo pago'
      : overdueItems.length             ? `${overdueItems.length} vencido(s)`
      :                                   `${pendingItems.length} pendente(s)`;

    if (!items.length) return `
      <div class="rep-mc" onclick="S._agendaMonth='${m.key}';renderAgenda()" style="opacity:.55">
        <div class="rep-mc-hd">
          <span class="rep-mc-name">${m.label}</span>
          <span class="rep-mc-yr">${m.year}</span>
        </div>
        <div class="rep-mc-entries" style="margin-top:8px">sem boletos nem fixos</div>
      </div>`;

    return `
      <div class="rep-mc" onclick="S._agendaMonth='${m.key}';renderAgenda()">
        <div class="rep-mc-hd">
          <span class="rep-mc-name">${m.label}</span>
          <span class="rep-mc-yr">${m.year}</span>
        </div>
        <div class="rep-mc-total" style="color:${statusColor}">R$&nbsp;${fmt(pendingTotal)}</div>
        <div class="rep-mc-row">
          <span class="rep-mc-lbl">Pago</span>
          <span class="rep-mc-val" style="color:var(--green)">R$&nbsp;${fmt(paidTotal)}</span>
        </div>
        <div class="rep-mc-row">
          <span class="rep-mc-lbl">Total</span>
          <span class="rep-mc-val">R$&nbsp;${fmt(totalAll)}</span>
        </div>
        <div class="rep-mc-entries" style="color:${statusColor}">${statusLabel} · ${items.length} item(s)</div>
      </div>`;
  }).join('');

  el.innerHTML = `
    <div style="padding:20px 20px 60px">
      <div class="inner-tabs" style="margin-bottom:20px">${yearTabs}</div>
      <div class="rep-mc-grid">${cards || '<div class="empty">nenhum mês neste ano</div>'}</div>
    </div>`;
}

// ── Detalhe de um mês ──
function _renderAgendaMonth(el, monthKey) {
  const m = S.months.find(x => x.key === monthKey);
  if (!m) { S._agendaMonth = null; renderAgenda(); return; }

  const items        = _agendaItemsForMonth(monthKey);
  const todayStr     = today();
  const filter       = S._agendaFilter || 'all';
  const pendingItems = items.filter(i => !i.paid);
  const pendingTotal = pendingItems.reduce((s, i) => s + i.amount, 0);
  const totalAll     = items.reduce((s, i) => s + i.amount, 0);
  const paidTotal    = totalAll - pendingTotal;
  const filtered     = filter === 'pending' ? pendingItems : items;

  if (!S._agendaExpanded) S._agendaExpanded = {};

  const rows = filtered.map(item => {
    const isOverdue  = item.date && item.date < todayStr && !item.paid;
    const amtColor   = item.paid ? 'var(--text3)' : isOverdue ? 'var(--red)' : 'var(--orange)';
    const dateLabel  = item.date ? item.date.split('-').reverse().join('/') : '—';

    // Badge de tipo com navegação ao clicar
    const typeNav = item.type === 'boleto'
      ? `onclick="event.stopPropagation();S.currentMonth='${monthKey}';showView('dash')" title="Ver no dashboard"`
      : item.type === 'sub'
      ? `onclick="event.stopPropagation();showView('subs')" title="Ir para Assinaturas"`
      : `onclick="event.stopPropagation();S.currentMonth='${monthKey}';showView('dash')" title="Ver no dashboard"`;
    const typeBadge = item.type === 'boleto'
      ? `<span class="bm bm-boleto agenda-type-nav" ${typeNav}>boleto ↗</span>`
      : item.type === 'sub'
      ? `<span class="bm bm-rec agenda-type-nav" ${typeNav}>assinatura ↗</span>`
      : `<span class="bm bm-rec" style="cursor:default">fixo</span>`;

    // Toggle de pago — ícone de checkbox claro
    const safeBank = (item.bankName || '').replace(/'/g, "\\'");
    const checkIcon = item.paid
      ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="3"/><polyline points="7 13 11 17 17 8"/></svg>`
      : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="3"/></svg>`;
    const toggleLabel = item.paid ? 'pago' : isOverdue ? 'vencido' : 'pendente';
    const toggleColor = item.paid ? 'var(--green)' : isOverdue ? 'var(--red)' : 'var(--text3)';

    // Expansão de linha (clique no item → ver detalhes)
    const itemKey = `${monthKey}:${item.type}:${item.id}`;
    const isExp   = !!S._agendaExpanded[itemKey];
    const expDetail = isExp ? `
      <tr class="agenda-exp-row">
        <td colspan="3" style="padding:6px 14px 10px;background:var(--bg3)">
          <div style="font-size:11px;color:var(--text3);line-height:1.8">
            ${item.date ? `📅 Vencimento: <strong style="color:var(--text2)">${dateLabel}</strong>` : ''}
            ${item.bankName ? `<br>🏦 Banco: <strong style="color:var(--text2)">${item.bankName}</strong>` : ''}
            ${item.note ? `<br>💬 ${item.note}` : ''}
            ${item.paid ? `<br>✓ <span style="color:var(--green)">Pago</span>` : ''}
          </div>
        </td>
      </tr>` : '';

    return `
      <tr class="entry-row agenda-item-row${item.paid ? ' agenda-paid' : ''}"
          onclick="_agendaToggleRow('${itemKey}')" style="cursor:pointer">
        <td>
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
            <span>${item.desc}</span>
            <span class="agenda-date">${dateLabel}</span>
            ${typeBadge}
          </div>
        </td>
        <td>
          <button class="agenda-check-btn"
            onclick="event.stopPropagation();toggleAgendaItemPaid('${item.type}','${item.id}','${monthKey}','${safeBank}')"
            title="${item.paid ? 'Clique para marcar como pendente' : 'Clique para marcar como pago'}"
            style="display:flex;align-items:center;gap:5px;background:none;border:1px solid var(--border);border-radius:20px;padding:3px 8px;cursor:pointer;color:${toggleColor};font-size:11px;font-family:var(--mono);transition:all .15s">
            ${checkIcon}
            ${toggleLabel}
          </button>
        </td>
        <td><span class="amt" style="color:${amtColor}">R$ ${fmt(item.amount)}</span></td>
      </tr>
      ${expDetail}`;
  }).join('');

  el.innerHTML = `
    <div style="padding:20px 20px 0">
      <div style="margin-bottom:16px">
        <button class="btn btn-ghost btn-sm" onclick="S._agendaMonth=null;renderAgenda()" style="gap:6px">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
          Todos os Meses
        </button>
      </div>

      <div class="summary-grid" style="margin-bottom:16px">
        <div class="card">
          <div class="card-lbl">Pendente</div>
          <div class="card-val r">R$ ${fmt(pendingTotal)}</div>
          <div class="card-sub">${pendingItems.length} item(s)</div>
        </div>
        <div class="card">
          <div class="card-lbl">Pago</div>
          <div class="card-val g">R$ ${fmt(paidTotal)}</div>
        </div>
        <div class="card">
          <div class="card-lbl">Total do mês</div>
          <div class="card-val">R$ ${fmt(totalAll)}</div>
        </div>
      </div>

      <div style="display:flex;gap:8px;margin-bottom:16px">
        <button class="btn ${filter === 'all' ? 'btn-primary' : 'btn-ghost'} btn-sm"
          onclick="S._agendaFilter='all';renderAgenda()">Todos (${items.length})</button>
        <button class="btn ${filter === 'pending' ? 'btn-primary' : 'btn-ghost'} btn-sm"
          onclick="S._agendaFilter='pending';renderAgenda()">Só pendentes (${pendingItems.length})</button>
      </div>
    </div>

    ${filtered.length === 0
      ? '<div class="empty" style="padding:40px 20px">Nenhum item para exibir.</div>'
      : `<div style="padding:0 20px 60px">
          <div class="tbl-block">
            <table>
              <thead><tr>
                <th>Descrição</th>
                <th style="white-space:nowrap">☐ Status</th>
                <th>Valor</th>
              </tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
          <div style="font-size:11px;color:var(--text3);margin-top:10px;line-height:1.8">
            ☐ Clique no botão de status para marcar como pago · Clique na linha para ver detalhes · ↗ para ir à seção
          </div>
        </div>`}`;
}
