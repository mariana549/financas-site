// ══════════════════════════════════════════════════
// MAIN.JS — Inicialização do App
// ══════════════════════════════════════════════════

// ── Injetar modais no body ──
injectModals();

// ── Aplicar tema salvo ──
applyTheme();

// ── Aplicar modo privacidade salvo ──
applyPrivacy(localStorage.getItem('fin_privacy') === 'on');

// ── Restaurar estado da sidebar desktop ──
if (localStorage.getItem('fin_sb_hidden') === '1') document.body.classList.add('sb-desktop-hidden');

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

// ── Detecta atualização do SW e recarrega automaticamente ──
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  });
}