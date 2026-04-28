// ══════════════════════════════════════════════════
// DEV.JS — Painel do Desenvolvedor
// Visível apenas para usuários em dev_users
// ══════════════════════════════════════════════════

let _devTab = 'changelog'; // 'changelog' | 'devs'

function renderDev() {
  const el = document.getElementById('devContent');
  if (!el || !S.isDev) return;
  _devTab === 'changelog' ? _renderDevChangelog(el) : _renderDevUsers(el);
}

function _devTabBar() {
  return `
  <div style="display:flex;gap:4px;margin-bottom:20px;background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:4px">
    ${['changelog','devs'].map(t => `
    <button onclick="_devSwitchTab('${t}')"
      style="flex:1;padding:7px 12px;border-radius:6px;border:none;cursor:pointer;font-size:13px;font-weight:500;transition:background .15s,color .15s;
        background:${_devTab===t ? 'var(--accent)' : 'transparent'};
        color:${_devTab===t ? '#fff' : 'var(--text2)'}">
      ${t === 'changelog' ? '📋 Novidades' : '👥 Devs'}
    </button>`).join('')}
  </div>`;
}

function _devSwitchTab(tab) {
  _devTab = tab;
  renderDev();
}

// ── ABA: CHANGELOG ─────────────────────────────────
function _renderDevChangelog(el) {
  const entries = S.changelogEntries;

  const rows = entries.length
    ? entries.map(e => {
        const itemPreview = (e.items || []).slice(0, 2)
          .map(it => `<span style="font-size:11px;color:var(--text3)">• ${it.text}</span>`).join('<br>');
        const more = (e.items || []).length > 2
          ? `<span style="font-size:11px;color:var(--text3)">+${e.items.length - 2} itens...</span>` : '';
        return `
        <div style="background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:14px 16px;margin-bottom:10px">
          <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:8px">
            <div style="flex:1;min-width:0">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:2px">
                <span style="font-size:12px;font-family:var(--mono);color:var(--accent);font-weight:600">v${e.version}</span>
                <span style="font-size:11px;color:var(--text3);font-family:var(--mono)">${e.date}</span>
              </div>
              <div style="font-size:13px;font-weight:600;color:var(--text)">${e.title}</div>
              <div style="font-size:12px;color:var(--text2);margin-top:2px">${e.summary}</div>
              ${itemPreview || more ? `<div style="margin-top:6px;line-height:1.6">${itemPreview}${more ? '<br>' + more : ''}</div>` : ''}
            </div>
            <div style="display:flex;gap:6px;flex-shrink:0">
              <button onclick="_devEditEntry('${e.id}')"
                style="font-size:11px;padding:4px 10px;border-radius:6px;border:1px solid var(--border2);background:var(--bg3);color:var(--text2);cursor:pointer">Editar</button>
              <button onclick="_devDeleteEntry('${e.id}')"
                style="font-size:11px;padding:4px 10px;border-radius:6px;border:1px solid rgba(255,77,77,.3);background:rgba(255,77,77,.08);color:var(--red);cursor:pointer">Excluir</button>
            </div>
          </div>
        </div>`;
      }).join('')
    : `<div style="text-align:center;padding:32px;color:var(--text3);font-size:13px">Nenhuma entrada ainda.<br>Crie a primeira clicando em "+ Nova entrada".</div>`;

  el.innerHTML = `
    ${_devTabBar()}
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <div>
        <div style="font-size:15px;font-weight:600;color:var(--text)">Entradas do changelog</div>
        <div style="font-size:12px;color:var(--text3)">${entries.length} entrada(s) · ordenadas por mais recente</div>
      </div>
      <button onclick="_devNewEntry()"
        style="font-size:12px;padding:6px 14px;border-radius:7px;background:var(--accent);color:#fff;border:none;cursor:pointer;font-weight:500">+ Nova entrada</button>
    </div>
    <div id="devChangelogForm" style="display:none"></div>
    ${rows}`;
}

function _devNewEntry() {
  _devShowForm(null);
}
function _devEditEntry(id) {
  const entry = S.changelogEntries.find(e => e.id === id);
  if (entry) _devShowForm(entry);
}

function _devShowForm(entry) {
  const el = document.getElementById('devChangelogForm');
  if (!el) return;
  el.style.display = 'block';

  const itemsText = (entry?.items || []).map(it => `${it.type}: ${it.text}`).join('\n');
  const maxPos = S.changelogEntries.length
    ? Math.max(...S.changelogEntries.map(e => e.position || 0)) : 0;

  el.innerHTML = `
  <div style="background:var(--bg2);border:1px solid var(--accent);border-radius:10px;padding:16px;margin-bottom:16px">
    <div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:14px">${entry ? 'Editar entrada' : 'Nova entrada'}</div>
    <input type="hidden" id="devEntryId" value="${entry?.id || ''}">
    <input type="hidden" id="devEntryPos" value="${entry?.position ?? (maxPos + 1)}">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
      <div>
        <label style="font-size:11px;color:var(--text3);display:block;margin-bottom:4px">Versão</label>
        <input id="devEntryVersion" type="text" value="${entry?.version || ''}" placeholder="ex: 1.2"
          style="width:100%;box-sizing:border-box;padding:7px 10px;border-radius:6px;border:1px solid var(--border2);background:var(--bg3);color:var(--text);font-size:13px">
      </div>
      <div>
        <label style="font-size:11px;color:var(--text3);display:block;margin-bottom:4px">Data</label>
        <input id="devEntryDate" type="text" value="${entry?.date || ''}" placeholder="ex: Maio 2026"
          style="width:100%;box-sizing:border-box;padding:7px 10px;border-radius:6px;border:1px solid var(--border2);background:var(--bg3);color:var(--text);font-size:13px">
      </div>
    </div>
    <div style="margin-bottom:10px">
      <label style="font-size:11px;color:var(--text3);display:block;margin-bottom:4px">Título</label>
      <input id="devEntryTitle" type="text" value="${(entry?.title || '').replace(/"/g,'&quot;')}" placeholder="ex: Melhorias no import IA"
        style="width:100%;box-sizing:border-box;padding:7px 10px;border-radius:6px;border:1px solid var(--border2);background:var(--bg3);color:var(--text);font-size:13px">
    </div>
    <div style="margin-bottom:10px">
      <label style="font-size:11px;color:var(--text3);display:block;margin-bottom:4px">Resumo</label>
      <input id="devEntrySummary" type="text" value="${(entry?.summary || '').replace(/"/g,'&quot;')}" placeholder="Uma frase descrevendo o grupo"
        style="width:100%;box-sizing:border-box;padding:7px 10px;border-radius:6px;border:1px solid var(--border2);background:var(--bg3);color:var(--text);font-size:13px">
    </div>
    <div style="margin-bottom:14px">
      <label style="font-size:11px;color:var(--text3);display:block;margin-bottom:4px">
        Itens <span style="color:var(--text3);font-style:normal">— uma por linha: <span style="font-family:var(--mono)">feat: texto</span> / <span style="font-family:var(--mono)">fix: texto</span> / <span style="font-family:var(--mono)">improve: texto</span></span>
      </label>
      <textarea id="devEntryItems" rows="6" placeholder="feat: Nova funcionalidade X&#10;fix: Corrigido bug Y&#10;improve: Melhoria em Z"
        style="width:100%;box-sizing:border-box;padding:8px 10px;border-radius:6px;border:1px solid var(--border2);background:var(--bg3);color:var(--text);font-size:12px;font-family:var(--mono);resize:vertical;line-height:1.6">${itemsText}</textarea>
    </div>
    <div style="display:flex;gap:8px;justify-content:flex-end">
      <button onclick="_devCancelForm()" style="padding:7px 16px;border-radius:6px;border:1px solid var(--border2);background:var(--bg3);color:var(--text2);cursor:pointer;font-size:13px">Cancelar</button>
      <button onclick="_devSaveForm()" style="padding:7px 18px;border-radius:6px;background:var(--accent);color:#fff;border:none;cursor:pointer;font-size:13px;font-weight:500">Salvar entrada</button>
    </div>
  </div>`;

  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function _devCancelForm() {
  const el = document.getElementById('devChangelogForm');
  if (el) { el.style.display = 'none'; el.innerHTML = ''; }
}

async function _devSaveForm() {
  const id      = document.getElementById('devEntryId').value.trim() || null;
  const pos     = parseInt(document.getElementById('devEntryPos').value) || 0;
  const version = document.getElementById('devEntryVersion').value.trim();
  const date    = document.getElementById('devEntryDate').value.trim();
  const title   = document.getElementById('devEntryTitle').value.trim();
  const summary = document.getElementById('devEntrySummary').value.trim();
  const rawItems = document.getElementById('devEntryItems').value;

  if (!version || !date || !title || !summary) { showToast('Preencha versão, data, título e resumo.', 'error'); return; }

  const typeMap = { feat: 'feat', fix: 'fix', improve: 'improve', melhoria: 'improve', correção: 'fix', novo: 'feat' };
  const items = rawItems.split('\n').map(l => l.trim()).filter(Boolean).map(l => {
    const sep = l.indexOf(':');
    if (sep < 0) return { type: 'feat', text: l };
    const rawType = l.slice(0, sep).trim().toLowerCase();
    return { type: typeMap[rawType] || 'feat', text: l.slice(sep + 1).trim() };
  });

  setSyncing(true);
  const saved = await dbSaveChangelogEntry({ id, version, date, title, summary, items, position: pos });
  setSyncing(false);

  if (!saved) { showToast('Erro ao salvar.', 'error'); return; }

  if (id) {
    const idx = S.changelogEntries.findIndex(e => e.id === id);
    if (idx >= 0) S.changelogEntries[idx] = saved;
  } else {
    S.changelogEntries.unshift(saved);
    S.changelogEntries.sort((a, b) => (b.position || 0) - (a.position || 0));
  }

  _devCancelForm();
  renderDev();
  showToast('✓ Entrada salva');
}

async function _devDeleteEntry(id) {
  if (!confirm('Excluir esta entrada do changelog?')) return;
  setSyncing(true);
  await dbDeleteChangelogEntry(id);
  setSyncing(false);
  S.changelogEntries = S.changelogEntries.filter(e => e.id !== id);
  renderDev();
  showToast('Entrada excluída');
}

// ── ABA: DEVS ──────────────────────────────────────
function _renderDevUsers(el) {
  const devs = S.devUsers;

  const rows = devs.map(d => {
    const isMe = d.email === currentUser?.email;
    const canRemove = devs.length > 1;
    const warnMe = isMe ? ' (você)' : '';
    return `
    <div style="display:flex;align-items:center;gap:12px;padding:12px 16px;background:var(--bg2);border:1px solid var(--border);border-radius:8px;margin-bottom:8px">
      <div style="width:32px;height:32px;border-radius:50%;background:var(--bg3);border:1px solid var(--border2);display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0">
        ${isMe ? '⭐' : '👤'}
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;color:var(--text);font-weight:${isMe ? '600' : '400'}">${d.email}${warnMe}</div>
        <div style="font-size:11px;color:var(--text3);font-family:var(--mono)">dev desde ${new Date(d.addedAt).toLocaleDateString('pt-BR')}</div>
      </div>
      ${canRemove
        ? `<button onclick="_devRemoveUser('${d.id}', '${d.email}', ${isMe})"
            style="font-size:11px;padding:4px 10px;border-radius:6px;border:1px solid rgba(255,77,77,.3);background:rgba(255,77,77,.08);color:var(--red);cursor:pointer;flex-shrink:0">Remover</button>`
        : `<span style="font-size:11px;color:var(--text3);padding:4px 8px">único dev</span>`}
    </div>`;
  }).join('');

  el.innerHTML = `
    ${_devTabBar()}
    <div style="margin-bottom:16px">
      <div style="font-size:15px;font-weight:600;color:var(--text);margin-bottom:2px">Desenvolvedores</div>
      <div style="font-size:12px;color:var(--text3)">${devs.length} dev(s) com acesso ao painel</div>
    </div>
    ${rows}
    <div style="background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:16px;margin-top:16px">
      <div style="font-size:13px;font-weight:500;color:var(--text);margin-bottom:10px">Adicionar dev por e-mail</div>
      <div style="display:flex;gap:8px">
        <input id="devNewEmail" type="email" placeholder="email@exemplo.com"
          style="flex:1;padding:8px 12px;border-radius:6px;border:1px solid var(--border2);background:var(--bg3);color:var(--text);font-size:13px"
          onkeydown="if(event.key==='Enter')_devAddUser()">
        <button onclick="_devAddUser()"
          style="padding:8px 16px;border-radius:6px;background:var(--accent);color:#fff;border:none;cursor:pointer;font-size:13px;font-weight:500;white-space:nowrap">+ Adicionar</button>
      </div>
    </div>`;
}

async function _devAddUser() {
  const input = document.getElementById('devNewEmail');
  const email = (input?.value || '').trim().toLowerCase();
  if (!email || !email.includes('@')) { showToast('E-mail inválido.', 'error'); return; }
  if (S.devUsers.some(d => d.email === email)) { showToast('Já é dev.', 'error'); return; }

  setSyncing(true);
  const added = await dbClaimDev(email);
  setSyncing(false);

  if (!added) { showToast('Erro ao adicionar dev.', 'error'); return; }
  S.devUsers.push(added);
  renderDev();
  showToast(`✓ ${email} adicionado como dev`);
}

async function _devRemoveUser(id, email, isMe) {
  const msg = isMe
    ? `Você vai perder seu próprio acesso ao Dev Panel. Tem certeza?`
    : `Remover ${email} como dev?`;
  if (!confirm(msg)) return;

  setSyncing(true);
  await dbRemoveDev(id);
  setSyncing(false);

  S.devUsers = S.devUsers.filter(d => d.id !== id);

  if (isMe) {
    S.isDev = false;
    const devNav = document.getElementById('nav-dev');
    if (devNav) devNav.style.display = 'none';
    showView('dash');
    showToast('Acesso dev removido');
  } else {
    renderDev();
    showToast('Dev removido');
  }
}
