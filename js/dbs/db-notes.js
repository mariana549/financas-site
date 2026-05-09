// ══════════════════════════════════════════════════
// DB-NOTES.JS — CRUD de Notas
// ══════════════════════════════════════════════════

async function dbSaveNote(note) {
  if (!currentUser) return null;
  const { data, error } = await sb.from('notes').upsert({
    id: note.id,
    user_id: currentUser.id,
    context_id: S.activeContext?.id || null,
    text: note.text,
    month_key: note.monthKey || null,
    archived: note.archived || false,
    converted_to_entry: note.convertedToEntry || false,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' }).select().maybeSingle();
  if (error) { console.error('[dbSaveNote]', error); return null; }
  return data;
}

async function dbDeleteNote(id) {
  if (!currentUser) return;
  await sb.from('notes').delete().eq('id', id).eq('user_id', currentUser.id);
}
