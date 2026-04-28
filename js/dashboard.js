// ══════════════════════════════════════════════════
// DASHBOARD.JS — Renderização do Dashboard Principal
// ══════════════════════════════════════════════════

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
  const today_d = new Date();
  (recL || []).forEach(r => {
    if (r.day) {
      const diff = parseInt(r.day) - today_d.getDate();
      if (diff >= 0 && diff <= 3)
        alerts += `<div class="alert-banner">📅 ${r.desc} vence ${diff === 0 ? 'hoje' : diff === 1 ? 'amanhã' : `em ${diff} dias`} (dia ${r.day}).</div>`;
    }
  });
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

  let html = `<div class="sec-title" style="margin-bottom:8px">Bancos</div><div class="bank-tabs">${bkTabs}</div>`;

  if (bk) {
    const sorted = [...bk.entries].sort((a, b_) => new Date(b_.date) - new Date(a.date));
    const bMine = sorted.filter(e => e.owner === 'mine').reduce((s, e) => s + e.amount, 0);
    const bOth  = sorted.filter(e => e.owner === 'other').reduce((s, e) => s + e.amount, 0);
    const rows = sorted.length ? sorted.map(e => {
      const ib = e.type === 'installment'
        ? `<span class="bm bm-inst">${e.installCurrent ?? '?'}/${e.installTotal ?? '?'}</span>`
        : e.type === 'pix' ? `<span class="bm bm-pix">pix</span>`
        : e.type === 'debit' ? `<span class="bm bm-debit">débito</span>`
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
      return `<tr class="entry-row" data-entry-id="${e.id}" data-bank="${bk.name}"
        onclick='showEntryDetail(${safeE}, "${bk.name}")'>
        <td>${icon ? icon + ' ' : ''}${e.desc} ${ib}</td>
        <td>${wb}</td>
        <td><span class="amt" style="color:${amtColor}">R$ ${fmt(e.amount)}</span></td>
      </tr>`;
    }).join('') : `<tr><td colspan="3"><div class="empty" style="padding:20px">nenhum lançamento</div></td></tr>`;

    html += `
      <div class="tbl-block">
        <div class="tbl-head">
          <span class="tbl-title">${bk.name}</span>
          <span class="tbl-total">R$ ${fmt(bMine + bOth)}</span>
        </div>
        <table>
          <thead><tr><th>Descrição</th><th>De quem</th><th>Valor</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        ${sorted.length ? `
          <div class="foot-row">
            <div class="foot-grp"><span class="foot-lbl">Meus</span><span class="foot-amt" style="color:var(--accent)">R$ ${fmt(bMine)}</span></div>
            <div class="foot-grp"><span class="foot-lbl">Outros</span><span class="foot-amt" style="color:var(--blue)">R$ ${fmt(bOth)}</span></div>
            <div class="foot-grp"><span class="foot-lbl">Total</span><span class="foot-amt">R$ ${fmt(bMine + bOth)}</span></div>
          </div>` : ''}
      </div>`;
  }
  return html;
}

function renderPixSection(pixL, pixT) {
  if (!pixL.length) return '';
  const prows = [...pixL].sort((a, b_) => new Date(b_.date) - new Date(a.date)).map(p => `
    <tr class="entry-row" onclick="openPixM(${p.id})">
      <td>${p.to}${p.obs ? ` <span style="color:var(--text3);font-size:11px">· ${p.obs}</span>` : ''}
        ${p.bank ? ` <span class="bm bm-cat">${p.bank}</span>` : ''}</td>
      <td><span class="bm bm-pix">pix</span></td>
      <td><span class="amt" style="color:var(--green)">R$ ${fmt(p.amount)}</span></td>
    </tr>`).join('');
  return `
    <div class="tbl-block">
      <div class="tbl-head"><span class="tbl-title">Pix Enviados</span><span class="tbl-total" style="color:var(--green)">R$ ${fmt(pixT)}</span></div>
      <table><thead><tr><th>Para</th><th>Tipo</th><th>Valor</th></tr></thead><tbody>${prows}</tbody></table>
    </div>`;
}

function renderRecurrentsSection(recL, recT) {
  if (!recL.length) return '';
  const rrows = recL.map(r => `
    <tr class="entry-row" onclick="openRecM(${r.id})">
      <td>${r.desc}${r.day ? ` <span style="color:var(--text3);font-size:11px">· dia ${r.day}</span>` : ''}</td>
      <td><span class="bm bm-rec">fixo</span></td>
      <td><span class="amt" style="color:var(--orange)">R$ ${fmt(r.amount)}</span></td>
    </tr>`).join('');
  return `
    <div class="tbl-block">
      <div class="tbl-head"><span class="tbl-title">Contas Fixas</span><span class="tbl-total" style="color:var(--orange)">R$ ${fmt(recT)}</span></div>
      <table><thead><tr><th>Descrição</th><th>Tipo</th><th>Valor</th></tr></thead><tbody>${rrows}</tbody></table>
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
    return `<tr class="entry-row" onclick="openIncomeM('${String(i.id).replace(/'/g,"\\'")}')">
      <td>${i.desc} ${typeBadge}${i.from ? ` <span style="color:var(--text3);font-size:11px">· ${i.from}</span>` : ''}</td>
      <td>${i.owner === 'other' ? `<span class="bm bm-other">${i.person}</span>` : `<span class="bm bm-mine">meu</span>`}</td>
      <td><span class="amt" style="color:var(--green)">R$ ${fmt(i.amount)}</span></td>
    </tr>`;
  }).join('');

  let html = '';
  if (Object.keys(incPplMap).length)
    html += `
      <div class="sec-title" style="margin-bottom:10px">Quem me deve</div>
      <div class="people-grid" style="margin-bottom:18px">
        ${Object.entries(incPplMap).map(([n, t]) => `
          <div class="pcard">
            <div class="pcard-name">${n}</div>
            <div class="pcard-val" style="color:var(--green)">R$ ${fmt(t)}</div>
            <div class="pcard-sub">a receber</div>
          </div>`).join('')}
      </div>`;

  html += `
    <div style="display:flex;justify-content:flex-end;margin-bottom:12px">
      <button class="btn btn-green btn-sm" onclick="openIncomeM()">+ Entrada</button>
    </div>
    <div class="tbl-block">
      <div class="tbl-head">
        <span class="tbl-title">Todas as Entradas</span>
        <span class="tbl-total" style="color:var(--green)">R$ ${fmt(incMyT + incOthT)}</span>
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
  const mySubs = (S.subscriptions || []).filter(s => !s.endDate && s.cycle === 'mensal' && (s.owner || 'mine') !== 'other');
  const mySubTotal = mySubs.reduce((s, sub) => s + calcMySubPart(sub), 0);
  const grandTotal = myEntriesAmt + splitAmt + pixTotal + recTotal + mySubTotal;

  const mkEntryRow = (e) => {
    const myAmt = e.owner === 'split' ? e.amount * (e.splitRatio ?? 0.5) : e.amount;
    const icon = getCategoryIcon(e.desc, e.category);
    const typeBadge = e.type === 'installment'
      ? `<span class="bm bm-inst">${e.installCurrent ?? '?'}/${e.installTotal ?? '?'}</span>`
      : e.type === 'debit' ? `<span class="bm bm-debit">déb</span>`
      : e.type === 'cash' ? `<span class="bm bm-cash">din</span>` : '';
    const splitBadge = e.owner === 'split' ? `<span class="bm bm-split">÷</span>` : '';
    return `<tr><td>${icon ? icon + ' ' : ''}${e.desc} ${typeBadge}${splitBadge}</td>
      <td style="color:var(--text2);font-size:12px">${e.bankName}</td>
      <td style="text-align:right"><span class="amt">R$ ${fmt(myAmt)}</span></td></tr>`;
  };

  const entryRows = [...myEntries, ...splitEntries]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .map(mkEntryRow).join('');

  const pixRows = [...pixL]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .map(p => `<tr><td>${p.to}${p.obs ? ` <span style="color:var(--text3);font-size:11px">· ${p.obs}</span>` : ''}</td>
      <td style="color:var(--text2);font-size:12px">pix</td>
      <td style="text-align:right"><span class="amt">R$ ${fmt(p.amount)}</span></td></tr>`).join('');

  const recRows = recL.map(r => `<tr>
    <td>${r.desc}${r.day ? ` <span style="color:var(--text3);font-size:11px">· dia ${r.day}</span>` : ''}</td>
    <td style="color:var(--text2);font-size:12px">fixo</td>
    <td style="text-align:right"><span class="amt">R$ ${fmt(r.amount)}</span></td></tr>`).join('');

  const subRows = mySubs.map(s => {
    const myPart = calcMySubPart(s);
    const splitBadge = s.owner === 'split' || s.owner === 'other' ? `<span class="bm bm-split">÷</span>` : '';
    return `<tr><td>${s.name} ${splitBadge}</td>
      <td style="color:var(--text2);font-size:12px">assinatura</td>
      <td style="text-align:right"><span class="amt">R$ ${fmt(myPart)}</span></td></tr>`;
  }).join('');

  const mkSection = (label, rows) => rows ? `
    <tr><td colspan="3" style="padding:10px 0 4px;font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:1px;font-weight:600">${label}</td></tr>
    ${rows}` : '';

  const allRows = mkSection('Lançamentos', entryRows)
    + mkSection('Pix', pixRows)
    + mkSection('Contas Fixas', recRows)
    + mkSection('Assinaturas', subRows);

  document.getElementById('meusGastosContent').innerHTML = `
    <div class="summary-grid" style="margin-bottom:20px">
      ${myEntriesAmt + splitAmt > 0 ? `<div class="card"><div class="card-lbl">Lançamentos</div><div class="card-val a">R$ ${fmt(myEntriesAmt + splitAmt)}</div></div>` : ''}
      ${pixTotal > 0 ? `<div class="card"><div class="card-lbl">Pix</div><div class="card-val a">R$ ${fmt(pixTotal)}</div></div>` : ''}
      ${recTotal > 0 ? `<div class="card"><div class="card-lbl">Contas Fixas</div><div class="card-val a">R$ ${fmt(recTotal)}</div></div>` : ''}
      ${mySubTotal > 0 ? `<div class="card"><div class="card-lbl">Assinaturas</div><div class="card-val a">R$ ${fmt(mySubTotal)}</div></div>` : ''}
      <div class="card"><div class="card-lbl">Total Meus</div><div class="card-val a" style="font-size:18px">R$ ${fmt(grandTotal)}</div></div>
    </div>
    ${allRows ? `<div class="tbl-block"><table><thead><tr><th>Descrição</th><th>Onde</th><th style="text-align:right">Meu valor</th></tr></thead><tbody>${allRows}</tbody></table></div>`
      : '<div class="empty">Nenhum gasto registrado</div>'}`;

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

  const myT  = allE.filter(e => e.owner === 'mine').reduce((s, e) => s + e.amount, 0)
    + allE.filter(e => e.owner === 'split').reduce((s, e) => s + e.amount * (e.splitRatio ?? 0.5), 0);
  const othT = allE.filter(e => e.owner === 'other').reduce((s, e) => s + e.amount, 0)
    + allE.filter(e => e.owner === 'split').reduce((s, e) => s + e.amount * (1 - (e.splitRatio ?? 0.5)), 0);
  const pixT = pixL.reduce((s, p) => s + p.amount, 0);
  const recT = recL.reduce((s, r) => s + r.amount, 0);

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

  const incPplMap = {};
  incL.filter(i => i.owner === 'other').forEach(i => {
    if (!incPplMap[i.person]) incPplMap[i.person] = 0;
    incPplMap[i.person] += i.amount;
  });

  const bk = m.banks.find(b => b.name === S.currentBank) || m.banks[0];
  if (bk) S.currentBank = bk.name;

  // ── Monta seção de gastos ──
  let gastoHTML = '';
  if (!m.banks.length && !recL.length && !pixL.length) {
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
    gastoHTML += renderBankSection(m, bk);
    gastoHTML += renderPixSection(pixL, pixT);
    gastoHTML += renderRecurrentsSection(recL, recT);
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
    </div>
    <div class="itab-content" id="itabc-gastos">
      <div style="display:flex;gap:7px;flex-wrap:wrap;margin-bottom:18px">
        <button class="btn btn-primary btn-sm" onclick="openEntryM()">+ Lançamento</button>
        <button class="btn btn-ghost btn-sm" onclick="openModal('mBank')">+ Banco</button>
        <button class="btn btn-ghost btn-sm" onclick="openPixM()">+ Pix</button>
        <button class="btn btn-ghost btn-sm" onclick="openRecM()">+ Conta Fixa</button>
      </div>
      ${gastoHTML}
    </div>
    <div class="itab-content" id="itabc-entradas" style="display:none">${renderEntradasSection(incL, incMyT, incOthT, incPplMap)}</div>`;

  if (S.currentInnerTab === 'entradas') {
    document.getElementById('itab-entradas')?.classList.add('active');
    document.getElementById('itab-gastos')?.classList.remove('active');
    document.getElementById('itabc-gastos').style.display = 'none';
    document.getElementById('itabc-entradas').style.display = 'block';
  }

  initSwipeRows();
}
