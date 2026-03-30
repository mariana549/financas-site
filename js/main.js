// ══════════════════════════════════════════════════
// MAIN.JS — Inicialização do App
// ══════════════════════════════════════════════════

// ── Aplicar tema salvo ──
applyTheme();

// ── Inicializar color grid ──
buildColorGrid();

// ── Registrar Service Worker ──
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('SW registrado:', reg.scope))
      .catch(err => console.log('SW falhou:', err));
  });
}