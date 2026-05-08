// ══════════════════════════════════════════════════
// AGENDA.JS — Agenda de Pagamentos
// Boletos, assinaturas mensais e contas fixas do mês
// ══════════════════════════════════════════════════

function renderAgenda() {
  const el = document.getElementById('agendaContent');
  if (!el) return;

  const m = getMonth();
  if (!m) {
    el.innerHTML = '<div class="empty" style="padding:40px 20px">Selecione um mês para ver a agenda de pagamentos.</div>';
    return;
  }

  const allE   = m.banks.flatMap(b => b.entries.map(e => ({ ...e, bankName: b.name })));
  const boletos = allE.filter(e => e.type === 'boleto');
  const recL   = S.recurrents[S.currentMonth] || [];
  const subs   = (S.subscriptions || []).filter(s =>
    s.cycle === 'mensal' && isSubActiveInMonth(s, S.currentMonth)
  );

  const todayStr = today();
  const items = [];

  // Boletos
  boletos.forEach(bl => {
    items.push({
      type: 'boleto',
      id: String(bl.id),
      bankName: bl.bankName,
      desc: bl.desc,
      amount: bl.amount,
      date: bl.date || '',
      note: bl.note || '',
      paid: bl.paid || false,
    });
  });

  // Assinaturas mensais
  subs.forEach(s => {
    const day  = s.day || s.billingDay || 1;
    const date = `${m.year}-${String(m.month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    items.push({
      type: 'sub',
      id: String(s.id),
      desc: s.name,
      amount: calcMySubPart(s),
      date,
      note: s.bank ? `banco: ${s.bank}` : '',
      paid: false, // assinaturas não têm status paid por ora
    });
  });

  // Contas fixas legadas
  recL.forEach(r => {
    const day  = r.day || 1;
    const date = `${m.year}-${String(m.month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    items.push({
      type: 'rec',
      id: String(r.id),
      desc: r.desc,
      amount: r.amount,
      date,
      note: '',
      paid: false,
    });
  });

  // Ordena por data asc
  items.sort((a, b) => (a.date || '9999') < (b.date || '9999') ? -1 : 1);

  const filter       = S._agendaFilter || 'all';
  const pendingItems = items.filter(i => !i.paid);
  const pendingTotal = pendingItems.reduce((s, i) => s + i.amount, 0);
  const totalAll     = items.reduce((s, i) => s + i.amount, 0);
  const paidTotal    = totalAll - pendingTotal;
  const filtered     = filter === 'pending' ? pendingItems : items;

  const rows = filtered.map(item => {
    const isOverdue   = item.date && item.date < todayStr && !item.paid;
    const statusCls   = item.paid ? 'bm-boleto-paid' : isOverdue ? 'bm-boleto-overdue' : 'bm-boleto-pending';
    const statusTxt   = item.paid ? 'pago ✓' : isOverdue ? 'vencido' : 'pendente';
    const amtColor    = item.paid ? 'var(--text3)' : isOverdue ? 'var(--red)' : 'var(--orange)';
    const typeBadge   = item.type === 'boleto'   ? '<span class="bm bm-boleto">boleto</span>'
                      : item.type === 'sub'       ? '<span class="bm bm-rec">assinatura</span>'
                      :                            '<span class="bm bm-rec">fixo</span>';
    const dateLabel   = item.date
      ? item.date.split('-').reverse().join('/')
      : '—';

    // Só boletos têm toggle de pago no momento
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

      <!-- Cards resumo -->
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

      <!-- Filtro -->
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
