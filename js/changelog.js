// ══════════════════════════════════════════════════
// CHANGELOG.JS — Histórico de versões do app
// Adicionar nova entrada aqui antes de cada deploy.
// ══════════════════════════════════════════════════

const APP_VERSION = '1.1.1';

// Tipos: 'feat' (novo) | 'fix' (correção) | 'improve' (melhoria)
const CHANGELOG = [
  {
    version: '1.1.1',
    date: '28/04/2026',
    items: [
      { type: 'fix',     text: 'Assinatura "de outra pessoa" não aparece mais em Meus Gastos com R$ 0,00' },
      { type: 'fix',     text: 'Card de assinatura não exibe mais "meu: R$ 0,00" quando é de terceiro' },
    ]
  },
  {
    version: '1.1.0',
    date: '28/04/2026',
    items: [
      { type: 'feat',    text: 'Import IA: nome de pessoa normalizado automaticamente (sem duplicatas de capitalização)' },
      { type: 'fix',     text: 'Import IA: lançamentos agora contabilizam corretamente em Meus Gastos e totais' },
      { type: 'fix',     text: 'Import IA: "R$" não aparece mais no final da descrição do item' },
    ]
  },
  {
    version: '1.0.9',
    date: '27/04/2026',
    items: [
      { type: 'improve', text: 'Campo de data no import IA agora aceita texto DD/MM/AAAA (mais fácil de editar)' },
      { type: 'fix',     text: 'R$ residual removido da descrição em faturas com valor na linha seguinte' },
    ]
  },
  {
    version: '1.0.7',
    date: '27/04/2026',
    items: [
      { type: 'feat',    text: 'Parser de fatura: extrai ano do cabeçalho (Emissão, Transações de...)' },
      { type: 'feat',    text: 'Parser de fatura: suporte a "Parcela X de Y" (formato Mercado Livre / Nubank)' },
      { type: 'feat',    text: 'Parser de fatura: filtra automaticamente seção Tarifas e Encargos' },
      { type: 'feat',    text: 'Parser de fatura: lida com valor na linha seguinte à descrição (multi-linha)' },
      { type: 'feat',    text: 'Data de compra incluída em cada item importado da fatura' },
    ]
  },
  {
    version: '1.0.6',
    date: '26/04/2026',
    items: [
      { type: 'feat',    text: 'Import IA: cada lançamento tem seu próprio tipo (cartão, débito, pix, boleto)' },
      { type: 'feat',    text: 'Import IA: toggle "Meu / Não meu" por item com sugestão de pessoas cadastradas' },
      { type: 'feat',    text: 'Import IA: categoria automática por palavras-chave, editável com sugestões' },
      { type: 'feat',    text: 'Import IA: múltiplas seções de PDF selecionáveis de uma vez' },
      { type: 'feat',    text: 'Import IA: suporte a extratos de qualquer banco (Itaú, Bradesco, C6, Santander, BB...)' },
    ]
  },
];

// ── Banner "O que há de novo" ──────────────────────
function checkVersionBanner() {
  const seen = localStorage.getItem('fin_seen_version');
  if (seen === APP_VERSION) return;
  const el = document.getElementById('versionBanner');
  if (el) el.style.display = 'flex';
}

function dismissVersionBanner(openChangelog) {
  localStorage.setItem('fin_seen_version', APP_VERSION);
  const el = document.getElementById('versionBanner');
  if (el) el.style.display = 'none';
  if (openChangelog) showView('changelog');
}

// ── Render da view de changelog ────────────────────
function renderChangelog() {
  const el = document.getElementById('changelogContent');
  if (!el) return;

  const typeLabel = { feat: 'novo', fix: 'correção', improve: 'melhoria' };
  const typeColor = { feat: 'var(--accent)', fix: 'var(--green)', improve: 'var(--orange)' };

  el.innerHTML = CHANGELOG.map((entry, idx) => {
    const isLatest = idx === 0;
    const rows = entry.items.map(it => `
      <div style="display:flex;align-items:flex-start;gap:10px;padding:7px 0;border-bottom:1px solid var(--border)">
        <span style="flex-shrink:0;font-size:10px;font-family:var(--mono);padding:2px 7px;border-radius:20px;
          background:${typeColor[it.type]}22;color:${typeColor[it.type]};border:1px solid ${typeColor[it.type]}55;
          margin-top:1px;white-space:nowrap">${typeLabel[it.type]}</span>
        <span style="font-size:13px;color:var(--text);line-height:1.4">${it.text}</span>
      </div>`).join('');

    return `
    <div style="margin-bottom:20px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
        <span style="font-size:15px;font-weight:600;color:var(--text)">v${entry.version}</span>
        ${isLatest ? `<span style="font-size:10px;font-family:var(--mono);padding:2px 8px;border-radius:20px;background:var(--accent);color:#fff">atual</span>` : ''}
        <span style="font-size:11px;color:var(--text3);font-family:var(--mono);margin-left:auto">${entry.date}</span>
      </div>
      <div style="background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:4px 12px">
        ${rows}
      </div>
    </div>`;
  }).join('');
}
