// ══════════════════════════════════════════════════
// DB-DEV.JS — Dev users + Changelog entries + Announcements
// ══════════════════════════════════════════════════

// ── Dev Users ──────────────────────────────────────
async function dbLoadDevUsers() {
  if (!currentUser) return [];
  const { data, error } = await sb.from('dev_users').select('*').order('added_at');
  if (error) { console.error('[dbLoadDevUsers]', error); return []; }
  return (data || []).map(r => ({ id: r.id, email: r.email, addedAt: r.added_at }));
}

async function dbClaimDev(email) {
  if (!currentUser) return null;
  const { data, error } = await sb.from('dev_users').insert({ email }).select().single();
  if (error) { console.error('[dbClaimDev]', error); return null; }
  return { id: data.id, email: data.email, addedAt: data.added_at };
}

async function dbRemoveDev(id) {
  if (!currentUser) return;
  const { error } = await sb.from('dev_users').delete().eq('id', id);
  if (error) console.error('[dbRemoveDev]', error);
}

// ── Changelog Entries ──────────────────────────────
async function dbLoadChangelogEntries() {
  if (!currentUser) return [];
  const { data, error } = await sb.from('changelog_entries').select('*')
    .order('position', { ascending: false }).order('created_at', { ascending: false });
  if (error) { console.error('[dbLoadChangelogEntries]', error); return []; }
  return (data || []).map(r => ({
    id: r.id, version: r.version, date: r.entry_date,
    title: r.title, summary: r.summary, items: r.items, position: r.position
  }));
}

async function dbSaveChangelogEntry(entry) {
  if (!currentUser) return null;
  const row = {
    version: entry.version, entry_date: entry.date,
    title: entry.title, summary: entry.summary,
    items: entry.items, position: entry.position ?? 0
  };
  if (entry.id) {
    const { data, error } = await sb.from('changelog_entries')
      .update(row).eq('id', entry.id).select().single();
    if (error) { console.error('[dbSaveChangelogEntry update]', error); return null; }
    return { ...entry, ...{ version: data.version, date: data.entry_date } };
  } else {
    const { data, error } = await sb.from('changelog_entries')
      .insert(row).select().single();
    if (error) { console.error('[dbSaveChangelogEntry insert]', error); return null; }
    return { id: data.id, version: data.version, date: data.entry_date,
      title: data.title, summary: data.summary, items: data.items, position: data.position };
  }
}

async function dbDeleteChangelogEntry(id) {
  if (!currentUser) return;
  const { error } = await sb.from('changelog_entries').delete().eq('id', id);
  if (error) console.error('[dbDeleteChangelogEntry]', error);
}

// ── Seed changelog from hardcoded array (first dev login) ──
async function dbSeedChangelog(entries) {
  const total = entries.length;
  for (let i = 0; i < total; i++) {
    const entry = entries[i];
    await dbSaveChangelogEntry({ ...entry, position: total - i });
  }
}

// ── User Management ────────────────────────────────
async function dbGetAllUsers() {
  if (!currentUser) return null;
  const { data, error } = await sb.rpc('get_all_users');
  if (error) { console.error('[dbGetAllUsers]', error); return null; }
  return data;
}

async function dbSetUserDisabled(userId, disabled) {
  if (!currentUser) return false;
  const { error } = await sb.rpc('set_user_disabled', { p_user_id: userId, p_disabled: disabled });
  if (error) { console.error('[dbSetUserDisabled]', error); return false; }
  return true;
}

// ── Health Stats ──────────────────────────────────
async function dbGetHealthStats() {
  if (!currentUser) return null;
  const { data, error } = await sb.rpc('get_health_stats');
  if (error) { console.error('[dbGetHealthStats]', error); return null; }
  return data;
}

// ── Announcements ──────────────────────────────────
async function dbLoadAnnouncements() {
  if (!currentUser) return [];
  const { data, error } = await sb.from('announcements').select('*').order('created_at', { ascending: false });
  if (error) { console.error('[dbLoadAnnouncements]', error); return []; }
  return (data || []).map(r => ({ id: r.id, message: r.message, active: r.active, createdAt: r.created_at }));
}

async function dbSaveAnnouncement(message) {
  if (!currentUser) return null;
  const { data, error } = await sb.from('announcements').insert({ message, active: true }).select().single();
  if (error) { console.error('[dbSaveAnnouncement]', error); return null; }
  return { id: data.id, message: data.message, active: data.active, createdAt: data.created_at };
}

async function dbToggleAnnouncement(id, active) {
  if (!currentUser) return false;
  const { error } = await sb.from('announcements').update({ active }).eq('id', id);
  if (error) { console.error('[dbToggleAnnouncement]', error); return false; }
  return true;
}

async function dbDeleteAnnouncement(id) {
  if (!currentUser) return;
  const { error } = await sb.from('announcements').delete().eq('id', id);
  if (error) console.error('[dbDeleteAnnouncement]', error);
}
