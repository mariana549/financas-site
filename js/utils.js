// ══════════════════════════════════════════════════
// UTILS — Funções utilitárias globais
// ══════════════════════════════════════════════════

function fmt(n) {
  return (n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d) {
  if (!d) return '—';
  try { const [y, mo, day] = d.split('-'); return `${day}/${mo}`; }
  catch { return d; }
}

function fmtDateLong(d) {
  if (!d) return '—';
  try {
    const [y, mo, day] = d.split('-');
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${day} ${months[parseInt(mo) - 1]} ${y}`;
  } catch { return d; }
}

function today() {
  return new Date().toISOString().split('T')[0];
}

function fillSel(id, opts) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = opts.map(o => `<option value="${o}">${o}</option>`).join('');
}

function clr(...ids) {
  ids.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
}

function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('open');
  if (id === 'mBank') buildColorGrid();
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
}

function getAllPeople() {
  const s = new Set();
  S.months.forEach(m => m.banks.forEach(b => b.entries.forEach(e => {
    if (e.person) s.add(e.person);
  })));
  return [...s];
}

// ── Fechar modal ao clicar fora ──
document.querySelectorAll('.modal-overlay').forEach(m => {
  m.addEventListener('click', e => { if (e.target === m) m.classList.remove('open'); });
});