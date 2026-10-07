/* João — página da decisão */
(function (G) {
  'use strict';
  const U = G.U, D = G.D, A = G.A, UI = G.UI, Store = G.Store;
  const { html, raw, icon } = U;
  const V = UI.V, F = UI.F;
  const CONC = { de_acordo: ['De acordo', 'good', 'check'], ressalva: ['Com ressalva', 'warning', 'alert'], veto: ['Veto', 'critical', 'x'], null: ['Pendente', 'neutral', 'clock'] };
  const PARECER = { favoravel: ['Favorável', 'good'], ressalvas: ['Favorável com ressalvas', 'warning'], desfavoravel: ['Desfavorável', 'critical'] };
  const nf1 = (n) => U.num(n, 1);

  /* ---------- ações do cabeçalho ---------- */
  V.decActions = (d) => {
    const u = D.user(), edit = D.podeEditarDecisao(d, u), adm = D.isAdmin(u), dono = u.id === d.proponenteId || adm;
    const data = { id: d.id }, o = [];
    if (d.status === 'rascunho' && edit) o.push(UI.btn('Enviar para análise', 'decAnalise', { kind: 'primary', icon: 'arrowR', data }));
    if (d.status === 'analise' && edit) o.push(UI.btn('Submeter à deliberação', 'decSubmeter', { kind: D.prontidao(d).pronta ? 'primary' : '', icon: 'scale', data }));
    if (D.ehDecisorIndividual(d, u)) { o.push(UI.btn('Registrar decisão', 'decDecidir', { kind: 'primary', icon: 'scale', data })); o.push(UI.btn('Devolver', 'decDevolver', { icon: 'arrowL', data })); }
    else if (d.status === 'deliberacao') {
      const f = d.roteamento && d.roteamento.forumId && D.forum(d.roteamento.forumId);
      if (adm || (f && (f.presidenteId === u.id || f.secretarioId === u.id))) o.push(UI.btn('Devolver para complementação', 'decDevolver', { icon: 'arrowL', data }));
    }
    if (d.status === 'aprovada' && (dono || u.id === d.rapid.executaId)) o.push(UI.btn('Iniciar execução', 'decExecucao', { kind: 'primary', icon: 'play', data }));
    if (d.status === 'execucao' && (dono || u.id === d.rapid.executaId)) o.push(UI.btn('Concluir execução', 'decConcluir', { kind: 'primary', icon: 'flag', data }));
    if (d.status === 'concluida' && dono) o.push(UI.btn('Registrar revisão', 'decRevisar', { kind: 'primary', icon: 'target', data }));
    if (edit) o.push(UI.btn('Editar', 'decEditar', { icon: 'edit', data }));
    if (D.ABERTAS.includes(d.status) && dono) o.push(UI.btn('Cancelar', 'decCancelar', { kind: 'ghost', cls: 'btn--soft-danger', data }));
    o.push(UI.btn('Imprimir', 'imprimir', { icon: 'printer', kind: 'ghost' }));
    return html`${o}`;
  };

  /* ---------- etapas ---------- */
  V.stepper = (d) => {
    if (d.status === 'cancelada') return html`<div class="notice"><span></span><div><strong>Decisão cancelada</strong> em ${U.fmtDate(d.cancelamento && d.cancelamento.em)} por ${D.nomePessoa(d.cancelamento && d.cancelamento.porId)} — ${d.cancelamento && d.cancelamento.motivo}</div></div>`;
    const cur = D.stepIndex(d.status), rej = d.status === 'rejeitada';
    return html`<div class="steps" role="list" aria-label="Etapas do ciclo de decisão">${D.STEPS.map((s, i) => {
      const cls = i < cur ? 'done' : i === cur ? (rej ? 'bad' : (d.status === 'revisada' ? 'done' : 'now')) : '';
      const lab = i === 3 && rej ? 'Rejeitada' : i === 3 && cur > 3 ? 'Aprovada' : s.label;
      return html`<div class="step ${cls}" role="listitem" ${i === cur ? raw('aria-current="step"') : ''}><i>${cls === 'done' ? icon('check', 14) : rej && i === cur ? icon('x', 14) : i + 1}</i><span>${lab}</span></div>`;
    })}</div>`;
  };

  /* ---------- matriz de critérios ---------- */
  V.matrizTabela = (d, canEdit) => {
    if (!d.alternativas.length) return UI.empty('layers', 'Nenhuma alternativa cadastrada', 'Decidir é escolher entre opções reais. Cadastre pelo menos duas — incluindo "não fazer nada" como linha de base.', canEdit ? UI.btn('Adicionar alternativa', 'altAdd', { kind: 'primary', icon: 'plus', data: { id: d.id } }) : '');
    const an = D.analiseMatriz(d);
    return html`<div class="mx-wrap"><table class="mx"><thead><tr><th><span class="label-s" style="margin:0">Critério · peso (1–10)</span></th>${d.alternativas.map((a) => html`<th><div class="alt-n">
      <strong>${canEdit ? html`<button type="button" class="btn btn--ghost btn--sm" style="height:auto;padding:2px 6px;white-space:normal;text-align:center" data-act="altEdit" data-id="${d.id}" data-alt="${a.id}" title="Editar alternativa">${a.nome}</button>` : a.nome}</strong>
      ${a.descricao ? html`<small class="muted" style="font-weight:400">${a.descricao}</small>` : ''}
      ${d.recomendacaoId === a.id ? html`<span class="rec-flag">${icon('flag', 12)} recomendada</span>` : ''}
      ${canEdit ? html`<button type="button" class="icon-btn x-btn" style="width:24px;height:24px" data-act="altDel" data-id="${d.id}" data-alt="${a.id}" aria-label="Remover alternativa ${a.nome}">${icon('trash', 14)}</button>` : ''}</div></th>`)}</tr></thead>
      <tbody>${d.criterios.map((c) => html`<tr><td><div class="mx-name"><span style="flex:1">${canEdit ? html`<button type="button" class="btn btn--ghost btn--sm" style="height:auto;padding:2px 6px;text-align:left;white-space:normal" data-act="critEdit" data-id="${d.id}" data-crit="${c.id}">${c.nome}</button>` : c.nome}</span>
          ${canEdit ? html`<input class="peso" type="number" min="1" max="10" value="${c.peso}" data-input="peso" data-id="${d.id}" data-crit="${c.id}" aria-label="Peso de ${c.nome}"><button type="button" class="icon-btn x-btn" style="width:24px;height:24px" data-act="critDel" data-id="${d.id}" data-crit="${c.id}" aria-label="Remover critério ${c.nome}">${icon('trash', 14)}</button>` : html`<b>${c.peso}</b>`}</div></td>
        ${d.alternativas.map((a) => { const n = (d.notas[a.id] || {})[c.id] || ''; return html`<td>${canEdit ? html`<input class="nota" type="number" min="1" max="5" value="${n}" data-n="${n}" data-input="nota" data-id="${d.id}" data-alt="${a.id}" data-crit="${c.id}" aria-label="Nota de ${a.nome} em ${c.nome}">` : html`<span class="nota" data-n="${n}" style="display:inline-grid;place-items:center;width:44px;height:32px;border-radius:7px;font-weight:650">${n || '—'}</span>`}</td>`; })}</tr>`)}</tbody>
      <tfoot><tr><td>Pontuação ponderada (0–100)</td>${d.alternativas.map((a) => { const r = an.rows.find((x) => x.alt.id === a.id); return html`<td data-total="${a.id}">${nf1(r.score)}</td>`; })}</tr></tfoot></table></div>
      ${canEdit ? html`<div class="row"><button type="button" class="btn btn--sm" data-act="altAdd" data-id="${d.id}">${icon('plus', 14)} Alternativa</button><button type="button" class="btn btn--sm" data-act="critAdd" data-id="${d.id}">${icon('plus', 14)} Critério</button><small class="muted">Notas de 1 (ruim) a 5 (excelente). Peso de 1 a 10 por importância do critério.</small></div>` : ''}`;
  };
  V.analiseHtml = (d) => {
    const an = D.analiseMatriz(d);
    if (!an.lider || !d.criterios.length) return html`<p class="sub">Cadastre ao menos 2 critérios para ver o ranking e a análise de sensibilidade.</p>`;
    const rec = d.alternativas.find((a) => a.id === d.recomendacaoId);
    const diverge = rec && an.lider.alt.id !== rec.id;
    return html`<div class="rank">${an.ordenadas.map((r, i) => html`<div class="rank-r ${i === 0 ? 'top' : ''}"><span class="rank-n">${i === 0 ? '1º · ' : ''}${r.alt.nome}</span><span class="hbar-t"><i style="width:${r.score}%"></i></span><span class="rank-v">${nf1(r.score)}</span></div>`)}</div>
      <div class="stack">${an.completo ? '' : UI.notice('warn', 'alert', 'Há notas em branco. Pontuações incompletas subestimam as alternativas.')}
      ${an.completo ? (an.robusta ? UI.notice('good', 'shieldCheck', html`<strong>Ranking robusto.</strong> A alternativa líder (${an.lider.alt.nome}) se mantém mesmo variando o peso de cada critério em ±50%. Margem sobre a 2ª: ${nf1(an.margem)} pts.`) : UI.notice('warn', 'alert', html`<strong>Ranking sensível.</strong> A liderança de “${an.lider.alt.nome}” muda se o peso de <em>${an.sensivelA.join(', ')}</em> variar ±50%. Margem sobre a 2ª: ${nf1(an.margem)} pts — discuta os pesos com o fórum.`)) : ''}
      ${diverge ? UI.notice('warn', 'flag', html`<strong>A recomendação diverge da matriz.</strong> A proposta recomenda “${rec.nome}”, mas a matriz pontua mais alto “${an.lider.alt.nome}”. Isso é legítimo, desde que a justificativa explique o que a matriz não captura.`) : ''}</div>`;
  };
  V.prontidaoHtml = (d) => {
    const pr = D.prontidao(d);
    return html`<div class="row row--sb"><strong>${pr.pronta ? 'Pronta para deliberar' : 'Faltam ' + U.plural(pr.bloqueios.length, 'item obrigatório', 'itens obrigatórios')}</strong><span class="muted">${pr.ok}/${pr.total}</span></div>${UI.meter(pr.pct, pr.pronta ? 'good' : 'accent')}
      <div>${pr.itens.map((i) => html`<div class="chk-i ${i.ok ? 'ok' : i.req ? 'blk' : 'no'}">${icon(i.ok ? 'check' : i.req ? 'alert' : 'circle', 16)}<span>${i.label}${!i.ok ? html`<small>${i.req ? '' : '(recomendado) '}${i.hint}</small>` : ''}</span></div>`)}</div>`;
  };

  /* atualização "ao vivo" sem perder o foco dos campos numéricos */
  V.liveRefresh = (d) => {
    const an = D.analiseMatriz(d);
    an.rows.forEach((r) => { const c = UI.$('[data-total="' + r.alt.id + '"]'); if (c) c.textContent = nf1(r.score); });
    const out = UI.$('#mx-out'); if (out) out.innerHTML = String(V.analiseHtml(d));
    const rd = UI.$('#ready'); if (rd) rd.innerHTML = String(V.prontidaoHtml(d));
    const ha = UI.$('#hdr-actions'); if (ha) ha.innerHTML = String(V.decActions(d));
  };
  UI.input.nota = (el) => {
    const n = parseInt(el.value, 10), ok = n >= 1 && n <= 5;
    if (el.value !== '' && !ok) { el.value = el.value.slice(0, -1); return; }
    A.setNota(el.dataset.id, el.dataset.alt, el.dataset.crit, ok ? n : 0);
    el.dataset.n = ok ? n : '';
    V.liveRefresh(D.decisao(el.dataset.id));
  };
  UI.input.peso = (el) => {
    const n = parseInt(el.value, 10);
    if (!(n >= 1 && n <= 10)) return;
    A.setPeso(el.dataset.id, el.dataset.crit, n);
    V.liveRefresh(D.decisao(el.dataset.id));
  };

  /* ---------- página ---------- */
  V.decisao = (id) => {
    const d = D.decisao(id);
    if (!d) return html`<div class="page-in">${UI.empty('search', 'Decisão não encontrada', id, UI.link('Ver todas as decisões', '#/decisoes', { kind: 'primary' }))}</div>`;
    const S = D.S(), u = D.user(), edit = D.podeEditarDecisao(d, u), aberta = D.ABERTAS.includes(d.status), prep = ['rascunho', 'analise'].includes(d.status);
    const area = D.area(d.areaId) || {}, tipo = D.tipo(d.tipoId) || {};
    const rot = D.rotaAtual(d);
    const acoes = S.acoes.filter((a) => a.decisaoId === d.id);
    const hist = S.audit.filter((e) => e.entidadeId === d.id).slice(-30).reverse();
    const riscos = d.riscosIds.map(D.risco).filter(Boolean), pols = d.politicasIds.map(D.politica).filter(Boolean);
    const pe = D.parecerExigido(d), fPar = pe && D.forum(pe.forumId);
    const reuniao = S.reunioes.find((r) => r.status === 'agendada' && r.pauta.some((p) => p.decisaoId === d.id && p.status === 'pendente'));
    const seloOk = !d.selo || Store.seloConteudo(d) === d.selo;
    const ultimaDev = d.devolucoes[d.devolucoes.length - 1];
    const podeAcao = edit || u.id === d.rapid.executaId || D.isAdmin(u) || u.id === d.proponenteId;

    return html`<div class="page-in">
      <div class="phead">
        <nav class="crumbs" aria-label="Você está em"><a href="#/decisoes">Decisões</a><span>${d.id}</span></nav>
        <div class="phead-row">
          <div class="phead-t"><span class="kicker">${area.nome} · ${tipo.nome}</span><h1>${d.titulo}</h1>
            <div class="meta">${UI.pill(d.status)}${d.irreversivel ? html`<span class="tag tag--t1" title="Difícil ou impossível de reverter">Irreversível · Tipo 1</span>` : html`<span class="tag">Reversível · Tipo 2</span>`}<span class="tag">${D.NIVEL_DECISAO[d.nivelDecisao]}</span>
              <span>${icon('user', 15)} ${D.nomePessoa(d.proponenteId)}</span>${d.valor ? html`<span>${icon('landmark', 15)} ${U.money(d.valor)}</span>` : ''}${aberta ? html`<span>${icon('clock', 15)} decidir até ${U.fmtDate(d.prazo)} (${U.rel(d.prazo)})</span>` : ''}</div></div>
          <div class="phead-a" id="hdr-actions">${V.decActions(d)}</div></div></div>

      ${V.stepper(d)}
      ${!seloOk ? UI.notice('crit', 'alert', html`<strong>Integridade do conteúdo:</strong> o conteúdo desta decisão foi alterado depois de submetido (o selo não confere). Verifique a trilha de auditoria.`) : ''}
      ${ultimaDev && d.status === 'analise' ? UI.notice('warn', 'arrowL', html`<strong>Devolvida por ${D.nomePessoa(ultimaDev.porId)} (${ultimaDev.instancia}) em ${U.fmtDate(ultimaDev.em)}.</strong><p>${ultimaDev.texto}</p>`) : ''}
      ${d.status === 'deliberacao' && d.roteamento && d.roteamento.forumId ? (reuniao ? UI.notice('info', 'calendar', html`<strong>Na pauta do ${D.forum(reuniao.forumId).sigla} de ${U.fmtDate(reuniao.data)}.</strong> <a href="#/reunioes/${reuniao.id}">Abrir a reunião</a>`) : UI.notice('warn', 'calendar', html`<strong>Ainda não está em pauta.</strong> A Governança deve incluí-la na próxima reunião do ${D.forum(d.roteamento.forumId).sigla}. <a href="#/foruns/${d.roteamento.forumId}">Abrir o fórum</a>`)) : ''}
      ${d.status === 'deliberacao' && d.roteamento && d.roteamento.decisorId ? UI.notice('info', 'user', html`<strong>Aguardando decisão de ${D.nomePessoa(d.roteamento.decisorId)}</strong> (${d.roteamento.instancia.nome}).`) : ''}

      <div class="grid g-main">
        <div class="col-stack">
          ${d.decisao ? V.registroDecisao(d) : ''}
          ${UI.card('Problema e contexto', html`<div class="prose">${d.contexto ? U.paras(d.contexto) : html`<span class="muted">Contexto ainda não descrito.</span>`}</div>
            <div class="grid g2"><div><span class="label-s">Resultado esperado</span><div class="prose">${d.resultadoEsperado ? U.paras(d.resultadoEsperado) : html`<span class="muted">Não definido</span>`}</div></div>
            <div><span class="label-s">Premissas críticas</span><div class="prose">${d.premissas ? U.paras(d.premissas) : html`<span class="muted">${d.irreversivel ? 'Obrigatório para decisões irreversíveis' : 'Não informadas'}</span>`}</div></div></div>
            ${d.gatilhos || d.irreversivel ? html`<div><span class="label-s">Gatilhos de reversão</span><div class="prose">${d.gatilhos ? U.paras(d.gatilhos) : html`<span class="muted">Obrigatório para decisões irreversíveis</span>`}</div></div>` : ''}`,
            { actions: edit ? UI.btn('Editar', 'decEditar', { cls: 'btn--sm', icon: 'edit', data: { id: d.id } }) : '' })}

          ${UI.card('Alternativas e critérios', html`${V.matrizTabela(d, edit)}<div id="mx-out" class="stack">${V.analiseHtml(d)}</div>
            ${d.alternativas.length ? html`<hr class="sep"><div class="stack"><span class="label-s">Recomendação do proponente</span>
              ${edit ? html`<div class="fgrid"><label class="field"><span class="field-l">Alternativa recomendada</span><select class="input" id="rec-alt"><option value="">— escolha —</option>${d.alternativas.map((a) => html`<option value="${a.id}" ${a.id === d.recomendacaoId ? raw('selected') : ''}>${a.nome}</option>`)}</select></label>
                <label class="field span2"><span class="field-l">Justificativa</span><textarea class="input" id="rec-just" rows="3" placeholder="Por que esta alternativa? O que a matriz não captura?">${d.justificativa}</textarea></label></div><div><button type="button" class="btn btn--sm" data-act="saveRec" data-id="${d.id}">Salvar recomendação</button></div>`
                : html`<div class="prose">${d.recomendacaoId ? html`<p><strong>${(d.alternativas.find((a) => a.id === d.recomendacaoId) || {}).nome}</strong></p>${U.paras(d.justificativa)}` : html`<span class="muted">Sem recomendação registrada.</span>`}</div>`}</div>` : ''}`,
            { sub: 'Matriz multicritério com análise de sensibilidade dos pesos' })}

          ${UI.card('Riscos e políticas vinculados', html`<div class="grid g2"><div class="stack"><span class="label-s">Riscos do registro corporativo</span>
              ${riscos.length ? riscos.map((r) => html`<div class="row row--sb"><span><a href="#/riscos">${r.id}</a> ${r.titulo}</span>${UI.riskChip(D.riscoScore(r))}</div>`) : html`<span class="muted">Nenhum risco vinculado.</span>`}</div>
            <div class="stack"><span class="label-s">Políticas aplicáveis</span>
              ${pols.length ? pols.map((p) => html`<div class="row row--sb"><span><a href="#/politicas">${p.id}</a> ${p.titulo}</span>${UI.badge(({ vigente: 'Vigente', a_vencer: 'A vencer', vencida: 'Vencida', rascunho: 'Rascunho' })[D.politicaSituacao(p)], D.politicaSituacao(p) === 'vencida' ? 'critical' : D.politicaSituacao(p) === 'a_vencer' ? 'warning' : 'good')}</div>`) : html`<span class="muted">Nenhuma política vinculada.</span>`}
              ${d.excecaoPolitica ? UI.badge('Exceção de política solicitada', 'serious', 'alert') : ''}</div></div>`,
            { actions: edit ? UI.btn('Vincular', 'vincular', { cls: 'btn--sm', icon: 'plus', data: { id: d.id } }) : '' })}

          ${UI.card('Ações de execução', acoes.length ? html`<div class="list">${acoes.map((a) => V.acaoLinha(a))}</div>` : UI.empty('checks', 'Nenhuma ação cadastrada', 'Quebre a decisão em ações com responsável e prazo.'), { flush: true, actions: podeAcao && d.status !== 'cancelada' ? UI.btn('Nova ação', 'novaAcao', { cls: 'btn--sm', icon: 'plus', data: { dec: d.id } }) : '' })}

          ${d.revisao ? V.registroRevisao(d) : ''}

          ${UI.card('Conversa', html`${d.comentarios.length ? html`<div class="stack">${d.comentarios.map((c) => html`<div class="cmt">${UI.avatar(D.pessoa(c.autorId), 'avatar--lg')}<div class="cmt-b"><small><strong>${D.nomePessoa(c.autorId)}</strong> · ${U.fmtTs(c.em)}</small>${U.paras(c.texto)}</div></div>`)}</div>` : html`<p class="sub">Sem comentários ainda. Use a conversa para registrar contribuições (o “I” do RAPID).</p>`}
            <div class="cmt">${UI.avatar(u, 'avatar--lg')}<div class="stack" style="flex:1"><textarea class="input" id="cmt-txt" rows="2" placeholder="Escreva um comentário…"></textarea><div><button type="button" class="btn btn--sm" data-act="comentar" data-id="${d.id}">Comentar</button></div></div></div>`)}

          ${UI.card('Histórico', hist.length ? html`<ul class="tl">${hist.map((e) => html`<li><span class="tl-d">${icon(V.auditIcon(e.acao), 13)}</span><span class="tl-t"><strong>${e.acao}</strong> — ${e.detalhe}<small>${D.nomePessoa(e.userId)} · ${U.fmtTs(e.ts)}</small></span></li>`)}</ul>` : html`<p class="sub">Sem eventos.</p>`, { sub: 'Eventos desta decisão, da trilha de auditoria', actions: UI.link('Trilha completa', '#/auditoria', { cls: 'btn--sm', kind: 'ghost' }) })}
        </div>

        <aside class="col-stack">
          ${UI.card(prep ? 'Alçada (previsão)' : 'Alçada', html`${V.routeSummary(rot)}${prep ? html`<p class="sub">Calculada pela matriz de alçadas com os dados atuais. Será <strong>fixada</strong> quando a decisão for submetida.</p>` : html`<p class="sub">Instância fixada na submissão em ${U.fmtDate(d.submetidaEm || (d.decisao && d.decisao.em))}.</p>`}`, { sub: 'Quem tem poder para decidir isto, e por quê' })}
          ${prep ? UI.card('Prontidão para deliberar', html`<div id="ready" class="stack">${V.prontidaoHtml(d)}</div>`, { sub: 'Checklist de qualidade da decisão' }) : ''}
          ${UI.card('Papéis (RAPID)', V.rapidHtml(d, edit, rot), { actions: edit ? UI.btn('Editar', 'rapidEdit', { cls: 'btn--sm', icon: 'edit', data: { id: d.id } }) : '' })}
          ${pe && fPar ? UI.card('Parecer prévio — ' + fPar.sigla, d.parecer ? html`<div class="stack">${UI.badge(PARECER[d.parecer.resultado][0], PARECER[d.parecer.resultado][1])}<div class="prose">${U.paras(d.parecer.texto)}</div><small class="muted">${D.nomePessoa(d.parecer.porId)} · ${U.fmtDate(d.parecer.em)}</small></div>` : html`<div class="stack"><p class="sub">A alçada exige parecer prévio do ${fPar.nome} para valores a partir de ${U.moneyC(pe.acima)}.</p>${fPar.membros.includes(u.id) && aberta && d.status !== 'rascunho' ? UI.btn('Emitir parecer', 'parecer', { kind: 'primary', cls: 'btn--sm', data: { id: d.id } }) : html`<span class="muted">Aguardando o comitê.</span>`}</div>`) : ''}
          ${UI.card('Dados-chave', html`<dl class="kv"><dt>Valor</dt><dd>${d.valor ? U.money(d.valor) : '—'}</dd><dt>Criada em</dt><dd>${U.fmtDate(d.criadaEm)}</dd><dt>Submetida em</dt><dd>${U.fmtDate(d.submetidaEm)}</dd><dt>Decidida em</dt><dd>${U.fmtDate(d.decisao && d.decisao.em)}</dd><dt>Execução iniciada</dt><dd>${U.fmtDate(d.execucaoInicioEm)}</dd><dt>Concluída em</dt><dd>${U.fmtDate(d.concluidaEm)}</dd><dt>Revisão prevista</dt><dd>${U.fmtDate(d.revisaoEm)}</dd>
              <dt>Conflito de interesses</dt><dd>${d.conflito ? (d.conflito.tipo === 'nenhum' ? 'Nenhum declarado' : 'Declarado') : html`<span class="muted">Não declarado</span>`}</dd></dl>
              ${d.conflito && d.conflito.tipo === 'declarado' ? html`<p class="sub">${d.conflito.texto}</p>` : ''}
              ${d.selo ? html`<div><span class="label-s">Selo de conteúdo (SHA-256)</span><div class="seal">${d.selo.slice(0, 32)}…</div><small class="muted">Prova de que o texto deliberado é o texto submetido.</small></div>` : ''}`)}
        </aside>
      </div>
    </div>`;
  };
  UI.add('decisoes', /^decisoes\/([\w-]+)$/, (m) => V.decisao(m[1]), 'Decisão');

  V.acaoLinha = (a) => {
    const u = D.user(), pode = D.isAdmin(u) || u.id === a.responsavelId, late = a.status !== 'concluida' && a.prazo < U.today();
    return html`<div class="li"><span class="li-ic ${a.status === 'concluida' ? 'li-ic--good' : late ? 'li-ic--crit' : ''}">${icon(a.status === 'concluida' ? 'check' : 'checks', 18)}</span>
      <span class="li-t"><strong style="${a.status === 'concluida' ? 'text-decoration:line-through;color:var(--ink-3)' : ''}">${a.titulo}</strong><small>${a.id} · ${D.nomePessoa(a.responsavelId)}</small></span>${UI.due(a.prazo, a.status === 'concluida')}
      <select class="input" style="width:auto;min-height:32px;padding:3px 8px" data-change="acaoStatus" data-id="${a.id}" aria-label="Status da ação ${a.id}" ${pode ? '' : raw('disabled')}>${Object.entries(D.ACAO_STATUS).map(([k, l]) => html`<option value="${k}" ${a.status === k ? raw('selected') : ''}>${l}</option>`)}</select></div>`;
  };

  V.rapidHtml = (d, edit, rot) => {
    const u = D.user();
    const row = (k, body) => html`<div class="resp"><div class="resp-b"><span class="label-s" style="margin:0">${k}</span>${body}</div></div>`;
    return html`${row('Recomenda', UI.who(d.rapid.recomendaId, { cargo: true }))}
      ${row('Concorda', (d.rapid.concordam || []).length ? html`<div class="stack">${d.rapid.concordam.map((c) => { const [lab, tone, ic] = CONC[c.resposta]; return html`<div class="stack" style="gap:4px">${UI.who(c.pessoaId)}<div class="row">${UI.badge(lab, tone, ic)}${c.em ? html`<small class="muted">${U.fmtDay(c.em)}</small>` : ''}${c.pessoaId === u.id && D.ABERTAS.includes(d.status) ? UI.btn(c.resposta ? 'Alterar resposta' : 'Responder', 'concordar', { cls: 'btn--sm', kind: c.resposta ? '' : 'primary', data: { id: d.id } }) : ''}</div>${c.nota ? html`<small class="muted">“${c.nota}”</small>` : ''}</div>`; })}</div>` : html`<span class="muted">Nenhuma concordância exigida.</span>`)}
      ${row('Consulta', (d.rapid.consultados || []).length ? html`<div class="stack">${d.rapid.consultados.map((id) => UI.who(id))}</div>` : html`<span class="muted">—</span>`)}
      ${row('Executa', d.rapid.executaId ? UI.who(d.rapid.executaId) : html`<span class="muted">Não definido</span>`)}
      ${row('Decide', html`<strong>${D.instanciaNome(rot)}</strong>`)}`;
  };

  V.registroDecisao = (d) => {
    const x = d.decisao, ok = x.resultado === 'aprovada', f = x.forumId && D.forum(x.forumId);
    const c = x.contagem;
    const tot = c ? Math.max(1, c.aprova + c.rejeita + c.abstem + c.impedido) : 1;
    return html`<section class="card" style="border-color:${ok ? 'var(--good)' : 'var(--crit)'}"><div class="card-b">
      <div class="row row--sb"><div class="row">${UI.pill(d.status)}<strong style="font-size:16px">${ok ? 'Aprovada' : 'Rejeitada'} ${f ? 'pelo ' + f.nome : 'por ' + D.nomePessoa(x.pessoaId)} em ${U.fmtDate(x.em)}</strong></div>${x.reuniaoId ? html`<a class="btn btn--sm" href="#/reunioes/${x.reuniaoId}">Ver reunião e ata</a>` : ''}</div>
      ${c ? html`<div class="stack"><div class="tally" role="img" aria-label="Votos"><i class="t-a" style="width:${(c.aprova / tot) * 100}%"></i><i class="t-c" style="width:${(c.rejeita / tot) * 100}%"></i><i class="t-b" style="width:${(c.abstem / tot) * 100}%"></i><i class="t-i" style="width:${(c.impedido / tot) * 100}%"></i></div>
        <div class="legend"><span><i style="background:var(--good)"></i>${c.aprova} a favor</span><span><i style="background:var(--crit)"></i>${c.rejeita} contra</span><span><i style="background:var(--ink-3)"></i>${c.abstem} abstenção(ões)</span><span><i style="background:var(--warn)"></i>${c.impedido} impedido(s)</span>${c.minerva ? html`<span>· voto de minerva</span>` : ''}</div>
        <div class="row">${Object.keys(x.votos || {}).map((pid) => html`<span class="tag" title="${D.VOTOS[x.votos[pid]]}">${D.nomePessoa(pid).split(' ')[0]}: ${D.VOTOS[x.votos[pid]].toLowerCase()}</span>`)}</div></div>` : ''}
      ${x.texto ? html`<div class="prose">${U.paras(x.texto)}</div>` : ''}</div></section>`;
  };
  V.registroRevisao = (d) => {
    const r = d.revisao;
    return UI.card('Revisão pós-decisão', html`<div class="row">${UI.badge(D.RESULTADO_REV[r.resultado], r.resultado === 'abaixo' ? 'warning' : 'good', r.resultado === 'abaixo' ? 'alert' : 'check')}${UI.badge(r.decisaoBoa === 'sim' ? 'Processo de decisão: bom' : r.decisaoBoa === 'parcial' ? 'Processo: parcial' : 'Processo: falhou', r.decisaoBoa === 'sim' ? 'good' : r.decisaoBoa === 'parcial' ? 'warning' : 'critical')}</div>
      ${r.kpiReal ? html`<div><span class="label-s">Resultado medido</span><div class="prose">${U.paras(r.kpiReal)}</div></div>` : ''}<div><span class="label-s">Lições aprendidas</span><div class="prose">${U.paras(r.licoes)}</div></div><small class="muted">${D.nomePessoa(r.porId)} · ${U.fmtDate(r.em)}</small>`, { sub: 'Compara o que foi esperado com o que aconteceu — e separa a qualidade do processo do acaso' });
  };

  /* =================== handlers =================== */
  const id = (el) => el.dataset.id;
  UI.on.imprimir = () => window.print();
  UI.on.decAnalise = (el) => { A.enviarAnalise(id(el)); UI.toast('Decisão enviada para análise. Complete os itens da prontidão.'); };
  UI.on.decSubmeter = (el) => {
    const d = D.decisao(id(el)), pr = D.prontidao(d);
    if (!pr.pronta) throw new A.RuleError('Ainda não dá para submeter. Faltam: ' + pr.bloqueios.map((b) => b.label).join('; ') + '.');
    const rot = D.rotear(d);
    UI.modal({ title: 'Submeter à deliberação?', submit: 'Submeter', body: html`<p class="modal-p">Ao submeter, o conteúdo é <strong>selado</strong> (não poderá mais ser editado) e a alçada é fixada:</p>${V.routeSummary(rot, { compact: true })}<p class="modal-p">${rot.forumId ? 'A Governança incluirá a decisão na pauta da próxima reunião do fórum.' : D.nomePessoa(rot.decisorId) + ' será notificado(a) na caixa de entrada.'}</p>`, onSubmit: () => { A.submeter(d.id); UI.toast('Decisão submetida à deliberação.'); } });
  };
  UI.on.decEditar = (el) => V.openDecisionModal(D.decisao(id(el)));
  UI.on.decCancelar = (el) => UI.modal({ title: 'Cancelar decisão', submit: 'Cancelar decisão', danger: true, body: F.area('motivo', '', { label: 'Motivo do cancelamento', req: true, rows: 3 }), onSubmit: (f) => { A.cancelar(id(el), f.motivo); UI.toast('Decisão cancelada.'); } });
  UI.on.decDecidir = (el) => {
    const d = D.decisao(id(el));
    UI.modal({ title: 'Registrar decisão', submit: 'Registrar', wide: true, body: html`<div class="notice notice--info">${icon('info', 18)}<div>Você decide como <strong>${d.roteamento.instancia.nome}</strong>. O registro entra na trilha de auditoria com seu nome.</div></div>
      ${F.select('resultado', [['aprovada', 'Aprovar'], ['rejeitada', 'Rejeitar']], 'aprovada', { label: 'Decisão', req: true })}${F.area('texto', '', { label: 'Justificativa e condições', rows: 4, hint: 'Obrigatória ao rejeitar. Ao aprovar, registre condições e ressalvas.' })}`,
      onSubmit: (f) => { A.decidirIndividual(d.id, f.resultado, f.texto); UI.toast('Decisão registrada: ' + (f.resultado === 'aprovada' ? 'aprovada.' : 'rejeitada.')); } });
  };
  UI.on.decDevolver = (el) => UI.modal({ title: 'Devolver para complementação', submit: 'Devolver', body: html`<p class="modal-p">A decisão volta para <strong>análise</strong> e precisará ser submetida novamente.</p>${F.area('texto', '', { label: 'O que precisa ser complementado?', req: true, rows: 4 })}`, onSubmit: (f) => { A.devolver(id(el), f.texto); UI.toast('Decisão devolvida ao proponente.'); } });
  UI.on.decExecucao = (el) => { A.iniciarExecucao(id(el)); UI.toast('Execução iniciada.'); };
  UI.on.decConcluir = (el) => UI.modal({ title: 'Concluir execução', submit: 'Concluir', body: html`<p class="modal-p">Todas as ações devem estar concluídas. Defina quando o resultado será revisado.</p>${F.text('rev', U.addDays(U.today(), 90), { label: 'Data da revisão pós-decisão', type: 'date', req: true, hint: 'Sugestão: 90 dias, tempo para o resultado aparecer.' })}`, onSubmit: (f) => { A.concluir(id(el), f.rev); UI.toast('Execução concluída. Revisão agendada.'); } });
  UI.on.decRevisar = (el) => {
    const d = D.decisao(id(el));
    UI.modal({ title: 'Revisão pós-decisão', wide: true, submit: 'Registrar revisão', body: html`<div class="notice notice--info">${icon('info', 18)}<div><strong>Resultado esperado:</strong> ${d.resultadoEsperado || '—'}</div></div>
      <div class="fgrid">${F.select('resultado', Object.entries(D.RESULTADO_REV), 'atendeu', { label: 'Resultado frente ao esperado', req: true })}${F.select('decisaoBoa', Object.entries(D.QUALIDADE_REV), 'sim', { label: 'Qualidade do processo de decisão', req: true, hint: 'Julgue pela informação que existia na época, não pelo resultado.' })}
      <div class="span2">${F.area('kpiReal', '', { label: 'Resultado medido', rows: 2, ph: 'Números reais frente à meta.' })}</div><div class="span2">${F.area('licoes', '', { label: 'Lições aprendidas', rows: 3, req: true, ph: 'O que faríamos diferente? O que replicar?' })}</div></div>`,
      onSubmit: (f) => { A.registrarRevisao(d.id, f); UI.toast('Revisão registrada. Ciclo da decisão completo.'); } });
  };
  UI.on.saveRec = (el) => { A.setRecomendacao(id(el), UI.$('#rec-alt').value, UI.$('#rec-just').value); UI.toast('Recomendação salva.'); };
  UI.on.comentar = (el) => { const t = UI.$('#cmt-txt').value; if (!t.trim()) throw new A.RuleError('Escreva o comentário.'); A.comentar(id(el), t); };

  UI.on.altAdd = (el) => UI.modal({ title: 'Nova alternativa', submit: 'Adicionar', body: F.text('nome', '', { label: 'Nome da alternativa', req: true, ph: 'Ex.: Não fazer nada (manter status quo)' }), onSubmit: (f) => { A.altAdd(id(el), f.nome); } });
  UI.on.altEdit = (el) => {
    const d = D.decisao(id(el)), a = d.alternativas.find((x) => x.id === el.dataset.alt);
    UI.modal({ title: 'Editar alternativa', body: html`${F.text('nome', a.nome, { label: 'Nome', req: true })}${F.area('descricao', a.descricao, { label: 'Descrição (opcional)', rows: 2 })}`, onSubmit: (f) => { A.altRename(d.id, a.id, f.nome, f.descricao); } });
  };
  UI.on.altDel = (el) => UI.confirm('Remover alternativa?', 'As notas dadas a ela serão perdidas.', () => A.altRemove(id(el), el.dataset.alt), { danger: true, label: 'Remover' });
  UI.on.critAdd = (el) => UI.modal({ title: 'Novo critério', submit: 'Adicionar', body: html`${F.text('nome', '', { label: 'Critério', req: true, ph: 'Ex.: Retorno financeiro' })}${F.text('peso', 5, { label: 'Peso (1–10)', type: 'number', min: 1, max: 10, req: true, hint: 'Quanto este critério importa frente aos demais.' })}`, onSubmit: (f) => { A.critAdd(id(el), f.nome, parseInt(f.peso, 10)); } });
  UI.on.critEdit = (el) => {
    const d = D.decisao(id(el)), c = d.criterios.find((x) => x.id === el.dataset.crit);
    UI.modal({ title: 'Renomear critério', body: F.text('nome', c.nome, { label: 'Critério', req: true }), onSubmit: (f) => { A.critRename(d.id, c.id, f.nome); } });
  };
  UI.on.critDel = (el) => UI.confirm('Remover critério?', 'As notas deste critério serão perdidas.', () => A.critRemove(id(el), el.dataset.crit), { danger: true, label: 'Remover' });

  UI.on.vincular = (el) => {
    const d = D.decisao(id(el)), S = D.S();
    UI.modal({ title: 'Vincular riscos e políticas', wide: true, body: html`<div class="fgrid"><div><span class="field-l">Riscos afetados</span><div class="checklist">${S.riscos.map((r) => html`<label class="chk"><input type="checkbox" name="riscos" value="${r.id}" ${d.riscosIds.includes(r.id) ? raw('checked') : ''}><span>${r.id} — ${r.titulo}<small>Severidade residual ${D.riscoScore(r)} · ${r.categoria}</small></span></label>`)}</div><small class="hint">Riscos acima do apetite elevam a alçada.</small></div>
        <div><span class="field-l">Políticas aplicáveis</span><div class="checklist">${S.politicas.map((p) => html`<label class="chk"><input type="checkbox" name="pols" value="${p.id}" ${d.politicasIds.includes(p.id) ? raw('checked') : ''}><span>${p.id} — ${p.titulo}<small>v${p.versao}</small></span></label>`)}</div></div></div>`,
      onSubmit: (f) => { A.setVinculos(d.id, UI.arr(f.riscos), UI.arr(f.pols)); UI.toast('Vínculos atualizados.'); } });
  };
  UI.on.rapidEdit = (el) => {
    const d = D.decisao(id(el));
    UI.modal({ title: 'Papéis da decisão (RAPID)', wide: true, body: html`<p class="modal-p"><strong>R</strong>ecomenda (o proponente) · <strong>A</strong>gree/Concorda (precisa dar o “de acordo”; pode vetar) · <strong>P</strong>erform/Executa · <strong>I</strong>nput/Consulta · <strong>D</strong>ecide (definido pela alçada).</p>
      <div class="fgrid">${F.persons('concordam', d.rapid.concordam.map((c) => c.pessoaId), { label: 'Concordam (de acordo obrigatório)', filter: (p) => p.id !== d.proponenteId })}${F.persons('consultados', d.rapid.consultados, { label: 'Consultados', filter: (p) => p.id !== d.proponenteId })}
      <div class="span2">${F.person('executa', d.rapid.executaId, { label: 'Executor', empty: '— definir depois —' })}</div></div>`,
      onSubmit: (f) => { A.salvarRapid(d.id, { concordam: UI.arr(f.concordam), consultados: UI.arr(f.consultados), executaId: f.executa }); UI.toast('Papéis atualizados.'); } });
  };
  UI.on.concordar = (el) => {
    const d = D.decisao(id(el)), c = d.rapid.concordam.find((x) => x.pessoaId === D.user().id);
    UI.modal({ title: 'Sua concordância', submit: 'Registrar', body: html`<p class="modal-p">${d.titulo}</p>${F.select('resposta', [['de_acordo', 'De acordo'], ['ressalva', 'De acordo, com ressalva'], ['veto', 'Veto — não posso concordar']], (c && c.resposta) || 'de_acordo', { label: 'Resposta', req: true })}${F.area('nota', (c && c.nota) || '', { label: 'Observação', rows: 3, hint: 'Obrigatória para ressalva ou veto. Um veto bloqueia a submissão até ser resolvido.' })}`, onSubmit: (f) => { A.responderConcordancia(d.id, f.resposta, f.nota); UI.toast('Resposta registrada.'); } });
  };
  UI.on.parecer = (el) => {
    const d = D.decisao(id(el)), pe = D.parecerExigido(d), fo = D.forum(pe.forumId);
    UI.modal({ title: 'Parecer prévio — ' + fo.sigla, submit: 'Emitir parecer', wide: true, body: html`<p class="modal-p">${d.titulo} · ${U.money(d.valor)}</p>${F.select('resultado', [['favoravel', 'Favorável'], ['ressalvas', 'Favorável com ressalvas'], ['desfavoravel', 'Desfavorável']], 'favoravel', { label: 'Parecer', req: true })}${F.area('texto', '', { label: 'Fundamentação', rows: 5, req: true })}`, onSubmit: (f) => { A.registrarParecer(d.id, f.resultado, f.texto); UI.toast('Parecer registrado.'); } });
  };
  UI.change.acaoStatus = (el) => { A.statusAcao(el.dataset.id, el.value); UI.toast('Status da ação atualizado.'); };
  UI.on.novaAcao = (el) => V.openActionModal(null, el.dataset.dec);
})(window);
