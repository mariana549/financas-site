// ══════════════════════════════════════════════════
// PJ-REPORTS.JS — Relatórios PJ
// ══════════════════════════════════════════════════

function renderPJReports() {
  const el = document.getElementById('view-pjreports');
  if (!el) return;

  if (!S.activeContext || S.activeContext.type === 'personal') {
    el.innerHTML = `<div style="padding:40px;text-align:center;color:var(--text3)">
      <div style="font-size:32px;margin-bottom:12px">📊</div>
      <div style="font-size:14px">Esta seção é exclusiva do contexto PJ.</div>
    </div>`;
    return;
  }

  // Agrupa receitas por mês
  const monthRevenue = {};
  Object.entries(S.incomes || {}).forEach(([mk, arr]) => {
    monthRevenue[mk] = (monthRevenue[mk] || 0) + arr.reduce((a, i) => a + i.amount, 0);
  });

  // Agrupa gastos por mês (entries do tipo 'mine')
  const monthExpense = {};
  S.months.forEach(m => {
    m.banks.forEach(b => {
      b.entries.forEach(e => {
        if (e.owner === 'mine') {
          monthExpense[m.key] = (monthExpense[m.key] || 0) + e.amount;
        }
      });
    });
  });

  // Agrupa impostos por mês de referência
  const monthTaxes = {};
  (S.pjTaxes || []).forEach(t => {
    if (t.refMonth) {
      monthTaxes[t.refMonth] = (monthTaxes[t.refMonth] || 0) + t.amount;
    }
  });

  // Todos os meses em ordem
  const allMonths = [...new Set([
    ...Object.keys(monthRevenue),
    ...Object.keys(monthExpense),
    ...Object.keys(monthTaxes)
  ])].sort().reverse();

  const totalRevenue = Object.values(monthRevenue).reduce((a, v) => a + v, 0);
  const totalExpense = Object.values(monthExpense).reduce((a, v) => a + v, 0);
  const totalTaxes   = Object.values(monthTaxes).reduce((a, v) => a + v, 0);
  const totalNet     = totalRevenue - totalExpense - totalTaxes;

  // Faturamento por cliente
  const clientRevenue = {};
  const clients = S.pjClients || [];
  Object.values(S.incomes || {}).flat().forEach(inc => {
    if (inc.clientId) {
      clientRevenue[inc.clientId] = (clientRevenue[inc.clientId] || 0) + inc.amount;
    }
  });
  const topClients = Object.entries(clientRevenue)
    .map(([id, rev]) => ({ client: clients.find(c => c.id === id), rev }))
    .filter(x => x.client)
    .sort((a, b) => b.rev - a.rev)
    .slice(0, 5);

  el.innerHTML = `
  <div style="max-width:760px;margin:0 auto;padding:20px 20px 60px">

    <!-- Cards de totais -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:24px">
      ${[
        { label: 'Faturamento bruto', val: totalRevenue, color: 'var(--green)' },
        { label: 'Custos totais',     val: totalExpense, color: 'var(--red)' },
        { label: 'Impostos',          val: totalTaxes,   color: 'var(--yellow)' },
        { label: 'Líquido',           val: totalNet,     color: totalNet >= 0 ? 'var(--green)' : 'var(--red)' },
      ].map(c => `
        <div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:14px;text-align:center">
          <div style="font-size:10px;color:var(--text3);font-family:var(--mono);margin-bottom:4px">${c.label}</div>
          <div style="font-size:15px;font-weight:700;color:${c.color};font-family:var(--mono)">${fmt(c.val)}</div>
        </div>`).join('')}
    </div>

    <!-- Gráfico mensal (barras simples com CSS) -->
    ${allMonths.length > 0 ? `
    <div style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:18px;margin-bottom:20px">
      <div style="font-size:12px;font-weight:600;color:var(--text);margin-bottom:16px">Faturamento por mês</div>
      <div style="display:flex;flex-direction:column;gap:10px">
        ${(() => {
          const maxVal = Math.max(...allMonths.map(mk => monthRevenue[mk] || 0), 1);
          return allMonths.slice(0, 12).map(mk => {
            const rev  = monthRevenue[mk] || 0;
            const exp  = monthExpense[mk] || 0;
            const tax  = monthTaxes[mk] || 0;
            const net  = rev - exp - tax;
            const pct  = Math.round((rev / maxVal) * 100);
            const m    = S.months.find(x => x.key === mk);
            const lbl  = m ? m.label : mk;
            return `
            <div>
              <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                <span style="font-size:11px;color:var(--text3);font-family:var(--mono)">${lbl}</span>
                <span style="font-size:11px;color:var(--green);font-family:var(--mono)">${fmt(rev)}</span>
              </div>
              <div style="height:6px;background:var(--bg3);border-radius:3px;overflow:hidden">
                <div style="height:100%;width:${pct}%;background:var(--green);border-radius:3px;transition:width .3s"></div>
              </div>
              <div style="display:flex;gap:12px;margin-top:3px">
                <span style="font-size:10px;color:var(--text3)">custos ${fmt(exp)}</span>
                <span style="font-size:10px;color:var(--yellow)">impostos ${fmt(tax)}</span>
                <span style="font-size:10px;font-weight:600;color:${net >= 0 ? 'var(--green)' : 'var(--red)'}">líquido ${fmt(net)}</span>
              </div>
            </div>`;
          }).join('');
        })()}
      </div>
    </div>` : ''}

    <!-- Top clientes -->
    ${topClients.length > 0 ? `
    <div style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:18px;margin-bottom:20px">
      <div style="font-size:12px;font-weight:600;color:var(--text);margin-bottom:14px">Top clientes</div>
      <div style="display:flex;flex-direction:column;gap:8px">
        ${topClients.map((x, i) => {
          const pct = totalRevenue > 0 ? Math.round((x.rev / totalRevenue) * 100) : 0;
          return `
          <div style="display:flex;align-items:center;gap:10px">
            <span style="font-size:11px;color:var(--text3);font-family:var(--mono);width:16px">${i + 1}.</span>
            <span style="flex:1;font-size:12px;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${x.client.name}</span>
            <span style="font-size:11px;color:var(--text3);font-family:var(--mono)">${pct}%</span>
            <span style="font-size:12px;font-weight:700;color:var(--green);font-family:var(--mono)">${fmt(x.rev)}</span>
          </div>`;
        }).join('')}
      </div>
    </div>` : ''}

    <!-- Exportar CSV -->
    <div style="text-align:center">
      <button class="btn btn-ghost btn-sm" onclick="_pjReportsExportCSV()" style="font-size:12px">
        <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" style="margin-right:5px"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        Exportar para contador (CSV)
      </button>
    </div>
  </div>`;
}

function _pjReportsExportCSV() {
  const rows = [['Mês', 'Faturamento Bruto', 'Custos', 'Impostos', 'Líquido']];

  const monthRevenue = {};
  Object.entries(S.incomes || {}).forEach(([mk, arr]) => {
    monthRevenue[mk] = arr.reduce((a, i) => a + i.amount, 0);
  });
  const monthExpense = {};
  S.months.forEach(m => {
    m.banks.forEach(b => {
      b.entries.forEach(e => {
        if (e.owner === 'mine') monthExpense[m.key] = (monthExpense[m.key] || 0) + e.amount;
      });
    });
  });
  const monthTaxes = {};
  (S.pjTaxes || []).forEach(t => {
    if (t.refMonth) monthTaxes[t.refMonth] = (monthTaxes[t.refMonth] || 0) + t.amount;
  });

  const allMonths = [...new Set([
    ...Object.keys(monthRevenue), ...Object.keys(monthExpense), ...Object.keys(monthTaxes)
  ])].sort();

  allMonths.forEach(mk => {
    const rev = monthRevenue[mk] || 0;
    const exp = monthExpense[mk] || 0;
    const tax = monthTaxes[mk] || 0;
    const m   = S.months.find(x => x.key === mk);
    rows.push([m ? m.label : mk, rev.toFixed(2), exp.toFixed(2), tax.toFixed(2), (rev - exp - tax).toFixed(2)]);
  });

  const csv = rows.map(r => r.join(';')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `relatorio-pj-${S.activeContext?.name || 'pj'}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('✓ CSV exportado');
}
