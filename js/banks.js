// ══════════════════════════════════════════════════
// BANKS.JS — CRUD de Bancos
// ══════════════════════════════════════════════════

function pickColor(el) {
  document.querySelectorAll('#colorGrid .color-dot').forEach(c => c.classList.remove('sel'));
  el.classList.add('sel');
  S.pickedColor = el.dataset.c;
}

function buildColorGrid() {
  const g = document.getElementById('colorGrid');
  if (!g) return;
  g.innerHTML = Object.entries(PALETTE).map(([k, v]) => `
    <div class="color-dot ${S.pickedColor === k ? 'sel' : ''}"
      style="background:${v}"
      data-c="${k}"
      onclick="pickColor(this)"
      title="${k}">
    </div>`).join('');
}

async function addBank() {
  const name = document.getElementById('bName').value.trim();
  if (!name) return;
  const m = getMonth();
  if (m.banks.find(b => b.name === name)) { alert('Já existe.'); return; }
  const bank = { name, color: S.pickedColor, entries: [] };
  m.banks.push(bank);
  setSyncing(true);
  await dbSaveBank(m.key, bank);
  setSyncing(false);
  S.currentBank = name;
  renderDash();
  buildActions();
  closeModal('mBank');
  document.getElementById('bName').value = '';
}

function selectBank(n) {
  S.currentBank = n;
  save();
  renderDash();
}

async function deleteBank(name) {
  if (!confirm(`Excluir o banco "${name}" e todos os seus lançamentos?`)) return;

  const m = getMonth();
  if (!m) return;

  const bank = m.banks.find(b => b.name === name);
  if (!bank) return;

  setSyncing(true);

  // Deleta todas as entradas do banco no Supabase
  for (const e of bank.entries) {
    await dbDeleteEntry(e.id);
  }

  // Deleta o banco no Supabase
  await sb.from('banks')
    .delete()
    .eq('user_id', currentUser.id)
    .eq('month_key', m.key)
    .eq('name', name);

  // Atualiza estado local
  m.banks = m.banks.filter(b => b.name !== name);

  // Reseta currentBank se era o banco deletado
  if (S.currentBank === name) {
    S.currentBank = m.banks.length ? m.banks[0].name : null;
  }

  setSyncing(false);
  renderDash();
  buildActions();
}