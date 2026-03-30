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
    <div class="month-actions">
      <button onclick="event.stopPropagation();openEditMonth('${m.key}')"
        style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:13px;padding:0 3px;line-height:1;transition:color .15s"
        onmouseover="this.style.color='var(--accent)'"
        onmouseout="this.style.color='var(--text3)'"
        title="Editar mês">✎</button>
      <button onclick="event.stopPropagation();openDeleteMonth('${m.key}')"
        style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:13px;padding:0 3px;line-height:1;transition:color .15s"
        onmouseover="this.style.color='var(--red)'"
        onmouseout="this.style.color='var(--text3)'"
        title="Excluir mês">×</button>
    </div>
    <span class="badge">R$${fmt(monthTotal(m))}</span>
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

// ══════════════════════════════════════════════════
// EDIT MONTH — Editar label, ano e meta do mês
// ══════════════════════════════════════════════════

function openEditMonth(key) {
  const m = S.months.find(x => x.key === key);
  if (!m) return;

  const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  document.getElementById('editMSel').value = m.label;
  document.getElementById('editMYear').value = m.year;
  document.getElementById('editMGoal').value = m.goal || '';
  document.getElementById('editMKey').value = key;

  openModal('mEditMonth');
}

async function saveEditMonth() {
  const oldKey  = document.getElementById('editMKey').value;
  const label   = document.getElementById('editMSel').value;
  const year    = document.getElementById('editMYear').value;
  const goal    = parseFloat(document.getElementById('editMGoal').value) || null;
  const newKey  = label + '/' + year;

  const m = S.months.find(x => x.key === oldKey);
  if (!m) return;

  // ── Sem mudança de key: só atualiza meta ──
  if (newKey === oldKey) {
    m.goal = goal;
    setSyncing(true);
    await dbSaveMonth(m);
    setSyncing(false);
    renderMonthList();
    if (S.currentMonth === oldKey) selectMonth(oldKey, true);
    closeModal('mEditMonth');
    return;
  }

  // ── Chave nova já existe? ──
  if (S.months.find(x => x.key === newKey)) {
    alert('Já existe um mês com esse nome/ano.');
    return;
  }

  setSyncing(true);

  // 1. Atualiza objeto local
  m.key   = newKey;
  m.label = label;
  m.year  = year;
  m.goal  = goal;

  // 2. Salva novo mês no Supabase
  await dbSaveMonth(m);

  // 3. Migra bancos e entradas
  for (const b of m.banks) {
    await dbSaveBank(newKey, b);
    for (const e of b.entries) {
      await dbSaveEntry(newKey, b.name, e);
      await dbDeleteEntry(e.id); // remove da key antiga (upsert por id já sobrescreve, mas garante month_key)
    }
    // Remove banco da key antiga
    await sb.from('banks')
      .delete()
      .eq('user_id', currentUser.id)
      .eq('month_key', oldKey)
      .eq('name', b.name);
  }

  // 4. Migra pix
  const pixList = S.pixEntries[oldKey] || [];
  S.pixEntries[newKey] = pixList;
  delete S.pixEntries[oldKey];
  for (const px of pixList) await dbSavePix(newKey, px);
  await sb.from('pix_entries').delete()
    .eq('user_id', currentUser.id).eq('month_key', oldKey);

  // 5. Migra recorrentes
  const recList = S.recurrents[oldKey] || [];
  S.recurrents[newKey] = recList;
  delete S.recurrents[oldKey];
  for (const r of recList) await dbSaveRecurrent(newKey, r);
  await sb.from('recurrents').delete()
    .eq('user_id', currentUser.id).eq('month_key', oldKey);

  // 6. Migra incomes
  const incList = S.incomes[oldKey] || [];
  S.incomes[newKey] = incList;
  delete S.incomes[oldKey];
  for (const i of incList) await dbSaveIncome(newKey, i);
  await sb.from('incomes').delete()
    .eq('user_id', currentUser.id).eq('month_key', oldKey);

  // 7. Deleta mês antigo do Supabase
  await sb.from('months').delete()
    .eq('user_id', currentUser.id).eq('key', oldKey);

  // 8. Atualiza currentMonth se necessário
  if (S.currentMonth === oldKey) S.currentMonth = newKey;

  setSyncing(false);
  renderMonthList();
  selectMonth(S.currentMonth, true);
  closeModal('mEditMonth');
}

// ══════════════════════════════════════════════════
// DELETE MONTH MODAL — Confirmação com dados do mês
// ══════════════════════════════════════════════════

function openDeleteMonth(key) {
  const m = S.months.find(x => x.key === key);
  if (!m) return;

  const total = monthTotal(m);

  document.getElementById('deleteMonthLabel').textContent = m.label + ' ' + m.year;
  document.getElementById('deleteMonthTotal').textContent =
    'Total lançado: R$ ' + fmt(total) +
    ' · ' + m.banks.flatMap(b => b.entries).length + ' lançamento(s)';
  document.getElementById('deleteMonthKey').value = key;

  openModal('mDeleteMonth');
}

async function executeDeleteMonth() {
  const key = document.getElementById('deleteMonthKey').value;
  if (!key) return;
  closeModal('mDeleteMonth');
  await deleteMonth(key); // reutiliza a lógica existente em deleteMonth()
}