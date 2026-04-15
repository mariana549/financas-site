// ══════════════════════════════════════════════════
// UTILS — Funções utilitárias globais
// ══════════════════════════════════════════════════

function fmt(n) {
  return (n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d) {
  if (!d) return '—';
  try { const [y, mo, day] = d.split('-'); return `${day}/${mo}`; }
  catch { return d; }
}

function fmtDateLong(d) {
  if (!d) return '—';
  try {
    const [y, mo, day] = d.split('-');
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${day} ${months[parseInt(mo) - 1]} ${y}`;
  } catch { return d; }
}

function today() {
  return new Date().toISOString().split('T')[0];
}

function fillSel(id, opts) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = opts.map(o => `<option value="${o}">${o}</option>`).join('');
}

function clr(...ids) {
  ids.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
}

function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('open');
  if (id === 'mBank') buildColorGrid();
  if (id === 'mMonth') {
    const now = new Date();
    const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    let mo = now.getMonth(); // 0-based
    let yr = now.getFullYear();
    // Se o mês atual já existe, sugere o próximo
    if (S.months.find(x => x.key === months[mo] + '/' + yr)) {
      mo = (mo + 1) % 12;
      if (mo === 0) yr++;
    }
    const mSel = document.getElementById('mSel');
    const mYear = document.getElementById('mYear');
    if (mSel) mSel.value = months[mo];
    if (mYear) mYear.value = yr;
  }
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
}

function getAllPeople() {
  const s = new Set();
  S.months.forEach(m => m.banks.forEach(b => b.entries.forEach(e => {
    if (e.owner === 'other' && e.person) s.add(e.person);
    if (e.splitPeople) e.splitPeople.filter(Boolean).forEach(p => s.add(p));
  })));
  return [...s];
}

const MONTH_NUM = {
  'Janeiro':1,'Fevereiro':2,'Março':3,'Abril':4,'Maio':5,'Junho':6,
  'Julho':7,'Agosto':8,'Setembro':9,'Outubro':10,'Novembro':11,'Dezembro':12
};

function getMonthDateRange(m) {
  const mn = MONTH_NUM[m.label] || 1;
  const yr = parseInt(m.year);
  const pad = n => String(n).padStart(2, '0');
  const min = `${yr}-${pad(mn)}-01`;
  const lastDay = new Date(yr, mn, 0).getDate();
  const max = `${yr}-${pad(mn)}-${pad(lastDay)}`;
  return { min, max };
}

// ── Toast global ──
function showToast(msg, type = 'ok') {
  let toast = document.getElementById('appToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'appToast';
    toast.style.cssText = 'position:fixed;bottom:28px;left:50%;transform:translateX(-50%);' +
      'padding:10px 20px;border-radius:8px;font-size:13px;z-index:9999;' +
      'font-family:var(--mono);white-space:nowrap;pointer-events:none;transition:opacity .3s';
    document.body.appendChild(toast);
  }
  const isErr = type === 'error';
  toast.style.background = isErr ? '#1a0a0a' : 'var(--bg3)';
  toast.style.border = `1px solid ${isErr ? '#ff4d4d55' : 'var(--border2)'}`;
  toast.style.color = isErr ? 'var(--red)' : 'var(--text)';
  toast.textContent = msg;
  toast.style.opacity = '1';
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { toast.style.opacity = '0'; }, 2500);
}

// ── Skeleton Screens ──
function renderSkeleton() {
  const card = (w1, w2) =>
    `<div class="card"><div class="skel" style="width:${w1}%;height:10px;margin-bottom:10px"></div><div class="skel" style="width:${w2}%;height:22px"></div></div>`;
  return `
    <div class="summary-grid" style="margin-bottom:22px">
      ${card(55,80)}${card(65,70)}${card(50,85)}${card(60,75)}
    </div>
    <div class="skel" style="height:38px;border-radius:8px;margin-bottom:18px"></div>
    <div class="skel" style="height:48px;border-radius:8px;margin-bottom:10px"></div>
    <div class="skel" style="height:48px;border-radius:8px;margin-bottom:10px"></div>
    <div class="skel" style="height:48px;border-radius:8px"></div>
  `;
}

// ── Ícones automáticos por categoria/descrição ──
function getCategoryIcon(desc, cat) {
  const MAP = [
    [/uber|99|cabify|táxi|taxi|lyft/i,                            '🚗'],
    [/ifood|rappi|delivery|pizza|lanche|hamburguer|burger|sushi/i,'🍕'],
    [/restaurante|almoço|almoco|jantar|bar |boteco/i,             '🍽️'],
    [/mercado|supermercado|carrefour|atacado|feira|hortifruti/i,  '🛒'],
    [/netflix|spotify|prime|disney|hbo|streaming/i,               '📺'],
    [/farmácia|farmacia|remédio|remedio|drogaria|saúde|saude|médico|medico|hospital|plano.saúde/i, '💊'],
    [/academia|gym|fitness|crossfit/i,                            '💪'],
    [/gasolina|combustível|combustivel|posto|etanol|álcool.carro/i,'⛽'],
    [/luz|energia|elétrica|eletrica|cpfl|cemig|enel|coelba/i,    '💡'],
    [/água|agua|saneamento|sabesp|cagece/i,                       '💧'],
    [/internet|tim|claro|vivo|oi |net |telefone|celular|plano.móvel|plano.movel/i,'📱'],
    [/aluguel|condomínio|condominio|iptu|moradia/i,               '🏠'],
    [/escola|faculdade|curso|livro|educação|educacao|ensino/i,    '📚'],
    [/viagem|hotel|airbnb|passagem|voo|turismo|pousada/i,         '✈️'],
    [/roupa|calçado|calcado|moda|zara|hm |riachuelo|lojas/i,     '👕'],
    [/cinema|teatro|show|ingresso|entretenimento|jogo /i,         '🎬'],
    [/pet|veterinário|veterinario|ração|racao|petshop/i,          '🐾'],
    [/cabelo|salão|salao|barbearia|manicure|estética|estetica/i,  '💈'],
    [/pix /i,                                                     '💸'],
    [/cartão|cartao|anuidade/i,                                   '💳'],
    [/padaria|café|cafe|cafeteria|cafézinho/i,                    '☕'],
    [/presente|gift|natal|aniversário|aniversario/i,              '🎁'],
    [/seguro/i,                                                   '🛡️'],
    [/imposto|ir |irpf|receita.federal/i,                         '🏛️'],
  ];
  const text = `${desc || ''} ${cat || ''}`;
  for (const [re, icon] of MAP) {
    if (re.test(text)) return icon;
  }
  return '';
}

// ── Swipe to delete/edit em linhas de lançamento ──
function initSwipeRows() {
  const THRESHOLD = 75;
  document.querySelectorAll('#view-dash .entry-row[data-entry-id]').forEach(row => {
    let startX = 0, startY = 0, dx = 0, moved = false;
    const cells = () => row.querySelectorAll('td');

    // Bloqueia o click se houve movimento horizontal
    row.addEventListener('click', e => {
      if (moved) { e.stopImmediatePropagation(); moved = false; }
    }, true);

    row.addEventListener('touchstart', e => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      dx = 0; moved = false;
      row.style.transition = 'none';
    }, { passive: true });

    row.addEventListener('touchmove', e => {
      const cx = e.touches[0].clientX;
      const cy = e.touches[0].clientY;
      const ddx = cx - startX;
      const ddy = cy - startY;
      if (!moved && Math.abs(ddx) < 10) return;
      if (!moved && Math.abs(ddy) > Math.abs(ddx)) return; // scroll vertical
      moved = true;
      dx = ddx;
      row.style.transform = `translateX(${dx}px)`;
      const pct = Math.min(Math.abs(dx) / THRESHOLD, 1);
      cells().forEach(td => {
        td.style.background = dx < 0
          ? `rgba(255,77,77,${(pct * 0.22).toFixed(2)})`
          : `rgba(77,160,255,${(pct * 0.22).toFixed(2)})`;
      });
    }, { passive: true });

    row.addEventListener('touchend', () => {
      const tr = 'transform .22s ease, background .22s ease';
      row.style.transition = tr;
      if (dx < -THRESHOLD) {
        cells().forEach(td => td.style.background = 'rgba(255,77,77,0.22)');
        setTimeout(() => {
          row.style.transform = '';
          cells().forEach(td => td.style.background = '');
          deleteEntry(row.dataset.bank, row.dataset.entryId);
        }, 220);
      } else if (dx > THRESHOLD) {
        cells().forEach(td => td.style.background = 'rgba(77,160,255,0.22)');
        setTimeout(() => {
          row.style.transform = '';
          cells().forEach(td => td.style.background = '');
          openEntryM(row.dataset.entryId, row.dataset.bank);
        }, 220);
      } else {
        row.style.transform = '';
        cells().forEach(td => td.style.background = '');
      }
      dx = 0;
    });
  });
}

// ── Fechar modal ao clicar fora ──
document.querySelectorAll('.modal-overlay').forEach(m => {
  m.addEventListener('click', e => { if (e.target === m) m.classList.remove('open'); });
});