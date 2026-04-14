// ══════════════════════════════════════════════════
// COBRANCA.JS — Cobrança de Terceiros
// ══════════════════════════════════════════════════

let _cobData = null;

function openCobranca(person) {
  const m = getMonth();
  if (!m) return;

  const cartao = m.banks.flatMap(b =>
    b.entries
      .filter(e => e.owner === 'other' && e.person === person)
      .map(e => ({ ...e, bankName: b.name, _tipo: 'cartao' }))
  );

  const pix = (S.pixEntries[m.key] || [])
    .filter(p => p.to === person)
    .map(p => ({
      id: p.id, desc: `Pix${p.obs ? ' — ' + p.obs : ''}`,
      amount: p.amount, date: p.date, bankName: p.bank,
      _tipo: 'pix', type: 'pix', category: null,
      installCurrent: null, installTotal: null
    }));

  const allItems = [...cartao, ...pix];
  const total    = allItems.reduce((s, e) => s + e.amount, 0);

  _cobData = { person, items: allItems, total, month: m };

  const el = document.getElementById('mCobrancaContent');
  if (!el) return;

  el.innerHTML = `
    <div style="text-align:center;padding:12px 0 20px">
      <div style="font-size:30px;font-weight:700;font-family:var(--mono);color:var(--blue)">R$ ${fmt(total)}</div>
      <div style="font-size:13px;color:var(--text2);margin-top:4px;font-weight:500">${person}</div>
      <div style="font-size:11px;color:var(--text3);font-family:var(--mono)">${m.label} ${m.year} · ${allItems.length} item(s)</div>
    </div>
    <div class="tbl-block" style="margin-bottom:16px">
      <table>
        <thead><tr><th>Descrição</th><th>Banco</th><th>Valor</th></tr></thead>
        <tbody>
          ${allItems.map(e => `
            <tr>
              <td>
                ${e.desc}
                ${e.installCurrent ? `<span class="bm bm-inst" style="margin-left:4px">${e.installCurrent}/${e.installTotal}</span>` : ''}
                ${e._tipo === 'pix' ? `<span class="bm bm-pix" style="margin-left:4px">pix</span>` : ''}
                ${e.category ? `<span class="bm bm-cat" style="margin-left:4px">${e.category}</span>` : ''}
              </td>
              <td style="color:var(--text3);font-size:12px;font-family:var(--mono)">${e.bankName || '—'}</td>
              <td><span class="amt">R$ ${fmt(e.amount)}</span></td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="copiarCobranca('simples')">📋 Simples</button>
      <button class="btn btn-primary" onclick="copiarCobranca('completo')">💬 Completo</button>
    </div>`;

  openModal('mCobranca');
}

function copiarCobranca(tipo) {
  if (!_cobData) return;
  const { person, items, total, month } = _cobData;

  let texto;
  if (tipo === 'simples') {
    const linhas = items.map(e => {
      let l = `• ${e.desc}: R$ ${fmt(e.amount)}`;
      if (e.installCurrent) l += ` ${e.installCurrent}/${e.installTotal}`;
      return l;
    }).join('\n');
    texto = `${person} — ${month.label} ${month.year}:\n${linhas}\n─────────────────\nTotal: R$ ${fmt(total)}`;
  } else {
    const linhas = items.map(e => {
      let l = `• ${e.desc}: R$ ${fmt(e.amount)}`;
      if (e.installCurrent) l += ` (parcela ${e.installCurrent}/${e.installTotal})`;
      if (e._tipo === 'pix') l += ' (pix)';
      return l;
    }).join('\n');
    texto = `💰 ${person}\n📅 ${month.label} ${month.year}\n\n${linhas}\n\n═══════════════════\n💵 Total: R$ ${fmt(total)}`;
  }

  const fallback = () => {
    const ta = document.createElement('textarea');
    ta.value = texto;
    ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
    document.body.appendChild(ta);
    ta.focus(); ta.select();
    try { document.execCommand('copy'); } catch {}
    document.body.removeChild(ta);
    showToast('📋 Cobrança copiada!');
  };

  if (navigator.clipboard) {
    navigator.clipboard.writeText(texto)
      .then(() => showToast('📋 Cobrança copiada!'))
      .catch(fallback);
  } else {
    fallback();
  }
}

