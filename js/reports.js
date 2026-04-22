// ══════════════════════════════════════════════════
// REPORTS.JS — Relatórios, Resumo Anual
// ══════════════════════════════════════════════════

const _rc = {};
function _destroyChart(k) { if (_rc[k]) { _rc[k].destroy(); delete _rc[k]; } }
function _makeChart(k, id, cfg) {
  _destroyChart(k);
  const cv = document.getElementById(id);
  if (!cv || typeof Chart === 'undefined') return;
  _rc[k] = new Chart(cv.getContext('2d'), cfg);
}

const CAT_COLORS = ['#4d9eff', '#a78bfa', '#fb923c', '#4ade80', '#f472b6', '#facc15', '#38bdf8', '#f87171', '#34d399', '#e879f9'];
const MONO_FONT = "'DM Mono', monospace";

function _chartDefaults() {
  return {
    grid: getCSSVar('--border') || '#1e1e1e',
    text: getCSSVar('--text3') || '#555',
    tick: { color: getCSSVar('--text3') || '#555', font: { size: 10, family: MONO_FONT } }
  };
}

function _avatarColor(name) {
  const colors = [
    { bg: '#152035', fg: '#4d9eff' },
    { bg: '#1e1230', fg: '#a78bfa' },
    { bg: '#0f2a1a', fg: '#4ade80' },
    { bg: '#2a1800', fg: '#fb923c' },
    { bg: '#2a0f0f', fg: '#f87171' },
    { bg: '#0f2a2a', fg: '#38bdf8' },
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}


// ══════════════════════════════════════════════════
// REPORTS — Relatório mensal
// ══════════════════════════════════════════════════
function renderReports() {
  const m = getMonth();
  const el = document.getElementById('repContent');
  if (!el) return;
  if (!m) { el.innerHTML = '<div class="empty">selecione um mês</div>'; return; }

  const subEl = document.getElementById('tbSub');
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

  const fallbackColors = ['#4d9eff', '#a78bfa', '#fb923c', '#4ade80', '#f472b6', '#facc15'];
  const bkRaw = m.banks.map(b => ({
    name: b.name,
    total: b.entries.reduce((s, e) => s + e.amount, 0),
    mine: b.entries.filter(e => e.owner === 'mine').reduce((s, e) => s + e.amount, 0),
    others: b.entries.filter(e => e.owner === 'other').reduce((s, e) => s + e.amount, 0),
    color: PALETTE[b.color] || PALETTE.azure
  }));
  const rawCores = bkRaw.map(x => x.color);
  const bkColors = bkRaw.map((b, i) =>
    rawCores.filter(c => c === b.color).length > 1 ? fallbackColors[i % fallbackColors.length] : b.color
  );

  const pplMap = {};
  allE.filter(e => e.owner === 'other').forEach(e => {
    pplMap[e.person] = (pplMap[e.person] || 0) + e.amount;
  });
  const pplItems = n => allE.filter(e => e.owner === 'other' && e.person === n).length;

  const catMap = {};
  allE.filter(e => e.category).forEach(e => {
    catMap[e.category] = (catMap[e.category] || 0) + e.amount;
  });
  const catSorted = Object.entries(catMap).sort((a, b) => b[1] - a[1]);

  const mIdx = S.months.findIndex(x => x.key === m.key);
  const prevM = mIdx > 0 ? S.months[mIdx - 1] : null;
  const prevTotal = prevM ? monthTotal(prevM) : null;

  let mySubRep = 0, splitSubRep = 0;
  (S.subscriptions || []).filter(s => !s.endDate && s.cycle === 'mensal').forEach(s => {
    if ((s.owner || 'mine') === 'mine') { mySubRep += s.amount; }
    else if (s.owner === 'split') {
      const myPart = calcMySubPart(s);
      mySubRep += myPart;
      splitSubRep += s.amount - myPart;
    }
  });

  const incTypeMap = {};
  incL.forEach(i => { const t = i.incType || 'Outros'; incTypeMap[t] = (incTypeMap[t] || 0) + i.amount; });

  const typeMap = { normal: 0, installment: 0, pix: pixT, debit: 0, cash: 0 };
  allE.forEach(e => {
    if (e.type === 'installment') typeMap.installment += e.amount;
    else if (e.type === 'debit') typeMap.debit += e.amount;
    else if (e.type === 'cash') typeMap.cash += e.amount;
    else typeMap.normal += e.amount;
  });
  typeMap.normal += recT;
  const tiposSorted = [
    { label: 'Normal / Fixo', val: typeMap.normal, color: getCSSVar('--accent') || '#4d9eff' },
    { label: 'Parcelado', val: typeMap.installment, color: '#fb923c' },
    { label: 'Pix', val: typeMap.pix, color: '#4ade80' },
    { label: 'Débito', val: typeMap.debit, color: '#38bdf8' },
    { label: 'Dinheiro', val: typeMap.cash, color: '#facc15' },
    { label: 'Assinaturas', val: mySubRep, color: '#a78bfa' },
    { label: 'Em conjunto', val: splitSubRep, color: '#f472b6' },
  ].filter(t => t.val > 0);

  const dailyMap = {};
  allE.forEach(e => { if (e.date) { const d = +e.date.split('-')[2]; dailyMap[d] = (dailyMap[d] || 0) + e.amount; } });
  pixL.forEach(p => { if (p.date) { const d = +p.date.split('-')[2]; dailyMap[d] = (dailyMap[d] || 0) + p.amount; } });
  const monthIdx = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'].indexOf(m.label);
  const daysInMonth = new Date(m.year, monthIdx + 1, 0).getDate() || 30;
  const dailyLabels = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  let acum = 0;
  const dailyData = dailyLabels.map(d => { acum += dailyMap[d] || 0; return acum; });

  const allMonths = S.months;
  const annualLabels = allMonths.map(mn => mn.label.slice(0, 3));
  const annualGastos = allMonths.map(mn => monthTotal(mn));
  const annualEntradas = allMonths.map(mn => (S.incomes[mn.key] || []).reduce((s, i) => s + i.amount, 0));
  const hasAnnual = annualGastos.some(v => v > 0) || annualEntradas.some(v => v > 0);

  el.innerHTML = `
    <div class="summary-grid" style="margin-bottom:16px">
      <div class="card"><div class="card-lbl">Total Gastos</div><div class="card-val">R$&nbsp;${fmt(totalGasto)}</div></div>
      <div class="card"><div class="card-lbl">Meus</div><div class="card-val a">R$&nbsp;${fmt(myT + pixT + recT)}</div></div>
      <div class="card"><div class="card-lbl">A Receber</div><div class="card-val b">R$&nbsp;${fmt(othT)}</div></div>
      <div class="card"><div class="card-lbl">Entradas</div><div class="card-val g">R$&nbsp;${fmt(incT)}</div></div>
      <div class="card"><div class="card-lbl">Saldo</div><div class="card-val ${saldo >= 0 ? 'g' : 'r'}">R$&nbsp;${fmt(saldo)}</div></div>
    </div>

    <div class="rep-row">
      <div class="rep-card">
        <div class="rep-card-title">Comparativo Mensal</div>
        ${prevM ? `
          <div style="position:relative;height:110px"><canvas id="repComparativo"></canvas></div>
          <div style="font-size:11px;font-family:var(--mono);margin-top:8px;color:${totalGasto > prevTotal ? 'var(--red)' : 'var(--green)'}">
            ${totalGasto > prevTotal
        ? `▲ R$&nbsp;${fmt(totalGasto - prevTotal)} a mais que ${prevM.label}`
        : `▼ R$&nbsp;${fmt(prevTotal - totalGasto)} a menos que ${prevM.label}`}
          </div>
        ` : `<div style="height:110px;display:flex;align-items:center;justify-content:center;font-size:11px;color:var(--text3)">apenas um mês cadastrado</div>`}
      </div>
      <div class="rep-card">
        <div class="rep-card-title">Por Banco</div>
        <div class="rep-donut-wrap">
          <div style="position:relative;width:120px;height:120px;flex-shrink:0">
            <canvas id="repBankDonut"></canvas>
          </div>
          <div class="rep-donut-legend">
            ${bkRaw.map((b, i) => `
              <div class="rep-legend-item">
                <div class="rep-legend-dot" style="background:${bkColors[i]}"></div>
                <span class="rep-legend-name">${b.name}</span>
                <span class="rep-legend-val">R$&nbsp;${fmt(b.total)}</span>
              </div>
              <div class="rep-legend-sub">meu: R$&nbsp;${fmt(b.mine)} · outros: R$&nbsp;${fmt(b.others)}</div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>

    <div class="rep-row">
      <div class="rep-card">
        <div class="rep-card-title">Por Categoria</div>
        ${catSorted.length ? `
          <div style="position:relative;height:${Math.max(catSorted.slice(0, 6).length * 36 + 10, 110)}px">
            <canvas id="repCat"></canvas>
          </div>
        ` : `<div style="height:110px;display:flex;align-items:center;justify-content:center;font-size:11px;color:var(--text3)">sem categorias</div>`}
      </div>
      <div class="rep-card">
        <div class="rep-card-title">Evolução Diária</div>
        <div style="position:relative;height:150px"><canvas id="repEvol"></canvas></div>
      </div>
    </div>

    ${Object.keys(pplMap).length ? `
      <div class="sec-title" style="margin:4px 0 12px">A Receber por Pessoa</div>
      <div class="rep-ppl-grid">
        ${Object.entries(pplMap).sort((a, b) => b[1] - a[1]).map(([n, t]) => {
          const av = _avatarColor(n);
          const initials = n.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
          const cnt = pplItems(n);
          return `<div class="rep-pcard" onclick="openCobranca('${n}')">
            <div class="rep-pcard-avatar" style="background:${av.bg};color:${av.fg}">${initials}</div>
            <div class="rep-pcard-name">${n}</div>
            <div class="rep-pcard-val">R$&nbsp;${fmt(t)}</div>
            <div class="rep-pcard-sub">${cnt}&nbsp;${cnt === 1 ? 'item' : 'itens'}</div>
          </div>`;
        }).join('')}
      </div>
    ` : ''}

    ${tiposSorted.length ? `
      <div class="rep-card" style="margin-bottom:12px">
        <div class="rep-card-title">Por Tipo</div>
        <div style="position:relative;height:${tiposSorted.length * 36 + 20}px">
          <canvas id="repTipo"></canvas>
        </div>
      </div>
    ` : ''}

    ${Object.keys(incTypeMap).length ? `
      <div class="rep-card" style="margin-bottom:12px">
        <div class="rep-card-title">Entradas por Tipo</div>
        ${(() => {
        const maxInc = Math.max(...Object.values(incTypeMap), 1);
        return Object.entries(incTypeMap).sort((a, b) => b[1] - a[1]).map(([t, v]) => {
          const color = t === 'Pix' ? 'var(--green)' : t === 'Débito' ? 'var(--teal)' : t === 'Dinheiro' ? 'var(--yellow)' : t === 'Salário' ? 'var(--accent)' : t === 'Freela' ? 'var(--blue)' : 'var(--text3)';
          return `<div class="bar-wrap">
              <div class="bar-lbl"><span>${t}</span><span>R$&nbsp;${fmt(v)}</span></div>
              <div class="bar-track"><div class="bar-fill" style="width:${(v / maxInc * 100).toFixed(1)}%;background:${color}"></div></div>
            </div>`;
        }).join('');
      })()}
      </div>
    ` : ''}

    ${hasAnnual ? `
      <div class="rep-card">
        <div class="rep-card-title">Entradas vs Gastos — Visão Anual</div>
        <div style="position:relative;height:190px"><canvas id="repAnual"></canvas></div>
      </div>
    ` : ''}
  `;

  // ── Charts do relatório mensal ─────────────────────────────────────────────
  const d = _chartDefaults();
  const fmtT = v => ' R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 });

  if (prevM) {
    _makeChart('repComp', 'repComparativo', {
      type: 'bar',
      data: {
        labels: [m.label.slice(0, 3) + ' ' + m.year, prevM.label.slice(0, 3) + ' ' + prevM.year],
        datasets: [{ data: [totalGasto, prevTotal], backgroundColor: [getCSSVar('--accent') || '#4d9eff', '#252528'], borderRadius: 4, borderSkipped: false }]
      },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => fmtT(ctx.raw) } } },
        scales: {
          x: { grid: { color: d.grid }, ticks: d.tick, border: { display: false } },
          y: { grid: { display: false }, ticks: { ...d.tick, color: getCSSVar('--text2') || '#888' }, border: { display: false } }
        }
      }
    });
  }

  if (bkRaw.length) {
    _makeChart('repDonut', 'repBankDonut', {
      type: 'doughnut',
      data: { labels: bkRaw.map(b => b.name), datasets: [{ data: bkRaw.map(b => b.total), backgroundColor: bkColors, borderWidth: 0, borderRadius: 4, spacing: 3 }] },
      options: { responsive: true, maintainAspectRatio: false, cutout: '72%', plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => fmtT(ctx.parsed) } } } }
    });
  }

  _makeChart('repEvol', 'repEvol', {
    type: 'line',
    data: {
      labels: dailyLabels,
      datasets: [{
        data: dailyData, borderColor: '#4d9eff',
        backgroundColor: ctx => {
          const g = ctx.chart.ctx.createLinearGradient(0, 0, 0, 150);
          g.addColorStop(0, 'rgba(77,158,255,0.15)');
          g.addColorStop(1, 'rgba(77,158,255,0)');
          return g;
        },
        borderWidth: 2, fill: true, tension: 0.4, pointRadius: 0, pointHoverRadius: 4,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => fmtT(ctx.parsed.y) } } },
      scales: {
        x: { grid: { color: d.grid }, ticks: { ...d.tick, maxTicksLimit: 8 }, border: { display: false } },
        y: { grid: { color: d.grid }, ticks: d.tick, border: { display: false } }
      }
    }
  });

  if (tiposSorted.length) {
    _makeChart('repTipo', 'repTipo', {
      type: 'bar',
      data: { labels: tiposSorted.map(t => t.label), datasets: [{ data: tiposSorted.map(t => t.val), backgroundColor: tiposSorted.map(t => t.color), borderRadius: 4, borderSkipped: false }] },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => fmtT(ctx.parsed.x) } } },
        scales: {
          x: { grid: { color: d.grid }, ticks: d.tick, border: { display: false } },
          y: { grid: { display: false }, ticks: { ...d.tick, color: d.text }, border: { display: false } }
        }
      }
    });
  }

  if (catSorted.length) {
    const topCats = catSorted.slice(0, 6);
    _makeChart('repCat', 'repCat', {
      type: 'bar',
      data: { labels: topCats.map(([c]) => getCategoryIcon(c, c) + ' ' + c), datasets: [{ data: topCats.map(([, v]) => v), backgroundColor: topCats.map((_, i) => CAT_COLORS[i % CAT_COLORS.length]), borderRadius: 4, borderSkipped: false }] },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => fmtT(ctx.parsed.x) } } },
        scales: {
          x: { grid: { color: d.grid }, ticks: d.tick, border: { display: false } },
          y: { grid: { display: false }, ticks: { ...d.tick, color: d.text }, border: { display: false } }
        }
      }
    });
  }

  if (hasAnnual) {
    _makeChart('repAnual', 'repAnual', {
      type: 'bar',
      data: {
        labels: annualLabels,
        datasets: [
          { label: 'Gastos', data: annualGastos, backgroundColor: '#4d9eff', borderRadius: 3, borderSkipped: false },
          { label: 'Entradas', data: annualEntradas, backgroundColor: '#4ade80', borderRadius: 3, borderSkipped: false }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        onClick: (_, els) => { if (els.length) { selectMonth(allMonths[els[0].index].key); showView('dash'); } },
        plugins: {
          legend: { display: true, position: 'top', labels: { color: d.text, font: { size: 10, family: MONO_FONT }, boxWidth: 10, boxHeight: 10, padding: 14 } },
          tooltip: { callbacks: { label: ctx => ' ' + ctx.dataset.label + ':' + fmtT(ctx.parsed.y) } }
        },
        scales: {
          x: { grid: { display: false }, ticks: d.tick, border: { display: false } },
          y: { grid: { color: d.grid }, ticks: d.tick, border: { display: false } }
        }
      }
    });
  }
}


// ══════════════════════════════════════════════════
// YEAR SUMMARY — Resumo anual
// ══════════════════════════════════════════════════
function renderYear() {
  const el = document.getElementById('yearContent');
  if (!el) return;
  if (!S.months.length) { el.innerHTML = '<div class="empty">nenhum mês cadastrado</div>'; return; }

  const years = [...new Set(S.months.map(m => m.year))].sort();
  const yearSub = document.getElementById('tbSub');
  let html = '';

  years.forEach(y => {
    const mths = S.months.filter(m => m.year === y);
    const totalAnual = mths.reduce((s, m) => s + monthTotal(m), 0);
    const incAnual = mths.reduce((s, m) => s + (S.incomes[m.key] || []).reduce((ss, i) => ss + i.amount, 0), 0);
    const saldoAnual = incAnual - totalAnual;

    // Categorias anuais
    const catAnual = {};
    mths.forEach(m => m.banks.forEach(b =>
      b.entries.filter(e => e.category).forEach(e => {
        catAnual[e.category] = (catAnual[e.category] || 0) + e.amount;
      })
    ));
    const topCats = Object.entries(catAnual).sort((a, b) => b[1] - a[1]).slice(0, 5);

    const monthH = Math.max(mths.length * 40 + 20, 60);
    const catH = Math.max(topCats.length * 38 + 20, 60);

    html += `
      <div class="yr-section">

        <!-- Cabeçalho do ano -->
        <div class="yr-header">
          <span class="yr-title">${y}</span>
          <div class="yr-stats">
            <span class="yr-stat">gastos
              <strong style="color:var(--text)">R$&nbsp;${fmt(totalAnual)}</strong>
            </span>
            <span class="yr-stat">entradas
              <strong style="color:var(--green)">R$&nbsp;${fmt(incAnual)}</strong>
            </span>
            <span class="yr-stat">saldo
              <strong style="color:${saldoAnual >= 0 ? 'var(--green)' : 'var(--red)'}">R$&nbsp;${fmt(saldoAnual)}</strong>
            </span>
          </div>
        </div>

        <!-- Entradas vs Gastos (apenas quando há 2+ meses) -->
        ${mths.length >= 2 ? `
          <div class="rep-card yr-card">
            <div class="rep-card-title">Entradas vs Gastos</div>
            <div style="position:relative;height:200px">
              <canvas id="yrBar_${y}"></canvas>
            </div>
          </div>
        ` : ''}

        <!-- Por Mês — Chart.js horizontal bar (clicável, substitui barras CSS) -->
        <div class="rep-card yr-card">
          <div class="rep-card-title">Por Mês</div>
          <div style="position:relative;height:${monthH}px">
            <canvas id="yrMonth_${y}"></canvas>
          </div>
        </div>

        <!-- Top Categorias -->
        <div class="rep-card yr-card">
          <div class="rep-card-title">Top Categorias</div>
          ${topCats.length ? `
            <div style="position:relative;height:${catH}px">
              <canvas id="yrCat_${y}"></canvas>
            </div>
          ` : `
            <div style="height:60px;display:flex;align-items:center;justify-content:center;
                 font-size:11px;color:var(--text3)">sem categorias registradas</div>
          `}
        </div>

      </div>`;
  });

  if (yearSub) yearSub.textContent = years.join(', ');
  el.innerHTML = html;

  // ── Charts ─────────────────────────────────────────────────────────────────
  const d = _chartDefaults();
  const fmtT = v => ' R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 });

  years.forEach(y => {
    const mths = S.months.filter(m => m.year === y);

    // ── Entradas vs Gastos (grouped bar) ─────────────────────────────────
    if (mths.length >= 2) {
      _makeChart('yrBar_' + y, 'yrBar_' + y, {
        type: 'bar',
        data: {
          labels: mths.map(m => m.label.slice(0, 3)),
          datasets: [
            {
              label: 'Gastos',
              data: mths.map(m => monthTotal(m)),
              backgroundColor: '#4d9eff',
              borderRadius: 4,
              borderSkipped: false,
            },
            {
              label: 'Entradas',
              data: mths.map(m => (S.incomes[m.key] || []).reduce((s, i) => s + i.amount, 0)),
              backgroundColor: '#4ade80',
              borderRadius: 4,
              borderSkipped: false,
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          onClick: (_, els) => {
            if (els.length) { selectMonth(mths[els[0].index].key); showView('dash'); }
          },
          plugins: {
            legend: {
              display: true,
              position: 'top',
              labels: {
                color: d.text,
                font: { size: 10, family: MONO_FONT },
                boxWidth: 10,
                boxHeight: 10,
                padding: 14,
              }
            },
            tooltip: {
              callbacks: { label: ctx => ' ' + ctx.dataset.label + ':' + fmtT(ctx.parsed.y) }
            }
          },
          scales: {
            x: { grid: { display: false }, ticks: d.tick, border: { display: false } },
            y: { grid: { color: d.grid }, ticks: d.tick, border: { display: false } }
          }
        }
      });
    }

    // ── Por Mês (horizontal bar — clicável, com suporte a meta) ──────────
    const hasGoals = mths.some(m => m.goal);

    _makeChart('yrMonth_' + y, 'yrMonth_' + y, {
      type: 'bar',
      data: {
        labels: mths.map(m => m.label.slice(0, 3)),
        datasets: [
          {
            label: 'Gasto',
            data: mths.map(m => monthTotal(m)),
            // Vermelho quando passa da meta, azul normal
            backgroundColor: mths.map(m => {
              const tot = monthTotal(m);
              return (m.goal && tot > m.goal) ? '#ff4d4d88' : (getCSSVar('--accent') || '#4d9eff');
            }),
            borderRadius: 4,
            borderSkipped: false,
          },
          ...(hasGoals ? [{
            label: 'Meta',
            data: mths.map(m => m.goal || null),
            backgroundColor: 'rgba(255,255,255,0.05)',
            borderColor: 'rgba(255,255,255,0.10)',
            borderWidth: 1,
            borderRadius: 4,
            borderSkipped: false,
          }] : [])
        ]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        onClick: (_, els) => {
          if (els.length) { selectMonth(mths[els[0].index].key); showView('dash'); }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => {
                if (ctx.dataset.label === 'Meta') return ' Meta:' + fmtT(ctx.parsed.x);
                const m = mths[ctx.dataIndex];
                const tot = monthTotal(m);
                let str = fmtT(tot);
                if (m.goal) str += `  (${(tot / m.goal * 100).toFixed(0)}% da meta)`;
                return str;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { color: d.grid },
            ticks: d.tick,
            border: { display: false },
          },
          y: {
            grid: { display: false },
            ticks: { ...d.tick, color: getCSSVar('--text2') || '#888' },
            border: { display: false },
          }
        }
      }
    });

    // ── Top Categorias ────────────────────────────────────────────────────
    const catAnual = {};
    mths.forEach(m => m.banks.forEach(b =>
      b.entries.filter(e => e.category).forEach(e => {
        catAnual[e.category] = (catAnual[e.category] || 0) + e.amount;
      })
    ));
    const topCats = Object.entries(catAnual).sort((a, b) => b[1] - a[1]).slice(0, 5);
    if (!topCats.length) return;

    _makeChart('yrCat_' + y, 'yrCat_' + y, {
      type: 'bar',
      data: {
        labels: topCats.map(([c]) => getCategoryIcon(c, c) + ' ' + c),
        datasets: [{
          data: topCats.map(([, v]) => v),
          backgroundColor: topCats.map((_, i) => CAT_COLORS[i % CAT_COLORS.length]),
          borderRadius: 4,
          borderSkipped: false,
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => fmtT(ctx.parsed.x) } }
        },
        scales: {
          x: { grid: { color: d.grid }, ticks: d.tick, border: { display: false } },
          y: { grid: { display: false }, ticks: { ...d.tick, color: d.text }, border: { display: false } }
        }
      }
    });
  });
}

// renderHistory() em js/history.js