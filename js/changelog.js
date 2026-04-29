// ══════════════════════════════════════════════════
// CHANGELOG.JS — Histórico de versões do app
// Adicionar nova entrada aqui antes de cada deploy.
// ══════════════════════════════════════════════════

const APP_VERSION = '1.3.0';

// Chave pública VAPID para notificações push.
// Gere em: https://vapidkeys.com/ ou rode: npx web-push generate-vapid-keys
// Depois adicione VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY e VAPID_MAILTO nos secrets do Supabase.
const VAPID_PUBLIC_KEY = 'BDiUaS0Fg_u2-MpjNuhK3fZ9WMngSQ1IxhsDXk1FKDnQIacME4CyNSK4n_g_6L8J6ZEkw3dKz2osFKvHnOXbshM';

// Cada entrada representa um lote de melhorias visível ao usuário.
// types disponíveis: 'feat' | 'fix' | 'improve'
const CHANGELOG = [
  {
    version: '1.1',
    date: 'Abril 2026',
    title: 'Import por IA muito melhorado',
    summary: 'A importação de extratos e faturas ficou muito mais inteligente e flexível.',
    items: [
      { type: 'feat',    text: 'Cada item importado tem seu próprio tipo (cartão, débito, PIX, boleto)' },
      { type: 'feat',    text: 'Toggle "Meu / Não meu" por item — com sugestão das pessoas já cadastradas' },
      { type: 'feat',    text: 'Categoria detectada automaticamente por palavras-chave, editável na hora' },
      { type: 'feat',    text: 'Data de cada compra extraída direto do extrato ou fatura' },
      { type: 'feat',    text: 'Suporte a faturas do Mercado Livre: filtra tarifas, lê parcelas "X de Y", extrai o ano do cabeçalho' },
      { type: 'feat',    text: 'Funciona com qualquer banco: Nubank, Itaú, Bradesco, C6, Santander e outros' },
      { type: 'improve', text: 'Campo de data como DD/MM/AAAA — mais fácil de editar manualmente' },
      { type: 'fix',     text: 'Lançamentos importados agora aparecem corretamente nos totais e em Meus Gastos' },
      { type: 'fix',     text: 'Nome da pessoa sempre salvo com capitalização correta, sem duplicatas' },
    ]
  },
  {
    version: '1.1',
    date: 'Abril 2026',
    title: 'Assinaturas de terceiros corrigidas',
    summary: 'Assinaturas marcadas como "de outra pessoa" agora se comportam corretamente.',
    items: [
      { type: 'fix', text: 'Não aparecem mais em Meus Gastos com valor R$ 0,00' },
      { type: 'fix', text: 'Card da assinatura não exibe mais "meu: R$ 0,00" — só aparece quando é conjunto' },
    ]
  },
  {
    version: '1.1',
    date: 'Abril 2026',
    title: 'Página de novidades',
    summary: 'Agora você sabe o que mudou a cada atualização.',
    items: [
      { type: 'feat', text: 'Banner aparece uma vez após cada atualização com link para ver as novidades' },
      { type: 'feat', text: 'Página de histórico acessível pelo menu a qualquer momento' },
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
  const typeColor = {
    feat:    { bg: 'rgba(77,159,255,.12)', text: 'var(--accent)',  border: 'rgba(77,159,255,.3)' },
    fix:     { bg: 'rgba(77,255,145,.1)',  text: 'var(--green)',   border: 'rgba(77,255,145,.25)' },
    improve: { bg: 'rgba(255,159,77,.1)',  text: 'var(--orange)',  border: 'rgba(255,159,77,.25)' },
  };

  // Usa entradas do Supabase se disponíveis, senão usa as hardcoded
  const source = (S.changelogEntries && S.changelogEntries.length > 0) ? S.changelogEntries : CHANGELOG;

  // Agrupar entradas com mesma versão em uma única "release"
  const releases = [];
  let lastVer = null;
  for (const entry of source) {
    if (entry.version !== lastVer) {
      releases.push({ version: entry.version, date: entry.date, groups: [] });
      lastVer = entry.version;
    }
    releases[releases.length - 1].groups.push(entry);
  }

  const header = `
    <div style="margin-bottom:28px;padding-bottom:20px;border-bottom:1px solid var(--border)">
      <div style="font-size:22px;font-weight:700;color:var(--text);margin-bottom:4px">O que há de novo ✨</div>
      <div style="font-size:13px;color:var(--text2)">Acompanhe as melhorias e correções de cada versão</div>
    </div>`;

  el.innerHTML = header + releases.map((rel, ri) => {
    const isLatest = ri === 0;

    const groups = rel.groups.map(g => {
      const rows = g.items.map(it => {
        const c = typeColor[it.type];
        return `
        <li style="display:flex;align-items:flex-start;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">
          <span style="flex-shrink:0;font-size:10px;font-family:var(--mono);padding:2px 8px;border-radius:20px;
            background:${c.bg};color:${c.text};border:1px solid ${c.border};margin-top:2px;white-space:nowrap;letter-spacing:.3px">
            ${typeLabel[it.type]}
          </span>
          <span style="font-size:13px;color:var(--text);line-height:1.5">${it.text}</span>
        </li>`;
      }).join('');

      return `
      <div style="margin-bottom:12px;background:var(--bg2);border:1px solid var(--border);border-radius:10px;overflow:hidden">
        <div style="padding:12px 16px 10px;border-bottom:1px solid var(--border)">
          <div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:2px">${g.title}</div>
          <div style="font-size:12px;color:var(--text2);line-height:1.4">${g.summary}</div>
        </div>
        <ul style="list-style:none;margin:0;padding:0 16px">${rows}
          <li style="height:4px"></li>
        </ul>
      </div>`;
    }).join('');

    return `
    <div style="display:flex;gap:16px;margin-bottom:28px">
      <!-- Linha do tempo -->
      <div style="display:flex;flex-direction:column;align-items:center;padding-top:4px;flex-shrink:0">
        <div style="width:12px;height:12px;border-radius:50%;
          background:${isLatest ? 'var(--accent)' : 'var(--border2)'};
          box-shadow:${isLatest ? '0 0 0 3px rgba(77,159,255,.2)' : 'none'};
          flex-shrink:0"></div>
        ${ri < releases.length - 1 ? `<div style="flex:1;width:2px;background:var(--border);margin-top:4px;min-height:20px"></div>` : ''}
      </div>
      <!-- Conteúdo -->
      <div style="flex:1;min-width:0;padding-bottom:4px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
          <span style="font-size:16px;font-weight:700;color:var(--text);font-family:var(--mono)">v${rel.version}</span>
          ${isLatest ? `<span style="font-size:10px;font-family:var(--mono);padding:2px 9px;border-radius:20px;background:var(--accent);color:#fff;letter-spacing:.3px">atual</span>` : ''}
          <span style="font-size:11px;color:var(--text3);font-family:var(--mono);margin-left:auto">${rel.date}</span>
        </div>
        ${groups}
      </div>
    </div>`;
  }).join('');
}
