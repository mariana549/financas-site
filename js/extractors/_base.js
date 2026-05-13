// ══════════════════════════════════════════════════
// EXTRACTORS/_BASE.JS — Helpers compartilhados
// Todos os parsers dependem deste arquivo.
// ══════════════════════════════════════════════════

// Mapeamentos de meses PT-BR
const EXT_MONTH_ABBR = { JAN:'01',FEV:'02',MAR:'03',ABR:'04',MAI:'05',JUN:'06',JUL:'07',AGO:'08',SET:'09',OUT:'10',NOV:'11',DEZ:'12' };
const EXT_MONTH_NAME = { '01':'Janeiro','02':'Fevereiro','03':'Março','04':'Abril','05':'Maio','06':'Junho','07':'Julho','08':'Agosto','09':'Setembro','10':'Outubro','11':'Novembro','12':'Dezembro' };

// Parse de valor BRL → number
function extParseValor(s) {
  if (!s) return 0;
  return parseFloat(String(s).replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.')) || 0;
}

// "DD/MM/YYYY" ou "DD/MM/YY" → "YYYY-MM-DD"
function extFmtDate(s) {
  if (!s) return null;
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{2,4})$/);
  if (!m) return null;
  const y = m[3].length === 2 ? '20' + m[3] : m[3];
  return `${y}-${m[2]}-${m[1]}`;
}

// Extrai info de parcela e retorna { parcela: "X/Y", clean: descSemParcela }
function extExtractParcela(desc) {
  const m = desc.match(/[Pp]arcela\s+(\d+)\s+de\s+(\d+)/i)
         || desc.match(/[Pp]arcela\s+(\d+)\/(\d+)/)
         || desc.match(/\((\d+)\/(\d+)\)/)
         || desc.match(/\s+(\d{1,2})\/(\d{2,3})\s*$/);
  return m ? { parcela: `${m[1]}/${m[2]}`, clean: desc.replace(m[0], '').trim() } : { parcela: '', clean: desc.trim() };
}

// Extrai nome da pessoa de descrição de PIX
function extExtractName(raw) {
  if (!raw) return '';
  const parts = raw.split(/\s+-\s+/);
  let name = parts[0].trim();
  if (/^[•\u2022\.\d-]+$/.test(name)) name = (parts[1] || '').trim();
  return name;
}

// Linha de crédito/estorno — não é compra
function extIsFaturaCredit(desc) {
  return /^(Pagamento|Crédito|Estorno|Reembolso|Restituição|Cashback|Saldo\s+anterior|IOF\s+est)/i.test(desc);
}

// Linha de tarifa/encargo — ignorar
function extIsFaturaFee(desc) {
  return /^(Tarifa|IOF\s+de\s+saque|Encargo|Juros|Multa\s+por|Valor\s+de\s+saque|Saque\s+de\s+cr|Disponível\s+para|Limite\s+de\s+cr|Total\s+de\s+encargo|Total\s+da\s+fatura|Total\s+em\s+aberto|Pagamentos?\s+realizados?|Fatura\s+anterior)/i.test(desc);
}

// Detecta tipo de documento: fatura de cartão ou extrato de conta
function extDetectDocKind(lines) {
  const text = lines.join('\n');
  const isFatura =
    /TRANSAÇÕES\s+DE/i.test(text) ||
    /COMPRAS\s+NO\s+CART[ÃA]O/i.test(text) ||
    /FATURA\s+CART[ÃA]O/i.test(text) ||
    /Lançamentos\s+do\s+cartão/i.test(text) ||
    /Lançamentos\s+na\s+fatura/i.test(text) ||
    (/fatura/i.test(text) && /vencimento/i.test(text)) ||
    (/TRANSAÇÕES/i.test(text) && /Parcela/i.test(text));
  const isExtrato =
    /Saldo\s+(inicial|anterior|em\s+conta)/i.test(text) ||
    /Total\s+de\s+(entradas|saídas)/i.test(text) ||
    /Movimentações/i.test(text) ||
    /Extrato\s+(de\s+)?[Cc]onta/i.test(text) ||
    /Extrato\s+[Bb]ancário/i.test(text) ||
    /Saldo\s+[Ff]inal/i.test(text);
  return { isFatura, isExtrato };
}

// Sugestões de categoria por palavras-chave (compartilhado entre parsers)
const EXT_CAT_HINTS = [
  [/ifood|rappi|uber\s*eat|delivery|mcdonald|burger|pizza|restaurante|lanche|padaria|mercado|atacad|carrefour|supermercado/i, 'Alimentação'],
  [/netflix|spotify|amazon\s*prime|disney|hbo|globoplay|youtube|prime\s*video|deezer|streaming/i, 'Assinaturas'],
  [/uber|99|cabify|ônibus|metro|passagem|combustível|gasolina|estacionamento|pedágio|posto/i, 'Transporte'],
  [/farmácia|droga|remédio|médico|consulta|plano\s*de\s*saúde|unimed|amil|hospital|clínica/i, 'Saúde'],
  [/escola|faculdade|curso|mensalidade\s*escola|educação|livro|material/i, 'Educação'],
  [/luz|água|energia|cemig|copel|saneamento|gás|condomínio|iptu|aluguel|internet|vivo|claro|tim\b|oi\b|net\b/i, 'Moradia'],
  [/roupa|calçado|tênis|loja|renner|riachuelo|zara|c&a|shein/i, 'Vestuário'],
  [/ingresso|cinema|show|teatro|lazer|game|steam/i, 'Lazer'],
];
function extAutoCategory(desc) {
  for (const [re, cat] of EXT_CAT_HINTS) {
    if (re.test(desc)) return cat;
  }
  return null;
}

// Cria entrada no contrato padrão da Extratora
function extMakeEntry({ desc, amount, date, entryType, isMine = true, installment = false, installCurrent = null, installTotal = null, person = null, confidence = 80, bankSource = 'generic' }) {
  return {
    desc,
    amount,
    date: date || null,
    category: extAutoCategory(desc),
    entryType,
    isMine,
    owner: isMine ? 'mine' : 'other',
    installment,
    installCurrent,
    installTotal,
    person,
    _confidence: confidence,
    _bankSource: bankSource,
  };
}
