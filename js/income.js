// ══════════════════════════════════════════════════
// INCOME.JS — Entradas / Receitas
// ══════════════════════════════════════════════════

// ── Tags de etiquetas ──
const _INC_DEFAULT_TAGS = ['Renda extra', 'Reembolso', 'Adiantamento', 'Bônus', 'Troca', 'Presente'];

function _incGetCustomTags() {
  try { return JSON.parse(localStorage.getItem('fin_income_tags') || '[]'); } catch { return []; }
}

function _incGetAllTags() {
  const custom = _incGetCustomTags();
  return [..._INC_DEFAULT_TAGS, ...custom.filter(t => !_INC_DEFAULT_TAGS.includes(t))];
}

function _incRebuildTagChips(selected = []) {
  const el = document.getElementById('incTagChips');
  if (!el) return;
  el.innerHTML = _incGetAllTags().map(t =>
    `<div class="chip${selected.includes(t) ? ' sel' : ''}" onclick="_incTagToggle(this)">${t}</div>`
  ).join('');
}

function _incTagToggle(el) { el.classList.toggle('sel'); }

function _incTagAdd() {
  const input = document.getElementById('incTagInput');
  const tag = input.value.trim();
  if (!tag) return;
  const custom = _incGetCustomTags();
  if (!custom.includes(tag) && !_INC_DEFAULT_TAGS.includes(tag)) {
    custom.push(tag);
    localStorage.setItem('fin_income_tags', JSON.stringify(custom));
  }
  input.value = '';
  const selected = _incGetSelectedTags();
  if (!selected.includes(tag)) selected.push(tag);
  _incRebuildTagChips(selected);
}

function _incGetSelectedTags() {
  return [...document.querySelectorAll('#incTagChips .chip.sel')].map(c => c.textContent.trim());
}

// ── Autocomplete de pessoa ──
function _incGetAllPersons() {
  const persons = new Set();
  Object.values(S.incomes || {}).forEach(arr =>
    arr.forEach(i => { if (i.person) persons.add(i.person); })
  );
  return [...persons].sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));
}

function _incAutoInput(val) {
  const ac = document.getElementById('incPersonAC');
  if (!ac) return;
  if (!val.trim()) { ac.style.display = 'none'; return; }
  const q = val.toLowerCase();
  const matches = _incGetAllPersons().filter(p => p.toLowerCase().includes(q));
  if (!matches.length) { ac.style.display = 'none'; return; }
  ac.innerHTML = matches.slice(0, 6).map(p =>
    `<div class="inc-ac-item" onmousedown="_incAutoSelect('${p.replace(/\\/g,'\\\\').replace(/'/g,"\\'")}')">  ${p}</div>`
  ).join('');
  ac.style.display = 'block';
}

function _incAutoSelect(name) {
  const inp = document.getElementById('incPerson');
  if (inp) inp.value = name;
  const ac = document.getElementById('incPersonAC');
  if (ac) ac.style.display = 'none';
}

// Fecha autocomplete ao clicar fora — registrado uma vez
if (!window._incACListenerSet) {
  window._incACListenerSet = true;
  document.addEventListener('click', e => {
    if (!e.target.closest('#incPersonGroup')) {
      const ac = document.getElementById('incPersonAC');
      if (ac) ac.style.display = 'none';
    }
  });
}

// ── Mesclar pessoas ──
function openMergePersonsM() {
  const persons = _incGetAllPersons();
  if (persons.length < 2) { showToast('Precisa de 2+ pessoas para mesclar.', 'error'); return; }
  const selA = document.getElementById('mergePersonA');
  const selB = document.getElementById('mergePersonB');
  const opts = persons.map(p => `<option value="${p}">${p}</option>`).join('');
  selA.innerHTML = opts;
  selB.innerHTML = opts;
  selB.selectedIndex = 1;
  document.getElementById('mergePersonCanonical').value = '';
  openModal('mMergePersons');
}

async function mergePersons() {
  const nameA = document.getElementById('mergePersonA').value;
  const nameB = document.getElementById('mergePersonB').value;
  const canonical = document.getElementById('mergePersonCanonical').value.trim() || nameB;
  if (nameA === nameB) { showToast('Selecione pessoas diferentes.', 'error'); return; }
  const promises = [];
  let count = 0;
  Object.entries(S.incomes || {}).forEach(([monthKey, arr]) => {
    arr.forEach(i => {
      if (i.person === nameA || i.person === nameB) {
        i.person = canonical;
        count++;
        promises.push(dbSaveIncome(monthKey, i));
      }
    });
  });
  if (!count) { showToast('Nenhuma entrada encontrada.', 'error'); return; }
  setSyncing(true);
  await Promise.all(promises);
  setSyncing(false);
  closeModal('mMergePersons');
  renderDash();
  showToast(`✓ ${count} entrada(s) mesclada(s) como "${canonical}"`);
}

// ── Modal de entrada ──
function openIncomeM(editId = null) {
  document.getElementById('editIncomeId').value = '';
  clr('incDesc', 'incAmt', 'incFrom', 'incPerson', 'incObs');
  document.getElementById('incTagInput').value = '';
  const delBtn = document.getElementById('incDeleteBtn');
  if (delBtn) delBtn.style.display = 'none';
  // Restringe data ao mês da pasta
  const _mi = getMonth();
  if (_mi) {
    const { min, max } = getMonthDateRange(_mi);
    const dateEl = document.getElementById('incDate');
    dateEl.setAttribute('min', min);
    dateEl.setAttribute('max', max);
    const t = today();
    dateEl.value = (t >= min && t <= max) ? t : min;
  }
  const titleEl = document.getElementById('incomeTitle');
  if (titleEl) titleEl.firstChild.textContent = editId ? 'Editar Entrada ' : 'Nova Entrada ';
  document.querySelectorAll('#incTypeChips .chip').forEach((c, i) => c.classList.toggle('sel', i === 0));
  S.incomeType = 'Salário';
  setIncOwner('mine');
  _incRebuildTagChips([]);

  if (editId) {
    const inc = (S.incomes[S.currentMonth] || []).find(x => String(x.id) === String(editId));
    if (inc) {
      document.getElementById('editIncomeId').value = String(inc.id);
      document.getElementById('incDesc').value = inc.desc;
      document.getElementById('incAmt').value = inc.amount;
      document.getElementById('incDate').value = inc.date || today();
      document.getElementById('incFrom').value = inc.from || '';
      document.getElementById('incObs').value = inc.obs || '';
      S.incomeType = inc.incType || 'Salário';
      document.querySelectorAll('#incTypeChips .chip').forEach(c => {
        c.classList.toggle('sel', c.textContent === S.incomeType);
      });
      setIncOwner(inc.owner || 'mine');
      if (inc.person) document.getElementById('incPerson').value = inc.person;
      _incRebuildTagChips(inc.tags || []);
      if (delBtn) delBtn.style.display = 'inline-flex';
    }
  }
  openModal('mIncome');
}

function pickIncType(el) {
  document.querySelectorAll('#incTypeChips .chip').forEach(c => c.classList.remove('sel'));
  el.classList.add('sel');
  S.incomeType = el.textContent;
}

function setIncOwner(o) {
  S.incomeOwner = o;
  document.getElementById('incMine').classList.toggle('active', o === 'mine');
  document.getElementById('incOther').classList.toggle('active', o === 'other');
  document.getElementById('incPersonGroup').style.display = o === 'other' ? 'block' : 'none';
}

async function saveIncome() {
  const desc = document.getElementById('incDesc').value.trim();
  const amt = parseFloat(document.getElementById('incAmt').value);
  const date = document.getElementById('incDate').value;
  const from = document.getElementById('incFrom').value.trim();
  const obs = document.getElementById('incObs').value.trim() || null;
  const tags = _incGetSelectedTags();
  const person = S.incomeOwner === 'other' ? document.getElementById('incPerson').value.trim() : null;
  const editId = document.getElementById('editIncomeId').value;

  if (!desc || isNaN(amt) || amt <= 0) { alert('Preencha descrição e valor.'); return; }
  if (!S.incomes[S.currentMonth]) S.incomes[S.currentMonth] = [];
  if (editId) {
    S.incomes[S.currentMonth] = S.incomes[S.currentMonth].filter(i => String(i.id) !== String(editId));
  }
  const inc = {
    id: editId ? String(editId) : String(Date.now()),
    desc, amount: amt, date, from, obs,
    tags: tags.length ? tags : null,
    owner: S.incomeOwner, person,
    incType: S.incomeType
  };
  S.incomes[S.currentMonth].push(inc);
  setSyncing(true);
  await dbSaveIncome(S.currentMonth, inc);
  setSyncing(false);
  renderDash();
  closeModal('mIncome');
  showToast('✓ Entrada salva');
}

async function deleteIncomeCurrent() {
  const editId = document.getElementById('editIncomeId').value;
  if (!editId) return;
  if (!confirm('Excluir entrada?')) return;
  closeModal('mIncome');
  S.incomes[S.currentMonth] = S.incomes[S.currentMonth].filter(i => String(i.id) !== String(editId));
  setSyncing(true);
  await dbDeleteIncome(editId);
  setSyncing(false);
  renderDash();
  showToast('Entrada excluída');
}

async function deleteIncome(id) {
  if (!confirm('Excluir entrada?')) return;
  S.incomes[S.currentMonth] = S.incomes[S.currentMonth].filter(i => String(i.id) !== String(id));
  setSyncing(true);
  await dbDeleteIncome(id);
  setSyncing(false);
  renderDash();
  showToast('Entrada excluída');
}

// ── Meta de Gastos ──
async function saveGoal() {
  const m = getMonth();
  if (!m) return;
  const g = parseFloat(document.getElementById('goalAmt').value) || null;
  m.goal = g;
  setSyncing(true);
  await dbSaveMonth(m);
  setSyncing(false);
  renderDash();
  renderMonthList();
  closeModal('mGoal');
  showToast('✓ Meta salva');
}