// ══════════════════════════════════════════════════
// AGENDA.JS — Agenda de Pagamentos
// Grid de meses → detalhe do mês (igual ao Relatórios)
// ══════════════════════════════════════════════════

// Monta a lista de itens (boletos + assinaturas + fixos) para um monthKey
function _agendaItemsForMonth(monthKey) {
  const m = S.months.find(x => x.key === monthKey);
  if (!m) return [];

  const allE    = m.banks.flatMap(b => b.entries.map(e => ({ ...e, bankName: b.name })));
  const boletos = allE.filter(e => e.type === 'boleto');
  const recL    = S.recurrents[monthKey] || [];
  const subs    = (S.subscriptions || []).filter(s =>
    s.cycle === 'mensal' && isSubActiveInMonth(s, monthKey)
  );

  const [y, mo] = monthKey.split('-');
  const items = [];

  boletos.forEach(bl => {
    items.push({
      type: 'boleto', id: String(bl.id), bankName: bl.bankName,
      desc: bl.desc, amount: bl.amount, date: bl.date || '',
      note: bl.note || '', paid: bl.paid || false,
    });
  });

  subs.forEach(s => {
    const day  = s.day || s.billingDay || 1;
    const date = `${y}-${mo}-${String(day).padStart(2, '0')}`;
    items.push({
      type: 'sub', id: String(s.id), desc: s.name,
      amount: calcMySubPart(s), date,
      note: s.bank ? `banco: ${s.bank}` : '', paid: false,
    });
  });

  recL.forEach(r => {
    const day  = r.day || 1;
    const date = `${y}-${mo}-${String(day).padStart(2, '0')}`;
    items.push({
      type: 'rec', id: String(r.id), desc: r.desc,
      amount: r.amount, date, note: '', paid: false,
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

// ── Grid de meses (tela inicial da Agenda) ──
function _renderAgendaGrid(el) {
  if (!S.months.length) {
    el.innerHTML = '<div class="empty" style="padding:40px 20px">Nenhum mês cadastrado.</div>';
    return;
  }

  const todayStr = today();
  const years = [...new Set(S.months.map(m => +m.year))].sort((a, b) => b - a);

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

    const statusColor = !items.length ? 'var(--text3)'
      : allPaid ? 'var(--green)'
      : overdueItems.length ? 'var(--red)'
      : 'var(--orange)';

    const statusLabel = !items.length ? 'sem itens'
      : allPaid ? '✓ tudo pago'
      : overdueItems.length ? `${overdueItems.length} vencido(s)`
      : `${pendingItems.length} pendente(s)`;

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

  const items      = _agendaItemsForMonth(monthKey);
  const todayStr   = today();
  const filter     = S._agendaFilter || 'all';
  const pendingItems = items.filter(i => !i.paid);
  const pendingTotal = pendingItems.reduce((s, i) => s + i.amount, 0);
  const totalAll     = items.reduce((s, i) => s + i.amount, 0);
  const paidTotal    = totalAll - pendingTotal;
  const filtered     = filter === 'pending' ? pendingItems : items;

  const rows = filtered.map(item => {
    const isOverdue  = item.date && item.date < todayStr && !item.paid;
    const statusCls  = item.paid ? 'bm-boleto-paid' : isOverdue ? 'bm-boleto-overdue' : 'bm-boleto-pending';
    const statusTxt  = item.paid ? 'pago ✓' : isOverdue ? 'vencido' : 'pendente';
    const amtColor   = item.paid ? 'var(--text3)' : isOverdue ? 'var(--red)' : 'var(--orange)';
    const typeBadge  = item.type === 'boleto' ? '<span class="bm bm-boleto">boleto</span>'
                     : item.type === 'sub'    ? '<span class="bm bm-rec">assinatura</span>'
                     :                         '<span class="bm bm-rec">fixo</span>';
    const dateLabel  = item.date ? item.date.split('-').reverse().join('/') : '—';
    const toggleAttr = item.type === 'boleto'
      ? `onclick="toggleBoletoPaid('${item.id}','${item.bankName}');renderAgenda()" title="Clique para marcar como ${item.paid ? 'pendente' : 'pago'}" style="cursor:pointer"`
      : `title="Status de ${item.type === 'sub' ? 'assinatura' : 'conta fixa'}"`;

    return `
      <tr class="entry-row${item.paid ? ' agenda-paid' : ''}">
        <td>
          ${item.desc}
          <span class="agenda-date">${dateLabel}</span>
          ${typeBadge}
          ${item.note ? `<span style="color:var(--text3);font-size:11px"> · ${item.note}</span>` : ''}
        </td>
        <td><span class="bm ${statusCls}" ${toggleAttr}>${statusTxt}</span></td>
        <td><span class="amt" style="color:${amtColor}">R$ ${fmt(item.amount)}</span></td>
      </tr>`;
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
              <thead><tr><th>Descrição</th><th>Status</th><th>Valor</th></tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
          <div style="font-size:11px;color:var(--text3);margin-top:10px;line-height:1.5">
            💡 Clique no badge de status dos boletos para marcar como pago/pendente sem abrir o modal.
          </div>
        </div>`}`;
}
