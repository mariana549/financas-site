// ══════════════════════════════════════════════════
// MONTHS.JS — CRUD de Meses
// ══════════════════════════════════════════════════

async function addMonth() {
  const m = document.getElementById('mSel').value;
  const y = document.getElementById('mYear').value;
  const key = m + '/' + y;
  if (S.months.find(x => x.key === key)) { alert('Mês já existe.'); return; }
  const goal = parseFloat(document.getElementById('mGoal').value) || null;
  const month = { key, label: m, year: y, banks: [], goal };
  S.months.push(month);
  setSyncing(true);
  await dbSaveMonth(month);
  await injectInstallments(key);
  setSyncing(false);
  renderMonthList();
  selectMonth(key);
  closeModal('mMonth');
  document.getElementById('mGoal').value = '';
}

async function copyLastMonth() {
  if (S.months.length === 0) { alert('Nenhum mês para copiar.'); return; }
  const last = S.months[S.months.length - 1];
  const m = document.getElementById('mSel').value;
  const y = document.getElementById('mYear').value;
  const key = m + '/' + y;
  if (S.months.find(x => x.key === key)) { alert('Mês já existe.'); return; }
  const goal = parseFloat(document.getElementById('mGoal').value) || last.goal || null;
  const banks = last.banks.map(b => ({ ...b, entries: [] }));
  const month = { key, label: m, year: y, banks, goal };
  S.months.push(month);
  setSyncing(true);
  await dbSaveMonth(month);
  for (const b of banks) await dbSaveBank(key, b);
  if (S.recurrents[last.key]) {
    S.recurrents[key] = (S.recurrents[last.key] || []).map(r => ({ ...r, id: Date.now() + Math.random() }));
    for (const r of S.recurrents[key]) await dbSaveRecurrent(key, r);
  }
  await injectInstallments(key);
  setSyncing(false);
  renderMonthList();
  selectMonth(key);
  closeModal('mMonth');
  document.getElementById('mGoal').value = '';
}

// ── NOVO: Deletar mês e todos os dados relacionados ──
async function deleteMonth(key) {
  if (!confirm('Excluir este mês e todos os lançamentos? Essa ação não pode ser desfeita.')) return;
  setSyncing(true);

  const m = S.months.find(x => x.key === key);
  if (m) {
    // Deleta todas as entradas de todos os bancos
    for (const b of m.banks) {
      for (const e of b.entries) await dbDeleteEntry(e.id);
    }
    // Deleta bancos
    await sb.from('banks')
      .delete()
      .eq('user_id', currentUser.id)
      .eq('month_key', key);
  }

  // Deleta pix, recorrentes, entradas do mês
  await sb.from('pix_entries').delete().eq('user_id', currentUser.id).eq('month_key', key);
  await sb.from('recurrents').delete().eq('user_id', currentUser.id).eq('month_key', key);
  await sb.from('incomes').delete().eq('user_id', currentUser.id).eq('month_key', key);
  await sb.from('transacoes').delete().eq('user_id', currentUser.id).eq('month_key', key);
  await sb.from('months').delete().eq('user_id', currentUser.id).eq('key', key);

  // Atualiza estado local
  S.months = S.months.filter(x => x.key !== key);
  delete S.pixEntries[key];
  delete S.recurrents[key];
  delete S.incomes[key];

  if (S.currentMonth === key) {
    S.currentMonth = S.months.length ? S.months[S.months.length - 1].key : null;
  }

  setSyncing(false);
  renderMonthList();

  if (S.currentMonth) {
    selectMonth(S.currentMonth);
  } else {
    document.getElementById('dashContent').innerHTML = '<div class="empty">selecione ou crie um mês<br>para começar</div>';
    document.getElementById('tbTitle').textContent = 'Selecione um mês';
    document.getElementById('tbSub').textContent = 'nenhum mês selecionado';
    document.getElementById('tbActions').innerHTML = '';
  }
}

function renderMonthList() {
  const el = document.getElementById('monthList');
  if (!el) return;
  if (!S.months.length) {
    el.innerHTML = '<div style="padding:8px 12px;font-size:12px;color:var(--text3);font-family:var(--mono)">nenhum mês</div>';
    return;
  }
  el.innerHTML = S.months.map(m => `
    <div class="month-item ${S.currentMonth === m.key ? 'active' : ''}"
      onclick="selectMonth('${m.key}')">
      <span>${m.label.slice(0, 3)} ${m.year}</span>
      <div style="display:flex;align-items:center;gap:6px">
        <span class="badge">R$${fmt(monthTotal(m))}</span>
        <button onclick="event.stopPropagation();deleteMonth('${m.key}')"
          style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:13px;padding:0 2px;line-height:1;transition:color .15s"
          onmouseover="this.style.color='var(--red)'"
          onmouseout="this.style.color='var(--text3)'"
          title="Excluir mês">×</button>
      </div>
    </div>`).join('');
}

function monthTotal(m) {
  let t = m.banks.reduce((s, b) => s + b.entries.reduce((ss, e) => ss + e.amount, 0), 0);
  t += (S.recurrents[m.key] || []).reduce((s, r) => s + r.amount, 0);
  t += (S.pixEntries[m.key] || []).reduce((s, p) => s + p.amount, 0);
  return t;
}

function selectMonth(key, render = true) {
  S.currentMonth = key;
  const m = getMonth();
  if (!m) return;
  const tbTitle = document.getElementById('tbTitle');
  const tbSub = document.getElementById('tbSub');
  if (tbTitle) tbTitle.textContent = m.label + ' ' + m.year;
  if (tbSub) tbSub.textContent = m.banks.length + ' banco(s)' + (m.goal ? ` · meta R$${fmt(m.goal)}` : '');
  S.currentBank = m.banks.length ? m.banks[0].name : null;
  buildActions();
  renderMonthList();
  if (render) renderDash();
  save();
}

function getMonth() {
  return S.months.find(m => m.key === S.currentMonth);
}

function buildActions() {
  const el = document.getElementById('tbActions');
  if (!el) return;
  if (getMonth()) {
    el.innerHTML = `
      <button class="btn btn-ghost btn-sm" onclick="openModal('mGoal')">🎯 Meta</button>
      <button class="btn btn-ghost btn-sm" onclick="openAI()">📄 Extrato IA</button>
      <button class="btn btn-ghost btn-sm" onclick="exportMonthPDF()">📥 PDF</button>`;
  } else {
    el.innerHTML = '';
  }
}