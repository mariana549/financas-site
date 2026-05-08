// ══════════════════════════════════════════════════
// DINHEIRO.JS — CRUD de Transações em Dinheiro
// Armazenadas em transacoes com type='cash'
// ══════════════════════════════════════════════════

function openDinheiroM(editId = null, editBank = null) {
  const m = getMonth();
  if (!m) { alert('Selecione um mês.'); return; }
  fillSel('dnBank', m.banks.map(b => b.name));
  document.getElementById('editDinheiroId').value = '';
  document.getElementById('editDinheiroBank').value = '';
  clr('dnDesc', 'dnAmt', 'dnObs');
  const { min: dnMin, max: dnMax } = getMonthDateRange(m);
  const dnT = today();
  document.getElementById('dnDate').value = (dnT >= dnMin && dnT <= dnMax) ? dnT : dnMin;

  const delBtn = document.getElementById('dinheiroDeleteBtn');
  if (delBtn) delBtn.style.display = 'none';

  if (editId) {
    const bankName = editBank || m.banks.find(b => b.entries.some(e => String(e.id) === String(editId)))?.name;
    const bk = m.banks.find(b => b.name === bankName);
    const dn = bk?.entries.find(e => String(e.id) === String(editId));
    if (dn) {
      document.getElementById('editDinheiroId').value = editId;
      document.getElementById('editDinheiroBank').value = bankName;
      document.getElementById('dnDesc').value = dn.desc;
      document.getElementById('dnAmt').value = dn.amount;
      document.getElementById('dnDate').value = dn.date || today();
      document.getElementById('dnBank').value = bankName;
      document.getElementById('dnObs').value = dn.note || '';
      if (delBtn) delBtn.style.display = '';
    }
  }
  openModal('mDinheiro');
}

async function saveDinheiro() {
  const desc = document.getElementById('dnDesc').value.trim();
  const amt = parseFloat(document.getElementById('dnAmt').value);
  const date = document.getElementById('dnDate').value;
  const bankName = document.getElementById('dnBank').value;
  const obs = document.getElementById('dnObs').value.trim();
  const editId = document.getElementById('editDinheiroId').value;
  const editBank = document.getElementById('editDinheiroBank').value;

  if (!desc || isNaN(amt) || amt <= 0) { alert('Preencha descrição e valor.'); return; }

  const m = getMonth();
  if (!m) return;

  if (editId) {
    const oldBankName = editBank || bankName;
    const oldBk = m.banks.find(b => b.name === oldBankName);
    if (oldBk) oldBk.entries = oldBk.entries.filter(e => String(e.id) !== String(editId));
    await dbDeleteEntry(editId);
  }

  let bk = m.banks.find(b => b.name === bankName);
  if (!bk) {
    const newBank = { name: bankName, color: 'azure', entries: [] };
    m.banks.push(newBank);
    await dbSaveBank(S.currentMonth, newBank);
    bk = m.banks[m.banks.length - 1];
  }

  const entry = {
    id: editId || String(Date.now()),
    desc, amount: amt, date, owner: 'mine', person: null,
    category: null, note: obs || null, type: 'cash'
  };
  bk.entries.push(entry);
  setSyncing(true);
  await dbSaveEntry(S.currentMonth, bankName, entry);
  setSyncing(false);
  renderDash();
  closeModal('mDinheiro');
  showToast('✓ Dinheiro salvo');
}

async function deleteDinheiro(id) {
  if (!confirm('Excluir lançamento em dinheiro?')) return;
  const m = getMonth();
  if (!m) return;
  for (const bk of m.banks) {
    bk.entries = bk.entries.filter(e => String(e.id) !== String(id));
  }
  setSyncing(true);
  await dbDeleteEntry(id);
  setSyncing(false);
  renderDash();
  showToast('Lançamento excluído');
}

async function deleteDinheiroCurrent() {
  const id = document.getElementById('editDinheiroId').value;
  if (!id) return;
  closeModal('mDinheiro');
  await deleteDinheiro(id);
}
