/* João — lista/quadro de decisões e formulário de decisão */
(function (G) {
  'use strict';
  const U = G.U, D = G.D, A = G.A, UI = G.UI;
  const { html, raw, icon } = U;
  const V = UI.V, F = UI.F;

  /* ---------- auxiliares compartilhados ---------- */
  V.instShort = (rot) => {
    if (!rot) return '—';
    if (rot.forumId) return (D.forum(rot.forumId) || {}).sigla || rot.instancia.nome;
    const p = D.pessoa(rot.decisorId);
    return (p ? p.nome.split(' ')[0] : '—') + ' (' + rot.instancia.nome.split(' ')[0] + ')';
  };
  V.nextStep = (d) => {
    switch (d.status) {
      case 'rascunho': return 'Próximo passo: enviar para análise';
      case 'analise': { const pr = D.prontidao(d); return pr.pronta ? 'Pronta para submeter à deliberação' : 'Prontidão ' + pr.pct + '% · faltam ' + U.plural(pr.bloqueios.length, 'item obrigatório', 'itens obrigatórios'); }
      case 'deliberacao': return 'Aguardando ' + D.instanciaNome(d.roteamento);
      case 'aprovada': return 'Aprovada — falta iniciar a execução';
      case 'execucao': { const n = D.S().acoes.filter((a) => a.decisaoId === d.id && a.status !== 'concluida').length; return n ? U.plural(n, 'ação em aberto', 'ações em aberto') : 'Execução sem ações em aberto — pode concluir'; }
      case 'concluida': return d.revisaoEm ? 'Revisão pós-decisão ' + (d.revisaoEm < U.today() ? 'atrasada desde ' : 'em ') + U.fmtDate(d.revisaoEm) : 'Aguardando revisão pós-decisão';
      case 'revisada': return 'Ciclo completo — lições registradas';
      case 'rejeitada': return 'Rejeitada em ' + U.fmtDate(d.decisao && d.decisao.em);
      default: return 'Cancelada';
    }
  };
  V.routeSummary = (rot, o) => {
    o = o || {};
    const nome = rot.forumId ? (D.forum(rot.forumId) || {}).nome : rot.instancia.nome;
    return html`<div class="route"><div class="route-main"><span class="route-ic">${icon(rot.forumId ? 'users' : 'user', 22)}</span><div><strong>${nome}</strong><small>${rot.forumId ? 'Delibera em reunião · regra: ' + D.REGRAS[D.forum(rot.forumId).regra].toLowerCase() : 'Decisor: ' + D.nomePessoa(rot.decisorId)}</small></div></div>
      ${o.compact ? '' : V.ladder(rot)}
      <ul class="why">${rot.motivos.map((m) => html`<li class="${m.kind}">${icon(m.kind === 'base' ? 'target' : m.kind === 'sod' ? 'lock' : m.kind === 'info' ? 'info' : 'arrowR', 14)}<span>${m.txt}</span></li>`)}</ul></div>`;
  };
  V.ladder = (rot) => html`<div class="ladder">${D.S().niveis.map((n) => html`<div class="ladder-s ${n.n === rot.nivel ? 'on' : n.n < rot.nivel ? 'pass' : ''}"><b>${n.n}</b><span>${n.nome}</span></div>`)}</div>`;

  /* ---------- lista e quadro ---------- */
  const st = { q: '', tab: 'todas', area: '', tipo: '', nivel: '', view: 'lista', mine: false };
  const TABS = {
    todas: () => true,
    abertas: (d) => ['rascunho', 'analise'].includes(d.status),
    aguardando: (d) => d.status === 'deliberacao',
    execucao: (d) => ['aprovada', 'execucao', 'concluida'].includes(d.status),
    encerradas: (d) => ['rejeitada', 'revisada', 'cancelada'].includes(d.status),
  };
  const ORDEM = ['deliberacao', 'analise', 'rascunho', 'aprovada', 'execucao', 'concluida', 'revisada', 'rejeitada', 'cancelada'];
  V.filtrarDecisoes = () => {
    const S = D.S(), q = U.norm(st.q).split(/\s+/).filter(Boolean);
    return S.decisoes.filter((d) => {
      if (!TABS[st.tab](d)) return false;
      if (st.area && d.areaId !== st.area) return false;
      if (st.tipo && d.tipoId !== st.tipo) return false;
      if (st.nivel) { const rot = D.rotaAtual(d); if (String(rot.nivel) !== st.nivel) return false; }
      if (st.mine && d.proponenteId !== S.usuarioId) return false;
      if (q.length) { const h = U.norm(d.id + ' ' + d.titulo + ' ' + d.contexto + ' ' + D.nomePessoa(d.proponenteId)); if (!q.every((w) => h.includes(w))) return false; }
      return true;
    }).sort((a, b) => ORDEM.indexOf(a.status) - ORDEM.indexOf(b.status) || a.prazo.localeCompare(b.prazo));
  };
  const rowDec = (d) => {
    const rot = D.rotaAtual(d), aberta = D.ABERTAS.includes(d.status);
    const pr = aberta ? D.prontidao(d) : null;
    return html`<tr data-row-href="#/decisoes/${d.id}" tabindex="0">
      <td><span class="t-main">${d.titulo}</span><span class="t-sub">${d.id} · ${D.tipo(d.tipoId).nome}</span></td>
      <td class="num">${d.valor ? U.moneyC(d.valor) : html`<span class="muted">—</span>`}</td>
      <td><span class="${aberta ? 'muted' : ''}" title="${aberta ? 'Previsão pela matriz de alçadas' : 'Instância que decidiu'}">${V.instShort(rot)}</span></td>
      <td>${UI.pill(d.status)}</td>
      <td>${pr ? html`<span class="row" style="gap:8px;flex-wrap:nowrap"><span style="width:64px">${UI.meter(pr.pct, pr.pronta ? 'good' : 'accent')}</span><small class="muted">${pr.pct}%</small></span>` : html`<span class="muted">—</span>`}</td>
      <td>${['revisada', 'rejeitada', 'cancelada'].includes(d.status) ? html`<span class="muted">${U.fmtDay(d.decisao ? d.decisao.em : d.prazo)}</span>` : UI.due(d.prazo)}</td>
      <td>${UI.avatar(D.pessoa(d.proponenteId))}</td></tr>`;
  };
  const colunas = [
    ['Em preparação', ['rascunho', 'analise']], ['Em deliberação', ['deliberacao']], ['Decididas', ['aprovada', 'rejeitada']], ['Em execução', ['execucao']], ['Concluídas e revisadas', ['concluida', 'revisada']],
  ];
  V.resultadosDecisoes = () => {
    const list = V.filtrarDecisoes();
    if (!list.length) return UI.empty('search', 'Nenhuma decisão encontrada', 'Ajuste a busca ou os filtros.');
    if (st.view === 'quadro') {
      return html`<div class="board">${colunas.map(([nome, sts]) => { const col = list.filter((d) => sts.includes(d.status)); return html`<div class="board-c"><header><strong>${nome}</strong><em>${col.length}</em></header>${col.map((d) => html`<a class="bcard" href="#/decisoes/${d.id}"><small class="muted">${d.id}${d.irreversivel ? ' · irreversível' : ''}</small><strong>${d.titulo}</strong><span class="row row--sb"><span>${d.valor ? U.moneyC(d.valor) : ''}</span>${sts.length > 1 ? UI.pill(d.status) : ''}</span><span class="row row--sb">${['revisada', 'rejeitada', 'cancelada'].includes(d.status) ? '' : UI.due(d.prazo)}${UI.avatar(D.pessoa(d.proponenteId))}</span></a>`)}${col.length ? '' : html`<p class="sub" style="padding:8px">Nada aqui.</p>`}</div>`; })}</div>`;
    }
    return html`<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Decisão</th><th class="num">Valor</th><th>Alçada</th><th>Status</th><th>Prontidão</th><th>Prazo</th><th>Dono</th></tr></thead><tbody>${list.map(rowDec)}</tbody></table></div>`;
  };

  V.decisoes = () => {
    const S = D.S();
    const cnt = (k) => S.decisoes.filter(TABS[k]).length;
    return html`<div class="page-in">
      ${UI.header({
        title: 'Decisões', sub: 'O registro corporativo de decisões: cada uma com contexto, alternativas avaliadas, alçada, responsáveis, resultado esperado e revisão posterior.',
        actions: html`${UI.btn('Exportar CSV', 'exportDecisoes', { icon: 'download' })}${UI.btn('Nova decisão', 'novaDecisao', { kind: 'primary', icon: 'plus' })}`,
      })}
      ${UI.card('', html`
        <div class="toolbar">
          <label class="searchbox grow">${icon('search', 16)}<input class="input" data-input="decQ" value="${st.q}" placeholder="Buscar por título, código, contexto ou responsável…" aria-label="Buscar decisões"></label>
          ${UI.tabs([['todas', 'Todas', cnt('todas')], ['abertas', 'Em preparação', cnt('abertas')], ['aguardando', 'Aguardando decisão', cnt('aguardando')], ['execucao', 'Execução e revisão', cnt('execucao')], ['encerradas', 'Encerradas', cnt('encerradas')]], st.tab, 'decTab')}
        </div>
        <div class="toolbar">
          <select class="input" data-change="decF" data-k="area" aria-label="Área"><option value="">Todas as áreas</option>${S.areas.filter((a) => a.id !== 'a-ca').map((a) => html`<option value="${a.id}" ${st.area === a.id ? raw('selected') : ''}>${a.nome}</option>`)}</select>
          <select class="input" data-change="decF" data-k="tipo" aria-label="Tipo"><option value="">Todos os tipos</option>${S.tipos.map((t) => html`<option value="${t.id}" ${st.tipo === t.id ? raw('selected') : ''}>${t.nome}</option>`)}</select>
          <select class="input" data-change="decF" data-k="nivel" aria-label="Alçada"><option value="">Todas as alçadas</option>${S.niveis.map((n) => html`<option value="${n.n}" ${st.nivel === String(n.n) ? raw('selected') : ''}>${n.nome}</option>`)}</select>
          <label class="chk" style="padding:0 6px"><input type="checkbox" data-change="decMine" ${st.mine ? raw('checked') : ''}> <span>Só as minhas</span></label>
          <span style="margin-left:auto">${UI.tabs([['lista', 'Lista'], ['quadro', 'Quadro']], st.view, 'decView')}</span>
        </div>
        <div id="dec-res">${V.resultadosDecisoes()}</div>`, { flush: true })}
    </div>`;
  };
  UI.add('decisoes', /^decisoes$/, () => V.decisoes(), 'Decisões');
  UI.input.decQ = (el) => { st.q = el.value; UI.$('#dec-res').innerHTML = String(V.resultadosDecisoes()); };
  UI.on.decTab = (el) => { st.tab = el.dataset.v; UI.render(); };
  UI.on.decView = (el) => { st.view = el.dataset.v; UI.render(); };
  UI.change.decF = (el) => { st[el.dataset.k] = el.value; UI.render(); };
  UI.change.decMine = (el) => { st.mine = el.checked; UI.render(); };
  UI.on.exportDecisoes = () => {
    const S = D.S();
    const rows = [['Código', 'Título', 'Tipo', 'Área', 'Proponente', 'Valor (R$)', 'Irreversível', 'Status', 'Instância', 'Prazo', 'Criada em', 'Decidida em', 'Resultado']];
    S.decisoes.forEach((d) => rows.push([d.id, d.titulo, D.tipo(d.tipoId).nome, (D.area(d.areaId) || {}).nome, D.nomePessoa(d.proponenteId), d.valor || '', d.irreversivel ? 'sim' : 'não', D.STATUS[d.status].label, D.instanciaNome(D.rotaAtual(d)), d.prazo, d.criadaEm, d.decisao ? d.decisao.em : '', d.decisao ? d.decisao.resultado : '']));
    U.download('decisoes-' + U.today() + '.csv', '﻿' + U.csv(rows), 'text/csv;charset=utf-8');
  };

  /* ---------- formulário de decisão (criar e editar) ---------- */
  V.openDecisionModal = (d) => {
    const S = D.S(), u = D.user(), edit = !!d;
    const x = d || { titulo: '', tipoId: S.tipos[0].id, areaId: u.areaId === 'a-ca' ? 'a-gov' : u.areaId, nivelDecisao: 'tatica', valor: null, irreversivel: false, excecaoPolitica: false, prazo: U.addDays(U.today(), 30), contexto: '', resultadoEsperado: '', premissas: '', gatilhos: '', conflito: null, proponenteId: u.id };
    const body = html`<div class="fgrid">
      <div class="span2">${F.text('titulo', x.titulo, { label: 'Título da decisão', req: true, ph: 'Ex.: Contratar a Seguradora A para o seguro cibernético', hint: 'Escreva como uma pergunta resolvida: o que será decidido.' })}</div>
      ${F.select('tipoId', S.tipos.map((t) => [t.id, t.nome]), x.tipoId, { label: 'Tipo de decisão', req: true, hint: 'Define a tabela de alçadas aplicável.' })}
      ${F.select('areaId', S.areas.filter((a) => a.id !== 'a-ca').map((a) => [a.id, a.nome]), x.areaId, { label: 'Área proponente', req: true })}
      ${F.money('valor', x.valor, { label: 'Valor envolvido (R$)', hint: 'Compromisso total. Vazio se não há valor financeiro.' })}
      ${F.select('nivelDecisao', Object.entries(D.NIVEL_DECISAO), x.nivelDecisao, { label: 'Natureza' })}
      ${F.text('prazo', x.prazo, { label: 'Decidir até', type: 'date', req: true })}
      ${edit ? F.person('proponenteId', x.proponenteId, { label: 'Proponente (dono)' }) : html`<div></div>`}
      <div class="span2 stack">${F.check('irreversivel', x.irreversivel, 'Decisão difícil ou impossível de reverter (porta de mão única)', 'Sobe um nível de alçada e exige premissas e gatilhos de reversão.')}${F.check('excecaoPolitica', x.excecaoPolitica, 'Exige exceção a uma política interna', 'Sobe um nível de alçada e deve ser vinculada à política afetada.')}</div>
      <div class="span2"><span class="label-s">Para onde esta decisão vai</span><div id="route-prev" class="sim-out"></div></div>
      <div class="span2">${F.area('contexto', x.contexto, { label: 'Problema e contexto', rows: 4, ph: 'Qual é o problema ou a oportunidade? Por que decidir agora? O que acontece se nada for feito?' })}</div>
      <div class="span2">${F.area('resultadoEsperado', x.resultadoEsperado, { label: 'Resultado esperado e como medir', rows: 2, ph: 'Métrica, meta e prazo. Ex.: reduzir o custo de frete em 9% em 6 meses.' })}</div>
      ${edit ? html`<div class="span2">${F.area('premissas', x.premissas, { label: 'Premissas críticas', rows: 2, hint: 'O que precisa ser verdade para a decisão fazer sentido.' })}</div><div class="span2">${F.area('gatilhos', x.gatilhos, { label: 'Gatilhos de reversão', rows: 2, hint: 'Sinais objetivos que levariam a parar ou rever.' })}</div>
      ${F.select('conflito', [['', 'Ainda não declarei'], ['nenhum', 'Declaro que não há conflito de interesses'], ['declarado', 'Há conflito de interesses (descrever abaixo)']], x.conflito ? x.conflito.tipo : '', { label: 'Conflito de interesses' })}${F.text('conflitoTexto', x.conflito ? x.conflito.texto : '', { label: 'Descrição do conflito', hint: 'Quem está impedido e como será tratado.' })}` : ''}
      </div>`;
    UI.modal({
      title: edit ? 'Editar decisão ' + d.id : 'Nova decisão', body, wide: true, submit: edit ? 'Salvar alterações' : 'Criar rascunho',
      onOpen: (dlg, form) => {
        const upd = () => {
          const f = UI.formData(form);
          const pseudo = { tipoId: f.tipoId, areaId: f.areaId, valor: U.parseMoney(f.valor), irreversivel: !!f.irreversivel, excecaoPolitica: !!f.excecaoPolitica, proponenteId: f.proponenteId || x.proponenteId, riscosIds: d ? d.riscosIds : [] };
          UI.$('#route-prev', dlg).innerHTML = String(V.routeSummary(D.rotear(pseudo), { compact: true }));
        };
        form.addEventListener('input', upd); form.addEventListener('change', upd); upd();
      },
      onSubmit: (f, form, close) => {
        const valor = f.valor && f.valor.trim() ? U.parseMoney(f.valor) : null;
        if (f.valor && f.valor.trim() && valor == null) throw new A.RuleError('Valor inválido. Use números, ex.: 1.500.000 ou 1,5 mi.');
        const base = { titulo: f.titulo, tipoId: f.tipoId, areaId: f.areaId, nivelDecisao: f.nivelDecisao, valor, irreversivel: !!f.irreversivel, excecaoPolitica: !!f.excecaoPolitica, prazo: f.prazo, contexto: f.contexto || '', resultadoEsperado: f.resultadoEsperado || '' };
        if (edit) {
          Object.assign(base, { premissas: f.premissas || '', gatilhos: f.gatilhos || '', proponenteId: f.proponenteId, conflito: f.conflito ? { tipo: f.conflito, texto: f.conflitoTexto || '' } : null });
          if (f.conflito === 'declarado' && !(f.conflitoTexto || '').trim()) throw new A.RuleError('Descreva o conflito de interesses e como será tratado.');
          A.editarDecisao(d.id, base);
          UI.toast('Decisão atualizada.');
        } else {
          const id = A.criarDecisao(base);
          close();
          UI.toast('Rascunho ' + id + ' criado. Complete a análise e envie à deliberação.');
          location.hash = '#/decisoes/' + id;
          return false;
        }
      },
    });
  };
  UI.on.novaDecisao = () => V.openDecisionModal(null);
})(window);
