// ══════════════════════════════════════════════════
// DASHBOARD.JS — Renderização do Dashboard Principal
// ══════════════════════════════════════════════════

// ── Multi-select / bulk delete ──
let _selectMode = false;
let _selected = new Map(); // key: 'type:id', value: {type, id, bankName}

function _selModeToggle() {
  _selectMode = !_selectMode;
  _selected.clear();
  if (_selectMode) {
    _selUpdateBar();
  } else {
    const bar = document.getElementById('selBar');
    if (bar) bar.remove();
  }
  renderDash();
}

function _selToggle(type, id, bankName) {
  const key = `${type}:${id}`;
  if (_selected.has(key)) {
    _selected.delete(key);
  } else {
    _selected.set(key, { type, id: String(id), bankName: bankName || '' });
  }
  const attrMap = {
    entry:    `[data-entry-id="${id}"]`,
    pix:      `[data-pix-id="${id}"]`,
    boleto:   `[data-boleto-id="${id}"]`,
    dinheiro: `[data-dinheiro-id="${id}"]`,
    rec:      `[data-rec-id="${id}"]`,
    income:   `[data-income-id="${id}"]`,
  };
  const row = document.querySelector(`#view-dash ${attrMap[type]}`);
  if (row) row.classList.toggle('sel-on', _selected.has(key));
  _selUpdateBar();
}

function _selGetAllItems() {
  const m = getMonth();
  if (!m) return [];
  const allE = m.banks.flatMap(b => b.entries.map(e => ({ ...e, bankName: b.name })));
  const items = [];
  allE.filter(e => e.type !== 'boleto' && e.type !== 'cash').forEach(e => {
    items.push({ type: 'entry', id: String(e.id), bankName: e.bankName });
  });
  (S.pixEntries[S.currentMonth] || []).forEach(p => {
    items.push({ type: 'pix', id: String(p.id), bankName: '' });
  });
  allE.filter(e => e.type === 'boleto').forEach(e => {
    items.push({ type: 'boleto', id: String(e.id), bankName: e.bankName });
  });
  allE.filter(e => e.type === 'cash').forEach(e => {
    items.push({ type: 'dinheiro', id: String(e.id), bankName: e.bankName });
  });
  (S.recurrents[S.currentMonth] || []).forEach(r => {
    items.push({ type: 'rec', id: String(r.id), bankName: '' });
  });
  (S.incomes[S.currentMonth] || []).forEach(i => {
    items.push({ type: 'income', id: String(i.id), bankName: '' });
  });
  return items;
}

function _selSelectAll() {
  const items = _selGetAllItems();
  const allSelected = items.length > 0 && items.every(it => _selected.has(`${it.type}:${it.id}`));
  if (allSelected) {
    _selected.clear();
  } else {
    items.forEach(it => _selected.set(`${it.type}:${it.id}`, it));
  }
  renderDash();
}

// ── Selecionar tudo de uma seção específica ──
function _selSelectSection(type, bankName) {
  const m = getMonth();
  if (!m) return;
  let items = [];
  if (type === 'entry') {
    const bank = bankName ? m.banks.find(b => b.name === bankName) : null;
    if (bank) items = bank.entries.filter(e => e.type !== 'boleto' && e.type !== 'cash').map(e => ({ type: 'entry', id: String(e.id), bankName }));
  } else if (type === 'pix') {
    items = (S.pixEntries[S.currentMonth] || []).map(p => ({ type: 'pix', id: String(p.id), bankName: '' }));
  } else if (type === 'boleto') {
    items = m.banks.flatMap(b => b.entries.filter(e => e.type === 'boleto').map(e => ({ type: 'boleto', id: String(e.id), bankName: b.name })));
  } else if (type === 'dinheiro') {
    items = m.banks.flatMap(b => b.entries.filter(e => e.type === 'cash').map(e => ({ type: 'dinheiro', id: String(e.id), bankName: b.name })));
  } else if (type === 'rec') {
    items = (S.recurrents[S.currentMonth] || []).map(r => ({ type: 'rec', id: String(r.id), bankName: '' }));
  } else if (type === 'income') {
    items = (S.incomes[S.currentMonth] || []).map(i => ({ type: 'income', id: String(i.id), bankName: '' }));
  }
  const allSel = items.length > 0 && items.every(it => _selected.has(`${it.type}:${it.id}`));
  if (allSel) {
    items.forEach(it => _selected.delete(`${it.type}:${it.id}`));
  } else {
    items.forEach(it => _selected.set(`${it.type}:${it.id}`, it));
  }
  renderDash();
}

function _selSecBtn(type, bankName) {
  if (!_selectMode) return '';
  const m = getMonth();
  if (!m) return '';
  let keys = [];
  if (type === 'entry') {
    const bank = bankName ? m.banks.find(b => b.name === bankName) : null;
    keys = bank ? bank.entries.filter(e => e.type !== 'boleto' && e.type !== 'cash').map(e => `entry:${e.id}`) : [];
  } else if (type === 'pix') {
    keys = (S.pixEntries[S.currentMonth] || []).map(p => `pix:${p.id}`);
  } else if (type === 'boleto') {
    keys = m.banks.flatMap(b => b.entries.filter(e => e.type === 'boleto').map(e => `boleto:${e.id}`));
  } else if (type === 'dinheiro') {
    keys = m.banks.flatMap(b => b.entries.filter(e => e.type === 'cash').map(e => `dinheiro:${e.id}`));
  } else if (type === 'rec') {
    keys = (S.recurrents[S.currentMonth] || []).map(r => `rec:${r.id}`);
  } else if (type === 'income') {
    keys = (S.incomes[S.currentMonth] || []).map(i => `income:${i.id}`);
  }
  if (!keys.length) return '';
  const allSel = keys.every(k => _selected.has(k));
  const safeName = (bankName || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  return `<button class="btn btn-ghost btn-sm" style="font-size:11px;padding:2px 8px;opacity:.8"
    onclick="event.stopPropagation();_selSelectSection('${type}','${safeName}')">${allSel ? 'desmarcar' : 'sel. tudo'}</button>`;
}

function _selUpdateBar() {
  const count = _selected.size;
  const total = _selGetAllItems().length;
  const allSelected = total > 0 && count === total;
  let bar = document.getElementById('selBar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'selBar';
    bar.className = 'sel-bar';
    document.body.appendChild(bar);
  }
  const selAllBtn = `<button class="btn btn-ghost btn-sm" onclick="_selSelectAll()">${allSelected ? 'Desmarcar tudo' : 'Selecionar tudo'}</button>`;
  if (count === 0) {
    bar.innerHTML = `<span class="sel-bar-count">selecione itens</span><div style="display:flex;gap:8px">${selAllBtn}<button class="btn btn-ghost btn-sm" onclick="_selModeToggle()">Cancelar</button></div>`;
  } else {
    bar.innerHTML = `<span class="sel-bar-count">${count} selecionado${count !== 1 ? 's' : ''}</span><div style="display:flex;gap:8px">${selAllBtn}<button class="btn btn-ghost btn-sm" onclick="_selModeToggle()">Cancelar</button><button class="btn btn-sm sel-del-btn" onclick="_selDeleteAll()">Excluir ${count}</button></div>`;
  }
}

async function _selDeleteAll() {
  const count = _selected.size;
  if (!count) return;
  if (!confirm(`Excluir ${count} item${count !== 1 ? 's' : ''}? Essa ação não pode ser desfeita.`)) return;

  const items = [..._selected.values()];
  setSyncing(true);

  for (const item of items) {
    const { type, id } = item;
    try {
      if (type === 'entry' || type === 'boleto' || type === 'dinheiro') {
        const m = getMonth();
        if (m) {
          for (const bk of m.banks) {
            const idx = bk.entries.findIndex(e => String(e.id) === String(id));
            if (idx !== -1) { bk.entries.splice(idx, 1); break; }
          }
        }
        await dbDeleteEntry(id);
      } else if (type === 'pix') {
        S.pixEntries[S.currentMonth] = (S.pixEntries[S.currentMonth] || []).filter(p => String(p.id) !== String(id));
        await dbDeletePix(id);
      } else if (type === 'rec') {
        S.recurrents[S.currentMonth] = (S.recurrents[S.currentMonth] || []).filter(r => String(r.id) !== String(id));
        await dbDeleteRecurrent(id);
      } else if (type === 'income') {
        S.incomes[S.currentMonth] = (S.incomes[S.currentMonth] || []).filter(i => String(i.id) !== String(id));
        await dbDeleteIncome(id);
      }
    } catch (err) {
      console.error('Erro ao excluir', item, err);
    }
  }

  setSyncing(false);
  _selectMode = false;
  _selected.clear();
  const bar = document.getElementById('selBar');
  if (bar) bar.remove();
  renderDash();
  showToast(`${count} item${count !== 1 ? 's' : ''} excluído${count !== 1 ? 's' : ''}`);
}

function filterEntries(q) {
  const v = q.toLowerCase().trim();
  document.querySelectorAll('#view-dash .entry-row').forEach(row => {
    row.style.display = !v || row.textContent.toLowerCase().includes(v) ? '' : 'none';
  });
}

function setInnerTab(t) {
  S.currentInnerTab = t;
  document.querySelectorAll('.itab').forEach(x => x.classList.remove('active'));
  document.querySelectorAll('.itab-content').forEach(x => x.style.display = 'none');
  document.getElementById('itab-' + t)?.classList.add('active');
  const c = document.getElementById('itabc-' + t);
  if (c) {
    c.style.display = 'block';
  }
  if (t === 'notas' && typeof renderMonthNotesInline === 'function') renderMonthNotesInline();
}

// ── Sub-funções extraídas de renderDash() ──

function renderGoalBar(m, metaGasto) {
  if (!m.goal) return '';
  const pct = metaGasto / m.goal * 100;
  const cor = metaGasto > m.goal
    ? 'var(--red)'
    : pct > 80
      ? 'var(--orange)'
      : 'var(--green)';
  const restam = m.goal - metaGasto;
  return `
      <div class="goal-bar-wrap" style="margin-top:6px">
        <div class="goal-bar-track">
          <div class="goal-bar-fill" style="width:${Math.min(pct, 100).toFixed(1)}%;background:${cor}"></div>
        </div>
        <div class="goal-bar-label">
          ${pct.toFixed(0)}% da meta ·
          ${restam > 0 ? `R$ ${fmt(restam)} restam` : `R$ ${fmt(Math.abs(restam))} acima`}
        </div>
      </div>`;
}

function renderAlerts(m, metaGasto, recL) {
  let alerts = '';
  if (m.goal) {
    const pct = metaGasto / m.goal;
    if (pct > 0.8 && metaGasto <= m.goal)
      alerts += `<div class="alert-banner">⚠️ Você usou ${(pct * 100).toFixed(0)}% da sua meta de gastos este mês.</div>`;
    if (metaGasto > m.goal)
      alerts += `<div class="alert-banner" style="background:#ff4d4d18;border-color:#ff4d4d44;color:var(--red)">🚨 Meta ultrapassada em R$ ${fmt(metaGasto - m.goal)}.</div>`;
  }

  // ── Banner de vencimentos próximos (Lote D) ──
  const n = S.profile?.notifyDaysBefore ?? 3;
  const todayD   = new Date();
  const todayStr = today();
  const futureD  = new Date(); futureD.setDate(futureD.getDate() + n);
  const futureStr = futureD.toISOString().split('T')[0];

  const agendaMarks = (() => {
    try { return JSON.parse(localStorage.getItem('fin_agenda_marks') || '{}'); } catch { return {}; }
  })();

  // Boletos pendentes que vencem até N dias
  const allE = m.banks.flatMap(b => b.entries);
  const boletosDue = allE.filter(e =>
    e.type === 'boleto' && !e.paid && e.date && e.date >= todayStr && e.date <= futureStr
  );
  const boletosOverdue = allE.filter(e =>
    e.type === 'boleto' && !e.paid && e.date && e.date < todayStr
  );

  // Assinaturas mensais não pagas que vencem até N dias
  const curMonthKey = S.currentMonth;
  const subsDue = (S.subscriptions || []).filter(s => {
    if (s.cycle !== 'mensal' || (s.owner || 'mine') === 'other') return false;
    if (!isSubActiveInMonth(s, curMonthKey)) return false;
    const isPaid = !!agendaMarks[`${curMonthKey}:sub:${String(s.id)}`];
    if (isPaid) return false;
    const diff = parseInt(s.day || 1) - todayD.getDate();
    return diff >= 0 && diff <= n;
  });

  // Contas fixas não pagas que vencem até N dias (mantém alertas individuais)
  const recDue = [];
  (recL || []).forEach(r => {
    if (!r.day) return;
    const isPaid = !!agendaMarks[`${curMonthKey}:rec:${String(r.id)}`];
    if (isPaid) return;
    const diff = parseInt(r.day) - todayD.getDate();
    if (diff >= 0 && diff <= n) recDue.push({ ...r, diff });
  });

  // Banner consolidado de vencimentos
  const totalDue = boletosDue.length + subsDue.length + recDue.length;
  const totalOverdue = boletosOverdue.length;
  if (totalOverdue > 0) {
    alerts += `<div class="alert-banner" onclick="S._agendaMonth='${curMonthKey}';showView('agenda')"
      style="background:#ff4d4d18;border-color:#ff4d4d44;color:var(--red);cursor:pointer">
      🚨 ${totalOverdue} boleto(s) vencido(s) sem pagamento — <strong>Ver agenda →</strong></div>`;
  }
  if (totalDue > 0) {
    const label = n === 1 ? 'amanhã' : `nos próximos ${n} dias`;
    alerts += `<div class="alert-banner" onclick="S._agendaMonth='${curMonthKey}';showView('agenda')"
      style="cursor:pointer">
      ⏰ ${totalDue} conta(s) vencem ${label} — <strong>Ver agenda →</strong></div>`;
  }

  return alerts;
}

function renderSummaryCards(m, totals) {
  const { totalGasto, metaGasto, othT, incMyT, incOthT, saldo, subM, mySubM, othSubM, pplMap, goalBar } = totals;

  // Calcular recebidos e pendentes para o card A Receber
  const aReceberBruto = Object.values(pplMap).reduce((s, d) => s + d.total, 0);
  const aReceberRecebido = (S.receivableMarks || [])
    .filter(r => r.monthKey === S.currentMonth && r.received)
    .reduce((s, r) => s + r.amount, 0);
  const aReceberPendente = Math.max(0, aReceberBruto - aReceberRecebido);

  return `
    <div class="summary-grid">
      <div class="card">
        <div class="card-lbl">Total Gastos</div>
        <div class="card-val">R$ ${fmt(totalGasto)}</div>
      </div>
      <div class="card card-link" onclick="showMeusGastosReport()" title="Ver detalhes dos meus gastos">
        <div class="card-lbl">Meus Gastos ↗</div>
        <div class="card-val a">R$ ${fmt(metaGasto)}</div>
        ${goalBar || '<div class="card-sub">clique para ver</div>'}
      </div>
      ${Object.keys(pplMap).length > 0 ? `<div class="card card-link" onclick="toggleAReceber()" title="Ver quem deve — clique para expandir">
        <div class="card-lbl">A Receber ↗</div>
        <div class="card-val b">R$ ${fmt(aReceberPendente)}</div>
        <div class="card-sub">
          ${Object.keys(pplMap).length} pessoa(s) · clique para ver
          ${aReceberRecebido > 0 ? `<div style="color:var(--green);font-size:10px;margin-top:1px">✓ R$ ${fmt(aReceberRecebido)} recebido(s)</div>` : ''}
        </div>
      </div>` : `<div class="card"><div class="card-lbl">A Receber</div><div class="card-val b">R$ 0,00</div><div class="card-sub">ninguém deve</div></div>`}
      <div class="card card-link" onclick="setInnerTab('entradas')" title="Ver entradas do mês">
        <div class="card-lbl">Entradas ↗</div>
        <div class="card-val g">R$ ${fmt(incMyT + incOthT)}</div>
        <div class="card-sub">clique para ver</div>
      </div>
      <div class="card"><div class="card-lbl">Saldo</div><div class="card-val ${saldo >= 0 ? 'g' : 'r'}">R$ ${fmt(saldo)}</div></div>
      ${subM > 0 ? `<div class="card card-link" onclick="showView('subs')" title="Gerenciar assinaturas">
        <div class="card-lbl">Assinaturas ↗</div>
        <div class="card-val p">R$ ${fmt(subM)}</div>
        <div class="card-sub">${mySubM > 0 ? `meu: R$ ${fmt(mySubM)}` : ''}${othSubM > 0 ? ` · terceiros: R$ ${fmt(othSubM)}` : ''} · clique para ver</div>
      </div>` : ''}
    </div>`;
}

function renderAReceber(pplMap) {
  if (!Object.keys(pplMap).length) return '';

  // Marks recebidos no mês corrente por pessoa
  const rcvMap = {};
  (S.receivableMarks || [])
    .filter(r => r.monthKey === S.currentMonth && r.received)
    .forEach(r => {
      if (!rcvMap[r.person]) rcvMap[r.person] = { count: 0, total: 0 };
      rcvMap[r.person].count++;
      rcvMap[r.person].total += r.amount;
    });

  return `
    <div id="dashAReceber" style="display:none;margin-bottom:4px">
      <div class="sec-title" style="margin-bottom:10px">A Receber</div>
      <div class="people-grid" style="margin-bottom:18px">
        ${Object.entries(pplMap).map(([n, d]) => {
          const rcv     = rcvMap[n] || { count: 0, total: 0 };
          const allDone = rcv.total > 0 && rcv.total >= d.total - 0.01;
          return `
          <div class="pcard${allDone ? ' pcard-done' : ''}" onclick="openCobranca('${n}')" style="cursor:pointer" title="${allDone ? 'Quitado — ver detalhes' : 'Ver cobrança de ' + n}">
            <div class="pcard-name">${n}</div>
            <div class="pcard-val${allDone ? ' g' : ' b'}">R$ ${fmt(d.total)}</div>
            <div class="pcard-sub">
              ${allDone
                ? '✓ quitado · toque para ver'
                : `${d.count} item(s) · toque para cobrar`}
              ${rcv.count > 0 && !allDone
                ? `<div style="color:var(--green);font-size:10px;margin-top:2px">✓ ${rcv.count} recebido(s) · R$ ${fmt(rcv.total)}</div>`
                : ''}
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
}

function toggleAReceber() {
  const el = document.getElementById('dashAReceber');
  if (!el) return;
  el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

function renderBankSection(m, bk) {
  if (!m.banks.length) return '';
  const bkTabs = m.banks.map(b => `
    <div class="btab ${S.currentBank === b.name ? 'active' : ''}" onclick="selectBank('${b.name}')">
      <span class="dot" style="color:${PALETTE[b.color] || PALETTE.azure}"></span>
      ${b.name}
      <button onclick="event.stopPropagation();deleteBank('${b.name}')"
        style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:14px;padding:0 2px;margin-left:2px;line-height:1;transition:color .15s"
        onmouseover="this.style.color='var(--red)'"
        onmouseout="this.style.color='var(--text3)'"
        title="Excluir banco">×</button>
    </div>`).join('') + `<button class="btab" onclick="openModal('mBank')" style="opacity:.5">+</button>`;

  let html = `<div class="bank-tabs">${bkTabs}</div>`;

  if (bk) {
    const sorted = [...bk.entries].filter(e => e.type !== 'boleto' && e.type !== 'cash').sort((a, b_) => new Date(b_.date) - new Date(a.date));

    // Assinaturas mensais vinculadas a este banco no mês corrente
    const bankSubs = (S.subscriptions || []).filter(s =>
      s.bank === bk.name && s.cycle === 'mensal' && isSubActiveInMonth(s, S.currentMonth)
    );

    // Totais corretos: inclui parte de cada dono em entradas divididas + assinaturas
    const bMine = sorted.filter(e => e.owner === 'mine').reduce((s, e) => s + e.amount, 0)
      + sorted.filter(e => e.owner === 'split').reduce((s, e) => s + e.amount * (e.splitRatio ?? 0.5), 0)
      + bankSubs.reduce((s, sub) => s + calcMySubPart(sub), 0);
    const bOth = sorted.filter(e => e.owner === 'other').reduce((s, e) => s + e.amount, 0)
      + sorted.filter(e => e.owner === 'split').reduce((s, e) => s + e.amount * (1 - (e.splitRatio ?? 0.5)), 0)
      + bankSubs.filter(s => (s.owner || 'mine') !== 'mine').reduce((s, sub) => s + (sub.amount - calcMySubPart(sub)), 0);

    const entryRows = sorted.map(e => {
      const ib = e.type === 'installment'
        ? `<span class="bm bm-inst">${e.installCurrent ?? '?'}/${e.installTotal ?? '?'}</span>`
        : e.type === 'pix' ? `<span class="bm bm-pix">pix</span>`
        : e.type === 'debit' ? `<span class="bm bm-debit">débito</span>`
        : e.type === 'boleto' ? `<span class="bm bm-boleto">boleto</span>`
        : e.type === 'cash' ? `<span class="bm bm-cash">dinheiro</span>` : '';
      const splitN = (e.splitPeople?.length ?? (e.person ? 1 : 0)) + 1;
      const wb = e.owner === 'split'
        ? `<span class="bm bm-split">÷${splitN}</span>`
        : e.owner === 'other'
          ? `<span class="bm bm-other">${e.person}</span>`
          : `<span class="bm bm-mine">eu</span>`;
      const amtColor = e.owner === 'other' ? 'var(--blue)' : e.owner === 'split' ? 'var(--purple)' : 'var(--text)';
      const icon = getCategoryIcon(e.desc, e.category);
      const safeE = JSON.stringify(e).replace(/'/g, "&#39;").replace(/"/g, "&quot;");
      const _eOnclick = _selectMode
        ? `onclick="_selToggle('entry', '${e.id}', '${bk.name}')"`
        : `onclick='showEntryDetail(${safeE}, "${bk.name}")'`;
      const _eCls = _selected.has(`entry:${e.id}`) ? ' sel-on' : '';
      return `<tr class="entry-row${_eCls}" data-entry-id="${e.id}" data-bank="${bk.name}" ${_eOnclick}>
        <td>${icon ? icon + ' ' : ''}${e.desc} ${ib}</td>
        <td>${wb}</td>
        <td><span class="amt" style="color:${amtColor}">R$ ${fmt(e.amount)}</span></td>
      </tr>`;
    }).join('');

    const subRows = bankSubs.map(sub => {
      const owner = sub.owner || 'mine';
      const splitN = (sub.splitPeople?.length ?? 0) + 1;
      const wb = owner === 'split'
        ? `<span class="bm bm-split">÷${splitN}</span>`
        : owner === 'other'
          ? `<span class="bm bm-other">${(sub.splitPeople || ['?'])[0]}</span>`
          : `<span class="bm bm-mine">eu</span>`;
      const amtColor = owner === 'other' ? 'var(--blue)' : owner === 'split' ? 'var(--purple)' : 'var(--text)';
      return `<tr class="entry-row" onclick="showView('subs')">
        <td>${sub.name} <span class="bm bm-rec">assinatura</span></td>
        <td>${wb}</td>
        <td><span class="amt" style="color:${amtColor}">R$ ${fmt(sub.amount)}</span></td>
      </tr>`;
    }).join('');

    const hasRows = sorted.length || bankSubs.length;
    const rows = hasRows
      ? entryRows + subRows
      : `<tr><td colspan="3"><div class="empty" style="padding:20px">nenhum lançamento</div></td></tr>`;

    html += `
      <div class="tbl-block">
        <div class="tbl-head">
          <span class="tbl-title">${bk.name}</span>
          <span style="display:flex;align-items:center;gap:6px">${_selSecBtn('entry', bk.name)}<span class="tbl-total">R$ ${fmt(bMine + bOth)}</span></span>
        </div>
        <table>
          <thead><tr><th>Descrição</th><th>De quem</th><th>Valor</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        ${hasRows ? `
          <div class="foot-row">
            <div class="foot-grp"><span class="foot-lbl">Meus</span><span class="foot-amt" style="color:var(--accent)">R$ ${fmt(bMine)}</span></div>
            <div class="foot-grp"><span class="foot-lbl">Outros</span><span class="foot-amt" style="color:var(--blue)">R$ ${fmt(bOth)}</span></div>
            <div class="foot-grp"><span class="foot-lbl">Total</span><span class="foot-amt">R$ ${fmt(bMine + bOth)}</span></div>
          </div>` : ''}
      </div>`;
  }
  return html;
}

function renderPixSection(pixL) {
  if (!pixL.length) return '';
  const prows = [...pixL].sort((a, b_) => new Date(b_.date) - new Date(a.date)).map(p => {
    const _pOnclick = _selectMode ? `onclick="_selToggle('pix', '${p.id}')"` : `onclick="openPixM(${p.id})"`;
    const _pCls = _selected.has(`pix:${p.id}`) ? ' sel-on' : '';
    return `
    <tr class="entry-row${_pCls}" data-pix-id="${p.id}" ${_pOnclick}>
      <td>${p.to}${p.obs ? ` <span style="color:var(--text3);font-size:11px">· ${p.obs}</span>` : ''}
        ${p.bank ? ` <span class="bm bm-cat">${p.bank}</span>` : ''}</td>
      <td><span class="bm bm-pix">pix</span></td>
      <td><span class="amt" style="color:var(--green)">R$ ${fmt(p.amount)}</span></td>
    </tr>`;
  }).join('');
  return `
    <div class="tbl-block">
      ${_selectMode ? `<div class="tbl-head" style="padding:6px 12px"><span></span>${_selSecBtn('pix', '')}</div>` : ''}
      <table><thead><tr><th>Para</th><th>Tipo</th><th>Valor</th></tr></thead><tbody>${prows}</tbody></table>
    </div>`;
}

function renderBoletosSection(boletoL) {
  if (!boletoL.length) return '';
  const _todayBol = today();
  const brows = [...boletoL].sort((a, b_) => new Date(b_.date) - new Date(a.date)).map(bl => {
    const _blOnclick = _selectMode
      ? `onclick="_selToggle('boleto', '${bl.id}', '${bl.bankName}')"`
      : `onclick="openBoletoM('${bl.id}', '${bl.bankName}')"`;
    const _blCls = (_selected.has(`boleto:${bl.id}`) ? ' sel-on' : '') + (bl.paid ? ' agenda-paid' : '');
    const isOverdue = bl.date && bl.date < _todayBol && !bl.paid;
    const statusCls = bl.paid ? 'bm-boleto-paid' : isOverdue ? 'bm-boleto-overdue' : 'bm-boleto-pending';
    const statusTxt = bl.paid ? 'pago ✓' : isOverdue ? 'vencido' : 'boleto';
    const statusClick = _selectMode ? '' : `onclick="event.stopPropagation();toggleBoletoPaid('${bl.id}','${bl.bankName}')"`;
    const amtColor = bl.paid ? 'var(--text3)' : isOverdue ? 'var(--red)' : 'var(--orange)';
    return `
    <tr class="entry-row${_blCls}" data-boleto-id="${bl.id}" data-boleto-bank="${bl.bankName}" ${_blOnclick}>
      <td>${bl.desc}${bl.note ? ` <span style="color:var(--text3);font-size:11px">· ${bl.note}</span>` : ''}
        ${bl.bankName ? ` <span class="bm bm-cat">${bl.bankName}</span>` : ''}</td>
      <td><span class="bm ${statusCls}" ${statusClick} title="Clique para marcar como ${bl.paid ? 'pendente' : 'pago'}">${statusTxt}</span></td>
      <td><span class="amt" style="color:${amtColor}">R$ ${fmt(bl.amount)}</span></td>
    </tr>`;
  }).join('');
  return `
    <div class="tbl-block">
      ${_selectMode ? `<div class="tbl-head" style="padding:6px 12px"><span></span>${_selSecBtn('boleto', '')}</div>` : ''}
      <table><thead><tr><th>Descrição</th><th>Status</th><th>Valor</th></tr></thead><tbody>${brows}</tbody></table>
    </div>`;
}

function renderDinheiroSection(dinheiroL) {
  if (!dinheiroL.length) return '';
  const drows = [...dinheiroL].sort((a, b_) => new Date(b_.date) - new Date(a.date)).map(dn => {
    const _dnOnclick = _selectMode
      ? `onclick="_selToggle('dinheiro', '${dn.id}', '${dn.bankName}')"`
      : `onclick="openDinheiroM('${dn.id}', '${dn.bankName}')"`;
    const _dnCls = _selected.has(`dinheiro:${dn.id}`) ? ' sel-on' : '';
    return `
    <tr class="entry-row${_dnCls}" data-dinheiro-id="${dn.id}" data-dinheiro-bank="${dn.bankName}" ${_dnOnclick}>
      <td>${dn.desc}${dn.note ? ` <span style="color:var(--text3);font-size:11px">· ${dn.note}</span>` : ''}
        ${dn.bankName ? ` <span class="bm bm-cat">${dn.bankName}</span>` : ''}</td>
      <td><span class="bm bm-cash">dinheiro</span></td>
      <td><span class="amt">R$ ${fmt(dn.amount)}</span></td>
    </tr>`;
  }).join('');
  return `
    <div class="tbl-block">
      ${_selectMode ? `<div class="tbl-head" style="padding:6px 12px"><span></span>${_selSecBtn('dinheiro', '')}</div>` : ''}
      <table><thead><tr><th>Descrição</th><th>Tipo</th><th>Valor</th></tr></thead><tbody>${drows}</tbody></table>
    </div>`;
}

function renderRecurrentsSection(recL) {
  if (!recL.length) return '';
  const rrows = recL.map(r => {
    const _rOnclick = _selectMode
      ? `onclick="_selToggle('rec', '${r.id}')"`
      : `onclick="openRecM(${r.id})"`;
    const _rCls = _selected.has(`rec:${r.id}`) ? ' sel-on' : '';
    return `
    <tr class="entry-row${_rCls}" data-rec-id="${r.id}" ${_rOnclick}>
      <td>${r.desc}${r.day ? ` <span style="color:var(--text3);font-size:11px">· dia ${r.day}</span>` : ''}</td>
      <td><span class="bm bm-rec">fixo</span></td>
      <td><span class="amt" style="color:var(--orange)">R$ ${fmt(r.amount)}</span></td>
    </tr>`;
  }).join('');
  return `
    <div class="dash-sec-deprecation">
      ⚠️ Esta seção foi descontinuada — use <strong>Assinaturas</strong> para gastos mensais recorrentes ou <strong>Boleto</strong> para contas avulsas. Os dados abaixo são registros antigos; você pode excluí-los.
    </div>
    <div class="tbl-block">
      ${_selectMode ? `<div class="tbl-head" style="padding:6px 12px"><span></span>${_selSecBtn('rec', '')}</div>` : ''}
      <table><thead><tr><th>Descrição</th><th>Tipo</th><th>Valor</th></tr></thead><tbody>${rrows}</tbody></table>
    </div>`;
}

function _dashToggle(key) {
  if (!S._dashOpen) S._dashOpen = {};
  S._dashOpen[key] = (S._dashOpen[key] === false) ? true : false;
  const body = document.getElementById('dsh-body-' + key);
  const icon = document.getElementById('dsh-icon-' + key);
  const open = S._dashOpen[key] !== false;
  if (body) body.style.display = open ? '' : 'none';
  if (icon) icon.textContent = open ? '▾' : '▸';
}

function _dashSection(key, label, color, totalStr, innerHtml) {
  if (!innerHtml) return '';
  if (!S._dashOpen) S._dashOpen = {};
  const open = S._dashOpen[key] !== false;
  S._dashOpen[key] = open;
  return `
    <div class="dash-sec">
      <div class="dash-sec-hd" onclick="_dashToggle('${key}')">
        <span class="dash-sec-label">${label}</span>
        <span class="dash-sec-meta">
          <span class="dash-sec-total" style="color:${color}">${totalStr}</span>
          <span id="dsh-icon-${key}" class="dash-sec-icon">${open ? '▾' : '▸'}</span>
        </span>
      </div>
      <div id="dsh-body-${key}" class="dash-sec-body" style="${open ? '' : 'display:none'}">
        ${innerHtml}
      </div>
    </div>`;
}

function renderEntradasSection(incL, incMyT, incOthT, incPplMap) {
  if (!incL.length) {
    return `
      <div style="display:flex;justify-content:flex-end;margin-bottom:14px">
        <button class="btn btn-green btn-sm" onclick="openIncomeM()">+ Entrada</button>
      </div>
      <div class="empty">nenhuma entrada</div>`;
  }

  const rows = [...incL].sort((a, b_) => new Date(b_.date) - new Date(a.date)).map(i => {
    const incType = i.incType || 'Outros';
    const typeBadge = incType === 'Pix' ? `<span class="bm bm-pix">pix</span>`
      : incType === 'Débito' ? `<span class="bm bm-debit">débito</span>`
      : incType === 'Dinheiro' ? `<span class="bm bm-cash">dinheiro</span>`
      : `<span class="bm bm-cat">${incType}</span>`;
    const _iId = String(i.id).replace(/'/g, "\\'");
    const _iOnclick = _selectMode
      ? `onclick="_selToggle('income', '${_iId}')"`
      : `onclick="openIncomeM('${_iId}')"`;
    const _iCls = _selected.has(`income:${i.id}`) ? ' sel-on' : '';
    const tagHtml = i.tags?.length
      ? `<div style="margin-top:3px">${i.tags.map(t => `<span class="bm" style="font-size:10px;padding:1px 6px;margin-right:2px;background:var(--bg3);color:var(--text2);border:1px solid var(--border)">${t}</span>`).join('')}</div>`
      : '';
    const obsHtml = i.obs ? `<div style="font-size:11px;color:var(--text3);margin-top:2px">💬 ${i.obs}</div>` : '';
    return `<tr class="entry-row${_iCls}" data-income-id="${i.id}" ${_iOnclick}>
      <td>
        ${i.desc} ${typeBadge}${i.from ? ` <span style="color:var(--text3);font-size:11px">· ${i.from}</span>` : ''}
        ${obsHtml}${tagHtml}
      </td>
      <td>${i.owner === 'other' ? `<span class="bm bm-other">${i.person}</span>` : `<span class="bm bm-mine">meu</span>`}</td>
      <td><span class="amt" style="color:var(--green)">R$ ${fmt(i.amount)}</span></td>
    </tr>`;
  }).join('');

  let html = '';
  const incPplKeys = Object.keys(incPplMap);
  if (incPplKeys.length) {
    const personCards = incPplKeys.map(key => {
      const d = incPplMap[key];
      const isExp = S._incExpandedPerson === key;
      const safeKey = key.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
      const entries = incL.filter(i => i.owner === 'other' && (i.person || '').trim().toLowerCase() === key);
      const detailRows = isExp ? entries.map(e =>
        `<div class="pcard-detail-row">
          <span>${e.desc}${e.obs ? ` <span style="color:var(--text3);font-size:10px">· ${e.obs}</span>` : ''}</span>
          <span style="color:var(--green);font-family:var(--mono);font-size:12px;white-space:nowrap">R$ ${fmt(e.amount)}</span>
        </div>`
      ).join('') : '';
      return `
        <div class="pcard${isExp ? ' pcard-expanded' : ''}"
             onclick="S._incExpandedPerson=S._incExpandedPerson==='${safeKey}'?null:'${safeKey}';renderDash()"
             style="cursor:pointer" title="Toque para ver entradas de ${d.display}">
          <div class="pcard-name">${d.display}</div>
          <div class="pcard-val" style="color:var(--green)">R$ ${fmt(d.total)}</div>
          <div class="pcard-sub">${d.count} entrada(s) · ${isExp ? 'fechar ▴' : 'ver ▾'}</div>
          ${isExp ? `<div class="pcard-detail">${detailRows}</div>` : ''}
        </div>`;
    }).join('');

    html += `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <div class="sec-title" style="margin:0">Recebido de</div>
        ${incPplKeys.length >= 2 ? `<button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();openMergePersonsM()" style="font-size:11px">⟷ Mesclar</button>` : ''}
      </div>
      <div class="people-grid" style="margin-bottom:18px">${personCards}</div>`;
  }

  html += `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <button class="btn btn-ghost btn-sm${_selectMode ? ' sel-mode-active' : ''}" onclick="_selModeToggle()">${_selectMode ? 'Cancelar' : 'Selecionar'}</button>
      ${_selectMode ? '' : `<button class="btn btn-green btn-sm" onclick="openIncomeM()">+ Entrada</button>`}
    </div>
    <div class="tbl-block">
      <div class="tbl-head">
        <span class="tbl-title">Todas as Entradas</span>
        <span style="display:flex;align-items:center;gap:6px">${_selSecBtn('income', '')}<span class="tbl-total" style="color:var(--green)">R$ ${fmt(incMyT + incOthT)}</span></span>
      </div>
      <table><thead><tr><th>Descrição</th><th>De quem</th><th>Valor</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="foot-row">
        <div class="foot-grp"><span class="foot-lbl">Meu</span><span class="foot-amt" style="color:var(--green)">R$ ${fmt(incMyT)}</span></div>
        <div class="foot-grp"><span class="foot-lbl">De outros</span><span class="foot-amt" style="color:var(--blue)">R$ ${fmt(incOthT)}</span></div>
        <div class="foot-grp"><span class="foot-lbl">Total</span><span class="foot-amt">R$ ${fmt(incMyT + incOthT)}</span></div>
      </div>
    </div>`;
  return html;
}

function _mgToggle(key) {
  if (!S._meusGastosOpen) S._meusGastosOpen = {};
  S._meusGastosOpen[key] = !S._meusGastosOpen[key];
  const body = document.getElementById('mg-body-' + key);
  const icon = document.getElementById('mg-icon-' + key);
  if (body) body.style.display = S._meusGastosOpen[key] ? '' : 'none';
  if (icon) icon.textContent = S._meusGastosOpen[key] ? '▾' : '▸';
}

function _mgSection(key, label, color, total, rows) {
  if (!rows) return '';
  if (!S._meusGastosOpen) S._meusGastosOpen = {};
  const open = S._meusGastosOpen[key] !== false; // aberto por padrão
  S._meusGastosOpen[key] = open;
  return `
    <div style="margin-bottom:8px;border:1px solid var(--border);border-radius:10px;overflow:hidden">
      <div onclick="_mgToggle('${key}')" style="display:flex;align-items:center;justify-content:space-between;padding:11px 14px;cursor:pointer;background:var(--bg3);user-select:none">
        <span style="font-size:12px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:.5px">${label}</span>
        <span style="display:flex;align-items:center;gap:10px">
          <span style="font-family:var(--mono);font-size:13px;font-weight:700;color:${color}">R$ ${fmt(total)}</span>
          <span id="mg-icon-${key}" style="color:var(--text3);font-size:12px">${open ? '▾' : '▸'}</span>
        </span>
      </div>
      <div id="mg-body-${key}" style="${open ? '' : 'display:none'}">
        <div class="tbl-block" style="margin:0">
          <table style="width:100%"><tbody>${rows}</tbody></table>
        </div>
      </div>
    </div>`;
}

function showMeusGastosReport() {
  const m = getMonth();
  if (!m) return;

  document.getElementById('meusGastosTitle').textContent = 'Meus Gastos — ' + m.label + ' ' + m.year;

  const allE = m.banks.flatMap(b => b.entries.map(e => ({ ...e, bankName: b.name })));
  const pixL = S.pixEntries[S.currentMonth] || [];
  const recL = S.recurrents[S.currentMonth] || [];

  const myEntries = allE.filter(e => e.owner === 'mine');
  const splitEntries = allE.filter(e => e.owner === 'split');
  const myEntriesAmt = myEntries.reduce((s, e) => s + e.amount, 0);
  const splitAmt = splitEntries.reduce((s, e) => s + e.amount * (e.splitRatio ?? 0.5), 0);
  const pixTotal = pixL.reduce((s, p) => s + p.amount, 0);
  const recTotal = recL.reduce((s, r) => s + r.amount, 0);
  const mySubs = (S.subscriptions || []).filter(s => isSubActiveInMonth(s, S.currentMonth) && (s.owner || 'mine') !== 'other');
  const mySubTotal = mySubs.reduce((s, sub) => s + calcMySubPart(sub), 0);
  const grandTotal = myEntriesAmt + splitAmt + pixTotal + recTotal + mySubTotal;

  // ── Lançamentos: por banco ──
  const byBank = {};
  [...myEntries, ...splitEntries].forEach(e => {
    if (!byBank[e.bankName]) byBank[e.bankName] = [];
    byBank[e.bankName].push(e);
  });

  const entryRows = Object.entries(byBank).map(([bName, entries]) => {
    const bankTotal = entries.reduce((s, e) => s + (e.owner === 'split' ? e.amount * (e.splitRatio ?? 0.5) : e.amount), 0);
    const rows = [...entries]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .map(e => {
        const myAmt = e.owner === 'split' ? e.amount * (e.splitRatio ?? 0.5) : e.amount;
        const icon = getCategoryIcon(e.desc, e.category);
        const typeBadge = e.type === 'installment'
          ? `<span class="bm bm-inst">${e.installCurrent ?? '?'}/${e.installTotal ?? '?'}</span>`
          : e.type === 'debit' ? `<span class="bm bm-debit">déb</span>`
          : e.type === 'cash' ? `<span class="bm bm-cash">din</span>` : '';
        const splitBadge = e.owner === 'split' ? `<span class="bm bm-split">÷</span>` : '';
        return `<tr>
          <td style="padding:8px 14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:0;width:99%">${icon ? icon + ' ' : ''}${e.desc} ${typeBadge}${splitBadge}</td>
          <td style="padding:8px 14px;white-space:nowrap;text-align:right"><span class="amt">R$ ${fmt(myAmt)}</span></td>
        </tr>`;
      }).join('');
    return `<tr><td colspan="2" style="padding:6px 14px 2px;font-size:10px;color:var(--text3);font-weight:700;text-transform:uppercase;letter-spacing:.5px;background:var(--bg4)">
      ${bName} <span style="float:right;color:var(--accent)">R$ ${fmt(bankTotal)}</span></td></tr>${rows}`;
  }).join('');

  const pixRows = [...pixL]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .map(p => `<tr>
      <td style="padding:8px 14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:0;width:99%">${p.to}${p.obs ? ` <span style="color:var(--text3);font-size:11px">· ${p.obs}</span>` : ''}</td>
      <td style="padding:8px 14px;white-space:nowrap;text-align:right"><span class="amt">R$ ${fmt(p.amount)}</span></td>
    </tr>`).join('');

  const recRows = recL
    .map(r => `<tr>
      <td style="padding:8px 14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:0;width:99%">${r.desc}${r.day ? ` <span style="color:var(--text3);font-size:11px">· dia ${r.day}</span>` : ''}</td>
      <td style="padding:8px 14px;white-space:nowrap;text-align:right"><span class="amt">R$ ${fmt(r.amount)}</span></td>
    </tr>`).join('');

  const subRows = mySubs.map(s => {
    const myPart = calcMySubPart(s);
    const splitBadge = s.owner === 'split' ? `<span class="bm bm-split">÷</span>` : '';
    return `<tr>
      <td style="padding:8px 14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:0;width:99%">${s.name} ${splitBadge}</td>
      <td style="padding:8px 14px;white-space:nowrap;text-align:right"><span class="amt">R$ ${fmt(myPart)}</span></td>
    </tr>`;
  }).join('');

  document.getElementById('meusGastosContent').innerHTML = `
    <!-- Total em destaque -->
    <div style="text-align:center;padding:20px 0 24px;margin-bottom:20px;border-bottom:1px solid var(--border)">
      <div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:2px;margin-bottom:8px">Total dos meus gastos</div>
      <div style="font-size:32px;font-weight:800;color:var(--accent);font-family:var(--mono)">R$ ${fmt(grandTotal)}</div>
      <div style="display:flex;justify-content:center;gap:16px;margin-top:14px;flex-wrap:wrap">
        ${myEntriesAmt + splitAmt > 0 ? `<div style="text-align:center"><div style="font-size:10px;color:var(--text3)">Lançamentos</div><div style="font-size:13px;font-weight:700;color:var(--text);font-family:var(--mono)">R$ ${fmt(myEntriesAmt + splitAmt)}</div></div>` : ''}
        ${pixTotal > 0 ? `<div style="text-align:center"><div style="font-size:10px;color:var(--text3)">Pix</div><div style="font-size:13px;font-weight:700;color:var(--text);font-family:var(--mono)">R$ ${fmt(pixTotal)}</div></div>` : ''}
        ${recTotal > 0 ? `<div style="text-align:center"><div style="font-size:10px;color:var(--text3)">Contas Fixas</div><div style="font-size:13px;font-weight:700;color:var(--text);font-family:var(--mono)">R$ ${fmt(recTotal)}</div></div>` : ''}
        ${mySubTotal > 0 ? `<div style="text-align:center"><div style="font-size:10px;color:var(--text3)">Assinaturas</div><div style="font-size:13px;font-weight:700;color:var(--text);font-family:var(--mono)">R$ ${fmt(mySubTotal)}</div></div>` : ''}
      </div>
    </div>

    <!-- Seções colapsáveis -->
    ${grandTotal === 0 ? '<div class="empty">Nenhum gasto registrado</div>' : ''}
    ${_mgSection('lancamentos', 'Lançamentos', 'var(--accent)', myEntriesAmt + splitAmt, entryRows)}
    ${_mgSection('pix', 'Pix Enviados', 'var(--green)', pixTotal, pixRows)}
    ${_mgSection('fixas', 'Contas Fixas', 'var(--orange)', recTotal, recRows)}
    ${_mgSection('subs', 'Assinaturas', 'var(--purple)', mySubTotal, subRows)}
  `;

  openModal('mMeusGastos');
}

// ── renderDash(): calcula totais, chama sub-funções, monta innerHTML ──
let _renderDashRaf = null;
function renderDash() {
  if (_renderDashRaf) return;
  _renderDashRaf = requestAnimationFrame(() => {
    _renderDashRaf = null;
    _renderDashImpl();
  });
}
function _renderDashImpl() {
  // Invalida cache de views derivadas ao mudar dados
  S._repKey = null;
  S._yearKey = null;
  S._histKey = null;

  const m = getMonth();
  const el = document.getElementById('dashContent');
  if (!el) return;
  if (!m) {
    const temMeses = S.months && S.months.length > 0;

    if (!temMeses) {
      // Nunca criou nenhum mês — ícone azul + botão criar
      el.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">
          <svg width="56" height="56" viewBox="0 0 52 52" fill="none">
            <rect x="6" y="12" width="40" height="30" rx="5" fill="#1a2a3a" stroke="#4d9eff" stroke-width="1.5"/>
            <line x1="6" y1="21" x2="46" y2="21" stroke="#4d9eff" stroke-width="1"/>
            <rect x="12" y="27" width="9" height="5" rx="1.5" fill="#4d9eff" opacity=".5"/>
            <rect x="26" y="27" width="13" height="5" rx="1.5" fill="#4d9eff" opacity=".25"/>
            <rect x="12" y="34" width="20" height="3" rx="1.5" fill="#4d9eff" opacity=".15"/>
            <circle cx="40" cy="36" r="8" fill="#0a0a0a" stroke="#4d9eff" stroke-width="1.5"/>
            <line x1="40" y1="32.5" x2="40" y2="39.5" stroke="#4d9eff" stroke-width="1.8" stroke-linecap="round"/>
            <line x1="36.5" y1="36" x2="43.5" y2="36" stroke="#4d9eff" stroke-width="1.8" stroke-linecap="round"/>
          </svg>
        </div>
        <div class="empty-state-title blue">nenhum mês ainda</div>
        <div class="empty-state-sub">crie seu primeiro mês para começar</div>
        <div class="empty-state-dots blue">
          <span></span><span></span><span></span>
        </div>
        <div class="empty-state-btn-wrap">
          <button class="btn btn-primary btn-sm" onclick="openModal('mMonth')">+ novo mês</button>
        </div>
      </div>`;
    } else {
      // Tem meses mas nenhum selecionado — ícone verde + instrução
      el.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">
          <svg width="56" height="56" viewBox="0 0 52 52" fill="none">
            <rect x="6" y="12" width="40" height="30" rx="5" fill="#1a2a1a" stroke="#5aad5a" stroke-width="1.5"/>
            <line x1="6" y1="21" x2="46" y2="21" stroke="#5aad5a" stroke-width="1"/>
            <rect x="12" y="27" width="9" height="5" rx="1.5" fill="#5aad5a" opacity=".5"/>
            <rect x="26" y="27" width="13" height="5" rx="1.5" fill="#5aad5a" opacity=".25"/>
            <rect x="12" y="34" width="20" height="3" rx="1.5" fill="#5aad5a" opacity=".15"/>
            <circle cx="40" cy="36" r="8" fill="#0a0a0a" stroke="#5aad5a" stroke-width="1.5"/>
            <polyline points="36.5,36 39,38.5 43.5,33" stroke="#5aad5a" stroke-width="1.8"
              stroke-linecap="round" stroke-linejoin="round" fill="none"/>
          </svg>
        </div>
        <div class="empty-state-title green">selecione um mês</div>
        <div class="empty-state-sub">escolha na sidebar para ver seus dados</div>
        <div class="empty-state-dots green">
          <span></span><span></span><span></span>
        </div>
      </div>`;
    }
    return;
  }
  
  const allE = m.banks.flatMap(b => b.entries.map(e => ({ ...e, bankName: b.name })));
  const pixL = S.pixEntries[S.currentMonth] || [];
  const recL = S.recurrents[S.currentMonth] || [];
  const incL = S.incomes[S.currentMonth] || [];
  const boletoL = allE.filter(e => e.type === 'boleto');
  const dinheiroL = allE.filter(e => e.type === 'cash');

  const myT  = allE.filter(e => e.owner === 'mine').reduce((s, e) => s + e.amount, 0)
    + allE.filter(e => e.owner === 'split').reduce((s, e) => s + e.amount * (e.splitRatio ?? 0.5), 0);
  const othT = allE.filter(e => e.owner === 'other').reduce((s, e) => s + e.amount, 0)
    + allE.filter(e => e.owner === 'split').reduce((s, e) => s + e.amount * (1 - (e.splitRatio ?? 0.5)), 0);
  const pixT      = pixL.reduce((s, p) => s + p.amount, 0);
  const recT      = recL.reduce((s, r) => s + r.amount, 0);
  const boletoT   = boletoL.reduce((s, e) => s + e.amount, 0);
  const dinheiroT = dinheiroL.reduce((s, e) => s + e.amount, 0);

  // ── Assinaturas: calcular partes e A Receber de terceiros ──
  let mySubM = 0, othSubM = 0;
  const subPplMap = {};
  (S.subscriptions || []).filter(s => s.cycle === 'mensal' && isSubActiveInMonth(s, S.currentMonth)).forEach(s => {
    const owner = s.owner || 'mine';
    const myPart = calcMySubPart(s);
    mySubM += myPart;
    if (owner === 'other') {
      const person = (s.splitPeople || ['?'])[0];
      othSubM += s.amount;
      if (!subPplMap[person]) subPplMap[person] = { total: 0, count: 0 };
      subPplMap[person].total += s.amount;
      subPplMap[person].count++;
    } else if (owner === 'split') {
      const othPart = s.amount - myPart;
      othSubM += othPart;
      const people = s.splitPeople || [];
      people.forEach((p, i) => {
        const share = s.splitValues ? (s.splitValues[i] || 0) : othPart / people.length;
        if (!subPplMap[p]) subPplMap[p] = { total: 0, count: 0 };
        subPplMap[p].total += share;
        subPplMap[p].count++;
      });
    }
  });
  const subM = mySubM + othSubM;
  const totalGasto = myT + othT + pixT + recT;

  // ── Meta considera gastos do usuário + minha parte das assinaturas mensais ──
  const metaGasto = myT + pixT + recT + mySubM;

  const incMyT  = incL.filter(i => i.owner === 'mine').reduce((s, i) => s + i.amount, 0);
  const incOthT = incL.filter(i => i.owner === 'other').reduce((s, i) => s + i.amount, 0);
  const saldo = incMyT - metaGasto;

  const pplMap = {};
  allE.filter(e => e.owner === 'other').forEach(e => {
    if (!pplMap[e.person]) pplMap[e.person] = { total: 0, count: 0 };
    pplMap[e.person].total += e.amount;
    pplMap[e.person].count++;
  });
  allE.filter(e => e.owner === 'split').forEach(e => {
    const people = (e.splitPeople || (e.person ? e.person.split(', ') : [])).filter(Boolean);
    if (!people.length) return;
    const count = e.splitCount || (people.length + 1);
    const myRatio = e.splitRatio ?? (1 / count);
    const share = e.amount * (1 - myRatio) / people.length;
    people.forEach(p => {
      if (!pplMap[p]) pplMap[p] = { total: 0, count: 0 };
      pplMap[p].total += share;
      pplMap[p].count++;
    });
  });
  // Mescla assinaturas de terceiros no pplMap principal
  Object.entries(subPplMap).forEach(([p, d]) => {
    if (!pplMap[p]) pplMap[p] = { total: 0, count: 0 };
    pplMap[p].total += d.total;
    pplMap[p].count += d.count;
  });

  // incPplMap: agrupa por nome normalizado (case-insensitive), preserva melhor capitalização
  const incPplMap = {};
  incL.filter(i => i.owner === 'other' && i.person).forEach(i => {
    const key = i.person.trim().toLowerCase();
    if (!incPplMap[key]) incPplMap[key] = { display: i.person, total: 0, count: 0 };
    else {
      // prefere nome com capitalização mista sobre tudo maiúsculo/minúsculo
      const cur = incPplMap[key].display;
      if (cur === cur.toUpperCase() && i.person !== i.person.toUpperCase())
        incPplMap[key].display = i.person;
    }
    incPplMap[key].total += i.amount;
    incPplMap[key].count++;
  });

  const bk = m.banks.find(b => b.name === S.currentBank) || m.banks[0];
  if (bk) S.currentBank = bk.name;

  // ── Monta seção de gastos ──
  let gastoHTML = '';
  if (!m.banks.length && !recL.length && !pixL.length && !boletoL.length && !dinheiroL.length) {
    gastoHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">
          <svg width="56" height="56" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" style="opacity:.35">
            <rect x="2" y="5" width="20" height="14" rx="2"/>
            <line x1="2" y1="10" x2="22" y2="10"/>
          </svg>
        </div>
        <div class="empty-state-title">Nenhum lançamento ainda</div>
        <div class="empty-state-sub">Comece registrando seu primeiro gasto do mês.</div>
        <button class="btn btn-primary" onclick="openEntryM()" style="margin-top:18px">+ Adicionar Lançamento</button>
      </div>`;
  } else {
    const bankT = myT + othT;
    gastoHTML += _dashSection('banco', 'Lançamentos', 'var(--accent)', `R$ ${fmt(bankT)}`, renderBankSection(m, bk));
    gastoHTML += _dashSection('pix', 'Pix', 'var(--green)', `R$ ${fmt(pixT)}`, renderPixSection(pixL));
    gastoHTML += _dashSection('boleto', 'Boletos', 'var(--orange)', `R$ ${fmt(boletoT)}`, renderBoletosSection(boletoL));
    gastoHTML += _dashSection('dinheiro', 'Dinheiro', 'var(--text)', `R$ ${fmt(dinheiroT)}`, renderDinheiroSection(dinheiroL));
    gastoHTML += _dashSection('fixas', 'Contas Fixas', 'var(--orange)', `R$ ${fmt(recT)}`, renderRecurrentsSection(recL));
  }

  const goalBar = renderGoalBar(m, metaGasto);
  const totals = { totalGasto, metaGasto, othT, incMyT, incOthT, saldo, subM, mySubM, othSubM, pplMap, goalBar };

  el.innerHTML = `
    ${renderAlerts(m, metaGasto, recL)}
    ${renderSummaryCards(m, totals)}
    ${renderAReceber(pplMap)}
    <div style="position:relative;margin-bottom:14px">
      <svg style="position:absolute;left:11px;top:50%;transform:translateY(-50%);pointer-events:none;color:var(--text3)" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
      <input type="text" id="globalSearch" placeholder="Buscar lançamento..." oninput="filterEntries(this.value)"
        style="padding-left:34px;background:var(--bg2);border:1px solid var(--border);border-radius:8px;width:100%;box-sizing:border-box;font-size:13px;color:var(--text)">
    </div>
    <div class="inner-tabs">
      <div class="itab active" id="itab-gastos" onclick="setInnerTab('gastos')">Gastos</div>
      <div class="itab" id="itab-entradas" onclick="setInnerTab('entradas')">Entradas</div>
      <div class="itab" id="itab-notas" onclick="setInnerTab('notas')">📝 Notas</div>
    </div>
    <div class="itab-content" id="itabc-gastos">
      <div style="display:flex;gap:7px;flex-wrap:wrap;margin-bottom:18px">
        ${_selectMode ? '' : `
        <button class="btn btn-primary btn-sm" onclick="openEntryM()">+ Lançamento</button>
        <button class="btn btn-ghost btn-sm" onclick="openPixM()">+ Pix</button>
        <button class="btn btn-ghost btn-sm" onclick="openBoletoM()">+ Boleto</button>
        <button class="btn btn-ghost btn-sm" onclick="openDinheiroM()">+ Dinheiro</button>`}
        <button class="btn btn-ghost btn-sm${_selectMode ? ' sel-mode-active' : ''}" onclick="_selModeToggle()">${_selectMode ? 'Cancelar' : 'Selecionar'}</button>
      </div>
      ${gastoHTML}
    </div>
    <div class="itab-content" id="itabc-entradas" style="display:none">${renderEntradasSection(incL, incMyT, incOthT, incPplMap)}</div>
    <div class="itab-content" id="itabc-notas" style="display:none"></div>`;

  if (S.currentInnerTab === 'entradas') {
    document.getElementById('itab-entradas')?.classList.add('active');
    document.getElementById('itab-gastos')?.classList.remove('active');
    document.getElementById('itabc-gastos').style.display = 'none';
    document.getElementById('itabc-entradas').style.display = 'block';
  } else if (S.currentInnerTab === 'notas') {
    document.getElementById('itab-notas')?.classList.add('active');
    document.getElementById('itab-gastos')?.classList.remove('active');
    document.getElementById('itabc-gastos').style.display = 'none';
    document.getElementById('itabc-notas').style.display = 'block';
    if (typeof renderMonthNotesInline === 'function') renderMonthNotesInline();
  }

  if (!_selectMode) initSwipeRows();
}
