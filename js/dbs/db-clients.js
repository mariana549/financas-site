// ══════════════════════════════════════════════════
// DB-CLIENTS.JS — Clientes PJ
// ══════════════════════════════════════════════════

async function dbLoadClients() {
  if (!currentUser || !S.activeContext) return [];
  const { data, error } = await sb.from('pj_clients').select('*')
    .eq('user_id', currentUser.id).eq('context_id', S.activeContext.id).order('name');
  if (error) { console.error('[dbLoadClients]', error); return []; }
  return (data || []).map(r => ({
    id: r.id, name: r.name, email: r.email || '', phone: r.phone || '',
    cnpj: r.cnpj || '', notes: r.notes || '', createdAt: r.created_at
  }));
}

async function dbSaveClient(client) {
  if (!currentUser) return null;
  const row = {
    user_id: currentUser.id, context_id: S.activeContext?.id || null,
    name: client.name, email: client.email || null, phone: client.phone || null,
    cnpj: client.cnpj || null, notes: client.notes || null
  };
  if (client.id) {
    const { data, error } = await sb.from('pj_clients').update(row).eq('id', client.id).select().single();
    if (error) { console.error('[dbSaveClient update]', error); return null; }
    return { id: data.id, name: data.name, email: data.email || '', phone: data.phone || '',
      cnpj: data.cnpj || '', notes: data.notes || '' };
  } else {
    const { data, error } = await sb.from('pj_clients').insert(row).select().single();
    if (error) { console.error('[dbSaveClient insert]', error); return null; }
    return { id: data.id, name: data.name, email: data.email || '', phone: data.phone || '',
      cnpj: data.cnpj || '', notes: data.notes || '' };
  }
}

async function dbDeleteClient(id) {
  if (!currentUser) return;
  const { error } = await sb.from('pj_clients').delete().eq('id', id).eq('user_id', currentUser.id);
  if (error) console.error('[dbDeleteClient]', error);
}
