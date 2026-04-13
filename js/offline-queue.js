// ══════════════════════════════════════════════════
// OFFLINE-QUEUE.JS — Fila de operações offline
// ══════════════════════════════════════════════════

const QUEUE_KEY = 'fin_offline_queue';

function isOnline() { return navigator.onLine; }

function queueGet() {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); }
  catch { return []; }
}

function queueSave(q) { localStorage.setItem(QUEUE_KEY, JSON.stringify(q)); }

function queueAdd(op) {
  const q = queueGet();
  q.push({ ...op, _queuedAt: Date.now() });
  queueSave(q);
  setOfflineIndicator('offline', q.length);
}

function queueRemove(index) {
  const q = queueGet();
  q.splice(index, 1);
  queueSave(q);
}

// ── Indicador visual no topo ──
function setOfflineIndicator(status, pending) {
  const dot = document.getElementById('syncDot');
  const lbl = document.getElementById('syncLabel');
  if (!dot || !lbl) return;
  dot.className = 'sync-dot';
  if (status === 'online') {
    lbl.textContent = 'ok';
  } else if (status === 'saving') {
    dot.classList.add('syncing');
    lbl.textContent = 'sync...';
  } else if (status === 'offline') {
    dot.classList.add('offline');
    lbl.textContent = pending ? `${pending} pend.` : 'offline';
  } else if (status === 'uploading') {
    dot.classList.add('uploading');
    lbl.textContent = 'enviando...';
  }
}

// ── Processar fila ao reconectar ──
async function syncQueue() {
  const q = queueGet();
  if (!q.length) { setOfflineIndicator('online'); return; }

  const bar   = document.getElementById('syncProgressBar');
  const count = document.getElementById('syncProgressCount');
  const total = q.length;
  if (bar) bar.style.width = '0%';
  if (count) count.textContent = `0 de ${total} enviados`;
  openModal('mSyncing');

  const errors = [];

  for (let i = q.length - 1; i >= 0; i--) {
    try {
      await executeQueuedOp(q[i]);
      queueRemove(i);
    } catch (e) {
      errors.push(e.message);
    }
    const done = total - queueGet().length;
    if (bar)   bar.style.width = Math.round((done / total) * 100) + '%';
    if (count) count.textContent = `${done} de ${total} enviados`;
  }

  closeModal('mSyncing');

  if (errors.length) {
    const errEl = document.getElementById('syncErrorDetail');
    if (errEl) errEl.textContent = `${errors.length} operação(ões) falharam.`;
    openModal('mSyncError');
  } else {
    setOfflineIndicator('online');
  }
}

async function executeQueuedOp(op) {
  if (!currentUser) throw new Error('Sem usuário logado');
  switch (op.type) {
    case 'saveMonth':       return dbSaveMonth(op.data);
    case 'saveBank':        return dbSaveBank(op.monthKey, op.data);
    case 'saveEntry':       return dbSaveEntry(op.monthKey, op.bankName, op.data);
    case 'deleteEntry':     return dbDeleteEntry(op.id);
    case 'savePix':         return dbSavePix(op.monthKey, op.data);
    case 'deletePix':       return dbDeletePix(op.id);
    case 'saveRecurrent':   return dbSaveRecurrent(op.monthKey, op.data);
    case 'deleteRecurrent': return dbDeleteRecurrent(op.id);
    case 'saveIncome':      return dbSaveIncome(op.monthKey, op.data);
    case 'deleteIncome':    return dbDeleteIncome(op.id);
    case 'saveSub':         return dbSaveSub(op.data);
    case 'deleteSub':       return dbDeleteSub(op.id);
    case 'saveInstallment': return dbSaveInstallment(op.data);
    default: console.warn('[Queue] Operação desconhecida:', op.type);
  }
}

// ── Listeners de conectividade ──
window.addEventListener('offline', () => {
  setOfflineIndicator('offline', queueGet().length);
  openModal('mOffline');
});

window.addEventListener('online', async () => {
  closeModal('mOffline');
  if (queueGet().length > 0) {
    await syncQueue();
  } else {
    setOfflineIndicator('online');
  }
});

function initOfflineIndicator() {
  if (!isOnline()) {
    setOfflineIndicator('offline', queueGet().length);
  }
}
