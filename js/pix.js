// ══════════════════════════════════════════════════
// PIX.JS — CRUD de Pix Enviados
// ══════════════════════════════════════════════════

function openPixM(editId = null) {
  const m = getMonth();
  if (!m) { alert('Selecione um mês.'); return; }
  fillSel('pxBank', m.banks.map(b => b.name));
  document.getElementById('editPixId').value = '';
  clr('pxTo', 'pxAmt', 'pxObs');
  document.getElementById('pxDate').value = today();

  if (editId) {
    const px = (S.pixEntries[S.currentMonth] || []).find(p => String(p.id) === String(editId));
    if (px) {
      document.getElementById('editPixId').value = editId;
      document.getElementById('pxTo').value = px.to;
      document.getElementById('pxAmt').value = px.amount;
      document.getElementById('pxDate').value = px.date || today();
      document.getElementById('pxBank').value = px.bank;
      document.getElementById('pxObs').value = px.obs || '';
    }
  }
  openModal('mPix');
}

async function savePix() {
  const to = document.getElementById('pxTo').value.trim();
  const amt = parseFloat(document.getElementById('pxAmt').value);
  const date = document.getElementById('pxDate').value;
  const bank = document.getElementById('pxBank').value;
  const obs = document.getElementById('pxObs').value.trim();
  const editId = document.getElementById('editPixId').value;

  if (!to || isNaN(amt) || amt <= 0) { alert('Preencha destinatário e valor.'); return; }
  if (!S.pixEntries[S.currentMonth]) S.pixEntries[S.currentMonth] = [];
  if (editId) {
    S.pixEntries[S.currentMonth] = S.pixEntries[S.currentMonth].filter(p => String(p.id) !== String(editId));
    await dbDeletePix(editId);
  }
  const px = { id: editId || Date.now(), to, amount: amt, date, bank, obs };
  S.pixEntries[S.currentMonth].push(px);
  setSyncing(true);
  await dbSavePix(S.currentMonth, px);
  setSyncing(false);
  renderDash();
  closeModal('mPix');
  showToast('✓ Pix salvo');
}

async function deletePix(id) {
  if (!confirm('Excluir Pix?')) return;
  S.pixEntries[S.currentMonth] = S.pixEntries[S.currentMonth].filter(p => String(p.id) !== String(id));
  setSyncing(true);
  await dbDeletePix(id);
  setSyncing(false);
  renderDash();
  showToast('Pix excluído');
}