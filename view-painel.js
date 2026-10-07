/* João — Painel ("minha mesa") */
(function (G) {
  'use strict';
  const U = G.U, D = G.D, UI = G.UI;
  const { html, raw, icon } = U;
  const V = UI.V;

  const hrefOf = (e) => (e.entidade === 'decisao' ? '#/decisoes/' + e.entidadeId : e.entidade === 'reuniao' ? '#/reunioes/' + e.entidadeId : e.entidade === 'risco' ? '#/riscos' : e.entidade === 'politica' ? '#/politicas' : e.entidade === 'acao' ? '#/acoes' : e.entidade === 'alcada' ? '#/alcadas' : '#/auditoria');
  V.auditIcon = (acao) => ({ criou: 'plus', status: 'arrowR', decidiu: 'scale', devolveu: 'arrowL', revisou: 'target', comentou: 'message', 'concordância': 'checks', parecer: 'shieldCheck', agendou: 'calendar', pauta: 'list', encerrou: 'flag', item: 'vote', editou: 'edit', cancelou: 'ban', removeu: 'trash' }[acao] || 'dot');

  V.painel = () => {
    const S = D.S(), u = D.user(), hoje = U.today();
    const m = D.metricas(), inbox = D.inbox(u.id);
    const urgentes = inbox.filter((i) => i.urg <= 1).length;
    const first = u.nome.split(' ')[0];
    const dataLonga = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());

    const proximas = S.reunioes.filter((r) => r.status === 'agendada').sort((a, b) => a.data.localeCompare(b.data));
    const fila = S.decisoes.filter((d) => d.status === 'deliberacao' && d.roteamento && d.roteamento.forumId && !S.reunioes.some((r) => r.status === 'agendada' && r.pauta.some((p) => p.decisaoId === d.id && p.status === 'pendente')));
    const minhas = S.decisoes.filter((d) => d.proponenteId === u.id && !['revisada', 'rejeitada', 'cancelada'].includes(d.status));
    const stDef = ['rascunho', 'analise', 'deliberacao', 'aprovada', 'execucao', 'concluida', 'revisada', 'rejeitada'];
    const maxF = Math.max(1, ...stDef.map((k) => m.funil[k]));
    const maxN = Math.max(1, ...Object.values(m.porNivel));
    const q = m.qual, qBoa = q.sim_superou + q.sim_atendeu;
    const recentes = [...S.audit].slice(-7).reverse();

    return html`<div class="page-in">
      <div class="phead"><div class="phead-row">
        <div class="phead-t"><span class="kicker">${dataLonga}</span><h1>${U.greeting()}, ${first}</h1>
          <p class="lead">${inbox.length ? html`Você tem <strong>${U.plural(inbox.length, 'item', 'itens')}</strong> na sua mesa${urgentes ? html`, <strong>${urgentes} com prazo estourado ou que dependem só de você</strong>` : ''}.` : 'Nada pendente com você agora. Boa hora para revisar os indicadores abaixo.'}</p></div>
        <div class="phead-a">${UI.btn('Nova decisão', 'novaDecisao', { kind: 'primary', icon: 'plus' })}</div></div></div>

      ${UI.pref('tip1') !== 'off' ? html`<div class="tip">${icon('info', 20)}<p>Você está vendo o sistema como <strong>${u.nome}</strong> (${u.cargo}). Use <strong>Ver como</strong>, no topo, para assumir outro papel — CEO, conselheira, secretária de governança — e perceber como a caixa de entrada e as permissões mudam. Os dados desta empresa são fictícios e ficam apenas neste navegador.</p><button type="button" class="btn btn--sm" data-act="dismissTip">Entendi</button></div>` : ''}

      <div class="grid g-main">
        <div class="col-stack">
          ${UI.card('Aguardando você', inbox.length ? html`<div class="list">${inbox.slice(0, 9).map((i) => html`<a class="li" href="${i.href}">
              <span class="li-ic ${i.urg <= 1 ? 'li-ic--crit' : ''}">${icon(i.icon, 18)}</span>
              <span class="li-t"><strong>${i.titulo}</strong><small>${i.meta}</small></span>
              <span>${UI.due(i.data)}</span><span class="btn btn--sm">${i.cta}</span></a>`)}</div>${inbox.length > 9 ? html`<p class="sub" style="padding:10px 18px">E mais ${inbox.length - 9} item(ns) com prazo mais distante.</p>` : ''}` : UI.empty('shieldCheck', 'Tudo em dia', 'Nenhuma decisão, voto, parecer ou ação pendente com você.'), { sub: 'Decisões, votos, pareceres, concordâncias, ações e revisões que dependem de você', flush: true })}

          ${UI.card('Saúde da governança', html`<div class="grid g-kpi">
            ${UI.kpi('Decisões em aberto', m.abertas, m.aguardando + ' aguardando deliberação', '', '#/decisoes')}
            ${UI.kpi('Ciclo médio de decisão', m.cicloMedio == null ? '—' : U.num(m.cicloMedio) + ' dias', m.cicloMedio == null ? 'sem decisões deliberadas' : 'mediana ' + U.num(m.cicloMediana) + ' d · ' + m.decididas + ' decisões')}
            ${UI.kpi('Taxa de aprovação', m.aprovacao == null ? '—' : U.num(m.aprovacao) + '%', 'das decisões deliberadas')}
            ${UI.kpi('Revisões atrasadas', m.revisoesAtrasadas, 'decisões concluídas sem revisão', m.revisoesAtrasadas ? 'warn' : 'good', '#/decisoes')}
            ${UI.kpi('Riscos acima do apetite', m.riscosAcima, 'severidade ≥ ' + S.config.apetiteRisco, m.riscosAcima ? 'alert' : 'good', '#/riscos')}
            ${UI.kpi('Políticas vencidas', m.politicasVencidas, 'revisão periódica em atraso', m.politicasVencidas ? 'warn' : 'good', '#/politicas')}
            ${UI.kpi('Ações atrasadas', m.acoesAtrasadas, 'em todas as decisões', m.acoesAtrasadas ? 'alert' : 'good', '#/acoes')}
          </div>`, { sub: 'Indicadores de disciplina de decisão da organização' })}

          <div class="grid g2">
            ${UI.card('Funil de decisões', html`<div>${stDef.map((k) => html`<div class="hbar ${k === 'rejeitada' ? 'hbar--dim' : ''}"><span class="hbar-l">${D.STATUS[k].label}</span><span class="hbar-t"><i style="width:${(m.funil[k] / maxF) * 100}%;${m.funil[k] ? '' : 'display:none'}"></i></span><span class="hbar-v">${m.funil[k]}</span></div>`)}</div>`, { sub: 'Onde estão as ' + S.decisoes.length + ' decisões registradas' })}
            ${UI.card('Quem decide', html`<div>${S.niveis.map((n) => html`<div class="hbar hbar--dim"><span class="hbar-l" title="${n.nome}">${n.nome}</span><span class="hbar-t"><i style="width:${(m.porNivel[n.n] / maxN) * 100}%;${m.porNivel[n.n] ? '' : 'display:none'}"></i></span><span class="hbar-v">${m.porNivel[n.n]}</span></div>`)}</div><p class="sub">Decisões submetidas, por instância definida pela matriz de alçadas. Concentração excessiva no topo indica alçadas estreitas demais.</p>`, { sub: 'Distribuição por instância de alçada' })}
          </div>
        </div>

        <div class="col-stack">
          ${UI.card('Próximas reuniões', proximas.length ? html`<div class="list">${proximas.slice(0, 4).map((r) => { const f = D.forum(r.forumId); const dd = U.parse(r.data); return html`<a class="li" href="#/reunioes/${r.id}"><span class="mtg-d"><small>${U.fmtWeekday(r.data)}</small><b>${dd.getDate()}</b></span><span class="li-t"><strong>${f.nome}</strong><small>${U.fmtDate(r.data)} · ${r.hora} · ${U.plural(r.pauta.length, 'item', 'itens')} na pauta</small></span>${icon('chevR', 16)}</a>`; })}</div>` : UI.empty('calendar', 'Nenhuma reunião agendada'), { flush: true, actions: UI.link('Fóruns', '#/foruns', { kind: 'ghost' }) })}
          ${fila.length ? UI.notice('warn', 'list', html`<strong>${U.plural(fila.length, 'decisão aguarda', 'decisões aguardam')} inclusão em pauta</strong><p>${fila.map((d) => d.id + ' → ' + D.forum(d.roteamento.forumId).sigla).join(' · ')}. <a href="#/foruns">Abrir fóruns</a></p>`) : ''}
          ${UI.card('Minhas decisões', minhas.length ? html`<div class="list">${minhas.slice(0, 6).map((d) => html`<a class="li" href="#/decisoes/${d.id}"><span class="li-t"><strong>${d.titulo}</strong><small>${V.nextStep(d)}</small></span>${UI.pill(d.status)}</a>`)}</div>` : UI.empty('scale', 'Você não tem decisões em andamento', 'Registre uma decisão para submetê-la ao fluxo de governança.', UI.btn('Nova decisão', 'novaDecisao', { kind: 'primary', icon: 'plus' })), { flush: true })}
          ${UI.card('Qualidade × resultado', m.revisadas ? html`<div class="q2"><div class="good"><b>${qBoa}</b><small>Boa decisão, resultado bom</small></div><div class="warn"><b>${q.sim_abaixo}</b><small>Boa decisão, resultado ruim (variância)</small></div><div><b>${q.parcial}</b><small>Decisão parcialmente informada</small></div><div class="crit"><b>${q.nao}</b><small>Falha de processo decisório</small></div></div><p class="sub">Baseado em ${U.plural(m.revisadas, 'revisão pós-decisão', 'revisões pós-decisão')}. Separar o processo do acaso evita aprender a lição errada.</p>` : UI.empty('target', 'Ainda sem revisões', 'Revise decisões concluídas para medir a qualidade do processo, não só o resultado.'), { sub: 'Aprendizado das revisões pós-decisão' })}
        </div>
      </div>

      <div class="grid g2">
        ${UI.card('Mapa de riscos', html`${V.heatmap({ mini: true })}<div class="row row--sb"><div class="legend"><span><i style="background:#0a8a0a"></i>Baixo</span><span><i style="background:#b57d00"></i>Médio</span><span><i style="background:#c9582d"></i>Alto</span><span><i style="background:#c03030"></i>Crítico</span></div>${UI.link('Ver registro', '#/riscos', { kind: 'ghost' })}</div>`, { sub: 'Severidade residual (probabilidade × impacto). Contorno = no apetite ou acima.' })}
        ${UI.card('Atividade recente', html`<ul class="tl">${recentes.map((e) => html`<li><span class="tl-d">${icon(V.auditIcon(e.acao), 13)}</span><span class="tl-t"><a href="${hrefOf(e)}"><strong>${e.entidadeId}</strong></a> · ${e.acao} <small>${D.nomePessoa(e.userId)} · ${U.fmtTs(e.ts)}</small>${e.detalhe ? html`<small style="color:var(--ink-2)">${e.detalhe.length > 110 ? e.detalhe.slice(0, 110) + '…' : e.detalhe}</small>` : ''}</span></li>`)}</ul>`, { sub: 'Da trilha de auditoria', actions: UI.link('Trilha completa', '#/auditoria', { kind: 'ghost' }) })}
      </div>
    </div>`;
  };
  UI.add('painel', /^painel$/, () => V.painel(), 'Painel');
  UI.on.dismissTip = () => { UI.pref('tip1', 'off'); UI.render(); };
})(window);
