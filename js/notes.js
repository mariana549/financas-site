// ══════════════════════════════════════════════════
// NOTES.JS — Bloco de Anotações Rápidas
// ══════════════════════════════════════════════════

function renderNotes() {
  const el = document.getElementById('notesContent');
  if (!el) return;

  const filter   = S._notesFilter || 'all';
  const curMonth = S.currentMonth;
  const notes    = S.notes || [];

  const visible = notes.filter(n => {
    if (n.archived) return filter === 'archived';
    if (filter === 'month')  return n.monthKey === curMonth;
    if (filter === 'global') return !n.monthKey;
    return !n.archived; // 'all'
  });

  // Months for the selector
  const monthOpts = [...S.months].reverse().map(m =>
    `<option value="${m.key}"${m.key === curMonth ? ' selected' : ''}>${m.label} ${m.year}</option>`
  ).join('');

  const noteRows = visible.map(n => {
    const dateStr = new Date(n.createdAt).toLocaleDateString('pt-BR', { day:'2-digit', month:'short', year:'numeric' });
    const monthLabel = n.monthKey
      ? (() => { const m = S.months.find(x => x.key === n.monthKey); return m ? `${m.label} ${m.year}` : n.monthKey; })()
      : 'Nota global';
    return `
      <div class="note-card${n.convertedToEntry ? ' note-converted' : ''}">
        <div class="note-card-text">${n.text.replace(/</g,'&lt;').replace(/\n/g,'<br>')}</div>
        <div class="note-card-meta">
          <span>${monthLabel} · ${dateStr}</span>
          ${n.convertedToEntry ? '<span class="bm" style="background:var(--green)15;color:var(--green);font-size:10px">→ lançado</span>' : ''}
        </div>
        <div class="note-card-actions">
          ${!n.convertedToEntry ? `<button class="btn btn-ghost btn-sm" onclick="_noteParseAI('${n.id}')" title="Lançar com IA">🤖 Lançar c/ IA</button>` : ''}
          <button class="btn btn-ghost btn-sm" onclick="_noteArchive('${n.id}',${!n.archived})" title="${n.archived ? 'Desarquivar' : 'Arquivar'}">
            ${n.archived ? '📤 Desarquivar' : '📁 Arquivar'}
          </button>
          <button class="btn btn-ghost btn-sm" onclick="_noteDelete('${n.id}')" style="color:var(--red)" title="Excluir">🗑</button>
        </div>
      </div>`;
  }).join('');

  el.innerHTML = `
    <div style="max-width:640px;margin:0 auto;padding:20px 20px 60px">

      <!-- ── Área de escrita ── -->
      <div class="note-write-block">
        <textarea id="noteTextArea" placeholder="Escreva qualquer coisa... ex: 'paguei mercado 87 reais ontem'"
          style="width:100%;min-height:100px;padding:12px;background:var(--bg2);border:1px solid var(--border);
          border-radius:10px;color:var(--text);font-size:14px;font-family:inherit;resize:vertical;
          box-sizing:border-box;outline:none;transition:border-color .15s"
          onfocus="this.style.borderColor='var(--accent)'" onblur="this.style.borderColor='var(--border)'"></textarea>
        <div style="display:flex;align-items:center;gap:8px;margin-top:10px;flex-wrap:wrap">
          <select id="noteMonthSel" style="flex:1;min-width:160px;padding:7px 10px;background:var(--bg3);
            border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:12px;outline:none">
            <option value="">Nota global (sem mês)</option>
            ${monthOpts}
          </select>
          <button class="btn btn-primary btn-sm" onclick="_noteSave()">Salvar nota</button>
          <button class="btn btn-ghost btn-sm" onclick="_noteParseAINew()" title="Interpretar texto e lançar como gasto">🤖 Lançar c/ IA</button>
        </div>
      </div>

      <!-- ── Filtros ── -->
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin:18px 0 12px">
        ${[
          ['all', 'Todas'],
          ['month', 'Este mês'],
          ['global', 'Globais'],
          ['archived', 'Arquivadas']
        ].map(([k, lbl]) => `
          <button class="btn ${filter === k ? 'btn-primary' : 'btn-ghost'} btn-sm"
            onclick="S._notesFilter='${k}';renderNotes()">${lbl}</button>`
        ).join('')}
      </div>

      <!-- ── Lista de notas ── -->
      ${visible.length === 0
        ? `<div class="empty" style="margin-top:20px">${filter === 'archived' ? 'Nenhuma nota arquivada.' : 'Nenhuma nota ainda. Escreva algo acima!'}</div>`
        : noteRows}
    </div>`;
}

async function _noteSave() {
  const text = document.getElementById('noteTextArea')?.value?.trim();
  if (!text) { showToast('Escreva algo antes de salvar.'); return; }
  const monthKey = document.getElementById('noteMonthSel')?.value || null;
  const note = {
    id: crypto.randomUUID(),
    text,
    monthKey,
    archived: false,
    convertedToEntry: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  setSyncing(true);
  const saved = await dbSaveNote(note);
  setSyncing(false);
  if (!saved) { showToast('Erro ao salvar nota.'); return; }
  note.id = saved.id;
  S.notes.unshift(note);
  document.getElementById('noteTextArea').value = '';
  renderNotes();
  showToast('✓ Nota salva');
}

async function _noteArchive(id, archived) {
  const note = S.notes.find(n => n.id === id);
  if (!note) return;
  note.archived = archived;
  note.updatedAt = new Date().toISOString();
  setSyncing(true);
  await dbSaveNote(note);
  setSyncing(false);
  renderNotes();
  showToast(archived ? 'Nota arquivada' : 'Nota desarquivada');
}

async function _noteDelete(id) {
  if (!confirm('Excluir esta nota?')) return;
  S.notes = S.notes.filter(n => n.id !== id);
  setSyncing(true);
  await dbDeleteNote(id);
  setSyncing(false);
  renderNotes();
  showToast('Nota excluída');
}

function _noteParseAINew() {
  const text = document.getElementById('noteTextArea')?.value?.trim();
  if (!text) { showToast('Escreva algo antes de lançar.'); return; }
  _noteRunAI(text, null);
}

async function _noteParseAI(noteId) {
  const note = S.notes.find(n => n.id === noteId);
  if (!note) return;
  await _noteRunAI(note.text, noteId);
}

function _noteRunAI(text, noteId) {
  S._aiNoteId = noteId || null;
  const isDash = document.getElementById('view-dash')?.style.display !== 'none';
  if (!isDash) showView('dash');
  setTimeout(() => {
    openAI();
    setTimeout(() => {
      const ta = document.getElementById('aiText');
      if (ta && text) ta.value = text;
    }, 50);
  }, isDash ? 0 : 150);
}

// ── Notas inline no dashboard (aba "📝 Notas" dentro do mês) ──

function renderMonthNotesInline() {
  const el = document.getElementById('itabc-notas');
  if (!el) return;
  const curMonth = S.currentMonth;
  const notes = (S.notes || []).filter(n => !n.archived && n.monthKey === curMonth);
  const noteRows = notes.map(n => {
    const dateStr = new Date(n.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    return `
      <div class="note-card${n.convertedToEntry ? ' note-converted' : ''}">
        <div class="note-card-text">${n.text.replace(/</g, '&lt;').replace(/\n/g, '<br>')}</div>
        <div class="note-card-meta">
          <span>${dateStr}</span>
          ${n.convertedToEntry ? '<span class="bm" style="background:var(--green)15;color:var(--green);font-size:10px">→ lançado</span>' : ''}
        </div>
        <div class="note-card-actions">
          ${!n.convertedToEntry ? `<button class="btn btn-ghost btn-sm" onclick="_noteParseAI('${n.id}')" title="Lançar com IA">🤖 Lançar c/ IA</button>` : ''}
          <button class="btn btn-ghost btn-sm" onclick="_noteDeleteInline('${n.id}')" style="color:var(--red)" title="Excluir">🗑</button>
        </div>
      </div>`;
  }).join('');

  el.innerHTML = `
    <div style="padding-bottom:60px">
      <div class="note-write-block" style="margin-bottom:16px">
        <textarea id="inlineNoteText" placeholder="Anotação rápida para este mês..."
          style="width:100%;min-height:80px;padding:12px;background:var(--bg2);border:1px solid var(--border);
          border-radius:10px;color:var(--text);font-size:14px;font-family:inherit;resize:vertical;
          box-sizing:border-box;outline:none;transition:border-color .15s"
          onfocus="this.style.borderColor='var(--accent)'" onblur="this.style.borderColor='var(--border)'"></textarea>
        <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">
          <button class="btn btn-primary btn-sm" onclick="_saveInlineNote()">Salvar nota</button>
          <button class="btn btn-ghost btn-sm" onclick="_launchInlineNoteAI()" title="Interpretar texto e lançar como gasto">🤖 Lançar c/ IA</button>
        </div>
      </div>
      ${notes.length === 0
        ? '<div class="empty" style="margin-top:12px">Nenhuma anotação neste mês ainda.</div>'
        : noteRows}
    </div>`;
}

async function _saveInlineNote() {
  const text = document.getElementById('inlineNoteText')?.value?.trim();
  if (!text) { showToast('Escreva algo antes de salvar.'); return; }
  const note = {
    id: crypto.randomUUID(),
    text,
    monthKey: S.currentMonth,
    archived: false,
    convertedToEntry: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  setSyncing(true);
  const saved = await dbSaveNote(note);
  setSyncing(false);
  if (!saved) { showToast('Erro ao salvar nota.'); return; }
  note.id = saved.id;
  S.notes.unshift(note);
  document.getElementById('inlineNoteText').value = '';
  renderMonthNotesInline();
  showToast('✓ Nota salva');
}

function _launchInlineNoteAI() {
  const text = document.getElementById('inlineNoteText')?.value?.trim();
  if (!text) { showToast('Escreva algo antes de lançar.'); return; }
  _noteRunAI(text, null);
}

async function _noteDeleteInline(id) {
  if (!confirm('Excluir esta nota?')) return;
  S.notes = S.notes.filter(n => n.id !== id);
  setSyncing(true);
  await dbDeleteNote(id);
  setSyncing(false);
  renderMonthNotesInline();
  showToast('Nota excluída');
}
