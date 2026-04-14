// ══════════════════════════════════════════════════
// DB.JS — Todas as funções de salvar/deletar no Supabase
// ══════════════════════════════════════════════════


async function loadAllFromSupabase() {
  if (!currentUser) return;
  setSyncing(true);
  try {
    const uid = currentUser.id;
    const [mRes, bRes, tRes, pRes, rRes, iRes, sRes, instRes] = await Promise.all([
      sb.from('months').select('*').eq('user_id', uid).order('created_at'),
      sb.from('banks').select('*').eq('user_id', uid),
      sb.from('transacoes').select('*').eq('user_id', uid),
      sb.from('pix_entries').select('*').eq('user_id', uid),
      sb.from('recurrents').select('*').eq('user_id', uid),
      sb.from('incomes').select('*').eq('user_id', uid),
      sb.from('subscriptions').select('*').eq('user_id', uid),
      sb.from('installments').select('*').eq('user_id', uid),
    ]);

    const months = (mRes.data || []).map(m => ({
      key: m.key, label: m.label, year: m.year, goal: m.goal,
      banks: (bRes.data || [])
        .filter(b => b.month_key === m.key)
        .map(b => ({
          name: b.name, color: b.color,
          entries: (tRes.data || [])
            .filter(t => t.month_key === m.key && t.bank_name === b.name)
            .map(t => ({
              id: t.id, desc: t.description, amount: parseFloat(t.amount),
              date: t.entry_date, owner: t.owner, person: t.person,
              category: t.category, note: t.note, type: t.type || 'normal',
              installCurrent: t.install_current, installTotal: t.install_total,
              groupId: t.group_id, autoInj: t.auto_injected
            }))
        }))
    }));

    const pixEntries = {};
    (pRes.data || []).forEach(p => {
      if (!pixEntries[p.month_key]) pixEntries[p.month_key] = [];
      pixEntries[p.month_key].push({
        id: p.id, to: p.to_person, amount: parseFloat(p.amount),
        date: p.entry_date, bank: p.bank_name, obs: p.obs
      });
    });

    const recurrents = {};
    (rRes.data || []).forEach(r => {
      if (!recurrents[r.month_key]) recurrents[r.month_key] = [];
      recurrents[r.month_key].push({
        id: r.id, desc: r.description, amount: parseFloat(r.amount),
        day: r.due_day, obs: r.obs
      });
    });

    const incomes = {};
    (iRes.data || []).forEach(i => {
      if (!incomes[i.month_key]) incomes[i.month_key] = [];
      incomes[i.month_key].push({
        id: i.id, desc: i.description, amount: parseFloat(i.amount),
        date: i.entry_date, incType: i.income_type, from: i.from_source,
        owner: i.owner, person: i.person
      });
    });

    const subscriptions = (sRes.data || []).map(s => ({
      id: s.id, name: s.name, amount: parseFloat(s.amount), cycle: s.cycle,
      bank: s.bank_name, day: s.due_day, startDate: s.start_date, endDate: s.end_date
    }));

    const installments = (instRes.data || []).map(i => ({
      id: i.id, gId: i.group_id, desc: i.description, amount: parseFloat(i.amount),
      total: i.total_parts, partNum: i.part_num, bankName: i.bank_name,
      owner: i.owner, person: i.person, cat: i.category,
      offset: i.month_offset, startKey: i.start_month_key, date: i.entry_date, done: i.done
    }));

    S.months = months;
    S.pixEntries = pixEntries;
    S.recurrents = recurrents;
    S.incomes = incomes;
    S.subscriptions = subscriptions;
    S.installments = installments;

    const saved = localStorage.getItem('fin_theme');
    if (saved) S.theme = saved;

  } catch (e) {
    console.error('Erro ao carregar dados:', e);
  }
  setSyncing(false);
}

async function dbSaveMonth(m) {
  if (!currentUser) return;
  await sb.from('months').upsert(
    { user_id: currentUser.id, key: m.key, label: m.label, year: m.year, goal: m.goal || null },
    { onConflict: 'user_id,key' }
  );
}

async function dbSaveBank(monthKey, bank) {
  if (!currentUser) return;
  await sb.from('banks').upsert(
    { user_id: currentUser.id, month_key: monthKey, name: bank.name, color: bank.color },
    { onConflict: 'user_id,month_key,name' }
  );
}

async function dbSaveEntry(monthKey, bankName, entry) {
  if (!currentUser) return;
  const { error } = await sb.from('transacoes').upsert({
    id: String(entry.id), user_id: currentUser.id, month_key: monthKey, bank_name: bankName,
    description: entry.desc, amount: entry.amount, entry_date: entry.date || null,
    owner: entry.owner || 'mine', person: entry.person || null, category: entry.category || null,
    note: entry.note || null, type: entry.type || 'normal',
    install_current: entry.installCurrent || null, install_total: entry.installTotal || null,
    group_id: entry.groupId || null, auto_injected: entry.autoInj || false
  }, { onConflict: 'id' });
  if (error) console.error('[dbSaveEntry] Supabase error:', error);
}

async function dbDeleteEntry(id) {
  if (!currentUser) return;
  await sb.from('transacoes').delete().eq('id', String(id)).eq('user_id', currentUser.id);
}

async function dbSavePix(monthKey, px) {
  if (!currentUser) return;
  await sb.from('pix_entries').upsert({
    id: String(px.id), user_id: currentUser.id, month_key: monthKey,
    to_person: px.to, amount: px.amount, entry_date: px.date || null,
    bank_name: px.bank || null, obs: px.obs || null
  }, { onConflict: 'id' });
}

async function dbDeletePix(id) {
  if (!currentUser) return;
  await sb.from('pix_entries').delete().eq('id', String(id)).eq('user_id', currentUser.id);
}

async function dbSaveRecurrent(monthKey, r) {
  if (!currentUser) return;
  await sb.from('recurrents').upsert({
    id: String(r.id), user_id: currentUser.id, month_key: monthKey,
    description: r.desc, amount: r.amount, due_day: r.day || null, obs: r.obs || null
  }, { onConflict: 'id' });
}

async function dbDeleteRecurrent(id) {
  if (!currentUser) return;
  await sb.from('recurrents').delete().eq('id', String(id)).eq('user_id', currentUser.id);
}

async function dbSaveIncome(monthKey, inc) {
  if (!currentUser) return;
  await sb.from('incomes').upsert({
    id: String(inc.id), user_id: currentUser.id, month_key: monthKey,
    description: inc.desc, amount: inc.amount, entry_date: inc.date || null,
    income_type: inc.incType || null, from_source: inc.from || null,
    owner: inc.owner || 'mine', person: inc.person || null
  }, { onConflict: 'id' });
}

async function dbDeleteIncome(id) {
  if (!currentUser) return;
  await sb.from('incomes').delete().eq('id', String(id)).eq('user_id', currentUser.id);
}

async function dbSaveSub(sub) {
  if (!currentUser) return;
  await sb.from('subscriptions').upsert({
    id: String(sub.id), user_id: currentUser.id, name: sub.name, amount: sub.amount,
    cycle: sub.cycle, bank_name: sub.bank || null, due_day: sub.day || null,
    start_date: sub.startDate || null, end_date: sub.endDate || null
  }, { onConflict: 'id' });
}

async function dbDeleteSub(id) {
  if (!currentUser) return;
  await sb.from('subscriptions').delete().eq('id', String(id)).eq('user_id', currentUser.id);
}

async function dbSaveInstallment(inst) {
  if (!currentUser) return;
  await sb.from('installments').upsert({
    id: inst.id, user_id: currentUser.id, group_id: inst.gId,
    description: inst.desc, amount: inst.amount, total_parts: inst.total,
    part_num: inst.partNum, bank_name: inst.bankName, owner: inst.owner,
    person: inst.person || null, category: inst.cat || null,
    month_offset: inst.offset, start_month_key: inst.startKey,
    entry_date: inst.date || null, done: inst.done || false
  }, { onConflict: 'id' });
}

async function dbDeleteInstallmentsByGroup(gId) {
  if (!currentUser) return;
  await sb.from('installments').delete().eq('group_id', gId).eq('user_id', currentUser.id);
}

async function dbMarkInstallmentDone(id) {
  if (!currentUser) return;
  await sb.from('installments').update({ done: true }).eq('id', id).eq('user_id', currentUser.id);
}