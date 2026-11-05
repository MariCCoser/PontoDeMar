/* ============================================================
   RECEITAS — agente responsável: "receitas"
   Caderno de receitas: salva sozinho, atalhos de pontos,
   contador de carreiras, foto, busca e impressão.
   ============================================================ */
(function () {
  const L = Loja;
  const raiz = document.getElementById('aba-receitas');
  const $ = s => raiz.querySelector(s);
  const CATS = ['Amigurumi', 'Bolsa', 'Chaveiro', 'Acessório', 'Decoração', 'Roupa', 'Outro'];
  const ATALHOS = ['am', 'corr', 'pbx', 'pb', 'mpa', 'pa', 'aum', 'dim', 'arremate'];
  const LEGENDA = [['am', 'anel mágico'], ['corr', 'correntinha'], ['pbx', 'ponto baixíssimo'], ['pb', 'ponto baixo'], ['mpa', 'meio ponto alto'], ['pa', 'ponto alto'], ['aum', 'aumento (2 pontos no mesmo)'], ['dim', 'diminuição (fechar 2 juntos)'], ['C1, C2…', 'carreira / volta'], ['(…) x6', 'repetir 6 vezes'], ['(18)', 'total de pontos na carreira']];

  let atualId = null, busca = '', filtro = 'Todas', timer = null;

  const receitas = () => L.dados.receitas;
  const atual = () => receitas().find(r => r.id === atualId) || null;
  const normal = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  function montar() {
    raiz.innerHTML = `
      <div class="cabecalho-aba">
        <h1>📒 Receitas</h1>
        <p>Anote suas receitas rapidinho. Tudo é salvo sozinho enquanto você digita.</p>
      </div>
      <div class="receitas-layout">
        <aside class="cartao lista-receitas">
          <button class="btn" id="rc-nova">+ Nova receita</button>
          <input id="rc-busca" type="search" placeholder="🔎 Procurar receita…">
          <div class="filtros" id="rc-filtros"></div>
          <div id="rc-lista"></div>
        </aside>
        <section class="cartao" id="rc-editor"></section>
      </div>`;
    if (!document.getElementById('impressao')) {
      const p = document.createElement('div');
      p.id = 'impressao';
      document.body.appendChild(p);
    }
  }

  /* ---------- lista ---------- */
  function renderFiltros() {
    const opcoes = ['Todas', '★ Favoritas', ...CATS.filter(c => receitas().some(r => r.categoria === c))];
    if (!opcoes.includes(filtro)) filtro = 'Todas';
    $('#rc-filtros').innerHTML = opcoes.map(o => `<button class="chip ${o === filtro ? 'ativo' : ''}" data-filtro="${o}">${o}</button>`).join('');
  }

  function filtradas() {
    const q = normal(busca);
    return receitas()
      .filter(r => filtro === 'Todas' || (filtro === '★ Favoritas' ? r.favorita : r.categoria === filtro))
      .filter(r => !q || normal([r.titulo, r.categoria, r.fio, r.materiais, r.passos, r.notas].join(' ')).includes(q))
      .sort((a, b) => (b.favorita - a.favorita) || (b.atualizada - a.atualizada));
  }

  function renderLista() {
    const lista = filtradas(), box = $('#rc-lista');
    if (!receitas().length) { box.innerHTML = `<p class="vazio">Nenhuma receita ainda. Clique em <b>+ Nova receita</b>.</p>`; return; }
    if (!lista.length) { box.innerHTML = `<p class="vazio">Nada encontrado.</p>`; return; }
    box.innerHTML = lista.map(r => `
      <button class="item-receita ${r.id === atualId ? 'ativo' : ''}" data-id="${r.id}">
        <span class="titulo">${r.favorita ? '★ ' : ''}${L.esc(r.titulo || 'Sem título')}</span>
        <span class="sub">${L.esc(r.categoria)}${r.fio ? ' · ' + L.esc(r.fio) : ''}</span>
      </button>`).join('');
  }

  /* ---------- editor ---------- */
  function renderEditor() {
    const r = atual(), box = $('#rc-editor');
    if (!r) {
      box.innerHTML = `<div class="placeholder-receita">
        <div class="grande">🧶</div>
        <p>Escolha uma receita na lista ou clique em <b>+ Nova receita</b>.</p>
        <div class="legenda">${LEGENDA.map(([a, b]) => `<div><b>${a}</b> = ${b}</div>`).join('')}</div>
      </div>`;
      return;
    }
    const campo = (k, rotulo, ph) => `<label>${rotulo}<input data-campo="${k}" value="${L.esc(r[k])}" placeholder="${ph}"></label>`;
    box.innerHTML = `
      <div class="editor-topo">
        <input class="titulo-grande" data-campo="titulo" value="${L.esc(r.titulo)}" placeholder="Nome da receita (ex.: Ursinho de 15 cm)">
        <button class="estrela ${r.favorita ? 'ligada' : ''}" id="rc-fav" title="Marcar como favorita">★</button>
      </div>
      <div class="campos">
        <label>Categoria<select data-campo="categoria">${CATS.map(c => `<option ${c === r.categoria ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
        ${campo('fio', 'Fio / linha', 'Ex.: Amigurumi Círculo')}
        ${campo('agulha', 'Agulha', 'Ex.: 2,5 mm')}
        ${campo('tamanho', 'Tamanho final', 'Ex.: 15 cm')}
        ${campo('tempo', 'Tempo aproximado', 'Ex.: 3 h')}
      </div>
      <div class="grade-receita">
        <div>
          <label class="bloco">Materiais<textarea data-campo="materiais" rows="5" placeholder="- 30 g de fio bege&#10;- enchimento&#10;- olhos com trava 8 mm">${L.esc(r.materiais)}</textarea></label>
          <label class="bloco">Observações<textarea data-campo="notas" rows="4" placeholder="Dicas, de onde veio a receita, cliente que pediu…">${L.esc(r.notas)}</textarea></label>
          <div class="foto-receita">
            ${r.foto
              ? `<img src="${r.foto}" alt="Foto da peça"><button class="btn-link perigo" id="rc-tirar-foto">Remover foto</button>`
              : `<label class="btn-sec botao-foto">📷 Adicionar foto da peça<input type="file" accept="image/*" id="rc-foto" hidden></label>`}
          </div>
          <div class="contador">
            <div><b class="rotulo">Contador de carreiras</b><br><button class="btn-link" data-cont="zerar">zerar</button></div>
            <div class="contador-botoes">
              <button class="grande" data-cont="-1" title="Menos uma">−</button>
              <b id="rc-cont">${L.num(r.contador)}</b>
              <button class="grande" data-cont="1" title="Mais uma">+</button>
            </div>
          </div>
        </div>
        <div>
          <div class="rotulo-linha">
            <span>Passo a passo</span>
            <span class="atalhos">
              <button class="forte" data-ins="__carr" title="Começa uma nova linha com o número da próxima carreira">+ Carreira</button>
              ${ATALHOS.map(a => `<button data-ins="${a}">${a}</button>`).join('')}
              <button data-ins="__rep" title="Repetir">( ) x</button>
            </span>
          </div>
          <textarea data-campo="passos" id="rc-passos" class="passos" rows="20" placeholder="C1: 6 pb no am (6)&#10;C2: 6 aum (12)&#10;C3: (1 pb, 1 aum) x6 (18)">${L.esc(r.passos)}</textarea>
        </div>
      </div>
      <div class="editor-rodape">
        <span id="rc-status" class="ajuda">✓ Tudo salvo</span>
        <div>
          <button class="btn-sec" id="rc-imprimir">🖨️ Imprimir</button>
          <button class="btn-sec" id="rc-duplicar">Duplicar</button>
          <button class="btn-perigo" id="rc-excluir">Excluir</button>
        </div>
      </div>`;
  }

  /* ---------- salvar ---------- */
  function status(t) { const s = $('#rc-status'); if (s) s.textContent = t; }
  function agendarSalvar() {
    status('Salvando…');
    clearTimeout(timer);
    timer = setTimeout(salvarAgora, 400);
  }
  function salvarAgora() {
    if (timer) { clearTimeout(timer); timer = null; }
    L.salvar('receitas');
    status('✓ Tudo salvo');
  }

  function abrir(id) {
    salvarAgora();
    atualId = id;
    renderLista();
    renderEditor();
  }

  function nova() {
    const agora = Date.now();
    const r = {
      id: L.id(), titulo: '', categoria: CATS.includes(filtro) ? filtro : 'Amigurumi',
      fio: '', agulha: '', tamanho: '', tempo: '', materiais: '', passos: '', notas: '',
      foto: '', contador: 0, favorita: false, criada: agora, atualizada: agora
    };
    receitas().unshift(r);
    busca = ''; $('#rc-busca').value = '';
    abrir(r.id);
    renderFiltros();
    $('#rc-editor [data-campo=titulo]').focus();
  }

  /* ---------- inserir atalhos no passo a passo ---------- */
  function inserir(chave) {
    const ta = $('#rc-passos');
    const ini = ta.selectionStart, fim = ta.selectionEnd;
    const antes = ta.value.slice(0, ini);
    const ultimo = antes.slice(-1);
    let texto, cursor;
    if (chave === '__carr') {
      const nums = [...ta.value.matchAll(/^C(\d+)/gim)].map(m => +m[1]);
      const n = nums.length ? Math.max(...nums) + 1 : 1;
      texto = (antes && ultimo !== '\n' ? '\n' : '') + `C${n}: `;
    } else if (chave === '__rep') {
      texto = (antes && !/[\s(]/.test(ultimo) ? ' ' : '') + '() x';
      cursor = ini + texto.indexOf('(') + 1;
    } else {
      texto = (antes && !/[\s(]/.test(ultimo) ? ' ' : '') + chave + ' ';
    }
    ta.setRangeText(texto, ini, fim, 'end');
    if (cursor !== undefined) ta.setSelectionRange(cursor, cursor);
    ta.focus();
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  }

  /* ---------- foto (reduzida para não lotar o navegador) ---------- */
  function reduzirFoto(arquivo, max = 800) {
    return new Promise((ok, erro) => {
      const img = new Image();
      const url = URL.createObjectURL(arquivo);
      img.onload = () => {
        const esc = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * esc);
        c.height = Math.round(img.height * esc);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        ok(c.toDataURL('image/jpeg', 0.72));
      };
      img.onerror = () => { URL.revokeObjectURL(url); erro(new Error('Não consegui abrir essa imagem.')); };
      img.src = url;
    });
  }

  function imprimir() {
    const r = atual();
    if (!r) return;
    salvarAgora();
    const info = [['Categoria', r.categoria], ['Fio', r.fio], ['Agulha', r.agulha], ['Tamanho', r.tamanho], ['Tempo', r.tempo]]
      .filter(([, v]) => v).map(([k, v]) => `<b>${k}:</b> ${L.esc(v)}`).join(' · ');
    document.getElementById('impressao').innerHTML = `
      <h1>${L.esc(r.titulo || 'Receita')}</h1><p>${info}</p>
      ${r.foto ? `<img src="${r.foto}" alt="">` : ''}
      ${r.materiais ? `<h2>Materiais</h2><pre>${L.esc(r.materiais)}</pre>` : ''}
      <h2>Passo a passo</h2><pre>${L.esc(r.passos)}</pre>
      ${r.notas ? `<h2>Observações</h2><pre>${L.esc(r.notas)}</pre>` : ''}`;
    document.body.classList.add('imprimir');
    window.print();
    document.body.classList.remove('imprimir');
  }

  /* ---------- eventos ---------- */
  function ligar() {
    $('#rc-nova').addEventListener('click', nova);
    $('#rc-busca').addEventListener('input', e => { busca = e.target.value; renderLista(); });
    $('#rc-filtros').addEventListener('click', e => {
      const b = e.target.closest('[data-filtro]');
      if (!b) return;
      filtro = b.dataset.filtro;
      renderFiltros(); renderLista();
    });
    $('#rc-lista').addEventListener('click', e => {
      const b = e.target.closest('[data-id]');
      if (b) abrir(b.dataset.id);
    });

    const ed = $('#rc-editor');
    ed.addEventListener('input', e => {
      const k = e.target.dataset.campo, r = atual();
      if (!k || !r) return;
      r[k] = e.target.value;
      r.atualizada = Date.now();
      agendarSalvar();
      if (k === 'titulo' || k === 'fio') renderLista();
      if (k === 'categoria') { renderFiltros(); renderLista(); }
    });

    ed.addEventListener('click', e => {
      const r = atual();
      if (!r) return;
      const t = e.target;
      const ins = t.closest('[data-ins]');
      if (ins) { inserir(ins.dataset.ins); return; }
      const cont = t.closest('[data-cont]');
      if (cont) {
        const v = cont.dataset.cont;
        r.contador = v === 'zerar' ? 0 : Math.max(0, L.num(r.contador) + Number(v));
        $('#rc-cont').textContent = r.contador;
        agendarSalvar();
        return;
      }
      if (t.id === 'rc-fav') { r.favorita = !r.favorita; t.classList.toggle('ligada', r.favorita); salvarAgora(); renderLista(); }
      if (t.id === 'rc-tirar-foto') { if (confirm('Remover a foto?')) { r.foto = ''; salvarAgora(); renderEditor(); } }
      if (t.id === 'rc-imprimir') imprimir();
      if (t.id === 'rc-duplicar') {
        const agora = Date.now();
        const copia = { ...JSON.parse(JSON.stringify(r)), id: L.id(), titulo: (r.titulo || 'Receita') + ' (cópia)', contador: 0, criada: agora, atualizada: agora };
        receitas().unshift(copia);
        abrir(copia.id);
        L.toast('Receita duplicada');
      }
      if (t.id === 'rc-excluir') {
        if (!confirm(`Excluir a receita "${r.titulo || 'Sem título'}"? Não dá para desfazer.`)) return;
        L.dados.receitas = receitas().filter(x => x.id !== r.id);
        atualId = null;
        salvarAgora();
        renderFiltros(); renderLista(); renderEditor();
      }
    });

    ed.addEventListener('change', e => {
      if (e.target.id !== 'rc-foto' || !e.target.files[0]) return;
      const r = atual();
      reduzirFoto(e.target.files[0])
        .then(url => { r.foto = url; r.atualizada = Date.now(); salvarAgora(); renderEditor(); })
        .catch(err => alert(err.message));
    });

    window.addEventListener('beforeunload', () => { if (timer) salvarAgora(); });
  }

  montar();
  ligar();
  renderFiltros();
  renderLista();
  renderEditor();
  L.aoMudar(origem => {
    if (origem === 'receitas') return;
    if (!atual()) atualId = null;
    renderFiltros(); renderLista();
    if (origem === 'importar') renderEditor();
  });
})();
