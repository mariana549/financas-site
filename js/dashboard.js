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
  if (c) c.style.display = 'block';
}

function renderDash() {
  const m = getMonth();
  const el = document.getElementById('dashContent');
  if (!el) return;
  if (!m) { el.innerHTML = '<div class="empty">selecione ou crie um mês</div>'; return; }

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
  const totalGasto = myT + othT + pixT + recT;

  // ── FEATURE 1.3: Meta considera apenas gastos do usuário (owner: 'mine') ──
  const metaGasto = myT + pixT + recT;

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

  const incPplMap = {};
  incL.filter(i => i.owner === 'other').forEach(i => {
    if (!incPplMap[i.person]) incPplMap[i.person] = 0;
    incPplMap[i.person] += i.amount;
  });

  const subM = (S.subscriptions || [])
    .filter(s => !s.endDate && s.cycle === 'mensal')
    .reduce((t, s) => t + s.amount, 0);

  const bk = m.banks.find(b => b.name === S.currentBank) || m.banks[0];
  if (bk) S.currentBank = bk.name;

  // ── Barra de meta — usa metaGasto (só owner: 'mine') ──
  const goalBar = m.goal ? (() => {
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
  })() : '';

  // ── Alertas — usa metaGasto ──
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

  // ── Abas de banco ──
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

  // ── Tabela de entradas do banco ──
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
    if (Object.keys(pplMap).length)
      gastoHTML += `
        <div class="sec-title" style="margin-bottom:10px">A Receber</div>
        <div class="people-grid" style="margin-bottom:18px">
          ${Object.entries(pplMap).map(([n, d]) => `
            <div class="pcard" onclick="openCobranca('${n}')" style="cursor:pointer" title="Cobrar ${n}">
              <div class="pcard-name">${n}</div>
              <div class="pcard-val">R$ ${fmt(d.total)}</div>
              <div class="pcard-sub">${d.count} item(s) · toque para cobrar</div>
            </div>`).join('')}
        </div>`;

    if (m.banks.length) {
      gastoHTML += `<div class="sec-title" style="margin-bottom:8px">Bancos</div><div class="bank-tabs">${bkTabs}</div>`;
      if (bk) {
        const sorted = [...bk.entries].sort((a, b_) => new Date(b_.date) - new Date(a.date));
        const bMine = sorted.filter(e => e.owner === 'mine').reduce((s, e) => s + e.amount, 0);
        const bOth  = sorted.filter(e => e.owner === 'other').reduce((s, e) => s + e.amount, 0);
        const rows = sorted.length ? sorted.map(e => {
          const ib = e.type === 'installment'
            ? `<span class="bm bm-inst">${e.installCurrent}/${e.installTotal}</span>`
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

        gastoHTML += `
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
    }

    if (pixL.length) {
      const prows = [...pixL].sort((a, b_) => new Date(b_.date) - new Date(a.date)).map(p => `
        <tr class="entry-row" onclick="openPixM(${p.id})">
          <td>${p.to}${p.obs ? ` <span style="color:var(--text3);font-size:11px">· ${p.obs}</span>` : ''}
            ${p.bank ? ` <span class="bm bm-cat">${p.bank}</span>` : ''}</td>
          <td><span class="bm bm-pix">pix</span></td>
          <td><span class="amt" style="color:var(--green)">R$ ${fmt(p.amount)}</span></td>
        </tr>`).join('');
      gastoHTML += `
        <div class="tbl-block">
          <div class="tbl-head"><span class="tbl-title">Pix Enviados</span><span class="tbl-total" style="color:var(--green)">R$ ${fmt(pixT)}</span></div>
          <table><thead><tr><th>Para</th><th>Tipo</th><th>Valor</th></tr></thead><tbody>${prows}</tbody></table>
        </div>`;
    }

    if (recL.length) {
      const rrows = recL.map(r => `
        <tr class="entry-row" onclick="openRecM(${r.id})">
          <td>${r.desc}${r.day ? ` <span style="color:var(--text3);font-size:11px">· dia ${r.day}</span>` : ''}</td>
          <td><span class="bm bm-rec">fixo</span></td>
          <td><span class="amt" style="color:var(--orange)">R$ ${fmt(r.amount)}</span></td>
        </tr>`).join('');
      gastoHTML += `
        <div class="tbl-block">
          <div class="tbl-head"><span class="tbl-title">Contas Fixas</span><span class="tbl-total" style="color:var(--orange)">R$ ${fmt(recT)}</span></div>
          <table><thead><tr><th>Descrição</th><th>Tipo</th><th>Valor</th></tr></thead><tbody>${rrows}</tbody></table>
        </div>`;
    }
  }

  // ── Entradas ──
  let entradaHTML = '';
  if (!incL.length) {
    entradaHTML = `
      <div style="display:flex;justify-content:flex-end;margin-bottom:14px">
        <button class="btn btn-green btn-sm" onclick="openIncomeM()">+ Entrada</button>
      </div>
      <div class="empty">nenhuma entrada</div>`;
  } else {
    const rows = [...incL].sort((a, b_) => new Date(b_.date) - new Date(a.date)).map(i => `
      <tr class="entry-row" onclick="openIncomeM(${i.id})">
        <td>${i.desc} <span class="bm bm-cat">${i.incType || 'Outros'}</span>
          ${i.from ? ` <span style="color:var(--text3);font-size:11px">· ${i.from}</span>` : ''}</td>
        <td>${i.owner === 'other' ? `<span class="bm bm-other">${i.person}</span>` : `<span class="bm bm-mine">meu</span>`}</td>
        <td><span class="amt" style="color:var(--green)">R$ ${fmt(i.amount)}</span></td>
      </tr>`).join('');

    if (Object.keys(incPplMap).length)
      entradaHTML += `
        <div class="sec-title" style="margin-bottom:10px">Quem me deve</div>
        <div class="people-grid" style="margin-bottom:18px">
          ${Object.entries(incPplMap).map(([n, t]) => `
            <div class="pcard">
              <div class="pcard-name">${n}</div>
              <div class="pcard-val" style="color:var(--green)">R$ ${fmt(t)}</div>
              <div class="pcard-sub">a receber</div>
            </div>`).join('')}
        </div>`;

    entradaHTML += `
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
  }

  el.innerHTML = `
    ${alerts}
    <div class="summary-grid">
      <div class="card">
        <div class="card-lbl">Total Gastos</div>
        <div class="card-val">R$ ${fmt(totalGasto)}</div>
      </div>
      <div class="card">
        <div class="card-lbl">Meus Gastos</div>
        <div class="card-val a">R$ ${fmt(metaGasto)}</div>
        ${goalBar}
      </div>
      <div class="card"><div class="card-lbl">A Receber</div><div class="card-val b">R$ ${fmt(othT)}</div><div class="card-sub">${Object.keys(pplMap).length} pessoa(s)</div></div>
      <div class="card"><div class="card-lbl">Entradas</div><div class="card-val g">R$ ${fmt(incMyT + incOthT)}</div></div>
      <div class="card"><div class="card-lbl">Saldo</div><div class="card-val ${saldo >= 0 ? 'g' : 'r'}">R$ ${fmt(saldo)}</div></div>
      ${subM > 0 ? `<div class="card card-link" onclick="showView('subs')" title="Gerenciar assinaturas">
        <div class="card-lbl">Assinaturas ↗</div>
        <div class="card-val p">R$ ${fmt(subM)}</div>
        <div class="card-sub">${(S.subscriptions||[]).filter(s=>!s.endDate&&s.cycle==='mensal').length} ativa(s) · clique para gerenciar</div>
      </div>` : ''}
    </div>
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
        <button class="btn btn-ghost btn-sm" onclick="openModal('mRec')">+ Conta Fixa</button>
      </div>
      ${gastoHTML}
    </div>
    <div class="itab-content" id="itabc-entradas" style="display:none">${entradaHTML}</div>`;

  if (S.currentInnerTab === 'entradas') {
    document.getElementById('itab-entradas')?.classList.add('active');
    document.getElementById('itab-gastos')?.classList.remove('active');
    document.getElementById('itabc-gastos').style.display = 'none';
    document.getElementById('itabc-entradas').style.display = 'block';
  }

  initSwipeRows();
}