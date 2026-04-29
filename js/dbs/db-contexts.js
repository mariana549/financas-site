// ══════════════════════════════════════════════════
// DB-CONTEXTS.JS — Contextos Pessoal / PJ
// ══════════════════════════════════════════════════

async function dbLoadContexts() {
  if (!currentUser) return [];
  const { data, error } = await sb.from('contexts').select('*').eq('user_id', currentUser.id).order('created_at');
  if (error) { console.error('[dbLoadContexts]', error); return []; }
  return (data || []).map(r => ({
    id: r.id, name: r.name, type: r.type, parentId: r.parent_id,
    color: r.color, createdAt: r.created_at
  }));
}

async function dbEnsurePersonalContext() {
  if (!currentUser) return null;
  const { data, error } = await sb.rpc('ensure_personal_context', { p_user_id: currentUser.id });
  if (error) { console.error('[dbEnsurePersonalContext]', error); return null; }
  return data; // uuid do contexto pessoal
}

async function dbEnsurePJContext() {
  if (!currentUser) return null;
  // Verifica se já existe um contexto PJ raiz
  const { data: existing } = await sb.from('contexts')
    .select('id').eq('user_id', currentUser.id).eq('type', 'pj').is('parent_id', null).maybeSingle();
  if (existing) return existing.id;
  // Cria o contexto PJ raiz
  const { data, error } = await sb.from('contexts')
    .insert({ user_id: currentUser.id, name: 'PJ', type: 'pj', color: '#4d9fff' })
    .select().single();
  if (error) { console.error('[dbEnsurePJContext]', error); return null; }
  return data.id;
}

async function dbEnablePJ() {
  if (!currentUser) return false;
  const { error } = await sb.from('user_profiles')
    .upsert({ user_id: currentUser.id, pj_enabled: true }, { onConflict: 'user_id' });
  if (error) { console.error('[dbEnablePJ]', error); return false; }
  return true;
}

async function dbDisablePJ() {
  if (!currentUser) return false;
  const { error } = await sb.from('user_profiles')
    .update({ pj_enabled: false }).eq('user_id', currentUser.id);
  if (error) { console.error('[dbDisablePJ]', error); return false; }
  return true;
}

async function dbSaveContext(ctx) {
  if (!currentUser) return null;
  const row = {
    user_id: currentUser.id, name: ctx.name, type: ctx.type || 'pj',
    parent_id: ctx.parentId || null, color: ctx.color || null
  };
  if (ctx.id) {
    const { data, error } = await sb.from('contexts').update(row).eq('id', ctx.id).select().single();
    if (error) { console.error('[dbSaveContext update]', error); return null; }
    return { id: data.id, name: data.name, type: data.type, parentId: data.parent_id, color: data.color };
  } else {
    const { data, error } = await sb.from('contexts').insert(row).select().single();
    if (error) { console.error('[dbSaveContext insert]', error); return null; }
    return { id: data.id, name: data.name, type: data.type, parentId: data.parent_id, color: data.color };
  }
}

async function dbDeleteContext(id) {
  if (!currentUser) return;
  const { error } = await sb.from('contexts').delete().eq('id', id).eq('user_id', currentUser.id);
  if (error) console.error('[dbDeleteContext]', error);
}
