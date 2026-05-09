// ══════════════════════════════════════════════════
// BOLETO.JS — CRUD de Boletos
// Boletos são armazenados em transacoes com type='boleto'
// ══════════════════════════════════════════════════

function _updateBlPaidBtn(isPaid) {
  const btn = document.getElementById('blPaidBtn');
  if (!btn) return;
  btn.textContent = isPaid ? '✓ Pago — clique para desmarcar' : 'Marcar como pago';
  btn.className = isPaid ? 'btn btn-green btn-sm' : 'btn btn-ghost btn-sm';
}

function toggleBlPaid() {
  const cur = document.getElementById('blPaid').value === '1';
  const next = !cur;
  document.getElementById('blPaid').value = next ? '1' : '0';
  _updateBlPaidBtn(next);
}

function openBoletoM(editId = null, editBank = null) {
  const m = getMonth();
  if (!m) { alert('Selecione um mês.'); return; }
  fillSel('blBank', m.banks.map(b => b.name));
  document.getElementById('editBoletoId').value = '';
  document.getElementById('editBoletoBank').value = '';
  document.getElementById('blPaid').value = '0';
  clr('blDesc', 'blAmt', 'blObs');
  const { min: blMin, max: blMax } = getMonthDateRange(m);
  const blT = today();
  document.getElementById('blDate').value = (blT >= blMin && blT <= blMax) ? blT : blMin;

  const delBtn = document.getElementById('boletoDeleteBtn');
  const statusRow = document.getElementById('boletoStatusRow');
  if (delBtn) delBtn.style.display = 'none';
  if (statusRow) statusRow.style.display = 'none';
  _updateBlPaidBtn(false);

  if (editId) {
    const bankName = editBank || m.banks.find(b => b.entries.some(e => String(e.id) === String(editId)))?.name;
    const bk = m.banks.find(b => b.name === bankName);
    const bl = bk?.entries.find(e => String(e.id) === String(editId));
    if (bl) {
      document.getElementById('editBoletoId').value = editId;
      document.getElementById('editBoletoBank').value = bankName;
      document.getElementById('blDesc').value = bl.desc;
      document.getElementById('blAmt').value = bl.amount;
      document.getElementById('blDate').value = bl.date || today();
      document.getElementById('blBank').value = bankName;
      document.getElementById('blObs').value = bl.note || '';
      document.getElementById('blPaid').value = bl.paid ? '1' : '0';
      if (delBtn) delBtn.style.display = '';
      if (statusRow) statusRow.style.display = '';
      _updateBlPaidBtn(bl.paid || false);
    }
  }
  openModal('mBoleto');
}

async function saveBoleto() {
  const desc = document.getElementById('blDesc').value.trim();
  const amt = parseFloat(document.getElementById('blAmt').value);
  const date = document.getElementById('blDate').value;
  const bankName = document.getElementById('blBank').value;
  const obs = document.getElementById('blObs').value.trim();
  const editId = document.getElementById('editBoletoId').value;
  const editBank = document.getElementById('editBoletoBank').value;

  if (!desc || isNaN(amt) || amt <= 0) { alert('Preencha descrição e valor.'); return; }

  const m = getMonth();
  if (!m) return;

  // Se editando e trocou de banco, remove do banco antigo
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

  const paid = document.getElementById('blPaid').value === '1';
  const entry = {
    id: editId || String(Date.now()),
    desc, amount: amt, date, owner: 'mine', person: null,
    category: null, note: obs || null, type: 'boleto',
    paid, paid_at: paid ? today() : null
  };
  bk.entries.push(entry);
  setSyncing(true);
  await dbSaveEntry(S.currentMonth, bankName, entry);
  setSyncing(false);
  renderDash();
  closeModal('mBoleto');
  showToast('✓ Boleto salvo');
}

async function deleteBoleto(id) {
  if (!confirm('Excluir Boleto?')) return;
  const m = getMonth();
  if (!m) return;
  for (const bk of m.banks) {
    bk.entries = bk.entries.filter(e => String(e.id) !== String(id));
  }
  setSyncing(true);
  await dbDeleteEntry(id);
  setSyncing(false);
  renderDash();
  showToast('Boleto excluído');
}

async function deleteBoletoCurrent() {
  const id = document.getElementById('editBoletoId').value;
  if (!id) return;
  closeModal('mBoleto');
  await deleteBoleto(id);
}

async function toggleBoletoPaid(id, bankName, monthKey) {
  const key = monthKey || S.currentMonth;
  const m = S.months.find(x => x.key === key);
  if (!m) return;
  const bk = m.banks.find(b => b.name === bankName);
  if (!bk) return;
  const entry = bk.entries.find(e => String(e.id) === String(id));
  if (!entry) return;
  entry.paid = !entry.paid;
  entry.paid_at = entry.paid ? today() : null;
  setSyncing(true);
  await dbSaveEntry(key, bankName, entry);
  setSyncing(false);
  if (S.currentView === 'agenda') renderAgenda();
  else renderDash();
  showToast(entry.paid ? '✓ Boleto marcado como pago' : 'Boleto pendente');
}
