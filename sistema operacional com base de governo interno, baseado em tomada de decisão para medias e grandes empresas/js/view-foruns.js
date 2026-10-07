/* João — fóruns, reuniões, votação e ata */
(function (G) {
  'use strict';
  const U = G.U, D = G.D, A = G.A, UI = G.UI;
  const { html, raw, icon } = U;
  const V = UI.V, F = UI.F;
  const notes = {}, obs = {}; // rascunhos de texto que sobrevivem a re-renderizações

  const fila = (forumId) => {
    const S = D.S();
    return S.decisoes.filter((d) => d.status === 'deliberacao' && d.roteamento && d.roteamento.forumId === forumId && !S.reunioes.some((r) => r.status === 'agendada' && r.pauta.some((p) => p.decisaoId === d.id && p.status === 'pendente')));
  };
  const proximaReuniao = (forumId) => D.S().reunioes.filter((r) => r.forumId === forumId && r.status === 'agendada').sort((a, b) => a.data.localeCompare(b.data))[0];
  const mtgBadge = (m) => UI.badge(({ agendada: 'Agendada', realizada: 'Realizada', cancelada: 'Cancelada' })[m.status], m.status === 'agendada' ? 'info' : m.status === 'realizada' ? 'good' : 'neutral', m.status === 'agendada' ? 'calendar' : m.status === 'realizada' ? 'check' : 'ban');

  /* =================== lista de fóruns =================== */
  V.foruns = () => {
    const S = D.S(), u = D.user();
    const reunioes = [...S.reunioes].sort((a, b) => (a.status === 'agendada') === (b.status === 'agendada') ? (a.status === 'agendada' ? a.data.localeCompare(b.data) : b.data.localeCompare(a.data)) : a.status === 'agendada' ? -1 : 1);
    return html`<div class="page-in">
      ${UI.header({ title: 'Fóruns e reuniões', sub: 'Os colegiados da governança. Cada fórum tem composição, quórum e regra de votação explícitos — a deliberação é apurada pelo sistema, não por interpretação.' })}
      <div class="grid g3">${S.foruns.map((f) => {
        const prox = proximaReuniao(f.id), q = fila(f.id);
        return html`<section class="card"><div class="card-b fcard">
          <div class="row row--sb"><span class="tag">${f.sigla}</span>${f.deliberativo ? UI.badge('Delibera', 'accent', 'scale') : UI.badge('Assessor · emite parecer', 'info', 'shieldCheck')}</div>
          <h3><a href="#/foruns/${f.id}" style="color:inherit">${f.nome}</a></h3><p class="sub" style="margin:0">${f.finalidade}</p>
          <div class="row row--sb">${UI.stack(f.membros, 6)}<small class="muted">${f.membros.length} membros · quórum ${f.quorum}</small></div>
          <dl class="kv"><dt>Regra de votação</dt><dd>${D.REGRAS[f.regra]}</dd><dt>Periodicidade</dt><dd>${f.periodicidade}</dd><dt>Presidente</dt><dd>${D.nomePessoa(f.presidenteId)}</dd>
            ${f.deliberativo ? html`<dt>Próxima reunião</dt><dd>${prox ? html`<a href="#/reunioes/${prox.id}">${U.fmtDate(prox.data)}</a>` : html`<span class="muted">não agendada</span>`}</dd>` : ''}</dl>
          ${q.length ? UI.badge(U.plural(q.length, 'decisão aguarda pauta', 'decisões aguardam pauta'), 'warning', 'list') : ''}
          <a class="btn" href="#/foruns/${f.id}">Abrir fórum ${icon('arrowR', 15)}</a></div></section>`;
      })}</div>
      ${UI.card('Calendário de reuniões', html`<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Data</th><th>Fórum</th><th>Local</th><th class="num">Itens</th><th>Status</th></tr></thead><tbody>${reunioes.map((m) => { const f = D.forum(m.forumId); return html`<tr data-row-href="#/reunioes/${m.id}" tabindex="0"><td><span class="t-main">${U.fmtDate(m.data)}</span><span class="t-sub">${U.fmtWeekday(m.data)} · ${m.hora}</span></td><td>${f.nome}</td><td class="muted">${m.local || '—'}</td><td class="num">${m.pauta.length}</td><td>${mtgBadge(m)}</td></tr>`; })}</tbody></table></div>`, { flush: true, sub: 'Agendadas primeiro; depois as já realizadas' })}
    </div>`;
  };
  UI.add('foruns', /^foruns$/, () => V.foruns(), 'Fóruns e reuniões');

  /* =================== detalhe do fórum =================== */
  V.forum = (fid) => {
    const f = D.forum(fid), S = D.S(), u = D.user();
    if (!f) return html`<div class="page-in">${UI.empty('search', 'Fórum não encontrado', '', UI.link('Ver fóruns', '#/foruns', { kind: 'primary' }))}</div>`;
    const q = fila(f.id), prox = proximaReuniao(f.id);
    const reun = S.reunioes.filter((r) => r.forumId === f.id).sort((a, b) => b.data.localeCompare(a.data));
    const podeSec = D.secretariaReuniao({ forumId: f.id }, u);
    const pareceres = S.decisoes.filter((d) => { const pe = D.parecerExigido(d); return pe && pe.forumId === f.id && !d.parecer && ['analise', 'deliberacao'].includes(d.status); });
    return html`<div class="page-in">
      ${UI.header({ crumbs: [{ label: 'Fóruns', href: '#/foruns' }, { label: f.sigla }], kicker: f.deliberativo ? 'Fórum deliberativo' : 'Comitê assessor', title: f.nome, sub: f.finalidade,
        actions: html`${D.isAdmin(u) ? UI.btn('Editar fórum', 'forumEdit', { icon: 'edit', data: { id: f.id } }) : ''}${f.deliberativo && podeSec ? UI.btn('Agendar reunião', 'reuniaoNova', { kind: 'primary', icon: 'calendar', data: { id: f.id } }) : ''}` })}
      <div class="grid g-main"><div class="col-stack">
        ${f.deliberativo ? UI.card('Fila de pauta', q.length ? html`<div class="list">${q.map((d) => html`<div class="li"><span class="li-t"><strong><a href="#/decisoes/${d.id}">${d.titulo}</a></strong><small>${d.id} · ${d.valor ? U.moneyC(d.valor) + ' · ' : ''}submetida ${U.rel(d.submetidaEm)}</small></span>${UI.due(d.prazo)}${podeSec && prox ? UI.btn('Incluir em ' + U.fmtDay(prox.data), 'pautaAdd', { cls: 'btn--sm', data: { r: prox.id, d: d.id } }) : ''}</div>`)}</div>${!prox && podeSec ? html`<p class="sub" style="padding:10px 18px">Agende uma reunião para incluir estas decisões na pauta.</p>` : ''}` : UI.empty('shieldCheck', 'Fila vazia', 'Nenhuma decisão aguardando inclusão em pauta neste fórum.'), { flush: true, sub: 'Decisões submetidas cuja alçada é este fórum e que ainda não estão em pauta' }) : ''}
        ${!f.deliberativo ? UI.card('Pareceres pendentes', pareceres.length ? html`<div class="list">${pareceres.map((d) => html`<a class="li" href="#/decisoes/${d.id}"><span class="li-t"><strong>${d.titulo}</strong><small>${d.id} · ${U.money(d.valor)} · ${D.STATUS[d.status].label}</small></span>${f.membros.includes(u.id) ? html`<span class="btn btn--sm">Emitir parecer</span>` : ''}</a>`)}</div>` : UI.empty('shieldCheck', 'Sem pareceres pendentes'), { flush: true, sub: 'Este comitê não delibera: emite parecer prévio exigido pela matriz de alçadas' }) : ''}
        ${f.deliberativo ? UI.card('Reuniões', reun.length ? html`<div class="list">${reun.map((m) => html`<a class="li" href="#/reunioes/${m.id}"><span class="mtg-d ${m.status === 'agendada' ? '' : 'mtg-d--past'}"><small>${U.fmtWeekday(m.data)}</small><b>${U.parse(m.data).getDate()}</b></span><span class="li-t"><strong>${U.fmtDate(m.data)} · ${m.hora}</strong><small>${m.local || 'Local a definir'} · ${U.plural(m.pauta.length, 'item', 'itens')}</small></span>${mtgBadge(m)}</a>`)}</div>` : UI.empty('calendar', 'Nenhuma reunião'), { flush: true }) : ''}
      </div>
      <aside class="col-stack">
        ${UI.card('Composição', html`<div class="stack">${f.membros.map((id) => html`<div class="row row--sb">${UI.who(id, { cargo: true })}<span class="row" style="gap:4px">${id === f.presidenteId ? UI.badge('Presidente', 'info') : ''}</span></div>`)}
          ${f.secretarioId ? html`<hr class="sep"><div class="row row--sb">${UI.who(f.secretarioId, { cargo: true })}${UI.badge('Secretário(a) · sem voto', 'neutral')}</div>` : ''}</div>`)}
        ${UI.card('Regras de funcionamento', html`<dl class="kv"><dt>Quórum mínimo</dt><dd>${f.quorum} de ${f.membros.length}</dd><dt>Votação</dt><dd>${D.REGRAS[f.regra]}</dd><dt>Voto de minerva</dt><dd>${f.deliberativo ? (f.minerva ? 'Sim — presidente desempata' : 'Não') : '—'}</dd><dt>Periodicidade</dt><dd>${f.periodicidade}</dd></dl>`)}
      </aside></div></div>`;
  };
  UI.add('foruns', /^foruns\/([\w-]+)$/, (m) => V.forum(m[1]), 'Fórum');

  UI.on.forumEdit = (el) => {
    const f = D.forum(el.dataset.id);
    UI.modal({ title: 'Editar fórum — ' + f.sigla, wide: true, body: html`<div class="fgrid">${F.text('nome', f.nome, { label: 'Nome', req: true })}${F.text('periodicidade', f.periodicidade, { label: 'Periodicidade', req: true })}
      <div class="span2">${F.area('finalidade', f.finalidade, { label: 'Finalidade e escopo', rows: 3 })}</div>
      ${F.text('quorum', f.quorum, { label: 'Quórum mínimo', type: 'number', min: 1, max: 20, req: true })}${F.select('regra', Object.entries(D.REGRAS), f.regra, { label: 'Regra de votação', req: true })}
      ${F.person('presidenteId', f.presidenteId, { label: 'Presidente', req: true })}${F.person('secretarioId', f.secretarioId, { label: 'Secretário(a)', empty: '— nenhum —' })}
      <div class="span2">${F.check('minerva', f.minerva, 'Presidente tem voto de minerva (desempate)')}</div>
      <div class="span2">${F.persons('membros', f.membros, { label: 'Membros com direito a voto' })}</div></div>`,
      onSubmit: (v) => { const m = UI.arr(v.membros); if (m.length < +v.quorum) throw new A.RuleError('O quórum não pode ser maior que o número de membros.'); A.salvarForum({ id: f.id, nome: v.nome, periodicidade: v.periodicidade, finalidade: v.finalidade, quorum: +v.quorum, regra: v.regra, presidenteId: v.presidenteId, secretarioId: v.secretarioId || null, minerva: !!v.minerva, membros: m }); UI.toast('Fórum atualizado.'); } });
  };
  UI.on.reuniaoNova = (el) => {
    const f = D.forum(el.dataset.id);
    UI.modal({ title: 'Agendar reunião — ' + f.sigla, body: html`<div class="fgrid">${F.text('data', U.addDays(U.today(), 14), { label: 'Data', type: 'date', req: true })}${F.text('hora', '10:00', { label: 'Hora', type: 'time', req: true })}<div class="span2">${F.text('local', '', { label: 'Local ou link', ph: 'Sala do Conselho / videoconferência' })}</div></div>`,
      onSubmit: (v, form, close) => { const id = A.criarReuniao({ forumId: f.id, data: v.data, hora: v.hora, local: v.local }); close(); UI.toast('Reunião agendada.'); location.hash = '#/reunioes/' + id; return false; } });
  };
  UI.on.pautaAdd = (el) => { A.pautaAdd(el.dataset.r, el.dataset.d); UI.toast('Incluída na pauta.'); };

  /* =================== reunião =================== */
  const barra = (c) => {
    const tot = Math.max(1, c.aprova + c.rejeita + c.abstem + c.impedido);
    return html`<div class="tally" role="img" aria-label="Apuração parcial"><i class="t-a" style="width:${(c.aprova / tot) * 100}%"></i><i class="t-c" style="width:${(c.rejeita / tot) * 100}%"></i><i class="t-b" style="width:${(c.abstem / tot) * 100}%"></i><i class="t-i" style="width:${(c.impedido / tot) * 100}%"></i></div>`;
  };
  const RES = { aprovada: ['Aprovada', 'good'], rejeitada: ['Rejeitada', 'critical'], empate: ['Empate', 'warning'], sem_votos: ['Sem votos', 'neutral'] };
  V.itemPauta = (m, f, it, idx, sec) => {
    const d = D.decisao(it.decisaoId);
    if (!d) return html`<div class="pauta-i"><div class="pauta-h">Decisão ${it.decisaoId} removida.</div></div>`;
    const open = m.status === 'agendada' && it.status === 'pendente';
    const an = D.analiseMatriz(d), rec = d.alternativas.find((a) => a.id === d.recomendacaoId), pr = D.prontidao(d);
    const rest = D.resolverVotacao(f, it.votos), voted = Object.keys(it.votos).length, falta = m.presentes.filter((p) => !it.votos[p]);
    const mr = D.maxRiscoVinculado(d);
    return html`<article class="pauta-i"><div class="pauta-h"><span class="pauta-n">${idx + 1}</span>
      <div style="flex:1;min-width:0" class="stack"><div><strong style="font-size:15.5px"><a href="#/decisoes/${d.id}" style="color:inherit">${d.titulo}</a></strong><div class="meta" style="margin:2px 0 0"><span>${d.id}</span>${d.valor ? html`<span>${U.money(d.valor)}</span>` : ''}${d.irreversivel ? html`<span class="tag tag--t1">Irreversível</span>` : ''}<span>Proponente: ${D.nomePessoa(d.proponenteId)}</span></div></div>
        <div class="row">${rec ? html`<span class="tag" title="Alternativa recomendada">Recomenda: ${rec.nome}</span>` : ''}${an.lider ? html`<span class="tag" title="Líder na matriz">Matriz: ${an.lider.alt.nome} (${U.num(an.lider.score, 1)})</span>` : ''}${d.parecer ? UI.badge('Parecer CAR: ' + ({ favoravel: 'favorável', ressalvas: 'com ressalvas', desfavoravel: 'desfavorável' })[d.parecer.resultado], d.parecer.resultado === 'favoravel' ? 'good' : d.parecer.resultado === 'ressalvas' ? 'warning' : 'critical') : ''}${mr ? html`${UI.riskChip(mr.score)}` : ''}${pr.pronta ? UI.badge('Prontidão 100%', 'good', 'check') : UI.badge('Prontidão ' + pr.pct + '%', 'warning')}</div></div>
      <span>${it.status === 'pendente' ? UI.badge('Em pauta', 'info') : it.status === 'adiado' ? UI.badge('Adiado', 'warning', 'clock') : UI.badge(RES[it.resultado][0], RES[it.resultado][1], it.resultado === 'aprovada' ? 'check' : 'x')}</span></div>
      ${open ? html`<div class="pauta-b"><div class="row row--sb"><span class="label-s" style="margin:0">Votação · ${D.REGRAS[f.regra]}${f.minerva ? ' · minerva do presidente' : ''}</span>${sec ? html`<span class="row"><button type="button" class="btn btn--sm" data-act="votarTodos" data-r="${m.id}" data-d="${d.id}" data-v="aprova">Registrar unanimidade a favor</button></span>` : ''}</div>
        <div class="vote-g">${m.presentes.map((pid) => { const p = D.pessoa(pid); return html`<div class="vote"><span class="who">${UI.avatar(p)}<span class="who-t"><span class="who-n">${p.nome}</span><span class="who-c">${pid === f.presidenteId ? 'Presidente' : p.cargo}</span></span></span>
          <span class="vote-opts" role="group" aria-label="Voto de ${p.nome}">${Object.entries(D.VOTOS).map(([k, l]) => html`<button type="button" data-act="votar" data-r="${m.id}" data-d="${d.id}" data-p="${pid}" data-v="${k}" class="${it.votos[pid] === k ? 'on' : ''}" aria-pressed="${it.votos[pid] === k}" ${sec || pid === D.user().id ? '' : raw('disabled')}>${l}</button>`)}</span></div>`; })}
          ${m.presentes.length ? '' : html`<p class="sub">Nenhum membro marcado como presente.</p>`}</div>
        ${barra(rest)}
        <div class="verdict">${voted ? html`<span>Apuração parcial:</span>${UI.badge(RES[rest.resultado][0], RES[rest.resultado][1])}<span class="muted">${rest.aprova} a favor · ${rest.rejeita} contra · ${rest.abstem} abst. · ${rest.impedido} impedido(s)${rest.minerva ? ' · desempate por minerva' : ''}</span>` : html`<span class="muted">Nenhum voto registrado.</span>`}${falta.length ? html`<span class="muted">${voted ? '· ' : ''}faltam ${falta.length} voto(s)</span>` : ''}</div>
        ${sec ? html`<label class="field"><span class="field-l">Registro da deliberação (entra na ata)</span><textarea class="input" rows="2" data-input="itemNote" data-dec="${d.id}" placeholder="Condições, ressalvas e encaminhamentos aprovados…">${notes[d.id] || ''}</textarea></label>
          <div class="row"><button type="button" class="btn btn--primary" data-act="proclamar" data-r="${m.id}" data-d="${d.id}">${icon('scale', 16)} Proclamar resultado</button><button type="button" class="btn" data-act="adiar" data-r="${m.id}" data-d="${d.id}">${icon('clock', 16)} Adiar item</button><button type="button" class="btn btn--ghost btn--soft-danger" data-act="pautaDel" data-r="${m.id}" data-d="${d.id}">Remover da pauta</button></div>` : html`<p class="sub">Cada membro presente registra o próprio voto acima. A proclamação do resultado cabe ao secretário, ao presidente ou à Governança.</p>`}</div>` : ''}
      ${it.status === 'decidido' ? html`<div class="pauta-b"><div class="verdict">${UI.badge(RES[it.resultado][0], RES[it.resultado][1])}<span>${it.contagem.aprova} a favor · ${it.contagem.rejeita} contra · ${it.contagem.abstem} abst. · ${it.contagem.impedido} impedido(s)${it.contagem.minerva ? ' · voto de minerva' : ''}</span></div>${barra(it.contagem)}<div class="row">${Object.keys(it.votos).map((pid) => html`<span class="tag">${D.nomePessoa(pid).split(' ')[0]}: ${D.VOTOS[it.votos[pid]].toLowerCase()}</span>`)}</div>${it.nota ? html`<div class="prose">${U.paras(it.nota)}</div>` : ''}</div>` : ''}
      ${it.status === 'adiado' ? html`<div class="pauta-b"><div class="prose">${it.nota ? U.paras(it.nota) : 'Item adiado sem registro.'}</div></div>` : ''}</article>`;
  };

  V.reuniao = (rid) => {
    const m = D.reuniao(rid), S = D.S(), u = D.user();
    if (!m) return html`<div class="page-in">${UI.empty('search', 'Reunião não encontrada', '', UI.link('Ver fóruns', '#/foruns', { kind: 'primary' }))}</div>`;
    const f = D.forum(m.forumId), sec = D.secretariaReuniao(m, u), q = D.quorum(f, m.presentes), agendada = m.status === 'agendada';
    const candidatas = fila(f.id);
    const pend = m.pauta.filter((p) => p.status === 'pendente').length;
    return html`<div class="page-in">
      ${UI.header({ crumbs: [{ label: 'Fóruns', href: '#/foruns' }, { label: f.sigla, href: '#/foruns/' + f.id }, { label: m.id }], kicker: f.nome, title: 'Reunião de ' + U.fmtDate(m.data),
        meta: html`<span>${mtgBadge(m)}</span><span>${icon('clock', 15)} ${m.hora}</span><span>${icon('building', 15)} ${m.local || 'Local a definir'}</span><span>${UI.badge(q.ok ? 'Quórum instalado (' + q.presentes + '/' + q.minimo + ')' : 'Sem quórum (' + q.presentes + '/' + q.minimo + ')', q.ok ? 'good' : 'critical', q.ok ? 'check' : 'alert')}</span>`,
        actions: html`${UI.btn('Imprimir', 'imprimir', { icon: 'printer', kind: 'ghost' })}${agendada && sec ? html`${UI.btn('Cancelar reunião', 'reuniaoCancelar', { kind: 'ghost', cls: 'btn--soft-danger', data: { r: m.id } })}${UI.btn('Encerrar reunião e gerar ata', 'reuniaoEncerrar', { kind: pend ? '' : 'primary', icon: 'flag', data: { r: m.id } })}` : ''}` })}

      <div class="grid g-main"><div class="col-stack">
        <h2 style="font-size:17px">Pauta <span class="muted" style="font-weight:400">· ${U.plural(m.pauta.length, 'item', 'itens')}</span></h2>
        ${m.pauta.length ? m.pauta.map((it, i) => V.itemPauta(m, f, it, i, sec && agendada)) : UI.empty('list', 'Pauta vazia', agendada ? 'Inclua decisões submetidas a este fórum.' : 'Reunião sem itens.')}
        ${agendada && sec && candidatas.length ? UI.card('Incluir na pauta', html`<div class="list">${candidatas.map((d) => html`<div class="li"><span class="li-t"><strong>${d.titulo}</strong><small>${d.id} · ${d.valor ? U.moneyC(d.valor) : 'sem valor'}</small></span>${UI.btn('Incluir', 'pautaAdd', { cls: 'btn--sm', icon: 'plus', data: { r: m.id, d: d.id } })}</div>`)}</div>`, { flush: true }) : ''}
        ${m.status === 'realizada' && m.ata ? UI.card('Ata da reunião', html`<pre class="ata">${m.ata}</pre><div class="row no-print">${UI.btn('Copiar texto', 'copiarAta', { cls: 'btn--sm', icon: 'file', data: { r: m.id } })}${UI.btn('Imprimir', 'imprimir', { cls: 'btn--sm', icon: 'printer' })}</div>`, { sub: 'Gerada automaticamente a partir de presença, votos e registros' }) : ''}
        ${agendada ? UI.card('Observações gerais (entram na ata)', html`<textarea class="input" rows="3" data-input="obs" data-r="${m.id}" placeholder="Assuntos gerais, avisos, encaminhamentos…" ${sec ? '' : raw('disabled')}>${obs[m.id] || m.observacoes || ''}</textarea>`) : (m.observacoes ? UI.card('Observações gerais', html`<div class="prose">${U.paras(m.observacoes)}</div>`) : '')}
      </div>
      <aside class="col-stack">
        ${UI.card('Presença', html`<div class="stack">${f.membros.map((id) => { const on = m.presentes.includes(id); return html`<label class="chk" style="padding:4px 0"><input type="checkbox" data-change="presenca" data-r="${m.id}" data-p="${id}" ${on ? raw('checked') : ''} ${agendada && sec ? '' : raw('disabled')}> ${UI.avatar(D.pessoa(id))}<span>${D.nomePessoa(id)}<small>${id === f.presidenteId ? 'Presidente' : D.pessoa(id).cargo}</small></span></label>`; })}</div>
          <div class="notice ${q.ok ? 'notice--good' : 'notice--crit'}">${icon(q.ok ? 'check' : 'alert', 18)}<div><strong>${q.presentes} de ${f.membros.length} presentes</strong><p>Quórum mínimo: ${q.minimo}. ${q.ok ? 'Pode deliberar.' : 'Não é possível proclamar resultados.'}</p></div></div>`, { sub: agendada ? 'Marque quem está presente. Só presentes votam.' : '' })}
        ${UI.card('Como a votação é apurada', html`<ul class="why"><li class="base">${icon('target', 14)}<span><strong>${D.REGRAS[f.regra]}.</strong> ${f.regra === 'maioria' ? 'Vence o lado com mais votos; abstenções e impedimentos não contam.' : f.regra === 'dois_tercos' ? 'Exige ao menos 2/3 dos votos válidos (a favor + contra).' : 'Qualquer voto contrário rejeita.'}</span></li>${f.minerva && f.regra === 'maioria' ? html`<li class="base">${icon('scale', 14)}<span>Em caso de empate, vale o voto de minerva do presidente (${D.nomePessoa(f.presidenteId)}).</span></li>` : ''}<li class="base">${icon('lock', 14)}<span>Todos os presentes precisam ter voto registrado (inclusive abstenção ou impedimento).</span></li></ul>`)}
      </aside></div></div>`;
  };
  UI.add('foruns', /^reunioes\/([\w-]+)$/, (m) => V.reuniao(m[1]), 'Reunião');

  UI.change.presenca = (el) => A.presenca(el.dataset.r, el.dataset.p, el.checked);
  UI.on.votar = (el) => { const cur = D.reuniao(el.dataset.r).pauta.find((p) => p.decisaoId === el.dataset.d).votos[el.dataset.p]; A.votar(el.dataset.r, el.dataset.d, el.dataset.p, cur === el.dataset.v ? null : el.dataset.v); };
  UI.on.votarTodos = (el) => A.votarTodos(el.dataset.r, el.dataset.d, el.dataset.v);
  UI.input.itemNote = (el) => { notes[el.dataset.dec] = el.value; };
  UI.input.obs = (el) => { obs[el.dataset.r] = el.value; };
  UI.on.proclamar = (el) => {
    const d = el.dataset, dec = D.decisao(d.d), m = D.reuniao(d.r), it = m.pauta.find((p) => p.decisaoId === d.d), r = D.resolverVotacao(D.forum(m.forumId), it.votos);
    UI.modal({ title: 'Proclamar resultado?', submit: 'Proclamar e registrar', body: html`<p class="modal-p"><strong>${dec.titulo}</strong></p><div class="verdict">${UI.badge(RES[r.resultado][0], RES[r.resultado][1])}<span>${r.aprova} a favor · ${r.rejeita} contra · ${r.abstem} abst. · ${r.impedido} impedido(s)</span></div><p class="modal-p">O resultado será gravado na decisão, na ata e na trilha de auditoria. Esta ação não pode ser desfeita.</p>`,
      onSubmit: () => { A.encerrarItem(d.r, d.d, notes[d.d] || ''); delete notes[d.d]; UI.toast('Resultado proclamado e registrado.'); } });
  };
  UI.on.adiar = (el) => UI.modal({ title: 'Adiar item', submit: 'Adiar', body: html`<p class="modal-p">O item sai desta reunião sem decisão, mas continua “em deliberação” e pode ser pautado de novo.</p>${F.area('nota', notes[el.dataset.d] || '', { label: 'Motivo do adiamento', rows: 3, req: true })}`, onSubmit: (f) => { A.adiarItem(el.dataset.r, el.dataset.d, f.nota); delete notes[el.dataset.d]; UI.toast('Item adiado.'); } });
  UI.on.pautaDel = (el) => UI.confirm('Remover da pauta?', 'Os votos já registrados neste item serão descartados.', () => A.pautaRemove(el.dataset.r, el.dataset.d), { danger: true, label: 'Remover' });
  UI.on.reuniaoEncerrar = (el) => {
    const m = D.reuniao(el.dataset.r);
    UI.modal({ title: 'Encerrar reunião', submit: 'Encerrar e gerar ata', body: html`<p class="modal-p">${m.pauta.some((p) => p.status === 'pendente') ? 'Ainda há itens pendentes: decida ou adie cada um antes de encerrar.' : 'A ata será gerada a partir da presença, dos votos e dos registros e ficará anexada à reunião.'}</p>${F.area('obs', obs[m.id] || m.observacoes || '', { label: 'Observações gerais', rows: 3 })}`, onSubmit: (f) => { A.encerrarReuniao(m.id, f.obs); delete obs[m.id]; UI.toast('Reunião encerrada. Ata gerada.'); } });
  };
  UI.on.reuniaoCancelar = (el) => UI.confirm('Cancelar reunião?', 'Os itens da pauta voltam para a fila.', () => A.cancelarReuniao(el.dataset.r), { danger: true, label: 'Cancelar reunião' });
  UI.on.copiarAta = async (el) => {
    const t = D.reuniao(el.dataset.r).ata;
    try { await navigator.clipboard.writeText(t); UI.toast('Ata copiada.'); } catch (e) { UI.toast('Não foi possível copiar automaticamente. Selecione o texto da ata e copie.', 'warn'); }
  };
})(window);
