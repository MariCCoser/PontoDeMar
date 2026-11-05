/* ============================================================
   AGENDA DO MÊS — diário de tarefas e posts do Instagram
   Loja.dados.agenda: { id, data:'AAAA-MM-DD', tipo:'tarefa'|'post', texto, feito,
                        formato (post), hora (post), legenda (post) }
   ============================================================ */
(function () {
  const L = Loja;
  const raiz = document.getElementById('aba-agenda');
  if (!raiz) return;
  const $ = s => raiz.querySelector(s);

  const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  const FORMATOS = ['Feed', 'Carrossel', 'Reels', 'Stories'];
  const ICONE_FORMATO = { Feed: '🖼️', Carrossel: '🗂️', Reels: '🎬', Stories: '⏳' };
  const IDEIAS = [
    'Bastidores: vídeo das mãos crochetando',
    'Peça pronta com fundo bonito e luz natural',
    'Antes e depois: novelo → peça pronta',
    'Quanto tempo leva uma peça? (mostre o cronômetro)',
    'Apresente-se: quem está por trás da Ponto de Mar',
    'Cores disponíveis de um produto (carrossel)',
    'Cliente feliz: foto ou depoimento (peça autorização)',
    'Embalando um pedido com carinho',
    'Enquete nos stories: qual cor vocês preferem?',
    'Dica rápida de cuidado com peças de crochê',
    'Novidade da semana / lançamento',
    'Caixinha de perguntas nos stories',
    'Mostre seus materiais favoritos',
    'Peça sob encomenda: como pedir a sua',
    'Detalhe de perto: o ponto e o acabamento'
  ];

  const hojeTxt = L.hoje();
  let mes = hojeTxt.slice(0, 7);        // 'AAAA-MM'
  let dia = hojeTxt;                    // dia selecionado

  const lista = () => L.dados.agenda || (L.dados.agenda = []);
  const doDia = d => lista().filter(i => i.data === d).sort((a, b) => (a.tipo === b.tipo ? (a.hora || '').localeCompare(b.hora || '') : a.tipo === 'tarefa' ? -1 : 1));

  function dataLonga(d) {
    const [a, m, dd] = d.split('-').map(Number);
    const dt = new Date(a, m - 1, dd);
    return `${SEMANA[dt.getDay()]}, ${dd} de ${MESES[m - 1]}`;
  }

  function mudarMes(delta) {
    const [a, m] = mes.split('-').map(Number);
    const dt = new Date(a, m - 1 + delta, 1);
    mes = dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0');
    dia = mes === hojeTxt.slice(0, 7) ? hojeTxt : mes + '-01';
    render();
  }

  /* ---------- estrutura ---------- */
  function montar() {
    raiz.innerHTML = `
      <div class="cabecalho-aba">
        <h1>📅 Agenda do mês</h1>
        <p>Planeje o que fazer em cada dia e os posts do Instagram. Clique num dia para ver e anotar.</p>
      </div>
      <div class="ag-topo">
        <div class="nav-mes">
          <button class="btn-sec" data-mes="-1" title="Mês anterior">‹</button>
          <strong id="ag-titulo"></strong>
          <button class="btn-sec" data-mes="1" title="Próximo mês">›</button>
          <button class="btn-link" data-hoje>hoje</button>
        </div>
        <div id="ag-resumo" class="ag-resumo"></div>
      </div>
      <div class="ag-grade">
        <div class="cartao ag-cal-cartao"><div id="ag-cal"></div></div>
        <div class="cartao" id="ag-dia"></div>
      </div>
      <details class="cartao">
        <summary>📸 Dicas de Instagram para começar</summary>
        <ul class="dicas">
          <li><b>Constância vale mais que quantidade.</b> 3 posts por semana já é ótimo — marque aqui na agenda os dias fixos.</li>
          <li><b>Reels alcançam gente nova;</b> o feed mostra o seu catálogo; os stories conversam com quem já te segue.</li>
          <li><b>Mostre o feito à mão:</b> bastidores e tempo de trabalho ajudam o cliente a entender o preço.</li>
          <li><b>Luz natural</b> perto da janela deixa as cores do fio fiéis.</li>
          <li><b>Escreva a legenda antes</b> (aqui no app) e só copie na hora de postar.</li>
          <li><b>Responda comentários e mensagens</b> — é assim que seguidor vira cliente.</li>
        </ul>
      </details>`;
  }

  /* ---------- calendário ---------- */
  function renderCal() {
    const [a, m] = mes.split('-').map(Number);
    $('#ag-titulo').textContent = MESES[m - 1][0].toUpperCase() + MESES[m - 1].slice(1) + ' ' + a;
    const primeiro = new Date(a, m - 1, 1).getDay();
    const total = new Date(a, m, 0).getDate();
    let html = SEMANA.map(s => `<div class="ag-sem">${s.slice(0, 3)}</div>`).join('');
    for (let i = 0; i < primeiro; i++) html += '<div class="ag-vazio"></div>';
    for (let d = 1; d <= total; d++) {
      const data = mes + '-' + String(d).padStart(2, '0');
      const itens = doDia(data);
      const linhas = itens.slice(0, 3).map(i => `<span class="ag-mini ${i.tipo} ${i.feito ? 'feito' : ''}">${i.tipo === 'post' ? '📸' : i.feito ? '✔' : '•'} ${L.esc(i.texto || (i.tipo === 'post' ? 'Post' : 'Tarefa'))}</span>`).join('');
      html += `<button type="button" class="ag-dia ${data === dia ? 'sel' : ''} ${data === hojeTxt ? 'hoje' : ''}" data-dia="${data}">
        <span class="ag-num">${d}</span>${linhas}${itens.length > 3 ? `<span class="ag-mais">+${itens.length - 3}</span>` : ''}
      </button>`;
    }
    $('#ag-cal').innerHTML = `<div class="ag-cal">${html}</div>`;

    const doMes = lista().filter(i => i.data.slice(0, 7) === mes);
    const t = doMes.filter(i => i.tipo === 'tarefa'), p = doMes.filter(i => i.tipo === 'post');
    $('#ag-resumo').innerHTML = `
      <span class="chip-info">✅ Tarefas: <b>${t.filter(i => i.feito).length}</b> de ${t.length}</span>
      <span class="chip-info">📸 Posts: <b>${p.filter(i => i.feito).length}</b> postados de ${p.length}</span>`;
  }

  /* ---------- dia selecionado ---------- */
  function renderDia() {
    const itens = doDia(dia);
    const tarefas = itens.filter(i => i.tipo === 'tarefa'), posts = itens.filter(i => i.tipo === 'post');
    $('#ag-dia').innerHTML = `
      <h2>${dataLonga(dia)}${dia === hojeTxt ? ' <span class="etiqueta">hoje</span>' : ''}</h2>

      <h3>✅ O que fazer</h3>
      ${tarefas.length ? tarefas.map(itemTarefa).join('') : '<p class="vazio">Nada anotado.</p>'}
      <form class="ag-add" data-add="tarefa">
        <input name="texto" placeholder="Ex.: terminar a bolsa da Ana, comprar linha…" autocomplete="off">
        <button class="btn-sec">+ Tarefa</button>
      </form>

      <h3>📸 Instagram</h3>
      ${posts.length ? posts.map(itemPost).join('') : '<p class="vazio">Nenhum post planejado.</p>'}
      <form class="ag-add ag-add-post" data-add="post">
        <input name="texto" placeholder="Sobre o que é o post?" autocomplete="off">
        <select name="formato">${FORMATOS.map(f => `<option>${f}</option>`).join('')}</select>
        <button type="button" class="btn-link" data-ideia title="Sugere uma ideia de post">💡 ideia</button>
        <button class="btn-sec">+ Post</button>
      </form>`;
  }

  function itemTarefa(i) {
    return `<div class="ag-item ${i.feito ? 'feito' : ''}" data-id="${i.id}">
      <input type="checkbox" data-campo="feito" ${i.feito ? 'checked' : ''} title="Feito">
      <input class="ag-texto" data-campo="texto" value="${L.esc(i.texto)}">
      <input type="date" data-campo="data" value="${i.data}" title="Mudar de dia">
      <button type="button" class="btn-x" data-apagar="${i.id}" title="Apagar">×</button>
    </div>`;
  }

  function itemPost(i) {
    return `<div class="ag-post ${i.feito ? 'feito' : ''}" data-id="${i.id}">
      <div class="ag-item">
        <input type="checkbox" data-campo="feito" ${i.feito ? 'checked' : ''} title="Já postei">
        <select data-campo="formato" title="Formato">${FORMATOS.map(f => `<option ${f === i.formato ? 'selected' : ''}>${f}</option>`).join('')}</select>
        <input class="ag-texto" data-campo="texto" value="${L.esc(i.texto)}" placeholder="Sobre o que é o post?">
        <button type="button" class="btn-x" data-apagar="${i.id}" title="Apagar">×</button>
      </div>
      <div class="ag-post-mais">
        <label>Horário<input type="time" data-campo="hora" value="${L.esc(i.hora || '')}"></label>
        <label>Dia<input type="date" data-campo="data" value="${i.data}"></label>
        <label class="ag-legenda">Legenda e hashtags
          <textarea data-campo="legenda" rows="3" placeholder="Escreva a legenda aqui e copie na hora de postar">${L.esc(i.legenda || '')}</textarea>
        </label>
        <div class="ag-post-acoes">
          ${i.legenda ? `<button type="button" class="btn-link" data-copiar="${i.id}">📋 Copiar legenda</button>` : ''}
          <span class="ajuda">${i.feito ? '✔ Postado' : ICONE_FORMATO[i.formato] + ' ' + i.formato + ' planejado'}</span>
        </div>
      </div>
    </div>`;
  }

  function render() { renderCal(); renderDia(); }

  /* ---------- eventos ---------- */
  function achar(id) { return lista().find(i => i.id === id); }

  function ligar() {
    raiz.addEventListener('click', e => {
      const b = e.target.closest('button, [data-hoje]');
      if (!b) return;
      if (b.dataset.mes) mudarMes(+b.dataset.mes);
      if ('hoje' in b.dataset) { mes = hojeTxt.slice(0, 7); dia = hojeTxt; render(); }
      if (b.dataset.dia) { dia = b.dataset.dia; render(); }
      if ('ideia' in b.dataset) {
        const inp = b.form.querySelector('[name=texto]');
        inp.value = IDEIAS[Math.floor(Math.random() * IDEIAS.length)];
        inp.focus();
      }
      if (b.dataset.apagar) {
        const it = achar(b.dataset.apagar);
        if (it.texto && !confirm(`Apagar "${it.texto}"?`)) return;
        L.dados.agenda = lista().filter(x => x !== it);
        L.salvar('agenda'); render();
      }
      if (b.dataset.copiar) copiar(achar(b.dataset.copiar).legenda);
    });

    raiz.addEventListener('submit', e => {
      e.preventDefault();
      const f = e.target, tipo = f.dataset.add;
      const texto = f.texto.value.trim();
      if (!texto) { f.texto.focus(); return; }
      const it = { id: L.id(), data: dia, tipo, texto, feito: false };
      if (tipo === 'post') Object.assign(it, { formato: f.formato.value, hora: '', legenda: '' });
      lista().push(it);
      L.salvar('agenda');
      render();
      $(`form[data-add="${tipo}"] [name=texto]`).focus();
    });

    // mudanças nos itens: salva sem redesenhar o que a pessoa está digitando
    raiz.addEventListener('change', e => {
      const campo = e.target.dataset.campo;
      const box = e.target.closest('[data-id]');
      if (!campo || !box) return;
      const it = achar(box.dataset.id);
      it[campo] = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
      if (campo === 'data' && !it.data) it.data = dia;
      L.salvar('agenda');
      if (campo === 'feito' || campo === 'data' || campo === 'formato') render();
      else renderCal();
      if (campo === 'feito' && it.feito && it.tipo === 'post') L.toast('Post feito! 👏');
    });
  }

  function copiar(txt) {
    const ok = () => L.toast('Legenda copiada! É só colar no Instagram 📋');
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(txt).then(ok);
    else {
      const t = document.createElement('textarea');
      t.value = txt; document.body.appendChild(t); t.select();
      document.execCommand('copy'); t.remove(); ok();
    }
  }

  montar();
  ligar();
  render();
  L.aoMudar(origem => { if (origem !== 'agenda') render(); });
})();
