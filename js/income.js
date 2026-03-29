// ══════════════════════════════════════════════════
// INCOME.JS — Entradas / Receitas
// ══════════════════════════════════════════════════

function openIncomeM(editId = null) {
  document.getElementById('editIncomeId').value = '';
  clr('incDesc', 'incAmt', 'incFrom', 'incPerson');
  document.getElementById('incDate').value = today();
  const titleEl = document.getElementById('incomeTitle');
  if (titleEl) titleEl.firstChild.textContent = editId ? 'Editar Entrada ' : 'Nova Entrada ';
  document.querySelectorAll('#incTypeChips .chip').forEach((c, i) => c.classList.toggle('sel', i === 0));
  S.incomeType = 'Salário';
  setIncOwner('mine');

  if (editId) {
    const inc = (S.incomes[S.currentMonth] || []).find(x => String(x.id) === String(editId));
    if (inc) {
      document.getElementById('editIncomeId').value = editId;
      if (titleEl) titleEl.firstChild.textContent = 'Editar Entrada ';
      document.getElementById('incDesc').value = inc.desc;
      document.getElementById('incAmt').value = inc.amount;
      document.getElementById('incDate').value = inc.date || today();
      document.getElementById('incFrom').value = inc.from || '';
      S.incomeType = inc.incType || 'Salário';
      document.querySelectorAll('#incTypeChips .chip').forEach(c => {
        c.classList.toggle('sel', c.textContent === S.incomeType);
      });
      setIncOwner(inc.owner || 'mine');
      if (inc.person) document.getElementById('incPerson').value = inc.person;
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
  const person = S.incomeOwner === 'other' ? document.getElementById('incPerson').value.trim() : null;
  const editId = document.getElementById('editIncomeId').value;

  if (!desc || isNaN(amt) || amt <= 0) { alert('Preencha descrição e valor.'); return; }
  if (!S.incomes[S.currentMonth]) S.incomes[S.currentMonth] = [];
  if (editId) {
    S.incomes[S.currentMonth] = S.incomes[S.currentMonth].filter(i => String(i.id) !== String(editId));
    await dbDeleteIncome(editId);
  }
  const inc = {
    id: editId || Date.now(),
    desc, amount: amt, date, from,
    owner: S.incomeOwner, person,
    incType: S.incomeType
  };
  S.incomes[S.currentMonth].push(inc);
  setSyncing(true);
  await dbSaveIncome(S.currentMonth, inc);
  setSyncing(false);
  renderDash();
  closeModal('mIncome');
}

async function deleteIncome(id) {
  if (!confirm('Excluir entrada?')) return;
  S.incomes[S.currentMonth] = S.incomes[S.currentMonth].filter(i => String(i.id) !== String(id));
  setSyncing(true);
  await dbDeleteIncome(id);
  setSyncing(false);
  renderDash();
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
}