// ══════════════════════════════════════════════════
// RECURRENTS.JS — Contas Fixas
// ══════════════════════════════════════════════════

function openRecM(editId = null) {
  document.getElementById('editRecId').value = '';
  clr('rDesc', 'rAmt', 'rDay', 'rObs');
  if (editId) {
    const r = (S.recurrents[S.currentMonth] || []).find(x => String(x.id) === String(editId));
    if (r) {
      document.getElementById('editRecId').value = editId;
      document.getElementById('rDesc').value = r.desc;
      document.getElementById('rAmt').value = r.amount;
      document.getElementById('rDay').value = r.day || '';
      document.getElementById('rObs').value = r.obs || '';
    }
  }
  openModal('mRec');
}

async function saveRec() {
  const desc = document.getElementById('rDesc').value.trim();
  const amt = parseFloat(document.getElementById('rAmt').value);
  const day = document.getElementById('rDay').value;
  const obs = document.getElementById('rObs').value.trim();
  const editId = document.getElementById('editRecId').value;

  if (!desc || isNaN(amt) || amt <= 0) { alert('Preencha descrição e valor.'); return; }
  if (!S.recurrents[S.currentMonth]) S.recurrents[S.currentMonth] = [];
  if (editId) {
    S.recurrents[S.currentMonth] = S.recurrents[S.currentMonth].filter(r => String(r.id) !== String(editId));
    await dbDeleteRecurrent(editId);
  }
  const r = { id: editId || Date.now(), desc, amount: amt, day, obs };
  S.recurrents[S.currentMonth].push(r);
  setSyncing(true);
  await dbSaveRecurrent(S.currentMonth, r);
  setSyncing(false);
  renderDash();
  closeModal('mRec');
  showToast('✓ Conta fixa salva');
}

async function deleteRec(id) {
  if (!confirm('Excluir conta fixa?')) return;
  S.recurrents[S.currentMonth] = S.recurrents[S.currentMonth].filter(r => String(r.id) !== String(id));
  setSyncing(true);
  await dbDeleteRecurrent(id);
  setSyncing(false);
  renderDash();
  showToast('Conta fixa excluída');
}