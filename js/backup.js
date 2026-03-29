// ══════════════════════════════════════════════════
// BACKUP.JS — Export JSON, Import JSON, Export PDF
// ══════════════════════════════════════════════════

function openBackup() {
  openModal('mBackup');
}

function exportBackup() {
  const data = {
    months: S.months,
    pixEntries: S.pixEntries,
    recurrents: S.recurrents,
    incomes: S.incomes,
    subscriptions: S.subscriptions,
    installments: S.installments,
    exportedAt: new Date().toISOString(),
    version: '1.0'
  };
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'financas_backup_' + today() + '.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

async function importBackup(input) {
  const file = input.files[0];
  if (!file) return;
  const r = new FileReader();
  r.onload = async e => {
    try {
      const d = JSON.parse(e.target.result);
      if (!d.months) { alert('Arquivo inválido — estrutura não reconhecida.'); return; }
      if (!confirm('Restaurar backup? Os dados atuais serão substituídos permanentemente.')) return;

      setSyncing(true);
      // Salva tudo no Supabase
      for (const m of (d.months || [])) {
        await dbSaveMonth(m);
        for (const b of (m.banks || [])) {
          await dbSaveBank(m.key, b);
          for (const entry of (b.entries || [])) {
            await dbSaveEntry(m.key, b.name, entry);
          }
        }
      }
      for (const [key, pxList] of Object.entries(d.pixEntries || {})) {
        for (const px of pxList) await dbSavePix(key, px);
      }
      for (const [key, recList] of Object.entries(d.recurrents || {})) {
        for (const r of recList) await dbSaveRecurrent(key, r);
      }
      for (const [key, incList] of Object.entries(d.incomes || {})) {
        for (const inc of incList) await dbSaveIncome(key, inc);
      }
      for (const sub of (d.subscriptions || [])) await dbSaveSub(sub);
      for (const inst of (d.installments || [])) await dbSaveInstallment(inst);

      setSyncing(false);
      alert('Backup restaurado com sucesso!');
      location.reload();
    } catch (err) {
      setSyncing(false);
      alert('Erro ao importar: ' + err.message);
    }
  };
  r.readAsText(file);
  // Limpa o input para permitir reimportar o mesmo arquivo
  input.value = '';
}

function exportMonthPDF() {
  const m = getMonth();
  if (!m) { alert('Selecione um mês.'); return; }

  const allE = m.banks.flatMap(b => b.entries.map(e => ({ ...e, bankName: b.name })));
  const pixL = S.pixEntries[m.key] || [];
  const recL = S.recurrents[m.key] || [];
  const incL = S.incomes[m.key] || [];

  const myT = allE.filter(e => e.owner === 'mine').reduce((s, e) => s + e.amount, 0);
  const othT = allE.filter(e => e.owner === 'other').reduce((s, e) => s + e.amount, 0);
  const pixT = pixL.reduce((s, p) => s + p.amount, 0);
  const recT = recL.reduce((s, r) => s + r.amount, 0);
  const incT = incL.reduce((s, i) => s + i.amount, 0);
  const saldo = incT - (myT + pixT + recT);

  const pplMap = {};
  allE.filter(e => e.owner === 'other').forEach(e => {
    if (!pplMap[e.person]) pplMap[e.person] = 0;
    pplMap[e.person] += e.amount;
  });

  const w = window.open('', '_blank');
  w.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Finanças ${m.label} ${m.year}</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 13px; color: #1a1a1a; padding: 32px; max-width: 900px; margin: 0 auto; }
    h1 { font-size: 22px; margin-bottom: 4px; }
    h2 { font-size: 14px; margin: 24px 0 8px; border-bottom: 2px solid #eee; padding-bottom: 4px; color: #333; }
    p { color: #666; font-size: 12px; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    th { background: #f5f5f5; padding: 7px 10px; text-align: left; font-size: 11px; border: 1px solid #ddd; text-transform: uppercase; letter-spacing: 1px; }
    td { padding: 7px 10px; border: 1px solid #eee; font-size: 12px; }
    tr:nth-child(even) td { background: #fafafa; }
    .total { text-align: right; font-weight: bold; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; }
    .card { background: #f9f9f9; border: 1px solid #eee; border-radius: 6px; padding: 14px; }
    .card-lbl { font-size: 10px; color: #999; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
    .card-val { font-size: 20px; font-weight: bold; }
    .badge-mine { background: #e8f4ff; color: #2563eb; padding: 2px 6px; border-radius: 4px; font-size: 11px; }
    .badge-other { background: #f3f0ff; color: #7c3aed; padding: 2px 6px; border-radius: 4px; font-size: 11px; }
    @media print { body { padding: 16px; } .no-print { display: none; } }
  </style>
</head>
<body>
  <h1>Finanças — ${m.label} ${m.year}</h1>
  <p>Gerado em ${new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>

  <div class="grid">
    <div class="card"><div class="card-lbl">Total Gastos</div><div class="card-val">R$ ${fmt(myT + othT + pixT + recT)}</div></div>
    <div class="card"><div class="card-lbl">Entradas</div><div class="card-val" style="color:#16a34a">R$ ${fmt(incT)}</div></div>
    <div class="card"><div class="card-lbl">Saldo</div><div class="card-val" style="color:${saldo >= 0 ? '#16a34a' : '#dc2626'}">R$ ${fmt(saldo)}</div></div>
    <div class="card"><div class="card-lbl">Meus Gastos</div><div class="card-val" style="color:#2563eb">R$ ${fmt(myT + pixT + recT)}</div></div>
    <div class="card"><div class="card-lbl">A Receber</div><div class="card-val" style="color:#7c3aed">R$ ${fmt(othT)}</div></div>
    ${m.goal ? `<div class="card"><div class="card-lbl">Meta</div><div class="card-val" style="color:${myT + othT + pixT + recT > m.goal ? '#dc2626' : '#16a34a'}">${((myT + othT + pixT + recT) / m.goal * 100).toFixed(0)}%</div></div>` : ''}
  </div>

  ${m.banks.map(b => `
    <h2>${b.name}</h2>
    <table>
      <tr><th>Descrição</th><th>De quem</th><th>Categoria</th><th>Tipo</th><th>Data</th><th>Valor</th></tr>
      ${b.entries.map(e => `
        <tr>
          <td>${e.desc}${e.installTotal ? ` (${e.installCurrent}/${e.installTotal})` : ''}</td>
          <td>${e.owner === 'other' ? `<span class="badge-other">${e.person}</span>` : '<span class="badge-mine">Meu</span>'}</td>
          <td>${e.category || '—'}</td>
          <td>${e.type === 'installment' ? 'Parcelado' : e.type === 'pix' ? 'Pix' : 'Normal'}</td>
          <td>${fmtDate(e.date)}</td>
          <td class="total">R$ ${fmt(e.amount)}</td>
        </tr>`).join('')}
      <tr style="background:#f0f0f0;font-weight:bold">
        <td colspan="5">Total ${b.name}</td>
        <td class="total">R$ ${fmt(b.entries.reduce((s, e) => s + e.amount, 0))}</td>
      </tr>
    </table>`).join('')}

  ${pixL.length ? `
    <h2>Pix Enviados</h2>
    <table>
      <tr><th>Para</th><th>Banco</th><th>Motivo</th><th>Data</th><th>Valor</th></tr>
      ${pixL.map(p => `<tr><td>${p.to}</td><td>${p.bank || '—'}</td><td>${p.obs || '—'}</td><td>${fmtDate(p.date)}</td><td class="total">R$ ${fmt(p.amount)}</td></tr>`).join('')}
    </table>` : ''}

  ${recL.length ? `
    <h2>Contas Fixas</h2>
    <table>
      <tr><th>Descrição</th><th>Vencimento</th><th>Observação</th><th>Valor</th></tr>
      ${recL.map(r => `<tr><td>${r.desc}</td><td>Dia ${r.day || '—'}</td><td>${r.obs || '—'}</td><td class="total">R$ ${fmt(r.amount)}</td></tr>`).join('')}
    </table>` : ''}

  ${incL.length ? `
    <h2>Entradas</h2>
    <table>
      <tr><th>Descrição</th><th>Tipo</th><th>De quem</th><th>Data</th><th>Valor</th></tr>
      ${incL.map(i => `<tr><td>${i.desc}</td><td>${i.incType || '—'}</td><td>${i.owner === 'other' ? i.person : 'Meu'}</td><td>${fmtDate(i.date)}</td><td class="total" style="color:#16a34a">R$ ${fmt(i.amount)}</td></tr>`).join('')}
    </table>` : ''}

  ${Object.keys(pplMap).length ? `
    <h2>Resumo — A Receber</h2>
    <table>
      <tr><th>Pessoa</th><th>Total a Receber</th></tr>
      ${Object.entries(pplMap).sort((a, b) => b[1] - a[1]).map(([n, t]) => `<tr><td>${n}</td><td class="total" style="color:#7c3aed">R$ ${fmt(t)}</td></tr>`).join('')}
    </table>` : ''}

  <script>window.print();<\/script>
</body>
</html>`);
  w.document.close();
}