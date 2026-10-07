/* João — ações, trilha de auditoria, pessoas e dados */
(function (G) {
  'use strict';
  const U = G.U, D = G.D, A = G.A, UI = G.UI, Store = G.Store;
  const { html, raw, icon } = U;
  const V = UI.V, F = UI.F;

  /* =================== AÇÕES =================== */
  const ac = { tab: 'minhas' };
  V.acoes = () => {
    const S = D.S(), u = S.usuarioId, hoje = U.today();
    const atrasada = (a) => a.status !== 'concluida' && a.prazo < hoje;
    const F2 = { minhas: (a) => a.responsavelId === u && a.status !== 'concluida', todas: () => true, atrasadas: atrasada, concluidas: (a) => a.status === 'concluida', abertas: (a) => a.status !== 'concluida' };
    const list = S.acoes.filter(F2[ac.tab]).sort((a, b) => (a.status === 'concluida') - (b.status === 'concluida') || a.prazo.localeCompare(b.prazo));
    return html`<div class="page-in">
      ${UI.header({ title: 'Ações', sub: 'O que precisa acontecer para a decisão virar realidade: cada ação com responsável e prazo. Uma decisão só pode ser concluída quando suas ações estiverem fechadas.', actions: UI.btn('Nova ação', 'novaAcao', { kind: 'primary', icon: 'plus' }) })}
      <div class="grid g-kpi">${UI.kpi('Em aberto', S.acoes.filter(F2.abertas).length, 'em todas as decisões')}${UI.kpi('Atrasadas', S.acoes.filter(atrasada).length, 'prazo vencido', S.acoes.some(atrasada) ? 'alert' : 'good')}${UI.kpi('Minhas pendentes', S.acoes.filter(F2.minhas).length, D.nomePessoa(u))}${UI.kpi('Concluídas', S.acoes.filter(F2.concluidas).length, 'no total', 'good')}</div>
      ${UI.card('', html`<div class="toolbar">${UI.tabs([['minhas', 'Minhas pendentes', S.acoes.filter(F2.minhas).length], ['abertas', 'Todas em aberto', S.acoes.filter(F2.abertas).length], ['atrasadas', 'Atrasadas', S.acoes.filter(atrasada).length], ['concluidas', 'Concluídas', S.acoes.filter(F2.concluidas).length], ['todas', 'Todas', S.acoes.length]], ac.tab, 'acTab')}</div>
        ${list.length ? html`<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Ação</th><th>Decisão</th><th>Responsável</th><th>Prazo</th><th>Status</th><th></th></tr></thead><tbody>${list.map((a) => { const d = a.decisaoId && D.decisao(a.decisaoId); const pode = D.isAdmin(D.user()) || D.user().id === a.responsavelId; return html`<tr>
          <td><span class="t-main" style="${a.status === 'concluida' ? 'text-decoration:line-through;color:var(--ink-3)' : ''}">${a.titulo}</span><span class="t-sub">${a.id}</span></td>
          <td>${d ? html`<a href="#/decisoes/${d.id}">${d.id}</a><span class="t-sub" style="display:block;max-width:34ch">${d.titulo}</span>` : html`<span class="muted">Ação avulsa</span>`}</td>
          <td>${UI.who(a.responsavelId)}</td><td>${UI.due(a.prazo, a.status === 'concluida')}</td>
          <td><select class="input" style="min-height:32px;padding:3px 8px;width:auto" data-change="acaoStatus" data-id="${a.id}" aria-label="Status de ${a.id}" ${pode ? '' : raw('disabled')}>${Object.entries(D.ACAO_STATUS).map(([k, l]) => html`<option value="${k}" ${a.status === k ? raw('selected') : ''}>${l}</option>`)}</select></td>
          <td class="num">${pode ? html`<span class="row" style="justify-content:flex-end;flex-wrap:nowrap">${UI.btn('', 'acaoEdit', { cls: 'btn--sm', kind: 'ghost', icon: 'edit', data: { id: a.id }, title: 'Editar' })}${UI.btn('', 'acaoDel', { cls: 'btn--sm', kind: 'ghost', icon: 'trash', data: { id: a.id }, title: 'Remover' })}</span>` : ''}</td></tr>`; })}</tbody></table></div>` : UI.empty('checks', 'Nada por aqui', ac.tab === 'minhas' ? 'Você não tem ações pendentes.' : 'Nenhuma ação neste filtro.')}`, { flush: true })}
    </div>`;
  };
  UI.add('acoes', /^acoes$/, () => V.acoes(), 'Ações');
  UI.on.acTab = (el) => { ac.tab = el.dataset.v; UI.render(); };
  UI.on.acaoEdit = (el) => V.openActionModal(D.acao(el.dataset.id));
  UI.on.acaoDel = (el) => UI.confirm('Remover ação?', D.acao(el.dataset.id).titulo, () => { A.removerAcao(el.dataset.id); UI.toast('Ação removida.'); }, { danger: true, label: 'Remover' });
  V.openActionModal = (a, decId) => {
    const S = D.S(), x = a || { titulo: '', decisaoId: decId || '', responsavelId: S.usuarioId, prazo: U.addDays(U.today(), 14) };
    const decs = S.decisoes.filter((d) => d.status !== 'cancelada' && d.status !== 'rejeitada' || d.id === x.decisaoId);
    UI.modal({ title: a ? 'Editar ação ' + a.id : 'Nova ação', body: html`<div class="stack">${F.text('titulo', x.titulo, { label: 'O que precisa ser feito', req: true })}${F.select('decisaoId', decs.map((d) => [d.id, d.id + ' — ' + d.titulo]), x.decisaoId, { label: 'Decisão relacionada', empty: 'Ação avulsa (sem decisão)' })}
      <div class="fgrid">${F.person('responsavelId', x.responsavelId, { label: 'Responsável', req: true })}${F.text('prazo', x.prazo, { label: 'Prazo', type: 'date', req: true })}</div></div>`,
      onSubmit: (f) => { A.salvarAcao({ id: a && a.id, titulo: f.titulo.trim(), decisaoId: f.decisaoId || null, responsavelId: f.responsavelId, prazo: f.prazo }); UI.toast(a ? 'Ação atualizada.' : 'Ação criada.'); } });
  };

  /* =================== AUDITORIA =================== */
  const au = { q: '', ent: '', usr: '', n: 80, status: null };
  const hrefAudit = (e) => ({ decisao: '#/decisoes/' + e.entidadeId, reuniao: '#/reunioes/' + e.entidadeId, risco: '#/riscos', politica: '#/politicas', acao: '#/acoes', alcada: '#/alcadas', forum: '#/foruns/' + e.entidadeId, pessoa: '#/pessoas', area: '#/pessoas' })[e.entidade];
  V.auditoriaLista = () => {
    const S = D.S(), q = U.norm(au.q).split(/\s+/).filter(Boolean);
    const all = [...S.audit].reverse().filter((e) => (!au.ent || e.entidade === au.ent) && (!au.usr || e.userId === au.usr) && (!q.length || q.every((w) => U.norm(e.entidadeId + ' ' + e.acao + ' ' + e.detalhe + ' ' + D.nomePessoa(e.userId)).includes(w))));
    const list = all.slice(0, au.n);
    return html`<div class="tbl-wrap"><table class="tbl"><thead><tr><th class="num">#</th><th>Quando</th><th>Quem</th><th>Objeto</th><th>Ação</th><th>Detalhe</th><th>Hash</th></tr></thead><tbody>${list.map((e) => { const h = hrefAudit(e); return html`<tr><td class="num muted">${e.seq}</td><td style="white-space:nowrap">${U.fmtTs(e.ts)}</td><td>${D.nomePessoa(e.userId)}</td><td>${h ? html`<a href="${h}">${e.entidadeId}</a>` : e.entidadeId}<span class="t-sub">${e.entidade}</span></td><td><span class="tag">${e.acao}</span></td><td style="max-width:60ch;overflow-wrap:anywhere">${e.detalhe}</td><td class="audit-h" title="${e.hash}">${e.hash.slice(0, 10)}…<br>↳ ${e.prev.slice(0, 6)}…</td></tr>`; })}</tbody></table></div>
      ${all.length > au.n ? html`<div class="row" style="padding:12px 18px;justify-content:center"><button type="button" class="btn" data-act="auMais">Mostrar mais ${Math.min(80, all.length - au.n)} de ${all.length - au.n} registros</button></div>` : ''}
      ${all.length ? '' : UI.empty('search', 'Nenhum registro com esses filtros')}`;
  };
  V.auditoriaStatus = () => {
    const S = D.S();
    if (!au.status) { const last = S.audit[S.audit.length - 1]; return html`<div class="notice notice--info">${icon('shieldCheck', 18)}<div><strong>${U.plural(S.audit.length, 'registro encadeado', 'registros encadeados')}.</strong> Cada registro guarda o hash (SHA-256) do anterior; alterar ou apagar qualquer linha quebra todos os hashes seguintes. Último hash: <span class="audit-h">${last ? last.hash.slice(0, 24) : '—'}…</span></div></div>`; }
    const r = au.status;
    if (r.demo) return UI.notice(r.ok ? 'good' : 'crit', r.ok ? 'check' : 'alert', html`<strong>Demonstração (cópia em memória; seus dados não foram alterados):</strong> alterei o texto do registro #${r.alvo} numa cópia da trilha. ${r.ok ? 'A verificação não detectou — algo está errado.' : html`A verificação <strong>detectou a adulteração no registro #${r.em}</strong> e invalidou o encadeamento a partir dali.`}`);
    return r.ok ? UI.notice('good', 'shieldCheck', html`<strong>Integridade confirmada.</strong> ${U.plural(r.total, 'registro', 'registros')} verificado(s): a sequência e os hashes encadeados conferem do primeiro ao último.`) : UI.notice('crit', 'alert', html`<strong>Trilha adulterada.</strong> O registro #${r.em} não confere com o hash esperado. Registros a partir dele não são confiáveis.`);
  };
  V.auditoria = () => {
    const S = D.S();
    const ents = [...new Set(S.audit.map((e) => e.entidade))];
    return html`<div class="page-in">
      ${UI.header({ title: 'Trilha de auditoria', sub: 'O registro imutável de quem fez o quê e quando. É a evidência para auditorias interna e externa, e o que torna as decisões rastreáveis.', actions: html`${UI.btn('Exportar CSV', 'auExport', { icon: 'download' })}${UI.btn('Demonstrar detecção', 'auDemo', { icon: 'eye' })}${UI.btn('Verificar integridade', 'auVerify', { kind: 'primary', icon: 'shieldCheck' })}` })}
      <div id="au-status">${V.auditoriaStatus()}</div>
      ${UI.card('', html`<div class="toolbar"><label class="searchbox grow">${icon('search', 16)}<input class="input" data-input="auQ" value="${au.q}" placeholder="Buscar por objeto, ação, pessoa ou detalhe…" aria-label="Buscar na trilha"></label>
        <select class="input" data-change="auF" data-k="ent" aria-label="Objeto"><option value="">Todos os objetos</option>${ents.map((e) => html`<option value="${e}" ${au.ent === e ? raw('selected') : ''}>${e}</option>`)}</select>
        <select class="input" data-change="auF" data-k="usr" aria-label="Pessoa"><option value="">Todas as pessoas</option>${S.pessoas.map((p) => html`<option value="${p.id}" ${au.usr === p.id ? raw('selected') : ''}>${p.nome}</option>`)}</select></div>
        <div id="au-list">${V.auditoriaLista()}</div>`, { flush: true })}
      <p class="sub">Limite desta demonstração: a trilha vive no navegador, então quem controla o navegador poderia recriar todos os hashes. Em produção, os registros devem ser gravados em armazenamento somente-anexação (WORM) no servidor, com o hash âncora assinado e publicado periodicamente.</p>
    </div>`;
  };
  UI.add('auditoria', /^auditoria$/, () => V.auditoria(), 'Trilha de auditoria');
  UI.input.auQ = (el) => { au.q = el.value; au.n = 80; UI.$('#au-list').innerHTML = String(V.auditoriaLista()); };
  UI.change.auF = (el) => { au[el.dataset.k] = el.value; au.n = 80; UI.$('#au-list').innerHTML = String(V.auditoriaLista()); };
  UI.on.auMais = () => { au.n += 80; UI.$('#au-list').innerHTML = String(V.auditoriaLista()); };
  UI.on.auVerify = () => { au.status = Store.verify(); UI.$('#au-status').innerHTML = String(V.auditoriaStatus()); };
  UI.on.auDemo = () => {
    const a = JSON.parse(JSON.stringify(D.S().audit)), alvo = Math.max(1, Math.floor(a.length / 3));
    a[alvo - 1].detalhe += ' (texto alterado)';
    const r = Store.verify(a);
    au.status = { demo: true, alvo, ok: r.ok, em: r.em }; UI.$('#au-status').innerHTML = String(V.auditoriaStatus());
  };
  UI.on.auExport = () => {
    const rows = [['Seq', 'Data/hora', 'Pessoa', 'Objeto', 'Id', 'Ação', 'Detalhe', 'Hash anterior', 'Hash']];
    D.S().audit.forEach((e) => rows.push([e.seq, e.ts, D.nomePessoa(e.userId), e.entidade, e.entidadeId, e.acao, e.detalhe, e.prev, e.hash]));
    U.download('trilha-auditoria-' + U.today() + '.csv', '﻿' + U.csv(rows), 'text/csv;charset=utf-8');
  };

  /* =================== PESSOAS E PAPÉIS =================== */
  V.pessoas = () => {
    const S = D.S(), adm = D.isAdmin(D.user());
    return html`<div class="page-in">
      ${UI.header({ title: 'Pessoas e papéis', sub: 'Quem existe na governança, a que área pertence e quais fóruns integra. Áreas definem o gerente e o diretor que o sistema usa ao rotear decisões.', actions: adm ? UI.btn('Nova pessoa', 'pesNova', { kind: 'primary', icon: 'plus' }) : '' })}
      ${UI.card('Pessoas', html`<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Pessoa</th><th>Área</th><th>Nível</th><th>Fóruns</th><th>Perfil</th>${adm ? html`<th></th>` : ''}</tr></thead><tbody>${S.pessoas.map((p) => html`<tr><td>${UI.who(p.id, { cargo: true })}</td><td>${(D.area(p.areaId) || {}).nome || '—'}</td><td>${p.nivel}</td>
        <td><span class="row" style="gap:4px">${S.foruns.filter((f) => f.membros.includes(p.id)).map((f) => html`<span class="tag">${f.sigla}${f.presidenteId === p.id ? ' · pres.' : ''}</span>`)}${S.foruns.filter((f) => f.secretarioId === p.id).map((f) => html`<span class="tag">${f.sigla} · sec.</span>`)}</span></td>
        <td>${p.perfil === 'admin' ? UI.badge('Governança · admin', 'info', 'shieldCheck') : html`<span class="muted">Membro</span>`}</td>${adm ? html`<td class="num"><button type="button" class="btn btn--sm btn--ghost" data-act="pesEdit" data-id="${p.id}">${icon('edit', 14)}</button></td>` : ''}</tr>`)}</tbody></table></div>`, { flush: true, sub: 'Níveis: 1 analista · 2 gerente · 3 diretor · 4 executivo (C-level) · 5 conselheiro' })}
      ${UI.card('Áreas', html`<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Área</th><th>Diretor (nível 2 da alçada)</th><th>Gerente (nível 1 da alçada)</th>${adm ? html`<th></th>` : ''}</tr></thead><tbody>${S.areas.filter((a) => a.id !== 'a-ca').map((a) => html`<tr><td><span class="t-main">${a.nome}</span></td><td>${a.diretorId ? UI.who(a.diretorId) : html`<span class="muted">—</span>`}</td><td>${a.gerenteId ? UI.who(a.gerenteId) : html`<span class="muted">sem gerente: sobe para o diretor</span>`}</td>${adm ? html`<td class="num"><button type="button" class="btn btn--sm btn--ghost" data-act="areaEdit" data-id="${a.id}">${icon('edit', 14)}</button></td>` : ''}</tr>`)}</tbody></table></div>`, { flush: true })}
      ${!adm ? UI.notice('info', 'lock', 'Somente a Governança (perfil administrador) altera pessoas, áreas, fóruns e alçadas. Use “Ver como → Patrícia Santos” para experimentar.') : ''}
    </div>`;
  };
  UI.add('pessoas', /^pessoas$/, () => V.pessoas(), 'Pessoas e papéis');
  UI.on.pesNova = () => V.pessoaModal(null);
  UI.on.pesEdit = (el) => V.pessoaModal(D.pessoa(el.dataset.id));
  V.pessoaModal = (p) => {
    const S = D.S(), x = p || { nome: '', cargo: '', areaId: S.areas[1].id, nivel: 2, perfil: 'membro', email: '' };
    UI.modal({ title: p ? 'Editar ' + p.nome : 'Nova pessoa', body: html`<div class="fgrid"><div class="span2">${F.text('nome', x.nome, { label: 'Nome completo', req: true })}</div><div class="span2">${F.text('cargo', x.cargo, { label: 'Cargo', req: true })}</div>
      ${F.select('areaId', S.areas.map((a) => [a.id, a.nome]), x.areaId, { label: 'Área' })}${F.select('nivel', [[1, '1 · Analista / coordenador'], [2, '2 · Gerente'], [3, '3 · Diretor'], [4, '4 · Executivo (C-level)'], [5, '5 · Conselheiro']], x.nivel, { label: 'Nível' })}
      ${F.text('email', x.email, { label: 'E-mail', type: 'email' })}${F.select('perfil', [['membro', 'Membro'], ['admin', 'Governança · administrador']], x.perfil, { label: 'Perfil de acesso' })}</div>`,
      onSubmit: (f) => { A.salvarPessoa({ id: p && p.id, nome: f.nome.trim(), cargo: f.cargo.trim(), areaId: f.areaId, nivel: +f.nivel, email: f.email, perfil: f.perfil }); UI.toast(p ? 'Pessoa atualizada.' : 'Pessoa cadastrada.'); } });
  };
  UI.on.areaEdit = (el) => {
    const a = D.area(el.dataset.id);
    UI.modal({ title: 'Editar área — ' + a.nome, body: html`<div class="stack">${F.text('nome', a.nome, { label: 'Nome da área', req: true })}${F.person('diretorId', a.diretorId, { label: 'Diretor', req: true })}${F.person('gerenteId', a.gerenteId, { label: 'Gerente', empty: '— sem gerente (sobe para o diretor) —' })}</div>`,
      onSubmit: (f) => { A.salvarArea({ id: a.id, nome: f.nome.trim(), diretorId: f.diretorId, gerenteId: f.gerenteId || null }); UI.toast('Área atualizada. As próximas decisões usam a nova estrutura.'); } });
  };

  /* =================== DADOS E AJUSTES =================== */
  V.dados = () => {
    const S = D.S(), adm = D.isAdmin(D.user());
    let kb = 0; try { kb = Math.round(JSON.stringify(S).length / 1024); } catch (e) { /* ignore */ }
    return html`<div class="page-in">
      ${UI.header({ title: 'Dados e ajustes', sub: 'Backup, restauração e como o João funciona.' })}
      <div class="grid g2">
        ${UI.card('Organização', html`<div class="stack"><dl class="kv"><dt>Nome</dt><dd>${S.empresa.nome}</dd><dt>Perfil</dt><dd>${S.empresa.setor}</dd></dl>${adm ? UI.btn('Renomear organização', 'empNome', { cls: 'btn--sm', icon: 'edit' }) : html`<small class="muted">Somente a Governança altera.</small>`}</div>`)}
        ${UI.card('Seus dados', html`<div class="stack"><p class="sub" style="margin:0">Tudo fica gravado <strong>neste navegador</strong> (≈ ${kb} KB). Exporte um backup para guardar ou levar a outro computador.</p>
          <div class="row">${UI.btn('Exportar backup (JSON)', 'bkExport', { icon: 'download' })}<label class="btn" style="cursor:pointer">${icon('upload', 16)} Importar backup<input type="file" accept="application/json,.json" data-change="bkImport" hidden></label></div>
          <hr class="sep"><div class="row row--sb"><span class="sub" style="margin:0">Voltar aos dados de demonstração (apaga o que você criou).</span>${UI.btn('Restaurar demonstração', 'bkReset', { cls: 'btn--sm btn--soft-danger' })}</div></div>`)}
      </div>
      ${UI.card('Como o João pensa', html`<div class="grid g2">
        <div class="stack"><strong>${icon('scale', 16)} Decisão como objeto de primeira classe</strong><p class="sub" style="margin:0">Cada decisão tem contexto, alternativas pontuadas por critérios ponderados, recomendação, resultado esperado, gatilhos de reversão e uma revisão posterior que separa a qualidade do processo do acaso do resultado.</p></div>
        <div class="stack"><strong>${icon('route', 16)} Alçada calculada, não negociada</strong><p class="sub" style="margin:0">A instância que decide vem da matriz de alçadas (tipo × valor) e sobe automaticamente por irreversibilidade, risco acima do apetite, exceção de política e segregação de funções — com o motivo exibido.</p></div>
        <div class="stack"><strong>${icon('users', 16)} Colegiados com regras explícitas</strong><p class="sub" style="margin:0">Quórum, regra de votação (maioria, 2/3, unanimidade) e voto de minerva são parâmetros do fórum. O sistema apura a votação e gera a ata.</p></div>
        <div class="stack"><strong>${icon('shieldCheck', 16)} Rastreabilidade comprovável</strong><p class="sub" style="margin:0">A trilha é encadeada por hash e o conteúdo submetido recebe um selo SHA-256, para provar que o que foi deliberado é o que foi proposto.</p></div></div>
        <hr class="sep"><div class="notice notice--warn">${icon('info', 18)}<div><strong>Esta é uma versão de demonstração de uso individual.</strong><p>Os dados ficam no navegador, sem login real: “Ver como” só simula papéis. Para uso corporativo é preciso um servidor com autenticação (SSO), controle de acesso por papel, banco de dados, armazenamento imutável da trilha e notificações por e-mail. As regras de negócio deste protótipo (<code>js/domain.js</code>) foram escritas para serem reaproveitadas nesse backend.</p></div></div>`)}
    </div>`;
  };
  UI.add('dados', /^dados$/, () => V.dados(), 'Dados e ajustes');
  UI.on.empNome = () => UI.modal({ title: 'Renomear organização', body: F.text('nome', D.S().empresa.nome, { label: 'Nome', req: true }), onSubmit: (f) => { A.salvarEmpresa(f.nome.trim()); UI.toast('Nome atualizado.'); } });
  UI.on.bkExport = () => { U.download('governa-os-backup-' + U.today() + '.json', Store.exportJson(), 'application/json'); UI.toast('Backup exportado.'); };
  UI.change.bkImport = (el) => {
    const file = el.files && el.files[0]; if (!file) return;
    const rd = new FileReader();
    rd.onload = () => UI.run(() => UI.modal({ title: 'Importar backup?', submit: 'Substituir todos os dados', danger: true, body: html`<p class="modal-p">O arquivo <strong>${file.name}</strong> vai <strong>substituir</strong> todos os dados atuais deste navegador. Exporte um backup antes se quiser guardá-los.</p>`, onSubmit: () => { Store.importJson(String(rd.result)); UI.toast('Backup importado.'); } }));
    rd.readAsText(file); el.value = '';
  };
  UI.on.bkReset = () => UI.confirm('Restaurar dados de demonstração?', 'Tudo o que você criou ou alterou será apagado e os dados fictícios originais voltarão.', () => { Store.reset(); au.status = null; UI.toast('Dados de demonstração restaurados.'); }, { danger: true, label: 'Restaurar' });
})(window);
