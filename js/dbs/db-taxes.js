// ══════════════════════════════════════════════════
// DB-TAXES.JS — Impostos PJ
// ══════════════════════════════════════════════════

async function dbLoadTaxes() {
  if (!currentUser || !S.activeContext) return [];
  const { data, error } = await sb.from('pj_taxes').select('*')
    .eq('user_id', currentUser.id).eq('context_id', S.activeContext.id)
    .order('due_date', { ascending: false });
  if (error) { console.error('[dbLoadTaxes]', error); return []; }
  return (data || []).map(r => ({
    id: r.id, type: r.type, amount: parseFloat(r.amount),
    dueDate: r.due_date, paid: r.paid, paidAt: r.paid_at,
    refMonth: r.ref_month, notes: r.notes || ''
  }));
}

async function dbSaveTax(tax) {
  if (!currentUser) return null;
  const row = {
    user_id: currentUser.id, context_id: S.activeContext?.id || null,
    type: tax.type, amount: tax.amount,
    due_date: tax.dueDate || null, paid: tax.paid || false,
    paid_at: tax.paidAt || null, ref_month: tax.refMonth || null,
    notes: tax.notes || null
  };
  if (tax.id) {
    const { data, error } = await sb.from('pj_taxes').update(row).eq('id', tax.id).select().single();
    if (error) { console.error('[dbSaveTax update]', error); return null; }
    return _taxFromRow(data);
  } else {
    const { data, error } = await sb.from('pj_taxes').insert(row).select().single();
    if (error) { console.error('[dbSaveTax insert]', error); return null; }
    return _taxFromRow(data);
  }
}

function _taxFromRow(r) {
  return { id: r.id, type: r.type, amount: parseFloat(r.amount),
    dueDate: r.due_date, paid: r.paid, paidAt: r.paid_at,
    refMonth: r.ref_month, notes: r.notes || '' };
}

async function dbMarkTaxPaid(id, paid) {
  if (!currentUser) return false;
  const { error } = await sb.from('pj_taxes').update({
    paid, paid_at: paid ? new Date().toISOString() : null
  }).eq('id', id).eq('user_id', currentUser.id);
  if (error) { console.error('[dbMarkTaxPaid]', error); return false; }
  return true;
}

async function dbDeleteTax(id) {
  if (!currentUser) return;
  const { error } = await sb.from('pj_taxes').delete().eq('id', id).eq('user_id', currentUser.id);
  if (error) console.error('[dbDeleteTax]', error);
}

async function dbSaveTaxRate(contextId, rate) {
  if (!currentUser) return false;
  const { error } = await sb.from('contexts').update({ tax_rate: rate }).eq('id', contextId).eq('user_id', currentUser.id);
  if (error) { console.error('[dbSaveTaxRate]', error); return false; }
  return true;
}
