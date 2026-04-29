// ══════════════════════════════════════════════════
// CLIENTS.JS — View de Clientes PJ
// ══════════════════════════════════════════════════

function renderClientsView() {
  const el = document.getElementById('view-clients');
  if (!el) return;

  // Só exibe se estiver em contexto PJ
  if (!S.activeContext || S.activeContext.type === 'personal') {
    el.innerHTML = `<div style="padding:40px;text-align:center;color:var(--text3)">
      <div style="font-size:32px;margin-bottom:12px">🏢</div>
      <div style="font-size:14px">Esta seção é exclusiva do contexto PJ.</div>
      <div style="font-size:12px;margin-top:8px">Ative o Modo PJ nas configurações do perfil e mude para o contexto PJ.</div>
    </div>`;
    return;
  }

  const clients = S.pjClients || [];

  // Calcula faturamento por cliente a partir das receitas
  const revenueByClient = {};
  Object.values(S.incomes || {}).forEach(arr => arr.forEach(inc => {
    if (inc.clientId) {
      revenueByClient[inc.clientId] = (revenueByClient[inc.clientId] || 0) + inc.amount;
    }
  }));

  el.innerHTML = `
  <div style="max-width:680px;margin:0 auto;padding:20px 20px 60px">
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">
      <div style="flex:1">
        <div style="font-size:13px;color:var(--text3);font-family:var(--mono)">${clients.length} cliente${clients.length !== 1 ? 's' : ''} cadastrado${clients.length !== 1 ? 's' : ''}</div>
      </div>
      <button class="btn btn-primary btn-sm" onclick="openModal('mClient')">+ Novo cliente</button>
    </div>

    ${clients.length === 0 ? `
      <div style="text-align:center;padding:48px 20px;color:var(--text3)">
        <div style="font-size:36px;margin-bottom:12px">👥</div>
        <div style="font-size:14px;font-weight:600;color:var(--text);margin-bottom:6px">Nenhum cliente ainda</div>
        <div style="font-size:12px">Cadastre seus clientes para vincular receitas e acompanhar o faturamento por cliente.</div>
      </div>
    ` : `
      <div style="display:flex;flex-direction:column;gap:8px">
        ${clients.map(c => {
          const rev = revenueByClient[c.id] || 0;
          return `
          <div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:14px 16px;display:flex;align-items:center;gap:14px">
            <div style="width:40px;height:40px;border-radius:50%;background:var(--accent);display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;color:#fff;flex-shrink:0;font-family:var(--mono)">
              ${c.name.slice(0,1).toUpperCase()}
            </div>
            <div style="flex:1;min-width:0">
              <div style="font-size:13px;font-weight:600;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${c.name}</div>
              <div style="font-size:11px;color:var(--text3);font-family:var(--mono);margin-top:2px">
                ${[c.cnpj, c.email, c.phone].filter(Boolean).join(' · ') || 'Sem informações de contato'}
              </div>
            </div>
            <div style="text-align:right;flex-shrink:0">
              <div style="font-size:12px;font-weight:600;color:var(--green);font-family:var(--mono)">${rev > 0 ? fmt(rev) : '—'}</div>
              <div style="font-size:10px;color:var(--text3)">faturamento</div>
            </div>
            <div style="display:flex;gap:4px;flex-shrink:0">
              <button class="btn btn-ghost btn-sm" onclick="_clientEdit('${c.id}')" style="padding:5px 8px" title="Editar">✎</button>
              <button class="btn btn-ghost btn-sm" onclick="_clientDelete('${c.id}')" style="padding:5px 8px;color:var(--red)" title="Excluir">✕</button>
            </div>
          </div>`;
        }).join('')}
      </div>
    `}
  </div>`;
}

function _clientEdit(id) {
  const c = (S.pjClients || []).find(x => x.id === id);
  if (!c) return;
  document.getElementById('clientId').value     = c.id;
  document.getElementById('clientName').value   = c.name;
  document.getElementById('clientEmail').value  = c.email;
  document.getElementById('clientPhone').value  = c.phone;
  document.getElementById('clientCNPJ').value   = c.cnpj;
  document.getElementById('clientNotes').value  = c.notes;
  document.getElementById('mClientTitle').textContent = 'Editar cliente';
  openModal('mClient');
}

async function _clientSave() {
  const id    = document.getElementById('clientId').value;
  const name  = document.getElementById('clientName').value.trim();
  if (!name) { showToast('Informe o nome do cliente.', 'error'); return; }

  const btn = document.getElementById('clientSaveBtn');
  btn.textContent = '...'; btn.disabled = true;

  const client = {
    id: id || null,
    name,
    email: document.getElementById('clientEmail').value.trim(),
    phone: document.getElementById('clientPhone').value.trim(),
    cnpj:  document.getElementById('clientCNPJ').value.trim(),
    notes: document.getElementById('clientNotes').value.trim(),
  };

  const saved = await dbSaveClient(client);
  btn.textContent = 'Salvar'; btn.disabled = false;

  if (!saved) { showToast('Erro ao salvar cliente.', 'error'); return; }

  if (!S.pjClients) S.pjClients = [];
  const idx = S.pjClients.findIndex(x => x.id === saved.id);
  if (idx >= 0) S.pjClients[idx] = saved;
  else S.pjClients.push(saved);

  closeModal('mClient');
  showToast(id ? 'Cliente atualizado' : `Cliente "${saved.name}" adicionado`);
  renderClientsView();
}

async function _clientDelete(id) {
  const c = (S.pjClients || []).find(x => x.id === id);
  if (!confirm(`Excluir cliente "${c?.name}"? As receitas vinculadas não serão apagadas.`)) return;
  await dbDeleteClient(id);
  S.pjClients = (S.pjClients || []).filter(x => x.id !== id);
  showToast('Cliente removido');
  renderClientsView();
}

function _clientModalOpen() {
  document.getElementById('clientId').value     = '';
  document.getElementById('clientName').value   = '';
  document.getElementById('clientEmail').value  = '';
  document.getElementById('clientPhone').value  = '';
  document.getElementById('clientCNPJ').value   = '';
  document.getElementById('clientNotes').value  = '';
  document.getElementById('mClientTitle').textContent = 'Novo cliente';
}
