// ══════════════════════════════════════════════════
// BANKS.JS — CRUD de Bancos + Color Picker
// ══════════════════════════════════════════════════

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

function pickColor(el) {
  document.querySelectorAll('#colorGrid .color-dot').forEach(c => c.classList.remove('sel'));
  el.classList.add('sel');
  S.pickedColor = el.dataset.c;
}

async function addBank() {
  const name = document.getElementById('bName').value.trim();
  if (!name) return;
  const m = getMonth();
  if (m.banks.find(b => b.name === name)) { alert('Banco já existe.'); return; }
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