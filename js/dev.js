// ══════════════════════════════════════════════════
// DEV.JS — Painel do Desenvolvedor
// Visível apenas para usuários em dev_users
// ══════════════════════════════════════════════════

let _devTab = 'changelog'; // 'changelog' | 'devs'

function renderDev() {
  const el = document.getElementById('devContent');
  if (!el || !S.isDev) return;
  if (_devTab === 'changelog') _renderDevChangelog(el);
  else if (_devTab === 'devs') _renderDevUsers(el);
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

// ── RASCUNHOS (localStorage) ───────────────────────
function _devGetDrafts() {
  try { return JSON.parse(localStorage.getItem('fin_cl_drafts') || '[]'); } catch { return []; }
}
function _devSaveDrafts(drafts) {
  localStorage.setItem('fin_cl_drafts', JSON.stringify(drafts));
}

function _devAddDraft() {
  const typeEl = document.getElementById('devDraftType');
  const textEl = document.getElementById('devDraftText');
  const type = typeEl?.value || 'feat';
  const text = (textEl?.value || '').trim();
  if (!text) { showToast('Escreva o texto do item.', 'error'); return; }
  const drafts = _devGetDrafts();
  drafts.unshift({ id: Date.now().toString(), type, text });
  _devSaveDrafts(drafts);
  textEl.value = '';
  _devRenderDraftsList();
}

function _devDeleteDraft(id) {
  _devSaveDrafts(_devGetDrafts().filter(d => d.id !== id));
  _devRenderDraftsList();
}

function _devClearAllDrafts() {
  if (!confirm('Apagar todos os rascunhos?')) return;
  _devSaveDrafts([]);
  _devRenderDraftsList();
}

// Cor e label por tipo
function _draftBadge(type) {
  const map = {
    feat:    { bg: 'rgba(77,159,255,.15)', color: 'var(--accent)',  border: 'rgba(77,159,255,.3)',  label: 'feat' },
    fix:     { bg: 'rgba(77,255,145,.1)',  color: 'var(--green)',   border: 'rgba(77,255,145,.25)', label: 'fix' },
    improve: { bg: 'rgba(255,159,77,.1)',  color: 'var(--orange)',  border: 'rgba(255,159,77,.25)', label: 'melhoria' },
  };
  return map[type] || map.feat;
}

// Re-renderiza só a lista de rascunhos
function _devRenderDraftsList() {
  const el = document.getElementById('devDraftsList');
  if (!el) return;
  const drafts = _devGetDrafts();
  if (!drafts.length) {
    el.innerHTML = `<div style="font-size:12px;color:var(--text3);text-align:center;padding:10px 0">Nenhum rascunho ainda.</div>`;
    return;
  }
  el.innerHTML = drafts.map(d => {
    const b = _draftBadge(d.type);
    return `
    <div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--border)">
      <span style="font-size:10px;font-family:var(--mono);padding:2px 8px;border-radius:20px;background:${b.bg};color:${b.color};border:1px solid ${b.border};white-space:nowrap;flex-shrink:0">${b.label}</span>
      <span style="flex:1;font-size:12px;color:var(--text);line-height:1.4">${d.text}</span>
      <button onclick="_devDeleteDraft('${d.id}')"
        style="font-size:16px;line-height:1;background:none;border:none;color:var(--text3);cursor:pointer;padding:0 2px;flex-shrink:0" title="Remover">×</button>
    </div>`;
  }).join('');
}

// ── ABA: CHANGELOG ─────────────────────────────────
function _renderDevChangelog(el) {
  const entries = S.changelogEntries;
  const drafts  = _devGetDrafts();
  const announcements = S.announcements || [];

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

  // Lista de rascunhos
  const draftsHtml = drafts.length
    ? drafts.map(d => {
        const b = _draftBadge(d.type);
        return `
        <div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--border)">
          <span style="font-size:10px;font-family:var(--mono);padding:2px 8px;border-radius:20px;background:${b.bg};color:${b.color};border:1px solid ${b.border};white-space:nowrap;flex-shrink:0">${b.label}</span>
          <span style="flex:1;font-size:12px;color:var(--text);line-height:1.4">${d.text}</span>
          <button onclick="_devDeleteDraft('${d.id}')"
            style="font-size:16px;line-height:1;background:none;border:none;color:var(--text3);cursor:pointer;padding:0 2px;flex-shrink:0" title="Remover">×</button>
        </div>`;
      }).join('')
    : `<div style="font-size:12px;color:var(--text3);text-align:center;padding:10px 0">Nenhum rascunho ainda.</div>`;

  // Anúncios ativos
  const annRows = announcements.length
    ? announcements.map(a => `
      <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--bg2);border:1px solid var(--border);border-radius:8px;margin-bottom:8px">
        <div style="flex:1;min-width:0">
          <div style="font-size:12px;color:var(--text);line-height:1.5">${a.message}</div>
          <div style="font-size:10px;color:var(--text3);font-family:var(--mono);margin-top:2px">${new Date(a.createdAt).toLocaleDateString('pt-BR')}</div>
        </div>
        <button onclick="_devToggleAnnouncement('${a.id}', ${!a.active})"
          style="font-size:11px;padding:4px 10px;border-radius:20px;border:1px solid ${a.active ? 'rgba(77,255,145,.3)' : 'var(--border2)'};background:${a.active ? 'rgba(77,255,145,.1)' : 'var(--bg3)'};color:${a.active ? 'var(--green)' : 'var(--text3)'};cursor:pointer;white-space:nowrap;flex-shrink:0">
          ${a.active ? '● Ativo' : '○ Inativo'}
        </button>
        <button onclick="_devDeleteAnnouncement('${a.id}')"
          style="font-size:11px;padding:4px 10px;border-radius:6px;border:1px solid rgba(255,77,77,.3);background:rgba(255,77,77,.08);color:var(--red);cursor:pointer;flex-shrink:0">Excluir</button>
      </div>`)
      .join('')
    : `<div style="font-size:12px;color:var(--text3);padding:10px 0 4px">Nenhum anúncio ainda.</div>`;

  el.innerHTML = `
    ${_devTabBar()}

    <!-- Rascunhos -->
    <div style="background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:14px 16px;margin-bottom:20px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
        <div>
          <div style="font-size:13px;font-weight:600;color:var(--text)">💡 Rascunhos</div>
          <div style="font-size:11px;color:var(--text3);margin-top:2px">Anote mudanças conforme você desenvolve. Na hora de criar uma entrada, você escolhe quais incluir.</div>
        </div>
        ${drafts.length ? `<button onclick="_devClearAllDrafts()" style="font-size:11px;padding:3px 10px;border-radius:6px;border:1px solid rgba(255,77,77,.3);background:rgba(255,77,77,.06);color:var(--red);cursor:pointer;flex-shrink:0">Limpar tudo</button>` : ''}
      </div>
      <div style="display:flex;gap:8px;margin-bottom:10px;margin-top:10px">
        <select id="devDraftType"
          style="padding:7px 10px;border-radius:6px;border:1px solid var(--border2);background:var(--bg3);color:var(--text);font-size:12px;font-family:var(--mono);cursor:pointer">
          <option value="feat">feat</option>
          <option value="fix">fix</option>
          <option value="improve">improve</option>
        </select>
        <input id="devDraftText" type="text" placeholder="Descreva a mudança..."
          style="flex:1;padding:7px 10px;border-radius:6px;border:1px solid var(--border2);background:var(--bg3);color:var(--text);font-size:13px"
          onkeydown="if(event.key==='Enter')_devAddDraft()">
        <button onclick="_devAddDraft()"
          style="padding:7px 14px;border-radius:6px;background:var(--accent);color:#fff;border:none;cursor:pointer;font-size:13px;font-weight:500;white-space:nowrap">+ Anotar</button>
      </div>
      <div id="devDraftsList">${draftsHtml}</div>
    </div>

    <!-- Anúncios ativos -->
    <div style="background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:14px 16px;margin-bottom:20px">
      <div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:10px">📣 Anúncios / Notificações</div>
      <div id="devAnnouncementsList">${annRows}</div>
    </div>

    <!-- Entradas do changelog -->
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

function _devNewEntry() { _devShowForm(null); }
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
  const drafts = _devGetDrafts();

  // HTML dos rascunhos com checkbox
  const draftsCheckboxHtml = drafts.length
    ? `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <span style="font-size:11px;color:var(--text2);font-weight:600">Selecione os rascunhos a incluir:</span>
        <div style="display:flex;gap:6px">
          <button onclick="_devSelectAllDrafts(true)" style="font-size:11px;padding:2px 8px;border-radius:4px;border:1px solid var(--border2);background:var(--bg3);color:var(--text2);cursor:pointer">Todos</button>
          <button onclick="_devSelectAllDrafts(false)" style="font-size:11px;padding:2px 8px;border-radius:4px;border:1px solid var(--border2);background:var(--bg3);color:var(--text2);cursor:pointer">Nenhum</button>
        </div>
      </div>
      <div id="devDraftCheckboxes" style="display:flex;flex-direction:column;gap:4px;max-height:200px;overflow-y:auto">
        ${drafts.map(d => {
          const b = _draftBadge(d.type);
          return `
          <label style="display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:6px;background:var(--bg);border:1px solid var(--border);cursor:pointer">
            <input type="checkbox" class="dev-draft-cb" data-id="${d.id}" data-type="${d.type}" data-text="${d.text.replace(/"/g,'&quot;')}" checked
              style="width:14px;height:14px;accent-color:var(--accent);flex-shrink:0;cursor:pointer">
            <span style="font-size:10px;font-family:var(--mono);padding:1px 7px;border-radius:20px;background:${b.bg};color:${b.color};border:1px solid ${b.border};white-space:nowrap;flex-shrink:0">${b.label}</span>
            <span style="font-size:12px;color:var(--text);line-height:1.4;flex:1">${d.text}</span>
          </label>`;
        }).join('')}
      </div>
      <button onclick="_devAddCheckedDraftsToItems()"
        style="margin-top:10px;width:100%;padding:7px;border-radius:6px;border:1px solid var(--border2);background:var(--bg3);color:var(--text2);cursor:pointer;font-size:12px;font-weight:500">
        ↓ Adicionar selecionados ao campo de itens
      </button>`
    : `<div style="font-size:12px;color:var(--text3);text-align:center;padding:8px 0">Nenhum rascunho para incluir. Anote rascunhos acima.</div>`;

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

    <!-- Rascunhos com checkboxes -->
    <div style="background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:12px 14px;margin-bottom:10px">
      <div style="font-size:11px;font-weight:600;color:var(--text2);margin-bottom:10px">💡 Rascunhos disponíveis</div>
      ${draftsCheckboxHtml}
    </div>

    <div style="margin-bottom:10px">
      <label style="font-size:11px;color:var(--text3);display:block;margin-bottom:4px">
        Itens — uma por linha: <span style="font-family:var(--mono)">feat: texto</span> / <span style="font-family:var(--mono)">fix: texto</span> / <span style="font-family:var(--mono)">improve: texto</span>
      </label>
      <textarea id="devEntryItems" rows="6" placeholder="feat: Nova funcionalidade X&#10;fix: Corrigido bug Y&#10;improve: Melhoria em Z"
        style="width:100%;box-sizing:border-box;padding:8px 10px;border-radius:6px;border:1px solid var(--border2);background:var(--bg3);color:var(--text);font-size:12px;font-family:var(--mono);resize:vertical;line-height:1.6">${itemsText}</textarea>
    </div>

    <!-- Toggle notificação -->
    <div style="display:flex;align-items:center;gap:12px;padding:12px 14px;background:var(--bg3);border:1px solid var(--border);border-radius:8px;margin-bottom:14px">
      <div style="flex:1">
        <div style="font-size:13px;font-weight:500;color:var(--text)">📣 Notificar usuários</div>
        <div style="font-size:11px;color:var(--text3);margin-top:2px">Exibe um banner para todos os usuários no próximo acesso</div>
      </div>
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
        <input type="checkbox" id="devEntryNotify" ${!entry ? 'checked' : ''}
          style="width:16px;height:16px;accent-color:var(--accent);cursor:pointer">
        <span id="devEntryNotifyLabel" style="font-size:12px;font-family:var(--mono);color:var(--text3)">${!entry ? 'Sim' : 'Não'}</span>
      </label>
    </div>

    <div style="display:flex;gap:8px;justify-content:flex-end">
      <button onclick="_devCancelForm()" style="padding:7px 16px;border-radius:6px;border:1px solid var(--border2);background:var(--bg3);color:var(--text2);cursor:pointer;font-size:13px">Cancelar</button>
      <button onclick="_devSaveForm()" style="padding:7px 18px;border-radius:6px;background:var(--accent);color:#fff;border:none;cursor:pointer;font-size:13px;font-weight:500">Salvar entrada</button>
    </div>
  </div>`;

  // Atualiza label do toggle ao mudar
  const notifyCb = document.getElementById('devEntryNotify');
  const notifyLabel = document.getElementById('devEntryNotifyLabel');
  if (notifyCb && notifyLabel) {
    notifyCb.addEventListener('change', () => {
      notifyLabel.textContent = notifyCb.checked ? 'Sim' : 'Não';
    });
  }

  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function _devSelectAllDrafts(checked) {
  document.querySelectorAll('.dev-draft-cb').forEach(cb => cb.checked = checked);
}

function _devAddCheckedDraftsToItems() {
  const checkboxes = document.querySelectorAll('.dev-draft-cb:checked');
  if (!checkboxes.length) { showToast('Nenhum rascunho selecionado.', 'error'); return; }
  const ta = document.getElementById('devEntryItems');
  if (!ta) return;
  const lines = [];
  checkboxes.forEach(cb => {
    lines.push(`${cb.dataset.type}: ${cb.dataset.text}`);
  });
  const cur = ta.value.trimEnd();
  ta.value = cur ? cur + '\n' + lines.join('\n') : lines.join('\n');
  showToast(`${lines.length} item(s) adicionado(s)`);
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
  const notify  = document.getElementById('devEntryNotify')?.checked ?? false;

  if (!version || !date || !title || !summary) { showToast('Preencha versão, data, título e resumo.', 'error'); return; }

  const typeMap = { feat: 'feat', fix: 'fix', improve: 'improve', melhoria: 'improve', correção: 'fix', novo: 'feat' };
  const items = rawItems.split('\n').map(l => l.trim()).filter(Boolean).map(l => {
    const sep = l.indexOf(':');
    if (sep < 0) return { type: 'feat', text: l };
    const rawType = l.slice(0, sep).trim().toLowerCase();
    return { type: typeMap[rawType] || 'feat', text: l.slice(sep + 1).trim() };
  });

  setSyncing(true);

  // Salva o changelog entry
  const saved = await dbSaveChangelogEntry({ id, version, date, title, summary, items, position: pos });

  // Salva anúncio se notificação ativada (apenas para entradas novas ou se marcou)
  if (notify && saved) {
    const msg = `🚀 Nova atualização v${version}: ${title}. Veja o que há de novo em "Novidades"!`;
    const ann = await dbSaveAnnouncement(msg);
    if (ann) {
      S.announcements.unshift(ann);
      renderAnnouncementBanner();
    }
  }

  setSyncing(false);

  if (!saved) { showToast('Erro ao salvar.', 'error'); return; }

  if (id) {
    const idx = S.changelogEntries.findIndex(e => e.id === id);
    if (idx >= 0) S.changelogEntries[idx] = saved;
  } else {
    S.changelogEntries.unshift(saved);
    S.changelogEntries.sort((a, b) => (b.position || 0) - (a.position || 0));
  }

  // Remove rascunhos usados (os que estavam marcados)
  const usedIds = Array.from(document.querySelectorAll('.dev-draft-cb:checked')).map(cb => cb.dataset.id);
  if (usedIds.length) {
    _devSaveDrafts(_devGetDrafts().filter(d => !usedIds.includes(d.id)));
  }

  _devCancelForm();
  renderDev();
  showToast(notify ? '✓ Entrada salva + notificação enviada' : '✓ Entrada salva');
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

// ── Anúncios ───────────────────────────────────────
async function _devToggleAnnouncement(id, active) {
  setSyncing(true);
  const ok = await dbToggleAnnouncement(id, active);
  setSyncing(false);
  if (!ok) { showToast('Erro ao atualizar anúncio.', 'error'); return; }
  const ann = S.announcements.find(a => a.id === id);
  if (ann) ann.active = active;
  renderAnnouncementBanner();
  _renderAnnouncementsSection();
  showToast(active ? 'Anúncio ativado' : 'Anúncio desativado');
}

async function _devDeleteAnnouncement(id) {
  if (!confirm('Excluir este anúncio?')) return;
  setSyncing(true);
  await dbDeleteAnnouncement(id);
  setSyncing(false);
  S.announcements = S.announcements.filter(a => a.id !== id);
  renderAnnouncementBanner();
  _renderAnnouncementsSection();
  showToast('Anúncio excluído');
}

function _renderAnnouncementsSection() {
  const el = document.getElementById('devAnnouncementsList');
  if (!el) return;
  const announcements = S.announcements || [];
  if (!announcements.length) {
    el.innerHTML = `<div style="font-size:12px;color:var(--text3);padding:10px 0 4px">Nenhum anúncio ainda.</div>`;
    return;
  }
  el.innerHTML = announcements.map(a => `
    <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--bg2);border:1px solid var(--border);border-radius:8px;margin-bottom:8px">
      <div style="flex:1;min-width:0">
        <div style="font-size:12px;color:var(--text);line-height:1.5">${a.message}</div>
        <div style="font-size:10px;color:var(--text3);font-family:var(--mono);margin-top:2px">${new Date(a.createdAt).toLocaleDateString('pt-BR')}</div>
      </div>
      <button onclick="_devToggleAnnouncement('${a.id}', ${!a.active})"
        style="font-size:11px;padding:4px 10px;border-radius:20px;border:1px solid ${a.active ? 'rgba(77,255,145,.3)' : 'var(--border2)'};background:${a.active ? 'rgba(77,255,145,.1)' : 'var(--bg3)'};color:${a.active ? 'var(--green)' : 'var(--text3)'};cursor:pointer;white-space:nowrap;flex-shrink:0">
        ${a.active ? '● Ativo' : '○ Inativo'}
      </button>
      <button onclick="_devDeleteAnnouncement('${a.id}')"
        style="font-size:11px;padding:4px 10px;border-radius:6px;border:1px solid rgba(255,77,77,.3);background:rgba(255,77,77,.08);color:var(--red);cursor:pointer;flex-shrink:0">Excluir</button>
    </div>`).join('');
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
