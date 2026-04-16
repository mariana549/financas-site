// ══════════════════════════════════════════════════
// REPORTS.JS — Relatórios, Resumo Anual, Histórico
// ══════════════════════════════════════════════════

function renderReports() {
  const m = getMonth();
  const el = document.getElementById('repContent');
  if (!el) return;
  if (!m) { el.innerHTML = '<div class="empty">selecione um mês</div>'; return; }

  const subEl = document.getElementById('repSub');
  if (subEl) subEl.textContent = m.label + ' ' + m.year;

  const allE = m.banks.flatMap(b => b.entries.map(e => ({ ...e, bankName: b.name })));
  const pixL = S.pixEntries[m.key] || [];
  const recL = S.recurrents[m.key] || [];
  const incL = S.incomes[m.key] || [];

  const myT = allE.filter(e => e.owner === 'mine').reduce((s, e) => s + e.amount, 0);
  const othT = allE.filter(e => e.owner === 'other').reduce((s, e) => s + e.amount, 0);
  const pixT = pixL.reduce((s, p) => s + p.amount, 0);
  const recT = recL.reduce((s, r) => s + r.amount, 0);
  const incT = incL.reduce((s, i) => s + i.amount, 0);
  const totalGasto = myT + othT + pixT + recT;
  const saldo = incT - (myT + pixT + recT);

  const bkD = m.banks.map(b => ({
    name: b.name,
    total: b.entries.reduce((s, e) => s + e.amount, 0),
    mine: b.entries.filter(e => e.owner === 'mine').reduce((s, e) => s + e.amount, 0),
    others: b.entries.filter(e => e.owner === 'other').reduce((s, e) => s + e.amount, 0),
    color: PALETTE[b.color] || PALETTE.azure
  }));
  const maxB = Math.max(...bkD.map(b => b.total), 1);

  const pplMap = {};
  allE.filter(e => e.owner === 'other').forEach(e => {
    if (!pplMap[e.person]) pplMap[e.person] = 0;
    pplMap[e.person] += e.amount;
  });

  const catMap = {};
  allE.filter(e => e.category).forEach(e => {
    if (!catMap[e.category]) catMap[e.category] = 0;
    catMap[e.category] += e.amount;
  });
  const maxC = Math.max(...Object.values(catMap), 1);

  // ── Comparativo mês anterior ──
  const mIdx = S.months.findIndex(x => x.key === m.key);
  const prevM = mIdx > 0 ? S.months[mIdx - 1] : null;
  const prevTotal = prevM ? monthTotal(prevM) : null;
  const maxComp = Math.max(totalGasto, prevTotal || 0, 1);

  // ── Tipo de entrada ──
  const incTypeMap = {};
  incL.forEach(i => {
    const t = i.incType || 'Outros';
    incTypeMap[t] = (incTypeMap[t] || 0) + i.amount;
  });
  const maxIncType = Math.max(...Object.values(incTypeMap), 1);

  // ── Tipo de gasto ──
  const typeMap = { normal: 0, installment: 0, pix: pixT, debit: 0, cash: 0 };
  allE.forEach(e => {
    if (e.type === 'installment') typeMap.installment += e.amount;
    else if (e.type === 'debit') typeMap.debit += e.amount;
    else if (e.type === 'cash') typeMap.cash += e.amount;
    else typeMap.normal += e.amount;
  });
  typeMap.normal += recT;
  const maxType = Math.max(...Object.values(typeMap), 1);

  el.innerHTML = `
    <div class="summary-grid" style="margin-bottom:24px">
      <div class="card"><div class="card-lbl">Total Gastos</div><div class="card-val">R$ ${fmt(totalGasto)}</div></div>
      <div class="card"><div class="card-lbl">Meus</div><div class="card-val a">R$ ${fmt(myT + pixT + recT)}</div></div>
      <div class="card"><div class="card-lbl">A Receber</div><div class="card-val b">R$ ${fmt(othT)}</div></div>
      <div class="card"><div class="card-lbl">Entradas</div><div class="card-val g">R$ ${fmt(incT)}</div></div>
      <div class="card"><div class="card-lbl">Saldo</div><div class="card-val ${saldo >= 0 ? 'g' : 'r'}">R$ ${fmt(saldo)}</div></div>
    </div>

    ${prevM ? `
    <div class="sec-title" style="margin-bottom:12px">Comparativo com mês anterior</div>
    <div class="comp-bar">
      <span class="comp-label">${m.label.slice(0, 3)} ${m.year}</span>
      <div class="comp-track">
        <div class="comp-fill" style="width:${(totalGasto / maxComp * 100).toFixed(1)}%">
          <span class="comp-val">R$ ${fmt(totalGasto)}</span>
        </div>
      </div>
    </div>
    <div class="comp-bar">
      <span class="comp-label">${prevM.label.slice(0, 3)} ${prevM.year}</span>
      <div class="comp-track">
        <div class="comp-fill" style="width:${(prevTotal / maxComp * 100).toFixed(1)}%;background:var(--text3)">
          <span class="comp-val">R$ ${fmt(prevTotal)}</span>
        </div>
      </div>
    </div>
    <div style="font-size:11px;font-family:var(--mono);color:${totalGasto > prevTotal ? 'var(--red)' : 'var(--green)'};margin-top:4px;margin-bottom:16px">
      ${totalGasto > prevTotal
        ? `▲ R$ ${fmt(totalGasto - prevTotal)} a mais que ${prevM.label}`
        : `▼ R$ ${fmt(prevTotal - totalGasto)} a menos que ${prevM.label}`}
    </div>
    <div class="divider"></div>` : ''}

    ${bkD.length ? `
    <div class="sec-title" style="margin-bottom:12px">Por Banco</div>
    ${bkD.map(b => `
      <div class="bar-wrap">
        <div class="bar-lbl"><span>${b.name}</span><span>R$ ${fmt(b.total)}</span></div>
        <div class="bar-track">
          <div class="bar-fill" style="width:${(b.total / maxB * 100).toFixed(1)}%;background:${b.color}"></div>
        </div>
        <div style="display:flex;gap:14px;margin-top:3px">
          <span style="font-size:10px;color:var(--accent);font-family:var(--mono)">meus: R$ ${fmt(b.mine)}</span>
          <span style="font-size:10px;color:var(--blue);font-family:var(--mono)">outros: R$ ${fmt(b.others)}</span>
        </div>
      </div>`).join('')}
    <div class="divider"></div>` : ''}

    <div class="sec-title" style="margin-bottom:12px">Por Tipo</div>
    ${[
      { label: 'Normal / Fixo', val: typeMap.normal, color: 'var(--accent)' },
      { label: 'Parcelado', val: typeMap.installment, color: 'var(--orange)' },
      { label: 'Pix', val: typeMap.pix, color: 'var(--green)' },
      { label: 'Débito', val: typeMap.debit, color: 'var(--teal)' },
      { label: 'Dinheiro', val: typeMap.cash, color: 'var(--yellow)' }
    ].filter(t => t.val > 0).map(t => `
      <div class="bar-wrap">
        <div class="bar-lbl"><span>${t.label}</span><span>R$ ${fmt(t.val)}</span></div>
        <div class="bar-track">
          <div class="bar-fill" style="width:${(t.val / maxType * 100).toFixed(1)}%;background:${t.color}"></div>
        </div>
      </div>`).join('')}

    ${Object.keys(pplMap).length ? `
    <div class="divider"></div>
    <div class="sec-title" style="margin-bottom:12px">A Receber por Pessoa</div>
    <div class="people-grid">
      ${Object.entries(pplMap).sort((a, b) => b[1] - a[1]).map(([n, t]) => `
        <div class="pcard">
          <div class="pcard-name">${n}</div>
          <div class="pcard-val">R$ ${fmt(t)}</div>
        </div>`).join('')}
    </div>` : ''}

    ${Object.keys(catMap).length ? `
    <div class="divider"></div>
    <div class="sec-title" style="margin-bottom:12px">Por Categoria</div>
    ${Object.entries(catMap).sort((a, b) => b[1] - a[1]).map(([c, t]) => `
      <div class="bar-wrap">
        <div class="bar-lbl"><span>${c}</span><span>R$ ${fmt(t)}</span></div>
        <div class="bar-track">
          <div class="bar-fill" style="width:${(t / maxC * 100).toFixed(1)}%;background:var(--purple)"></div>
        </div>
      </div>`).join('')}` : ''}

    ${Object.keys(incTypeMap).length ? `
    <div class="divider"></div>
    <div class="sec-title" style="margin-bottom:12px">Entradas por Tipo</div>
    ${Object.entries(incTypeMap).sort((a, b) => b[1] - a[1]).map(([t, v]) => {
      const color = t === 'Pix' ? 'var(--green)' : t === 'Débito' ? 'var(--teal)' : t === 'Dinheiro' ? 'var(--yellow)' : t === 'Salário' ? 'var(--accent)' : t === 'Freela' ? 'var(--blue)' : 'var(--text3)';
      return `
      <div class="bar-wrap">
        <div class="bar-lbl"><span>${t}</span><span>R$ ${fmt(v)}</span></div>
        <div class="bar-track">
          <div class="bar-fill" style="width:${(v / maxIncType * 100).toFixed(1)}%;background:${color}"></div>
        </div>
      </div>`;
    }).join('')}` : ''}`;
}

// ══════════════════════════════════════════════════
// YEAR SUMMARY
// ══════════════════════════════════════════════════
function renderYear() {
  const el = document.getElementById('yearContent');
  if (!el) return;
  if (!S.months.length) { el.innerHTML = '<div class="empty">nenhum mês cadastrado</div>'; return; }

  const years = [...new Set(S.months.map(m => m.year))];
  const yearSub = document.getElementById('yearSub');
  let html = '';

  years.forEach(y => {
    const mths = S.months.filter(m => m.year === y);
    const maxT = Math.max(...mths.map(m => monthTotal(m)), 1);
    const totalAnual = mths.reduce((s, m) => s + monthTotal(m), 0);
    const incAnual = mths.reduce((s, m) => s + (S.incomes[m.key] || []).reduce((ss, i) => ss + i.amount, 0), 0);
    const saldoAnual = incAnual - totalAnual;

    // ── Top categorias do ano ──
    const catAnual = {};
    mths.forEach(m => {
      m.banks.forEach(b => {
        b.entries.filter(e => e.category).forEach(e => {
          catAnual[e.category] = (catAnual[e.category] || 0) + e.amount;
        });
      });
    });
    const topCats = Object.entries(catAnual).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const maxCat = topCats.length ? topCats[0][1] : 1;

    html += `
      <div style="margin-bottom:32px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px">
          <div class="topbar-title">${y}</div>
          <div style="display:flex;gap:16px;flex-wrap:wrap">
            <span style="font-family:var(--mono);font-size:12px;color:var(--text2)">gastos: <span style="color:var(--text)">R$ ${fmt(totalAnual)}</span></span>
            <span style="font-family:var(--mono);font-size:12px;color:var(--text2)">entradas: <span style="color:var(--green)">R$ ${fmt(incAnual)}</span></span>
            <span style="font-family:var(--mono);font-size:12px;color:var(--text2)">saldo: <span style="color:${saldoAnual >= 0 ? 'var(--green)' : 'var(--red)'}">R$ ${fmt(saldoAnual)}</span></span>
          </div>
        </div>
        ${mths.map(m => `
          <div class="comp-bar">
            <span class="comp-label" style="cursor:pointer;color:var(--text2)"
              onclick="selectMonth('${m.key}');showView('dash')">${m.label.slice(0, 3)}</span>
            <div class="comp-track">
              <div class="comp-fill" style="width:${(monthTotal(m) / maxT * 100).toFixed(1)}%">
                <span class="comp-val">R$ ${fmt(monthTotal(m))}</span>
              </div>
            </div>
            ${m.goal
              ? `<span style="font-family:var(--mono);font-size:10px;color:${monthTotal(m) > m.goal ? 'var(--red)' : 'var(--text3)'};margin-left:6px;flex-shrink:0">
                  ${(monthTotal(m) / m.goal * 100).toFixed(0)}%
                </span>`
              : ''}
          </div>`).join('')}

        ${topCats.length ? `
          <div style="margin-top:18px;padding-top:16px;border-top:1px solid var(--border)">
            <div class="sec-title" style="margin-bottom:10px;font-size:10px">Top Categorias ${y}</div>
            ${topCats.map(([cat, val]) => `
              <div class="bar-wrap" style="margin-bottom:7px">
                <div class="bar-lbl">
                  <span style="font-size:12px">${getCategoryIcon(cat, cat)} ${cat}</span>
                  <span style="font-family:var(--mono);font-size:11px">R$ ${fmt(val)}</span>
                </div>
                <div class="bar-track">
                  <div class="bar-fill" style="width:${(val / maxCat * 100).toFixed(1)}%;background:var(--purple)"></div>
                </div>
              </div>`).join('')}
          </div>` : ''}
      </div>`;
  });

  if (yearSub) yearSub.textContent = years.join(', ');
  el.innerHTML = html;
}

// ══════════════════════════════════════════════════
// HISTORY — Histórico de pessoas entre meses
// ══════════════════════════════════════════════════
function renderHistory() {
  const el = document.getElementById('historyContent');
  if (!el) return;

  const pplAll = {};
  S.months.forEach(m => {
    m.banks.forEach(b => {
      b.entries.filter(e => e.owner === 'other').forEach(e => {
        if (!pplAll[e.person]) pplAll[e.person] = { total: 0, months: {} };
        pplAll[e.person].total += e.amount;
        if (!pplAll[e.person].months[m.key]) pplAll[e.person].months[m.key] = { total: 0, items: [] };
        pplAll[e.person].months[m.key].total += e.amount;
        pplAll[e.person].months[m.key].items.push(e);
      });
      b.entries.filter(e => e.owner === 'split').forEach(e => {
        const people = (e.splitPeople || (e.person ? e.person.split(', ') : [])).filter(Boolean);
        if (!people.length) return;
        const count = e.splitCount || (people.length + 1);
        const myRatio = e.splitRatio ?? (1 / count);
        const share = e.amount * (1 - myRatio) / people.length;
        people.forEach(p => {
          if (!pplAll[p]) pplAll[p] = { total: 0, months: {} };
          pplAll[p].total += share;
          if (!pplAll[p].months[m.key]) pplAll[p].months[m.key] = { total: 0, items: [] };
          pplAll[p].months[m.key].total += share;
          pplAll[p].months[m.key].items.push({ ...e, desc: e.desc + ' (÷' + count + ')', amount: share });
        });
      });
    });
  });

  if (!Object.keys(pplAll).length) {
    el.innerHTML = '<div class="empty">nenhum lançamento de outras pessoas ainda</div>';
    return;
  }

  el.innerHTML = Object.entries(pplAll)
    .sort((a, b) => b[1].total - a[1].total)
    .map(([name, data]) => `
      <div class="tbl-block" style="margin-bottom:16px">
        <div class="tbl-head">
          <span class="tbl-title">${name}</span>
          <span class="tbl-total" style="color:var(--blue)">R$ ${fmt(data.total)} total</span>
        </div>
        <table>
          <thead><tr><th>Mês</th><th>Itens</th><th>Total</th></tr></thead>
          <tbody>
            ${Object.entries(data.months).map(([mk, md]) => `
              <tr>
                <td style="font-family:var(--mono);font-size:12px;white-space:nowrap">${mk}</td>
                <td style="color:var(--text2);font-size:12px">${md.items.map(i => i.desc).join(', ')}</td>
                <td><span class="amt" style="color:var(--blue)">R$ ${fmt(md.total)}</span></td>
              </tr>`).join('')}
          </tbody>
        </table>
        <div class="foot-row">
          <div class="foot-grp">
            <span class="foot-lbl">Total geral</span>
            <span class="foot-amt" style="color:var(--blue)">R$ ${fmt(data.total)}</span>
          </div>
          <div class="foot-grp">
            <span class="foot-lbl">Meses</span>
            <span class="foot-amt">${Object.keys(data.months).length}</span>
          </div>
        </div>
      </div>`).join('');
}