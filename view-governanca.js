/* João — matriz de alçadas, riscos e políticas */
(function (G) {
  'use strict';
  const U = G.U, D = G.D, A = G.A, UI = G.UI;
  const { html, raw, icon } = U;
  const V = UI.V, F = UI.F;

  /* =================== ALÇADAS =================== */
  const faixaTxt = (t, nivel) => {
    const fs = D.faixasOrdenadas(t), out = [];
    fs.forEach((f, i) => {
      if (f.nivel !== nivel) return;
      const de = i > 0 ? fs[i - 1].ate : null;
      if (f.ate == null) out.push(de != null ? 'acima de ' + U.moneyC(de) : 'qualquer valor');
      else out.push(de != null ? U.moneyC(de) + ' a ' + U.moneyC(f.ate) : 'até ' + U.moneyC(f.ate));
    });
    return out.join(' · ');
  };
  const sim = { tipoId: null, areaId: null, valor: '3.000.000', irrev: false, exc: false, risco: '', prop: null };
  const simInit = () => { const S = D.S(); if (!sim.tipoId) { sim.tipoId = S.tipos[0].id; sim.areaId = 'a-ops'; sim.prop = S.usuarioId; } };
  V.simulador = () => {
    const S = D.S();
    const v = U.parseMoney(sim.valor);
    const pseudo = { tipoId: sim.tipoId, areaId: sim.areaId, valor: v, irreversivel: sim.irrev, excecaoPolitica: sim.exc, proponenteId: sim.prop, riscosIds: sim.risco ? [sim.risco] : [] };
    const rot = D.rotear(pseudo), t = D.tipo(sim.tipoId);
    const pe = D.parecerExigido(pseudo);
    return html`${V.routeSummary(rot)}${pe ? html`<div class="notice notice--info">${icon('shieldCheck', 18)}<div>Exige <strong>parecer prévio do ${D.forum(pe.forumId).sigla}</strong> (a partir de ${U.moneyC(pe.acima)}).</div></div>` : ''}`;
  };
  V.alcadas = () => {
    simInit();
    const S = D.S(), u = D.user(), adm = D.isAdmin(u), c = S.config;
    return html`<div class="page-in">
      ${UI.header({ title: 'Matriz de alçadas', sub: 'Quem tem poder para decidir o quê, até qual valor — e em que situações uma decisão sobe de nível. É a regra que o sistema aplica automaticamente a cada decisão.',
        actions: adm ? UI.btn('Editar regras de escalonamento', 'regrasEdit', { icon: 'sliders' }) : html`<span class="muted">Somente a Governança altera as alçadas</span>` })}
      ${UI.card('Tabela de alçadas', html`<div class="tbl-wrap"><table class="tbl alc"><thead><tr><th>Tipo de decisão</th>${S.niveis.map((n) => html`<th>${n.n} · ${n.nome}</th>`)}<th>Parecer prévio</th>${adm ? html`<th></th>` : ''}</tr></thead><tbody>${S.tipos.map((t) => html`<tr><td><span class="t-main">${t.nome}</span></td>${S.niveis.map((n) => { const x = faixaTxt(t, n.n); return html`<td><span class="alc-c" data-n="${x ? n.n : 0}">${x || '—'}</span></td>`; })}
        <td>${t.parecer ? html`<span class="tag">${(D.forum(t.parecer.forumId) || {}).sigla} ${t.parecer.acima ? 'a partir de ' + U.moneyC(t.parecer.acima) : 'sempre'}</span>` : html`<span class="muted">—</span>`}</td>${adm ? html`<td><button type="button" class="btn btn--sm" data-act="tipoEdit" data-id="${t.id}" aria-label="Editar alçada de ${t.nome}" title="Editar">${icon('edit', 14)}</button></td>` : ''}</tr>`)}</tbody></table></div>`, { flush: true, sub: 'Cada célula mostra a faixa de valor em que aquela instância decide. Quanto mais escuro, mais alto o nível.' })}

      <div class="grid g2">
        ${UI.card('Regras de escalonamento', html`<ul class="why">
          <li class="base">${icon(c.bumpIrreversivel ? 'check' : 'x', 14)}<span><strong>Irreversibilidade (Tipo 1).</strong> ${c.bumpIrreversivel ? 'Decisão de mão única sobe um nível.' : 'Desativada.'}</span></li>
          <li class="base">${icon(c.bumpRisco ? 'check' : 'x', 14)}<span><strong>Apetite a risco.</strong> ${c.bumpRisco ? html`Risco vinculado com severidade residual ≥ <b>${c.apetiteRisco}</b> sobe um nível.` : 'Desativada.'}</span></li>
          <li class="base">${icon(c.bumpExcecao ? 'check' : 'x', 14)}<span><strong>Exceção de política.</strong> ${c.bumpExcecao ? 'Pedir exceção a uma política interna sobe um nível.' : 'Desativada.'}</span></li>
          <li class="base">${icon(c.sod ? 'check' : 'x', 14)}<span><strong>Segregação de funções.</strong> ${c.sod ? 'Ninguém decide a própria proposta: se o decisor é o proponente, sobe um nível.' : 'Desativada.'}</span></li></ul>
          <p class="sub">Os níveis só sobem, nunca descem. O teto é o Conselho de Administração.</p>`)}
        ${UI.card('Simulador de alçada', html`<div class="fgrid">
          <label class="field"><span class="field-l">Tipo</span><select class="input" data-change="sim" data-k="tipoId">${S.tipos.map((t) => html`<option value="${t.id}" ${sim.tipoId === t.id ? raw('selected') : ''}>${t.nome}</option>`)}</select></label>
          <label class="field"><span class="field-l">Área proponente</span><select class="input" data-change="sim" data-k="areaId">${S.areas.filter((a) => a.id !== 'a-ca').map((a) => html`<option value="${a.id}" ${sim.areaId === a.id ? raw('selected') : ''}>${a.nome}</option>`)}</select></label>
          <label class="field"><span class="field-l">Valor (R$)</span><input class="input" data-input="sim" data-k="valor" value="${sim.valor}" inputmode="decimal" placeholder="Ex.: 3.000.000 ou 3 mi"></label>
          <label class="field"><span class="field-l">Proponente</span><select class="input" data-change="sim" data-k="prop">${S.pessoas.map((p) => html`<option value="${p.id}" ${sim.prop === p.id ? raw('selected') : ''}>${p.nome}</option>`)}</select></label>
          <label class="field span2"><span class="field-l">Risco vinculado</span><select class="input" data-change="sim" data-k="risco"><option value="">Nenhum</option>${S.riscos.map((r) => html`<option value="${r.id}" ${sim.risco === r.id ? raw('selected') : ''}>${r.id} — ${r.titulo} (sev. ${D.riscoScore(r)})</option>`)}</select></label>
          <div class="span2 row"><label class="chk"><input type="checkbox" data-change="sim" data-k="irrev" ${sim.irrev ? raw('checked') : ''}><span>Irreversível</span></label><label class="chk"><input type="checkbox" data-change="sim" data-k="exc" ${sim.exc ? raw('checked') : ''}><span>Exceção de política</span></label></div></div>
          <div class="sim-out" id="sim-out">${V.simulador()}</div>`, { sub: 'Teste qualquer cenário sem criar uma decisão' })}
      </div>
    </div>`;
  };
  UI.add('alcadas', /^alcadas$/, () => V.alcadas(), 'Matriz de alçadas');
  const simUpd = (el) => { const k = el.dataset.k; sim[k] = el.type === 'checkbox' ? el.checked : el.value; UI.$('#sim-out').innerHTML = String(V.simulador()); };
  UI.input.sim = simUpd; UI.change.sim = simUpd;

  UI.on.regrasEdit = () => {
    const c = D.S().config;
    UI.modal({ title: 'Regras de escalonamento', body: html`<div class="stack">${F.check('bumpIrreversivel', c.bumpIrreversivel, 'Decisão irreversível sobe um nível')}${F.check('bumpRisco', c.bumpRisco, 'Risco vinculado acima do apetite sobe um nível')}${F.check('bumpExcecao', c.bumpExcecao, 'Exceção a política sobe um nível')}${F.check('sod', c.sod, 'Segregação de funções (proponente não decide a própria proposta)')}</div>${F.text('apetite', c.apetiteRisco, { label: 'Apetite a risco (severidade a partir da qual escala)', type: 'number', min: 1, max: 25, req: true, hint: 'Escala 1–25 (probabilidade × impacto). Mais baixo = mais conservador.' })}`,
      onSubmit: (f) => { A.salvarConfig({ bumpIrreversivel: !!f.bumpIrreversivel, bumpRisco: !!f.bumpRisco, bumpExcecao: !!f.bumpExcecao, sod: !!f.sod, apetiteRisco: U.clamp(parseInt(f.apetite, 10) || 15, 1, 25) }); UI.toast('Regras atualizadas. Valem para decisões ainda não submetidas.'); } });
  };
  UI.on.tipoEdit = (el) => {
    const S = D.S(), t = D.tipo(el.dataset.id), fs = D.faixasOrdenadas(t);
    const rows = [0, 1, 2, 3].map((i) => fs[i] || null);
    UI.modal({ title: 'Alçada — ' + t.nome, wide: true, body: html`<p class="modal-p">Defina até que valor cada nível decide. A última faixa deve ficar com “até” vazio (sem limite).</p>
      <div class="fgrid">${rows.map((f, i) => html`${F.text('ate' + i, f && f.ate != null ? U.num(f.ate) : '', { label: 'Faixa ' + (i + 1) + ' — até (R$)', inputmode: 'decimal', ph: i === 0 || f ? 'vazio = sem limite' : 'não usar' })}${F.select('niv' + i, S.niveis.map((n) => [n.n, n.n + ' · ' + n.nome]), f ? f.nivel : S.niveis[S.niveis.length - 1].n, { label: 'Quem decide' })}`)}
      ${F.select('parecerForum', S.foruns.map((x) => [x.id, x.nome]), t.parecer ? t.parecer.forumId : '', { label: 'Parecer prévio de', empty: 'Nenhum' })}${F.text('parecerAcima', t.parecer ? U.num(t.parecer.acima) : '', { label: 'A partir de (R$)', inputmode: 'decimal', hint: '0 = sempre' })}</div>`,
      onSubmit: (f) => {
        const faixas = [];
        for (let i = 0; i < 4; i++) {
          const txt = (f['ate' + i] || '').trim();
          if (i > 0 && faixas.length && faixas[faixas.length - 1].ate == null) break; // já fechou
          if (!txt) { faixas.push({ ate: null, nivel: +f['niv' + i] }); break; }
          const v = U.parseMoney(txt); if (v == null) throw new A.RuleError('Valor inválido na faixa ' + (i + 1) + '.');
          faixas.push({ ate: v, nivel: +f['niv' + i] });
        }
        if (faixas[faixas.length - 1].ate != null) throw new A.RuleError('A última faixa precisa ficar sem limite ("até" vazio) para cobrir valores maiores.');
        for (let i = 1; i < faixas.length - 1; i++) if (faixas[i].ate <= faixas[i - 1].ate) throw new A.RuleError('Os limites das faixas devem ser crescentes.');
        for (let i = 1; i < faixas.length; i++) if (faixas[i].nivel < faixas[i - 1].nivel) throw new A.RuleError('Uma faixa de valor maior não pode ser decidida por um nível mais baixo.');
        const ac = (f.parecerAcima || '').trim() ? U.parseMoney(f.parecerAcima) : 0;
        A.salvarTipo({ id: t.id, faixas, parecer: f.parecerForum ? { forumId: f.parecerForum, acima: ac || 0 } : null });
        UI.toast('Alçada atualizada.');
      } });
  };

  /* =================== RISCOS =================== */
  const rs = { view: 'residual', sel: null, q: '' };
  V.heatmap = (o) => {
    o = o || {};
    const S = D.S(), view = o.view || (o.mini ? 'residual' : rs.view), ap = S.config.apetiteRisco;
    const ativos = S.riscos.filter(D.riscoAtivo);
    const cnt = (p, i) => ativos.filter((r) => (view === 'residual' ? (r.residualP || r.p) === p && (r.residualI || r.i) === i : r.p === p && r.i === i)).length;
    const cells = [];
    for (let p = 5; p >= 1; p--) for (let i = 1; i <= 5; i++) {
      const n = cnt(p, i), sc = p * i, sel = !o.mini && rs.sel && rs.sel.p === p && rs.sel.i === i;
      cells.push(html`<${raw(o.mini ? 'div' : 'button type="button" data-act="heat" data-p="' + p + '" data-i="' + i + '"')} class="heat-c ${sc >= ap ? 'apet' : ''} ${sel ? 'sel' : ''}" data-n="${D.riscoNivel(sc)}" title="Probabilidade ${p} × impacto ${i} = ${sc}${n ? ' · ' + n + ' risco(s)' : ''}">${n ? html`<b>${n}</b>` : ''}</${raw(o.mini ? 'div' : 'button')}>`);
    }
    return html`<div class="heatwrap"><div class="heat-y"><span>5</span><span>4</span><span>3</span><span>2</span><span>1</span></div><div class="heat">${cells}</div><div></div><div class="heat-x"><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span></div></div>
      <div class="row row--sb" style="font-size:12px;color:var(--ink-3)"><span>↑ Probabilidade</span><span>Impacto →</span></div>`;
  };
  V.riscos = () => {
    const S = D.S(), u = D.user(), ap = S.config.apetiteRisco;
    const ativos = S.riscos.filter(D.riscoAtivo);
    return html`<div class="page-in">
      ${UI.header({ title: 'Registro de riscos', sub: 'Riscos corporativos com dono, severidade inerente e residual, plano de mitigação e revisão periódica. O apetite a risco define quando uma decisão precisa subir de nível.', actions: UI.btn('Novo risco', 'riscoNovo', { kind: 'primary', icon: 'plus' }) })}
      <div class="grid g-kpi">${UI.kpi('Riscos ativos', ativos.length, S.riscos.length - ativos.length + ' encerrado(s)')}${UI.kpi('Acima do apetite', S.riscos.filter(D.acimaApetite).length, 'severidade residual ≥ ' + ap, S.riscos.some(D.acimaApetite) ? 'alert' : 'good')}${UI.kpi('Críticos', ativos.filter((r) => D.riscoScore(r) >= 15).length, 'severidade ≥ 15')}${UI.kpi('Revisão em atraso', ativos.filter((r) => r.proximaRevisao < U.today()).length, 'pelo ciclo da política de riscos', ativos.some((r) => r.proximaRevisao < U.today()) ? 'warn' : 'good')}</div>
      <div class="grid g-main" style="grid-template-columns:minmax(0,1fr) 340px;align-items:start">
        <div class="col-stack" id="risk-tbl-wrap">${V.riscosTabela()}</div>
        <aside class="col-stack">${UI.card('Mapa de calor', html`<div class="row"><div class="seg">${[['residual', 'Residual'], ['inerente', 'Inerente']].map(([v, l]) => html`<button type="button" class="${rs.view === v ? 'on' : ''}" data-act="riscoView" data-v="${v}">${l}</button>`)}</div>${rs.sel ? html`<button type="button" class="btn btn--sm" data-act="heatClear">${icon('x', 14)} Limpar filtro</button>` : ''}</div>${V.heatmap()}
          <div class="legend"><span><i style="background:#0a8a0a"></i>Baixo</span><span><i style="background:#b57d00"></i>Médio</span><span><i style="background:#c9582d"></i>Alto</span><span><i style="background:#c03030"></i>Crítico</span></div>
          <p class="sub">O contorno marca o apetite (≥ ${ap}). Clique numa célula para filtrar a lista.</p>`, { sub: 'Riscos ativos por probabilidade × impacto' })}</aside></div></div>`;
  };
  V.riscosTabela = () => {
    const S = D.S();
    let list = [...S.riscos].sort((a, b) => D.riscoScore(b) - D.riscoScore(a));
    if (rs.sel) list = list.filter((r) => D.riscoAtivo(r) && (rs.view === 'residual' ? (r.residualP || r.p) === rs.sel.p && (r.residualI || r.i) === rs.sel.i : r.p === rs.sel.p && r.i === rs.sel.i));
    const link = (r) => S.decisoes.filter((d) => d.riscosIds.includes(r.id)).length;
    return UI.card('Riscos', list.length ? html`<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Risco</th><th>Inerente</th><th>Residual</th><th>Situação</th><th></th></tr></thead><tbody>${list.map((r) => html`<tr>
      <td style="min-width:230px"><button type="button" class="btn btn--ghost" style="height:auto;padding:0;text-align:left;font-weight:600;white-space:normal;color:var(--ink)" data-act="riscoEdit" data-id="${r.id}">${r.titulo}</button><span class="t-sub">${r.id} · ${r.categoria} · dono: ${D.nomePessoa(r.donoId)}${link(r) ? ' · em ' + U.plural(link(r), 'decisão', 'decisões') : ''}</span></td>
      <td>${UI.riskChip(r.p * r.i)}</td><td>${UI.riskChip(D.riscoScore(r))}${D.acimaApetite(r) ? html`<span class="t-sub" style="display:block;color:var(--crit-ink);font-weight:600">acima do apetite</span>` : ''}</td>
      <td><div class="stack" style="gap:3px;justify-items:start">${UI.badge(({ identificado: 'Identificado', mitigando: 'Mitigando', aceito: 'Aceito', encerrado: 'Encerrado' })[r.status], r.status === 'encerrado' ? 'neutral' : r.status === 'aceito' ? 'info' : r.status === 'mitigando' ? 'good' : 'warning')}${r.status === 'encerrado' ? '' : html`<small class="muted">revisão ${UI.due(r.proximaRevisao)}</small>`}</div></td>
      <td class="num">${r.status !== 'encerrado' && (D.isAdmin(D.user()) || D.user().id === r.donoId) ? UI.btn('Revisar', 'riscoRev', { cls: 'btn--sm', data: { id: r.id }, title: 'Registrar revisão periódica' }) : ''}</td></tr>`)}</tbody></table></div>` : UI.empty('search', 'Nenhum risco nesta célula'), { flush: true, sub: rs.sel ? 'Filtrado pelo mapa de calor' : 'Ordenados pela severidade residual' });
  };
  UI.add('riscos', /^riscos$/, () => V.riscos(), 'Riscos');
  UI.on.heat = (el) => { const p = +el.dataset.p, i = +el.dataset.i; rs.sel = rs.sel && rs.sel.p === p && rs.sel.i === i ? null : { p, i }; UI.render(); };
  UI.on.heatClear = () => { rs.sel = null; UI.render(); };
  UI.on.riscoView = (el) => { rs.view = el.dataset.v; UI.render(); };
  UI.on.riscoRev = (el) => { A.revisarRisco(el.dataset.id); UI.toast('Revisão registrada. Próxima em 90 dias.'); };
  UI.on.riscoNovo = () => V.riscoModal(null);
  UI.on.riscoEdit = (el) => V.riscoModal(D.risco(el.dataset.id));
  V.riscoModal = (r) => {
    const x = r || { titulo: '', categoria: D.RISCO_CATS[0], descricao: '', p: 3, i: 3, residualP: 2, residualI: 3, donoId: D.S().usuarioId, status: 'identificado', mitigacao: '', proximaRevisao: U.addDays(U.today(), 90) };
    const n5 = [1, 2, 3, 4, 5].map((n) => [n, String(n)]);
    UI.modal({ title: r ? 'Editar risco ' + r.id : 'Novo risco', wide: true, body: html`<div class="fgrid"><div class="span2">${F.text('titulo', x.titulo, { label: 'Risco', req: true, ph: 'Ex.: Interrupção do fornecimento de aço' })}</div>
      ${F.select('categoria', D.RISCO_CATS.map((c) => [c, c]), x.categoria, { label: 'Categoria' })}${F.person('donoId', x.donoId, { label: 'Dono do risco', req: true })}
      ${F.select('p', n5, x.p, { label: 'Probabilidade inerente (1–5)' })}${F.select('i', n5, x.i, { label: 'Impacto inerente (1–5)' })}
      ${F.select('residualP', n5, x.residualP || x.p, { label: 'Probabilidade residual (após mitigação)' })}${F.select('residualI', n5, x.residualI || x.i, { label: 'Impacto residual (após mitigação)' })}
      ${F.select('status', [['identificado', 'Identificado'], ['mitigando', 'Em mitigação'], ['aceito', 'Aceito'], ['encerrado', 'Encerrado']], x.status, { label: 'Status' })}${F.text('proximaRevisao', x.proximaRevisao, { label: 'Próxima revisão', type: 'date', req: true })}
      <div class="span2">${F.area('mitigacao', x.mitigacao, { label: 'Plano de mitigação e controles', rows: 3 })}</div></div>`,
      onSubmit: (f) => { A.salvarRisco({ id: r && r.id, titulo: f.titulo.trim(), categoria: f.categoria, descricao: x.descricao, p: +f.p, i: +f.i, residualP: +f.residualP, residualI: +f.residualI, donoId: f.donoId, status: f.status, mitigacao: f.mitigacao, proximaRevisao: f.proximaRevisao }); UI.toast(r ? 'Risco atualizado.' : 'Risco registrado.'); } });
  };

  /* =================== POLÍTICAS =================== */
  const SIT = { vigente: ['Vigente', 'good', 'check'], a_vencer: ['Revisão a vencer', 'warning', 'clock'], vencida: ['Revisão vencida', 'critical', 'alert'], rascunho: ['Rascunho', 'neutral', 'edit'] };
  V.politicas = () => {
    const S = D.S(), u = D.user();
    const sit = (p) => D.politicaSituacao(p);
    const n = (k) => S.politicas.filter((p) => sit(p) === k).length;
    const list = [...S.politicas].sort((a, b) => a.proximaRevisao.localeCompare(b.proximaRevisao));
    return html`<div class="page-in">
      ${UI.header({ title: 'Políticas internas', sub: 'A biblioteca de normas da empresa. Cada política tem dono, versão e ciclo de revisão — e pode ser vinculada às decisões que a aplicam ou pedem exceção.', actions: D.isAdmin(u) ? UI.btn('Nova política', 'polNova', { kind: 'primary', icon: 'plus' }) : '' })}
      <div class="grid g-kpi">${UI.kpi('Vigentes', n('vigente'), 'dentro do ciclo de revisão', 'good')}${UI.kpi('Revisão a vencer', n('a_vencer'), 'nos próximos 45 dias', n('a_vencer') ? 'warn' : 'good')}${UI.kpi('Revisão vencida', n('vencida'), 'exigem ação do dono', n('vencida') ? 'alert' : 'good')}${UI.kpi('Total', S.politicas.length, 'políticas cadastradas')}</div>
      ${UI.card('Biblioteca', html`<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Política</th><th>Dono</th><th>Versão</th><th>Vigente desde</th><th>Próxima revisão</th><th>Situação</th><th></th></tr></thead><tbody>${list.map((p) => { const s = SIT[sit(p)]; const dec = S.decisoes.filter((d) => d.politicasIds.includes(p.id)).length; const pode = D.isAdmin(u) || u.id === p.donoId; return html`<tr>
        <td><span class="t-main">${p.titulo}</span><span class="t-sub">${p.id} · ${p.categoria}${dec ? ' · citada em ' + U.plural(dec, 'decisão', 'decisões') : ''}</span><span class="t-sub" style="display:block;max-width:56ch;margin-top:2px">${p.resumo}</span></td>
        <td>${UI.who(p.donoId)}</td><td>v${p.versao}</td><td>${U.fmtDate(p.vigenteDesde)}</td><td>${UI.due(p.proximaRevisao)}</td><td>${UI.badge(s[0], s[1], s[2])}</td>
        <td class="num">${pode ? html`<span class="row" style="justify-content:flex-end;flex-wrap:nowrap">${UI.btn('Registrar revisão', 'polRev', { cls: 'btn--sm', data: { id: p.id } })}${D.isAdmin(u) ? UI.btn('', 'polEdit', { cls: 'btn--sm', icon: 'edit', kind: 'ghost', data: { id: p.id }, title: 'Editar' }) : ''}</span>` : ''}</td></tr>`; })}</tbody></table></div>`, { flush: true, sub: 'Ordenadas pela data da próxima revisão' })}
    </div>`;
  };
  UI.add('politicas', /^politicas$/, () => V.politicas(), 'Políticas');
  UI.on.polNova = () => V.polModal(null);
  UI.on.polEdit = (el) => V.polModal(D.politica(el.dataset.id));
  V.polModal = (p) => {
    const x = p || { titulo: '', categoria: D.POL_CATS[0], donoId: D.S().usuarioId, versao: '1.0', vigenteDesde: U.today(), proximaRevisao: U.addDays(U.today(), 365), resumo: '', status: 'vigente' };
    UI.modal({ title: p ? 'Editar ' + p.id : 'Nova política', wide: true, body: html`<div class="fgrid"><div class="span2">${F.text('titulo', x.titulo, { label: 'Título', req: true })}</div>${F.select('categoria', D.POL_CATS.map((c) => [c, c]), x.categoria, { label: 'Categoria' })}${F.person('donoId', x.donoId, { label: 'Dono', req: true })}
      ${F.text('versao', x.versao, { label: 'Versão', req: true })}${F.select('status', [['vigente', 'Vigente'], ['rascunho', 'Rascunho']], x.status, { label: 'Situação' })}${F.text('vigenteDesde', x.vigenteDesde, { label: 'Vigente desde', type: 'date', req: true })}${F.text('proximaRevisao', x.proximaRevisao, { label: 'Próxima revisão', type: 'date', req: true })}
      <div class="span2">${F.area('resumo', x.resumo, { label: 'Resumo do que a política determina', rows: 3 })}</div></div>`,
      onSubmit: (f) => { A.salvarPolitica({ id: p && p.id, titulo: f.titulo.trim(), categoria: f.categoria, donoId: f.donoId, versao: f.versao, status: f.status, vigenteDesde: f.vigenteDesde, proximaRevisao: f.proximaRevisao, resumo: f.resumo }); UI.toast(p ? 'Política atualizada.' : 'Política cadastrada.'); } });
  };
  UI.on.polRev = (el) => {
    const p = D.politica(el.dataset.id);
    UI.modal({ title: 'Registrar revisão — ' + p.id, body: html`<p class="modal-p">${p.titulo} · versão atual ${p.versao}. A revisão renova a vigência por 12 meses.</p>${F.text('versao', p.versao, { label: 'Versão resultante', req: true, hint: 'Mantenha a versão se não houve mudança no texto.' })}${F.area('resumo', p.resumo, { label: 'Resumo atualizado', rows: 3 })}`, onSubmit: (f) => { A.revisarPolitica(p.id, f.versao, f.resumo); UI.toast('Revisão registrada. Próxima em 12 meses.'); } });
  };
})(window);
