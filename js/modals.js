// ══════════════════════════════════════════════════
// MODALS.JS — Injeção de todos os modais no body
// ══════════════════════════════════════════════════

function injectModals() {
  document.body.insertAdjacentHTML('beforeend', `
<!-- Month -->
<div class="modal-overlay" id="mMonth"><div class="modal modal-sm">
  <div class="modal-title">Novo Mês <button class="modal-close" onclick="closeModal('mMonth')">×</button></div>
  <div class="fr">
    <div class="fg"><label>Mês</label><select id="mSel"><option>Janeiro</option><option>Fevereiro</option><option>Março</option><option>Abril</option><option>Maio</option><option>Junho</option><option>Julho</option><option>Agosto</option><option>Setembro</option><option>Outubro</option><option>Novembro</option><option>Dezembro</option></select></div>
    <div class="fg"><label>Ano</label><input type="number" id="mYear" value="2025" min="2020" max="2035"></div>
  </div>
  <div class="fg"><label>Meta de gastos (R$) — opcional <span class="tip" data-tip="Quanto você quer gastar no mês.&#10;Só conta seus gastos (Meu).&#10;Gastos de terceiros não entram.">?</span></label><input type="number" id="mMonthGoal" step="0.01" placeholder="ex: 3000,00"></div>
  <div class="modal-actions">
    <button class="btn btn-ghost btn-sm" onclick="copyLastMonth()">📋 Copiar mês anterior</button>
    <button class="btn btn-ghost btn-sm" onclick="closeModal('mMonth')">Cancelar</button>
    <button class="btn btn-primary btn-sm" onclick="addMonth()">Criar</button>
  </div>
</div></div>

<!-- Bank -->
<div class="modal-overlay" id="mBank"><div class="modal modal-sm">
  <div class="modal-title">Novo Banco <button class="modal-close" onclick="closeModal('mBank')">×</button></div>
  <div class="fg"><label>Nome</label><input type="text" id="bName" placeholder="Nubank, Will, Mercado Livre..."></div>
  <div class="fg"><label>Cor</label><div class="color-grid" id="colorGrid"></div></div>
  <div class="modal-actions"><button class="btn btn-ghost btn-sm" onclick="closeModal('mBank')">Cancelar</button><button class="btn btn-primary btn-sm" onclick="addBank()">Adicionar</button></div>
</div></div>

<!-- Global Bank -->
<div class="modal-overlay" id="mGlobalBank"><div class="modal modal-sm">
  <div class="modal-title">Novo Banco Global <button class="modal-close" onclick="closeModal('mGlobalBank')">×</button></div>
  <div class="fg"><label>Nome</label><input type="text" id="gbName" placeholder="Nubank, Itaú, Mercado Livre..."></div>
  <div class="fg"><label>Cor</label><div class="color-grid" id="gbColorGrid"></div></div>
  <div class="modal-actions"><button class="btn btn-ghost btn-sm" onclick="closeModal('mGlobalBank')">Cancelar</button><button class="btn btn-primary btn-sm" onclick="addGlobalBank()">Adicionar</button></div>
</div></div>

<!-- Entry -->
<div class="modal-overlay" id="mEntry"><div class="modal">
  <div class="modal-title" id="entryTitle">Novo Lançamento <button class="modal-close" onclick="closeModal('mEntry')">×</button></div>
  <div class="fg"><label>Descrição</label><input type="text" id="eDesc" placeholder="ex: Mercado, iFood, Gasolina..."></div>
  <div class="fr">
    <div class="fg">
      <label>Valor Total da Compra (R$) <span class="tip" data-tip="Digite o valor total.&#10;Para parcelado, o app divide&#10;automaticamente por parcela.">?</span></label>
      <input type="number" id="eAmt" step="0.01" placeholder="0,00" oninput="updateInstallHint()">
      <div id="installHint" style="font-size:11px;color:var(--text3);font-family:var(--mono);margin-top:4px;display:none"></div>
    </div>
    <div class="fg"><label>Data</label><input type="date" id="eDate"></div>
  </div>
  <div class="fg"><label>Tipo</label>
    <div class="tgl">
      <div class="tgl-o active" id="tNormal" onclick="setEType('normal')">Normal</div>
      <div class="tgl-o" id="tInstall" onclick="setEType('installment')">Parcelado</div>
      <div class="tgl-o" id="tPix" onclick="setEType('pix')">Pix</div>
      <div class="tgl-o" id="tDebit" onclick="setEType('debit')">Débito</div>
      <div class="tgl-o" id="tCash" onclick="setEType('cash')">Dinheiro</div>
    </div>
  </div>
  <div id="installGroup" style="display:none">
    <div class="fr">
      <div class="fg"><label>Total parcelas <span class="tip" data-tip="Quantas parcelas no total.&#10;Ex: 12x → o app lança R$ X/12&#10;nos próximos 12 meses.">?</span></label><input type="number" id="eInstTotal" min="2" max="60" placeholder="ex: 12" oninput="updateInstallHint()"></div>
      <div class="fg"><label>Parcela atual</label><input type="number" id="eInstCur" min="1" value="1"></div>
    </div>
    <div style="background:var(--bg3);border-radius:6px;padding:9px 12px;font-size:11px;color:var(--text3);font-family:var(--mono);margin-bottom:12px">
      ⚡ Próximas parcelas aparecem automaticamente nos meses seguintes.
    </div>
  </div>
  <div class="fg"><label>De quem <span class="tip" data-tip="Meu = entra na sua meta.&#10;Outra pessoa = entra em A Receber.&#10;Dividido = metade na sua meta,&#10;metade em A Receber.">?</span></label>
    <div class="tgl">
      <div class="tgl-o active" id="tMine" onclick="setOwner('mine')">Meu</div>
      <div class="tgl-o" id="tOther" onclick="setOwner('other')">Outra pessoa</div>
      <div class="tgl-o" id="tSplit" onclick="setOwner('split')">Dividido</div>
    </div>
  </div>
  <div id="personGroup" style="display:none">
    <div class="fg"><label>Nome da Pessoa</label><input type="text" id="ePerson" placeholder="Sogra, Pai, Mãe..."></div>
    <div class="chips" id="personChips"></div>
  </div>
  <div id="splitGroup" style="display:none">
    <div class="fg">
      <label>Total de pessoas (incluindo você) <span class="tip" data-tip="Quantas pessoas ao todo dividem este gasto, contando com você. Ex: você + 2 amigos = 3 pessoas.">?</span></label>
      <div style="display:flex;align-items:center;gap:8px;margin-top:5px;margin-bottom:10px">
        <button class="btn btn-ghost" style="padding:1px 10px;font-size:15px;line-height:1.4;border-radius:5px" onclick="adjustSplitCount(-1)">−</button>
        <span id="splitCountVal" style="font-family:var(--mono);font-size:17px;font-weight:700;min-width:22px;text-align:center;color:var(--accent)">2</span>
        <button class="btn btn-ghost" style="padding:1px 10px;font-size:15px;line-height:1.4;border-radius:5px" onclick="adjustSplitCount(1)">+</button>
        <span style="font-size:11px;color:var(--text3);font-family:var(--mono)">pessoas no total</span>
      </div>
    </div>
    <label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin-bottom:10px;font-size:12px;color:var(--text2)">
      <input type="checkbox" id="splitCustomPct" onchange="toggleSplitCustomPct(this.checked)" style="width:auto;margin:0;cursor:pointer">
      Porcentagem personalizada
    </label>
    <div id="splitPctRow" style="display:none;margin-bottom:10px">
      <div class="fg" style="margin-bottom:0">
        <label style="font-size:12px">Minha parte (%)</label>
        <input type="number" id="splitMyPct" min="1" max="99" step="1" placeholder="ex: 40"
          oninput="S.splitMyPct=parseFloat(this.value)||null;updateSplitHint()">
      </div>
    </div>
    <div id="splitNamesWrap"></div>
    <div id="splitHint" style="font-size:11px;color:var(--text3);font-family:var(--mono);margin-top:4px;margin-bottom:12px;line-height:1.9">—</div>
  </div>
  <div class="fg"><label>Categoria</label>
    <div class="chips" id="catChips">
      <div class="chip" onclick="pickCat(this)">Mercado</div>
      <div class="chip" onclick="pickCat(this)">Moto</div>
      <div class="chip" onclick="pickCat(this)">Notebook</div>
      <div class="chip" onclick="pickCat(this)">Saúde</div>
      <div class="chip" onclick="pickCat(this)">Lazer</div>
      <div class="chip" onclick="pickCat(this)">Transporte</div>
      <div class="chip" onclick="pickCat(this)">Alimentação</div>
      <div class="chip" onclick="pickCat(this)">Compras Online</div>
      <div class="chip" onclick="pickCat(this)">Outros</div>
    </div>
    <input type="text" id="eCat" placeholder="ou digite..." style="margin-top:7px"
      oninput="document.querySelectorAll('#catChips .chip').forEach(c=>c.classList.remove('sel'))">
  </div>
  <div class="fg"><label>Observação</label><textarea id="eNote" placeholder="detalhes adicionais..."></textarea></div>
  <div class="fg"><label>Banco</label><select id="eBank"></select></div>
  <input type="hidden" id="editEntryId">
  <input type="hidden" id="editBankName">
  <div class="modal-actions">
    <button class="btn btn-ghost btn-sm" onclick="closeModal('mEntry')">Cancelar</button>
    <button class="btn btn-primary btn-sm" onclick="saveEntry()">Salvar</button>
  </div>
</div></div>

<!-- Entry Detail -->
<div class="modal-overlay" id="mDetail"><div class="modal modal-sm">
  <div class="modal-title" id="detailTitle">Detalhes <button class="modal-close" onclick="closeModal('mDetail')">×</button></div>
  <div id="detailContent"></div>
  <div class="modal-actions" id="detailActions"></div>
</div></div>

<!-- Income -->
<div class="modal-overlay" id="mIncome"><div class="modal">
  <div class="modal-title" id="incomeTitle">Nova Entrada <button class="modal-close" onclick="closeModal('mIncome')">×</button></div>
  <div class="fg"><label>Descrição</label><input type="text" id="incDesc" placeholder="Salário, Freela, Transferência..."></div>
  <div class="fr">
    <div class="fg"><label>Valor (R$)</label><input type="number" id="incAmt" step="0.01" placeholder="0,00"></div>
    <div class="fg"><label>Data</label><input type="date" id="incDate"></div>
  </div>
  <div class="fg"><label>Tipo</label>
    <div class="chips" id="incTypeChips">
      <div class="chip sel" onclick="pickIncType(this)">Salário</div>
      <div class="chip" onclick="pickIncType(this)">Freela</div>
      <div class="chip" onclick="pickIncType(this)">Transferência</div>
      <div class="chip" onclick="pickIncType(this)">Pix</div>
      <div class="chip" onclick="pickIncType(this)">Débito</div>
      <div class="chip" onclick="pickIncType(this)">Dinheiro</div>
      <div class="chip" onclick="pickIncType(this)">Outros</div>
    </div>
  </div>
  <div class="fg"><label>Origem (opcional)</label><input type="text" id="incFrom" placeholder="empresa, cliente..."></div>
  <div class="fg"><label>É dinheiro seu ou de outra pessoa? <span class="tip" data-tip="Meu = entra no seu saldo do mês.&#10;De outra pessoa = registra que&#10;alguém te deve, mas não conta&#10;como sua renda.">?</span></label>
    <div class="tgl"><div class="tgl-o active" id="incMine" onclick="setIncOwner('mine')">Meu</div><div class="tgl-o" id="incOther" onclick="setIncOwner('other')">De outra pessoa</div></div>
  </div>
  <div id="incPersonGroup" style="display:none">
    <div class="fg"><label>Nome da pessoa</label><input type="text" id="incPerson" placeholder="quem vai me pagar..."></div>
  </div>
  <input type="hidden" id="editIncomeId">
  <div class="modal-actions">
    <button id="incDeleteBtn" class="btn btn-danger btn-sm" style="display:none" onclick="deleteIncomeCurrent()">Excluir</button>
    <button class="btn btn-ghost btn-sm" onclick="closeModal('mIncome')">Cancelar</button>
    <button class="btn btn-primary btn-sm" onclick="saveIncome()">Salvar</button>
  </div>
</div></div>

<!-- Recurrent -->
<div class="modal-overlay" id="mRec"><div class="modal modal-sm">
  <div class="modal-title">Conta Fixa <button class="modal-close" onclick="closeModal('mRec')">×</button></div>
  <div class="fg"><label>Descrição</label><input type="text" id="rDesc" placeholder="Aluguel, Água, Luz..."></div>
  <div class="fr">
    <div class="fg"><label>Valor (R$)</label><input type="number" id="rAmt" step="0.01" placeholder="0,00"></div>
    <div class="fg"><label>Venc. (dia) <span class="tip" data-tip="Dia do mês em que vence.&#10;Só para controle visual,&#10;não bloqueia pagamento.">?</span></label><input type="number" id="rDay" min="1" max="31" placeholder="ex: 10"></div>
  </div>
  <div class="fg"><label>Observação</label><textarea id="rObs" placeholder="detalhes..."></textarea></div>
  <input type="hidden" id="editRecId">
  <div class="modal-actions">
    <button id="recDeleteBtn" class="btn btn-danger btn-sm" style="display:none" onclick="deleteRecCurrent()">Excluir</button>
    <button class="btn btn-ghost btn-sm" onclick="closeModal('mRec')">Cancelar</button>
    <button class="btn btn-primary btn-sm" onclick="saveRec()">Salvar</button>
  </div>
</div></div>

<!-- Pix -->
<div class="modal-overlay" id="mPix"><div class="modal modal-sm">
  <div class="modal-title">Pix Enviado <button class="modal-close" onclick="closeModal('mPix')">×</button></div>
  <div class="fg"><label>Para quem</label><input type="text" id="pxTo" placeholder="nome ou descrição..."></div>
  <div class="fr">
    <div class="fg"><label>Valor (R$)</label><input type="number" id="pxAmt" step="0.01" placeholder="0,00"></div>
    <div class="fg"><label>Data</label><input type="date" id="pxDate"></div>
  </div>
  <div class="fg"><label>Banco de origem <span class="tip" data-tip="De qual cartão ou conta&#10;o Pix foi enviado.">?</span></label><select id="pxBank"></select></div>
  <div class="fg"><label>Motivo (opcional)</label><input type="text" id="pxObs" placeholder="rachar conta, presente..."></div>
  <input type="hidden" id="editPixId">
  <div class="modal-actions"><button class="btn btn-ghost btn-sm" onclick="closeModal('mPix')">Cancelar</button><button class="btn btn-primary btn-sm" onclick="savePix()">Salvar</button></div>
</div></div>

<!-- Sub -->
<div class="modal-overlay" id="mSub"><div class="modal">
  <div class="modal-title" id="subTitle">Nova Assinatura <button class="modal-close" onclick="closeModal('mSub')">×</button></div>
  <div class="fg"><label>Serviço</label><input type="text" id="sName" placeholder="Netflix, Spotify, iCloud..."></div>
  <div class="fr">
    <div class="fg"><label>Valor (R$)</label><input type="number" id="sAmt" step="0.01" placeholder="0,00" oninput="updateSubSplitHint()"></div>
    <div class="fg"><label>Ciclo <span class="tip" data-tip="Mensal = cobrado todo mês.&#10;Anual = cobrado 1x por ano.&#10;Semanal = cobrado todo semana.&#10;Afeta o cálculo da projeção anual.">?</span></label><select id="sCycle"><option value="mensal">Mensal</option><option value="anual">Anual</option><option value="semanal">Semanal</option></select></div>
  </div>
  <div class="fg"><label>De quem é?</label>
    <div class="tgl">
      <div class="tgl-o active" id="sOwnerMine" onclick="setSubOwner('mine')">Meu</div>
      <div class="tgl-o" id="sOwnerOther" onclick="setSubOwner('other')">De outra pessoa</div>
      <div class="tgl-o" id="sOwnerSplit" onclick="setSubOwner('split')">Em conjunto</div>
    </div>
  </div>
  <div id="sOtherGroup" style="display:none">
    <div class="fg"><label>Nome da pessoa</label><input type="text" id="sOtherPerson" placeholder="de quem é esta assinatura..."></div>
  </div>
  <div id="sSplitGroup" style="display:none">
    <div class="fg"><label>Pessoas</label>
      <div id="sSplitPeopleWrap"></div>
    </div>
    <div class="fg"><label>Divisão</label>
      <div class="tgl">
        <div class="tgl-o active" id="sSplitEqual" onclick="setSubSplitType('equal')">Igual</div>
        <div class="tgl-o" id="sSplitFixed" onclick="setSubSplitType('fixed')">Valor fixo por pessoa</div>
      </div>
    </div>
    <div id="sFixedValuesWrap" style="display:none;margin-top:8px"></div>
    <div id="sSplitHint" style="font-size:11px;color:var(--text3);font-family:var(--mono);margin-top:6px;min-height:16px"></div>
  </div>
  <div class="fr">
    <div class="fg"><label>Banco / Cartão</label><input type="text" id="sBank" placeholder="Nubank, Will..."></div>
    <div class="fg"><label>Dia de cobrança <span class="tip" data-tip="Dia do mês em que é cobrado.&#10;Só informativo, não cria lançamento automático.">?</span></label><input type="number" id="sDay" min="1" max="31" placeholder="ex: 5"></div>
  </div>
  <div class="fr">
    <div class="fg"><label>Data de início</label><input type="month" id="sStart"></div>
    <div class="fg"><label>Cancelado em <span class="tip" data-tip="Deixe vazio se ainda está ativa.&#10;Preencha para marcar como cancelada&#10;e tirá-la do total mensal.">?</span></label><input type="month" id="sEnd" placeholder="vazio = ativa"></div>
  </div>
  <input type="hidden" id="editSubId">

  <!-- Histórico de preço — só aparece ao editar -->
  <div id="sHistorySection" style="display:none">
    <div class="divider" style="margin:14px 0 12px"></div>
    <div style="font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--text3);margin-bottom:10px">Histórico de Preço</div>
    <div id="sHistoryList" style="margin-bottom:10px"></div>
    <div id="sReajusteForm" style="display:none;background:var(--bg3);border-radius:8px;padding:12px;margin-bottom:8px">
      <div class="fr">
        <div class="fg"><label>Novo valor (R$)</label><input type="number" id="sReajusteAmt" step="0.01" placeholder="0,00"></div>
        <div class="fg"><label>Mês do reajuste</label><input type="month" id="sReajusteDate"></div>
      </div>
      <div class="fg"><label>Observação (opcional)</label><input type="text" id="sReajusteNote" placeholder="ex: Reajuste anual 2025"></div>
      <div style="display:flex;gap:8px;margin-top:4px">
        <button class="btn btn-primary btn-sm" onclick="confirmReajuste()">Confirmar</button>
        <button class="btn btn-ghost btn-sm" onclick="closeReajusteForm()">Cancelar</button>
      </div>
    </div>
    <button id="sReajusteBtn" class="btn btn-ghost btn-sm" onclick="openReajusteForm()">+ Registrar Reajuste</button>
  </div>

  <div class="modal-actions"><button class="btn btn-ghost btn-sm" onclick="closeModal('mSub')">Cancelar</button><button class="btn btn-primary btn-sm" onclick="saveSub()">Salvar</button></div>
</div></div>

<!-- Inst Detail -->
<div class="modal-overlay" id="mInstDet"><div class="modal">
  <div class="modal-title">Parcelamento <button class="modal-close" onclick="closeModal('mInstDet')">×</button></div>
  <div id="instDetContent"></div>
  <div class="modal-actions" id="instDetActions"></div>
</div></div>

<!-- Backup -->
<div class="modal-overlay" id="mBackup"><div class="modal modal-sm">
  <div class="modal-title">Backup & Restauração <button class="modal-close" onclick="closeModal('mBackup')">×</button></div>
  <div style="display:flex;flex-direction:column;gap:10px">
    <button class="btn btn-ghost" onclick="exportBackup()">⬇️ Exportar dados (JSON)</button>
    <div class="fg" style="margin-bottom:0">
      <label>Restaurar backup</label>
      <input type="file" id="backupFile" accept=".json" onchange="importBackup(this)" style="padding:8px">
    </div>
  </div>
  <div class="modal-actions"><button class="btn btn-ghost btn-sm" onclick="closeModal('mBackup')">Fechar</button></div>
</div></div>

<!-- AI Import -->
<div class="modal-overlay" id="mAI"><div class="modal">
  <div class="modal-title">📄 Importar Extrato <button class="modal-close" onclick="closeModal('mAI')">×</button></div>

  <!-- Tipo de extrato -->
  <div class="fg" style="margin-bottom:8px">
    <label style="margin-bottom:6px">Tipo de extrato</label>
    <div id="aiTypeChips" class="ai-type-chips">
      <button class="ai-chip ai-chip--active" onclick="setAIType('auto',this)">Auto</button>
      <button class="ai-chip" onclick="setAIType('cartao',this)">Cartão</button>
      <button class="ai-chip" onclick="setAIType('debito',this)">Débito</button>
      <button class="ai-chip" onclick="setAIType('pixout',this)">Pix enviado</button>
      <button class="ai-chip" onclick="setAIType('pixin',this)">Pix recebido</button>
      <button class="ai-chip" onclick="setAIType('boleto',this)">Boleto</button>
    </div>
  </div>

  <!-- PDF upload zone -->
  <div class="ai-pdf-zone" id="aiPdfZone"
       onclick="document.getElementById('aiPdfInput').click()"
       ondragover="event.preventDefault()"
       ondrop="event.preventDefault();handleAIPdfFiles(event.dataTransfer.files)">
    <input type="file" id="aiPdfInput" accept=".pdf" multiple style="display:none"
           onchange="handleAIPdfFiles(this.files)">
    <span class="ai-pdf-zone-icon">📎</span>
    <span class="ai-pdf-zone-label">Solte PDFs aqui ou clique para selecionar</span>
  </div>
  <div id="aiPdfStatus" class="ai-pdf-status" style="display:none"></div>

  <!-- PDF sections extracted -->
  <div id="aiPdfSections" style="display:none;margin-bottom:8px"></div>

  <div class="fg"><label>Mês de destino</label><select id="aiMonthSel" onchange="updateAIBankSel()"></select></div>
  <div class="fg" id="aiiBankRow"><label>Banco</label><select id="aiBankSel"></select></div>
  <div class="fg">
    <label>Cole o texto do extrato</label>
    <textarea id="aiText" placeholder="Cole aqui o texto extraído do PDF ou digite manualmente..." style="min-height:120px"></textarea>
  </div>
  <button class="btn btn-primary" style="width:100%;justify-content:center;margin-bottom:10px" onclick="runAI()">
    <span id="aiBtnText">✨ Interpretar</span>
  </button>
  <div id="aiResult" style="display:none">
    <div class="ai-box-title" style="margin-bottom:6px">Selecione os que deseja importar:</div>
    <div id="aiEntryList" class="ai-entry-list"></div>
    <div class="modal-actions" style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border)">
      <button class="btn btn-ghost btn-sm" onclick="closeModal('mAI')">Cancelar</button>
      <button class="btn btn-primary btn-sm" onclick="importAIEntries()">Importar Selecionados</button>
    </div>
  </div>
  <div class="modal-actions" id="aiBaseActions">
    <button class="btn btn-ghost btn-sm" onclick="closeModal('mAI')">Fechar</button>
  </div>
</div></div>

<!-- Logout Confirm -->
<div class="modal-overlay" id="mLogout"><div class="modal modal-sm">
  <div class="modal-title">Sair da conta <button class="modal-close" onclick="closeModal('mLogout')">×</button></div>
  <div style="text-align:center;padding:10px 0 20px">
    <div style="font-size:32px;margin-bottom:12px">👋</div>
    <p style="color:var(--text2);font-size:13px;margin-bottom:4px">Tem certeza que deseja sair?</p>
    <p style="color:var(--text3);font-size:11px;font-family:var(--mono)">Seus dados ficam salvos no servidor</p>
  </div>
  <div class="modal-actions" style="justify-content:center;gap:12px">
    <button class="btn btn-ghost" onclick="closeModal('mLogout')">Cancelar</button>
    <button class="btn btn-danger" onclick="confirmLogout()">🚪 Sair</button>
  </div>
</div></div>

<!-- Trocar Senha -->
<div class="modal-overlay" id="mChangePwd"><div class="modal modal-sm">
  <div class="modal-title">Trocar senha <button class="modal-close" onclick="closeModal('mChangePwd')">×</button></div>
  <div class="fg auth-pwd-wrap">
    <label>Nova senha</label>
    <input type="password" id="changePwd" placeholder="mínimo 6 caracteres" autocomplete="new-password">
    <button type="button" class="auth-eye" onclick="toggleAuthEye('changePwd',this)" tabindex="-1">
      <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
    </button>
  </div>
  <div class="fg auth-pwd-wrap">
    <label>Confirmar nova senha</label>
    <input type="password" id="changePwdConfirm" placeholder="repita a senha" autocomplete="new-password" onkeydown="if(event.key==='Enter')handleChangePwd()">
    <button type="button" class="auth-eye" onclick="toggleAuthEye('changePwdConfirm',this)" tabindex="-1">
      <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
    </button>
  </div>
  <div class="modal-actions">
    <button class="btn btn-ghost btn-sm" onclick="closeModal('mChangePwd')">Cancelar</button>
    <button class="btn btn-primary btn-sm" onclick="handleChangePwd()" id="changePwdBtn">Salvar</button>
  </div>
</div></div>

<!-- Editar Mês -->
<div class="modal-overlay" id="mEditMonth"><div class="modal modal-sm">
  <div class="modal-title">Editar Mês <button class="modal-close" onclick="closeModal('mEditMonth')">×</button></div>
  <div class="fr">
    <div class="fg"><label>Mês</label>
      <select id="editMSel">
        <option>Janeiro</option><option>Fevereiro</option><option>Março</option>
        <option>Abril</option><option>Maio</option><option>Junho</option>
        <option>Julho</option><option>Agosto</option><option>Setembro</option>
        <option>Outubro</option><option>Novembro</option><option>Dezembro</option>
      </select>
    </div>
    <div class="fg"><label>Ano</label>
      <input type="number" id="editMYear" min="2020" max="2035">
    </div>
  </div>
  <div class="fg"><label>Meta de gastos (R$)</label>
    <input type="number" id="editMGoal" step="0.01" placeholder="ex: 3000,00">
  </div>
  <input type="hidden" id="editMKey">
  <div style="background:var(--bg3);border-radius:6px;padding:9px 12px;font-size:11px;color:var(--text3);font-family:var(--mono);margin-bottom:12px">
    ⚠️ Mudar o nome/ano recria a chave do mês — todos os dados são migrados automaticamente.
  </div>
  <div class="modal-actions">
    <button class="btn btn-ghost btn-sm" onclick="closeModal('mEditMonth')">Cancelar</button>
    <button class="btn btn-primary btn-sm" onclick="saveEditMonth()">Salvar</button>
  </div>
</div></div>

<!-- Confirmar Exclusão de Mês -->
<div class="modal-overlay" id="mDeleteMonth"><div class="modal modal-sm">
  <div class="modal-title">Excluir Mês <button class="modal-close" onclick="closeModal('mDeleteMonth')">×</button></div>
  <div style="text-align:center;padding:10px 0 20px">
    <div style="font-size:32px;margin-bottom:12px">🗑️</div>
    <p style="font-size:14px;font-weight:600;margin-bottom:6px" id="deleteMonthLabel">—</p>
    <p style="font-size:12px;color:var(--red);font-family:var(--mono)" id="deleteMonthTotal">—</p>
    <p style="font-size:12px;color:var(--text3);margin-top:10px">
      Todos os lançamentos, bancos, pix, contas fixas e entradas deste mês serão <strong>permanentemente excluídos</strong>.
    </p>
  </div>
  <input type="hidden" id="deleteMonthKey">
  <div class="modal-actions" style="justify-content:center;gap:12px">
    <button class="btn btn-ghost" onclick="closeModal('mDeleteMonth')">Cancelar</button>
    <button class="btn btn-danger" onclick="executeDeleteMonth()">🗑 Excluir tudo</button>
  </div>
</div></div>

<!-- Meta -->
<div class="modal-overlay" id="mGoal">
  <div class="modal modal-sm">
    <div class="modal-title">
      🎯 Meta de Gastos
      <button class="modal-close" onclick="closeModal('mGoal')">×</button>
    </div>
    <div class="fg">
      <label for="goalAmt">Valor da meta mensal (R$)</label>
      <input type="number" id="goalAmt" placeholder="ex: 700,00"
        step="0.01" min="0">
    </div>
    <p style="font-size:11px;color:var(--text3);font-family:var(--mono);margin-bottom:16px">
      A meta considera apenas seus gastos pessoais, ignorando lançamentos de terceiros.
    </p>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="closeModal('mGoal')">Cancelar</button>
      <button class="btn btn-primary" onclick="saveGoal()">Salvar Meta</button>
    </div>
  </div>
</div>

<!-- Cobrança -->
<div class="modal-overlay" id="mCobranca"><div class="modal modal-sm">
  <div class="modal-title">💰 Cobrança <button class="modal-close" onclick="closeModal('mCobranca')">×</button></div>
  <div id="mCobrancaContent"></div>
</div></div>

<!-- Meus Gastos Report -->
<div class="modal-overlay" id="mMeusGastos"><div class="modal">
  <div class="modal-title" id="meusGastosTitle">Meus Gastos <button class="modal-close" onclick="closeModal('mMeusGastos')">×</button></div>
  <div id="meusGastosContent"></div>
  <div class="modal-actions"><button class="btn btn-ghost btn-sm" onclick="closeModal('mMeusGastos')">Fechar</button></div>
</div></div>
  `);
}
