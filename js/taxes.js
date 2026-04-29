// ══════════════════════════════════════════════════
// TAXES.JS — Impostos PJ
// ══════════════════════════════════════════════════

const TAX_TYPES = ['DAS', 'IRPF', 'INSS', 'ISS', 'Outro'];

function renderTaxesView() {
  const el = document.getElementById('view-taxes');
  if (!el) return;

  if (!S.activeContext || S.activeContext.type === 'personal') {
    el.innerHTML = `<div style="padding:40px;text-align:center;color:var(--text3)">
      <div style="font-size:32px;margin-bottom:12px">🧾</div>
      <div style="font-size:14px">Esta seção é exclusiva do contexto PJ.</div>
    </div>`;
    return;
  }

  const taxes = S.pjTaxes || [];
  const pending = taxes.filter(t => !t.paid);
  const paid    = taxes.filter(t => t.paid);
  const totalPending = pending.reduce((a, t) => a + t.amount, 0);
  const totalPaid    = paid.reduce((a, t) => a + t.amount, 0);
  const taxRate      = S.activeContext.taxRate || null;

  // Faturamento bruto do contexto atual (soma de incomes)
  const grossRevenue = Object.values(S.incomes || {}).flat().reduce((a, i) => a + i.amount, 0);
  const estimatedTax = taxRate ? grossRevenue * (taxRate / 100) : null;

  el.innerHTML = `
  <div style="max-width:680px;margin:0 auto;padding:20px 20px 60px">

    <!-- Resumo -->
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:20px">
      <div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:14px;text-align:center">
        <div style="font-size:11px;color:var(--text3);font-family:var(--mono);margin-bottom:4px">a pagar</div>
        <div style="font-size:16px;font-weight:700;color:var(--red);font-family:var(--mono)">${fmt(totalPending)}</div>
      </div>
      <div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:14px;text-align:center">
        <div style="font-size:11px;color:var(--text3);font-family:var(--mono);margin-bottom:4px">pago no período</div>
        <div style="font-size:16px;font-weight:700;color:var(--green);font-family:var(--mono)">${fmt(totalPaid)}</div>
      </div>
      <div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:14px;text-align:center">
        <div style="font-size:11px;color:var(--text3);font-family:var(--mono);margin-bottom:4px">estimativa</div>
        <div style="font-size:16px;font-weight:700;color:var(--accent);font-family:var(--mono)">${estimatedTax !== null ? fmt(estimatedTax) : '—'}</div>
      </div>
    </div>

    <!-- Alíquota -->
    <div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:14px 16px;margin-bottom:16px;display:flex;align-items:center;gap:12px">
      <div style="flex:1">
        <div style="font-size:12px;font-weight:600;color:var(--text)">Alíquota estimada</div>
        <div style="font-size:11px;color:var(--text3)">Usada para estimar imposto sobre o faturamento bruto</div>
      </div>
      <div style="display:flex;align-items:center;gap:6px">
        <input type="number" id="taxRateInput" min="0" max="100" step="0.1"
          value="${taxRate || ''}" placeholder="0.0"
          style="width:70px;padding:6px 8px;background:var(--bg3);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:13px;text-align:right;font-family:var(--mono);outline:none">
        <span style="font-size:13px;color:var(--text3)">%</span>
        <button class="btn btn-ghost btn-sm" onclick="_taxSaveRate()" style="padding:5px 10px">Salvar</button>
      </div>
    </div>

    <!-- Ações -->
    <div style="display:flex;justify-content:flex-end;margin-bottom:16px">
      <button class="btn btn-primary btn-sm" onclick="openModal('mTax')">+ Lançar imposto</button>
    </div>

    <!-- Lista pendentes -->
    ${pending.length > 0 ? `
    <div style="font-size:11px;font-weight:600;color:var(--text3);font-family:var(--mono);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Pendentes</div>
    <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:16px">
      ${pending.map(t => _taxRowHtml(t)).join('')}
    </div>` : ''}

    <!-- Lista pagos -->
    ${paid.length > 0 ? `
    <div style="font-size:11px;font-weight:600;color:var(--text3);font-family:var(--mono);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Pagos</div>
    <div style="display:flex;flex-direction:column;gap:6px">
      ${paid.map(t => _taxRowHtml(t)).join('')}
    </div>` : ''}

    ${taxes.length === 0 ? `
    <div style="text-align:center;padding:48px 20px;color:var(--text3)">
      <div style="font-size:36px;margin-bottom:12px">🧾</div>
      <div style="font-size:14px;font-weight:600;color:var(--text);margin-bottom:6px">Nenhum imposto lançado</div>
      <div style="font-size:12px">Registre DAS, IRPF, INSS e outros impostos para acompanhar o que está pendente.</div>
    </div>` : ''}
  </div>`;
}

function _taxRowHtml(t) {
  const overdue = !t.paid && t.dueDate && t.dueDate < today();
  return `
  <div style="background:var(--bg2);border:1px solid ${overdue ? 'rgba(255,100,100,.35)' : 'var(--border)'};border-radius:10px;padding:12px 14px;display:flex;align-items:center;gap:12px">
    <div style="flex:1;min-width:0">
      <div style="display:flex;align-items:center;gap:8px">
        <span style="font-size:12px;font-weight:700;color:var(--text);font-family:var(--mono)">${t.type}</span>
        ${t.refMonth ? `<span style="font-size:10px;color:var(--text3);font-family:var(--mono)">${t.refMonth}</span>` : ''}
        ${overdue ? `<span style="font-size:10px;color:var(--red);font-family:var(--mono)">vencido</span>` : ''}
      </div>
      <div style="font-size:11px;color:var(--text3);margin-top:2px">
        ${t.dueDate ? `Vence ${new Date(t.dueDate + 'T12:00:00').toLocaleDateString('pt-BR')}` : 'Sem data'}
        ${t.notes ? ` · ${t.notes}` : ''}
      </div>
    </div>
    <div style="font-size:13px;font-weight:700;font-family:var(--mono);color:${t.paid ? 'var(--green)' : 'var(--red)'}">${fmt(t.amount)}</div>
    <button onclick="_taxTogglePaid('${t.id}',${!t.paid})"
      style="padding:4px 10px;border-radius:6px;border:1px solid var(--border);background:${t.paid ? 'rgba(81,207,102,.15)' : 'var(--bg3)'};color:${t.paid ? 'var(--green)' : 'var(--text3)'};font-size:11px;cursor:pointer;font-family:var(--mono)">
      ${t.paid ? '✓ pago' : 'marcar pago'}
    </button>
    <button onclick="_taxEdit('${t.id}')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:14px;padding:0 4px" title="Editar">✎</button>
    <button onclick="_taxDelete('${t.id}')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:14px;padding:0 4px" title="Excluir">✕</button>
  </div>`;
}

async function _taxTogglePaid(id, paid) {
  const ok = await dbMarkTaxPaid(id, paid);
  if (!ok) { showToast('Erro ao atualizar.', 'error'); return; }
  const t = (S.pjTaxes || []).find(x => x.id === id);
  if (t) { t.paid = paid; t.paidAt = paid ? new Date().toISOString() : null; }
  showToast(paid ? 'Imposto marcado como pago' : 'Imposto marcado como pendente');
  renderTaxesView();
}

function _taxEdit(id) {
  const t = (S.pjTaxes || []).find(x => x.id === id);
  if (!t) return;
  document.getElementById('taxId').value      = t.id;
  document.getElementById('taxType').value    = t.type;
  document.getElementById('taxAmount').value  = t.amount;
  document.getElementById('taxDueDate').value = t.dueDate || '';
  document.getElementById('taxRefMonth').value = t.refMonth || '';
  document.getElementById('taxNotes').value   = t.notes;
  document.getElementById('mTaxTitle').textContent = 'Editar imposto';
  openModal('mTax');
}

async function _taxSave() {
  const id     = document.getElementById('taxId').value;
  const type   = document.getElementById('taxType').value;
  const amount = parseFloat(document.getElementById('taxAmount').value);
  if (!type || isNaN(amount) || amount <= 0) {
    showToast('Preencha tipo e valor.', 'error'); return;
  }
  const btn = document.getElementById('taxSaveBtn');
  btn.textContent = '...'; btn.disabled = true;

  const tax = {
    id: id || null, type, amount,
    dueDate:  document.getElementById('taxDueDate').value || null,
    refMonth: document.getElementById('taxRefMonth').value || null,
    notes:    document.getElementById('taxNotes').value.trim(),
    paid: false
  };

  const saved = await dbSaveTax(tax);
  btn.textContent = 'Salvar'; btn.disabled = false;
  if (!saved) { showToast('Erro ao salvar.', 'error'); return; }

  if (!S.pjTaxes) S.pjTaxes = [];
  const idx = S.pjTaxes.findIndex(x => x.id === saved.id);
  if (idx >= 0) S.pjTaxes[idx] = saved;
  else S.pjTaxes.push(saved);

  closeModal('mTax');
  showToast(id ? 'Imposto atualizado' : 'Imposto lançado');
  renderTaxesView();
}

async function _taxDelete(id) {
  if (!confirm('Excluir este lançamento de imposto?')) return;
  await dbDeleteTax(id);
  S.pjTaxes = (S.pjTaxes || []).filter(x => x.id !== id);
  showToast('Imposto removido');
  renderTaxesView();
}

async function _taxSaveRate() {
  const val = parseFloat(document.getElementById('taxRateInput')?.value);
  if (isNaN(val) || val < 0 || val > 100) { showToast('Alíquota inválida (0–100).', 'error'); return; }
  const ok = await dbSaveTaxRate(S.activeContext.id, val);
  if (ok) {
    S.activeContext.taxRate = val;
    showToast(`Alíquota salva: ${val}%`);
    renderTaxesView();
  } else {
    showToast('Erro ao salvar alíquota.', 'error');
  }
}

function _taxModalOpen() {
  document.getElementById('taxId').value       = '';
  document.getElementById('taxType').value     = 'DAS';
  document.getElementById('taxAmount').value   = '';
  document.getElementById('taxDueDate').value  = '';
  document.getElementById('taxRefMonth').value = '';
  document.getElementById('taxNotes').value    = '';
  document.getElementById('mTaxTitle').textContent = 'Lançar imposto';
}
