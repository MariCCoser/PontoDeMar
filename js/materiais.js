/* ============================================================
   MATERIAIS — agente responsável: "precificacao"
   Linhas, enchimentos, aplicações… com cor, marca, situação
   (tenho / acabando / acabou), histórico de compras e a loja
   mais barata. O preço "atual" de cada material é usado na
   Precificação (preco ÷ quantidade).
   ============================================================ */
(function () {
  const L = Loja;
  const raiz = document.getElementById('aba-materiais');
  const $ = s => raiz.querySelector(s);

  const CATS = L.CATS_MAT;
  const ICONE = L.ICONE_MAT;
  // dicas para cada tipo: medida padrão e exemplos dos campos
  const DICA = {
    'Linha / fio': { unid: 'g', nome: 'Fio Amigurumi', tam: 'Ex.: 125 g / 254 m', carac: 'Ex.: 100% algodão', preco: 'Ex.: novelo de 125 g por R$ 18,90 → Preço 18,90 · Vem 125 gramas' },
    'Enchimento': { unid: 'g', nome: 'Fibra siliconada', tam: 'Ex.: pacote 500 g', carac: 'Ex.: antialérgica', preco: 'Ex.: pacote de 500 g por R$ 25 → Preço 25 · Vem 500 gramas' },
    'Olhos': { unid: 'un', nome: 'Olho com trava', tam: 'Ex.: 4 mm', carac: 'Ex.: com trava, preto', preco: 'Ex.: pacote com 50 pares por R$ 12 → Preço 12 · Vem 100 unidades (cada olho é 1)' },
    'Focinhos e aplicações': { unid: 'un', nome: 'Focinho de urso', tam: 'Ex.: 10 mm', carac: 'Ex.: com trava, marrom', preco: 'Ex.: pacote com 20 por R$ 8 → Preço 8 · Vem 20 unidades' },
    'Argolas': { unid: 'un', nome: 'Argola de metal', tam: 'Ex.: 25 mm', carac: 'Ex.: dourada', preco: 'Ex.: pacote com 10 por R$ 6 → Preço 6 · Vem 10 unidades' },
    'Chaveiros e mosquetões': { unid: 'un', nome: 'Argola de chaveiro', tam: 'Ex.: 25 mm', carac: 'Ex.: prateada, com corrente', preco: 'Ex.: pacote com 50 por R$ 15 → Preço 15 · Vem 50 unidades' },
    'Alças': { unid: 'un', nome: 'Alça de bolsa', tam: 'Ex.: 60 cm', carac: 'Ex.: couro sintético caramelo', preco: 'Ex.: par de alças por R$ 20 → Preço 20 · Vem 2 unidades' },
    'Fechos, zíperes e botões': { unid: 'un', nome: 'Botão de madeira', tam: 'Ex.: 15 mm', carac: 'Ex.: 2 furos', preco: 'Ex.: cartela com 12 por R$ 6 → Preço 6 · Vem 12 unidades' },
    'Embalagem': { unid: 'un', nome: 'Saquinho de presente', tam: 'Ex.: 15 × 20 cm', carac: 'Ex.: kraft com visor', preco: 'Ex.: 100 saquinhos por R$ 30 → Preço 30 · Vem 100 unidades' },
    'Agulhas e ferramentas': { unid: 'un', nome: 'Agulha de crochê', tam: 'Ex.: 2,5 mm', carac: 'Ex.: cabo emborrachado', preco: '' },
    'Outro': { unid: 'un', nome: 'Material', tam: 'Ex.: tamanho', carac: 'Ex.: detalhe', preco: '' }
  };
  const STATUS = { tenho: '✅ Tenho', acabando: '⚠️ Acabando', acabou: '❌ Acabou' };
  const UNID = { g: 'grama', m: 'metro', un: 'unidade' };
  const UNID_PL = { g: 'gramas', m: 'metros', un: 'unidades' };
  const UNID_C = { g: 'g', m: 'm', un: 'un' };
  const fmt3 = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 3 });

  let busca = '', filtro = 'Todos';
  let rasc = null;        // cópia do material sendo editado na janelinha
  let mexeuCor = false;

  const mats = () => L.dados.materiais;
  const porUnid = (preco, qtd) => L.num(qtd) > 0 ? L.num(preco) / L.num(qtd) : 0;
  const dataBR = d => d ? d.split('-').reverse().join('/') : '';
  const normal = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  function maisBarata(m) {
    const cs = (m.compras || []).filter(c => porUnid(c.preco, c.quantidade) > 0);
    if (!cs.length) return null;
    return cs.reduce((a, b) => porUnid(b.preco, b.quantidade) < porUnid(a.preco, a.quantidade) ? b : a);
  }
  function lojas() {
    return [...new Set(mats().flatMap(m => (m.compras || []).map(c => (c.loja || '').trim()).filter(Boolean)))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }
  function usadoEm(m) { return L.dados.produtos.filter(p => (p.itens || []).some(i => i.materialId === m.id)).map(p => p.nome); }
  function emUso(m) { return usadoEm(m).length > 0; }

  /* ---------- estrutura ---------- */
  function montar() {
    raiz.innerHTML = `
      <div class="cabecalho-aba">
        <h1>🧺 Meus materiais</h1>
        <p>Suas linhas, enchimentos, olhinhos e tudo mais — com o preço e <b>onde você achou mais barato</b>. Os preços daqui são usados na Precificação.</p>
      </div>
      <div class="cartao ferramentas">
        <button class="btn" id="ma-novo">+ Novo material</button>
        <input type="search" id="ma-busca" placeholder="🔎 Procurar por nome, cor, marca ou loja…">
        <div class="filtros" id="ma-filtros"></div>
      </div>
      <div class="materiais-layout">
        <div id="ma-lista" class="grade-cards"></div>
        <aside>
          <div class="cartao">
            <h2>🛒 Lista de compras</h2>
            <div id="ma-compras"></div>
          </div>
          <div class="cartao">
            <h2>🏪 Onde comprar barato</h2>
            <div id="ma-lojas"></div>
          </div>
        </aside>
      </div>
      <dialog id="ma-dialogo" class="dialogo"></dialog>`;
  }

  /* ---------- lista de cards ---------- */
  function renderFiltros() {
    const opcoes = ['Todos', '⚠️ Faltando', ...CATS.filter(c => mats().some(m => m.categoria === c))];
    if (!opcoes.includes(filtro)) filtro = 'Todos';
    $('#ma-filtros').innerHTML = opcoes.map(o => `<button class="chip ${o === filtro ? 'ativo' : ''}" data-filtro="${o}">${o}</button>`).join('');
  }

  function filtrados() {
    const q = normal(busca);
    return mats()
      .filter(m => filtro === 'Todos' || (filtro === '⚠️ Faltando' ? m.status !== 'tenho' : m.categoria === filtro))
      .filter(m => !q || normal([m.nome, m.marca, m.cor, m.tamanho, m.acabamento, m.categoria, m.notas, ...(m.compras || []).map(c => c.loja)].join(' ')).includes(q))
      .sort((a, b) => (CATS.indexOf(a.categoria) - CATS.indexOf(b.categoria)) || a.nome.localeCompare(b.nome, 'pt-BR'));
  }

  function renderLista() {
    const box = $('#ma-lista'), lista = filtrados();
    if (!mats().length) {
      box.innerHTML = `<div class="cartao vazio-grande"><div class="grande">🧶</div><p>Nenhum material ainda.<br>Clique em <b>+ Novo material</b> e cadastre sua primeira linha!</p></div>`;
      return;
    }
    if (!lista.length) { box.innerHTML = `<p class="vazio">Nada encontrado.</p>`; return; }
    box.innerHTML = lista.map(m => {
      const pu = porUnid(m.preco, m.quantidade), b = maisBarata(m);
      const sub = [m.tamanho, m.acabamento, m.cor, m.marca].filter(Boolean).join(' · ') || m.categoria;
      const usos = usadoEm(m);
      return `<div class="card-mat" data-id="${m.id}">
        <div class="card-topo">
          <span class="amostra" style="${m.corHex ? `background:${L.esc(m.corHex)}` : ''}">${m.corHex ? '' : ICONE[m.categoria] || '✨'}</span>
          <div class="card-nome"><b>${L.esc(m.nome)}</b><small>${L.esc(sub)}</small></div>
        </div>
        <div class="preco-mat">${L.num(m.preco) > 0
          ? `${L.moeda(L.num(m.preco))} <small>por ${L.num(m.quantidade)} ${UNID_C[m.unidade]} · ${fmt3.format(pu)}/${UNID[m.unidade]}</small>`
          : `<small class="neg">sem preço — clique para colocar</small>`}</div>
        ${b ? `<div class="barato">💰 Mais barato: <b>${L.esc(b.loja || 'sem nome')}</b> — ${fmt3.format(porUnid(b.preco, b.quantidade))}/${UNID[m.unidade]}${b.data ? ` <small>(${dataBR(b.data)})</small>` : ''}</div>` : ''}
        ${usos.length ? `<small class="usado-em">🧸 Usado em: ${usos.map(L.esc).join(', ')}</small>` : ''}
        <div class="status-chips">${Object.entries(STATUS).map(([k, t]) => `<button class="st st-${k} ${m.status === k ? 'ativo' : ''}" data-status="${k}">${t}</button>`).join('')}</div>
      </div>`;
    }).join('');
  }

  function textoListaCompras() {
    return mats().filter(m => m.status !== 'tenho').map(m => {
      const b = maisBarata(m);
      return `- ${L.nomeMaterial(m)}${m.marca ? ' (' + m.marca + ')' : ''}${b ? ` → mais barato em ${b.loja || '?'}` : ''}`;
    }).join('\n');
  }

  function renderListaCompras() {
    const box = $('#ma-compras');
    const falta = mats().filter(m => m.status !== 'tenho');
    if (!falta.length) { box.innerHTML = `<p class="vazio">Nada faltando! Quando algo estiver acabando, marque <b>⚠️ Acabando</b> no card e ele aparece aqui.</p>`; return; }
    box.innerHTML = `<ul class="lista-compras">${falta.map(m => {
      const b = maisBarata(m);
      const det = [m.tamanho, m.acabamento, m.cor].filter(Boolean).join(' · ');
      return `<li><span class="st-bolinha st-${m.status}"></span><div><b>${L.esc(m.nome)}</b>${det ? ` <small>${L.esc(det)}</small>` : ''}
        <small class="bloco">${b ? `mais barato em <b>${L.esc(b.loja || '?')}</b> (${fmt3.format(porUnid(b.preco, b.quantidade))}/${UNID[m.unidade]})` : 'sem compra anotada'}</small></div></li>`;
    }).join('')}</ul>
    <button class="btn-sec" id="ma-copiar">📋 Copiar lista</button>`;
  }

  function renderLojas() {
    const box = $('#ma-lojas');
    const ls = lojas();
    if (!ls.length) { box.innerHTML = `<p class="vazio">Quando você anotar onde comprou cada material, mostro aqui as lojas que saem mais em conta.</p>`; return; }
    const info = ls.map(loja => ({
      loja,
      compras: mats().reduce((s, m) => s + (m.compras || []).filter(c => (c.loja || '').trim() === loja).length, 0),
      ganhou: mats().filter(m => (maisBarata(m)?.loja || '').trim() === loja).map(m => m.nome)
    })).sort((a, b) => b.ganhou.length - a.ganhou.length || b.compras - a.compras);
    box.innerHTML = `<ul class="lista-lojas">${info.map(i => `<li>
      <b>${L.esc(i.loja)}</b> <small>${i.compras} compra${i.compras > 1 ? 's' : ''}</small>
      <small class="bloco">${i.ganhou.length ? `🏆 mais barata para: ${i.ganhou.map(L.esc).join(', ')}` : 'não foi a mais barata em nada'}</small></li>`).join('')}</ul>`;
  }

  function atualizar() {
    renderFiltros();
    renderLista();
    renderListaCompras();
    renderLojas();
  }

  /* ---------- janelinha de edição ---------- */
  function abrirEditor(id) {
    const m = id ? mats().find(x => x.id === id) : null;
    const catIni = CATS.includes(filtro) ? filtro : 'Linha / fio';
    rasc = m ? JSON.parse(JSON.stringify(m)) : {
      id: null, nome: '', categoria: catIni, marca: '', cor: '', corHex: '', tamanho: '', acabamento: '',
      unidade: DICA[catIni].unid, preco: '', quantidade: '', status: 'tenho', notas: '', compras: []
    };
    const dk = DICA[rasc.categoria] || DICA.Outro;
    mexeuCor = false;
    const dlg = $('#ma-dialogo');
    dlg.innerHTML = `
      <form id="ma-form">
        <div class="dialogo-topo"><h2>${m ? 'Editar material' : 'Novo material'}</h2><button type="button" class="btn-x" data-fechar title="Fechar">×</button></div>
        <div class="campos">
          <label>Tipo<select name="categoria">${CATS.map(c => `<option value="${c}" ${c === rasc.categoria ? 'selected' : ''}>${ICONE[c]} ${c}</option>`).join('')}</select></label>
          <label class="duplo">Nome<input name="nome" required value="${L.esc(rasc.nome)}" placeholder="Ex.: ${dk.nome}"></label>
          <label>Tamanho / medida<input name="tamanho" value="${L.esc(rasc.tamanho)}" placeholder="${dk.tam}"></label>
          <label>Característica<input name="acabamento" value="${L.esc(rasc.acabamento)}" placeholder="${dk.carac}"></label>
          <label>Cor<input name="cor" value="${L.esc(rasc.cor)}" placeholder="Ex.: Rosa bebê 3526"></label>
          <label>Marca<input name="marca" value="${L.esc(rasc.marca)}" placeholder="Ex.: Círculo"></label>
          <label>Amostra da cor<span class="cor-linha"><input type="color" name="corHex" value="${rasc.corHex || '#ffffff'}"><button type="button" class="btn-link" id="ma-sem-cor">${rasc.corHex ? 'tirar' : 'sem cor'}</button></span></label>
          <label>Medida<select name="unidade">${Object.keys(UNID).map(u => `<option value="${u}" ${u === rasc.unidade ? 'selected' : ''}>${UNID_PL[u]}</option>`).join('')}</select></label>
          <label class="largo">Observações<textarea name="notas" rows="2" placeholder="Ex.: rende 2 ursinhos; não desbota na lavagem">${L.esc(rasc.notas)}</textarea></label>
        </div>

        <h3>💰 Preço usado na Precificação</h3>
        <div class="campos linha">
          <label>Preço (R$)<input name="preco" type="number" min="0" step="0.01" value="${L.esc(rasc.preco)}" placeholder="Ex.: 18,90"></label>
          <label>Vem quanto<input name="quantidade" type="number" min="0" step="any" value="${L.esc(rasc.quantidade)}" placeholder="Ex.: 125"></label>
          <p class="pu" id="ma-pu"></p>
        </div>
        <p class="ajuda" id="ma-dica-preco">${dk.preco}</p>

        <h3>🏪 Onde comprei</h3>
        <div id="ma-hist"></div>
        <div class="campos linha nova-compra">
          <label>Loja / site<input id="mc-loja" list="ma-lojas-lista" placeholder="Ex.: Armarinho do centro"></label>
          <label>Paguei (R$)<input id="mc-preco" type="number" min="0" step="0.01"></label>
          <label>Quantidade<input id="mc-qtd" type="number" min="0" step="any"></label>
          <label>Data<input id="mc-data" type="date" value="${L.hoje()}"></label>
          <button type="button" class="btn-sec" id="mc-add">+ Anotar</button>
        </div>
        <label class="interruptor"><input type="checkbox" id="mc-usar" checked><span>Usar o preço desta compra na Precificação</span></label>
        <datalist id="ma-lojas-lista">${lojas().map(l => `<option>${L.esc(l)}</option>`).join('')}</datalist>

        <div class="editor-rodape">
          ${m ? `<button type="button" class="btn-perigo" id="ma-excluir">Excluir material</button>` : '<span></span>'}
          <div><button type="button" class="btn-sec" data-fechar>Cancelar</button><button type="submit" class="btn">Salvar</button></div>
        </div>
      </form>`;
    renderHist();
    atualizarPU();
    dlg.showModal();
    if (!m) dlg.querySelector('[name=nome]').focus();
  }

  function unidAtual() { return $('#ma-form').elements.unidade.value; }

  function atualizarPU() {
    const f = $('#ma-form').elements;
    const pu = porUnid(f.preco.value, f.quantidade.value);
    $('#ma-pu').innerHTML = pu > 0 ? `= <b>${fmt3.format(pu)}</b> por ${UNID[unidAtual()]}` : '';
  }

  function renderHist() {
    const box = $('#ma-hist'), u = unidAtual();
    const cs = [...(rasc.compras || [])].sort((a, b) => (b.data || '').localeCompare(a.data || ''));
    if (!cs.length) { box.innerHTML = `<p class="vazio">Nenhuma compra anotada. Anote abaixo onde você comprou e por quanto — assim você sabe onde é mais barato.</p>`; return; }
    const b = maisBarata(rasc);
    box.innerHTML = `<table class="tabela"><thead><tr><th>Data</th><th>Loja</th><th class="num">Paguei</th><th class="num">Qtd.</th><th class="num">Por ${UNID[u]}</th><th></th></tr></thead><tbody>
      ${cs.map(c => `<tr class="${b && c.id === b.id ? 'mais-barato' : ''}">
        <td>${dataBR(c.data)}</td><td>${L.esc(c.loja)} ${b && c.id === b.id ? '<span class="etiqueta">mais barato</span>' : ''}</td>
        <td class="num">${L.moeda(L.num(c.preco))}</td><td class="num">${L.num(c.quantidade)} ${UNID_C[u]}</td>
        <td class="num">${fmt3.format(porUnid(c.preco, c.quantidade))}</td>
        <td><button type="button" class="btn-x" data-del-compra="${c.id}" title="Apagar">×</button></td></tr>`).join('')}
      </tbody></table>`;
  }

  // retorna true se anotou a compra digitada
  function anotarCompra() {
    const loja = $('#mc-loja').value.trim(), preco = L.num($('#mc-preco').value), qtd = L.num($('#mc-qtd').value);
    if (!(preco > 0) || !(qtd > 0)) return false;
    rasc.compras = rasc.compras || [];
    rasc.compras.push({ id: L.id(), loja, preco, quantidade: qtd, data: $('#mc-data').value });
    if ($('#mc-usar').checked) {
      const f = $('#ma-form').elements;
      f.preco.value = preco; f.quantidade.value = qtd;
      atualizarPU();
    }
    $('#mc-loja').value = ''; $('#mc-preco').value = ''; $('#mc-qtd').value = '';
    renderHist();
    return true;
  }

  function salvarEditor() {
    anotarCompra(); // se esqueceu de clicar em "+ Anotar"
    const f = $('#ma-form').elements;
    Object.assign(rasc, {
      nome: f.nome.value.trim(), categoria: f.categoria.value, marca: f.marca.value.trim(), cor: f.cor.value.trim(),
      tamanho: f.tamanho.value.trim(), acabamento: f.acabamento.value.trim(),
      unidade: f.unidade.value, preco: L.num(f.preco.value), quantidade: L.num(f.quantidade.value), notas: f.notas.value.trim()
    });
    if (mexeuCor) rasc.corHex = f.corHex.value;
    if (!rasc.nome) { alert('Dê um nome para o material.'); return; }
    const lista = mats();
    if (rasc.id) {
      const i = lista.findIndex(x => x.id === rasc.id);
      if (i >= 0) lista[i] = rasc; else lista.push(rasc);
    } else { rasc.id = L.id(); lista.push(rasc); }
    $('#ma-dialogo').close();
    L.salvar('materiais');
    L.toast(`"${rasc.nome}" salvo 🧶`);
  }

  function copiar(texto) {
    const ok = () => L.toast('Lista copiada! Cole no WhatsApp ou nas notas 📋');
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(texto).then(ok, () => antigo());
    else antigo();
    function antigo() {
      const t = document.createElement('textarea');
      t.value = texto; document.body.appendChild(t); t.select();
      try { document.execCommand('copy'); ok(); } catch (e) { alert(texto); }
      t.remove();
    }
  }

  /* ---------- eventos ---------- */
  function ligar() {
    $('#ma-novo').addEventListener('click', () => abrirEditor(null));
    $('#ma-busca').addEventListener('input', e => { busca = e.target.value; renderLista(); });
    $('#ma-filtros').addEventListener('click', e => {
      const b = e.target.closest('[data-filtro]');
      if (!b) return;
      filtro = b.dataset.filtro;
      renderFiltros(); renderLista();
    });

    $('#ma-lista').addEventListener('click', e => {
      const card = e.target.closest('[data-id]');
      if (!card) return;
      const st = e.target.closest('[data-status]');
      if (st) {
        const m = mats().find(x => x.id === card.dataset.id);
        m.status = st.dataset.status;
        L.salvar('materiais');
        return;
      }
      abrirEditor(card.dataset.id);
    });

    raiz.addEventListener('click', e => { if (e.target.id === 'ma-copiar') copiar('Lista de compras 🧶\n' + textoListaCompras()); });

    const dlg = $('#ma-dialogo');
    dlg.addEventListener('submit', e => { e.preventDefault(); salvarEditor(); });
    dlg.addEventListener('input', e => {
      const n = e.target.name;
      if (n === 'preco' || n === 'quantidade') atualizarPU();
      if (n === 'corHex') { mexeuCor = true; $('#ma-sem-cor').textContent = 'tirar'; }
    });
    dlg.addEventListener('change', e => {
      if (e.target.name === 'unidade') { atualizarPU(); renderHist(); }
      if (e.target.name === 'categoria') {
        // troca os exemplos e, se ainda não tem preço, a medida padrão (gramas p/ linha, unidades p/ olhos, argolas…)
        const f = $('#ma-form').elements, dk = DICA[f.categoria.value] || DICA.Outro;
        f.nome.placeholder = 'Ex.: ' + dk.nome;
        f.tamanho.placeholder = dk.tam;
        f.acabamento.placeholder = dk.carac;
        $('#ma-dica-preco').textContent = dk.preco;
        if (!L.num(f.preco.value) && !(rasc.compras || []).length) { f.unidade.value = dk.unid; atualizarPU(); renderHist(); }
      }
    });
    dlg.addEventListener('click', e => {
      const t = e.target;
      if (t.closest('[data-fechar]')) { dlg.close(); return; }
      if (t.id === 'mc-add') { if (!anotarCompra()) alert('Coloque quanto pagou e a quantidade.'); return; }
      if (t.id === 'ma-sem-cor') { rasc.corHex = ''; mexeuCor = false; $('#ma-form').elements.corHex.value = '#ffffff'; t.textContent = 'sem cor'; return; }
      const dc = t.closest('[data-del-compra]');
      if (dc) { rasc.compras = rasc.compras.filter(c => c.id !== dc.dataset.delCompra); renderHist(); return; }
      if (t.id === 'ma-excluir') {
        const m = mats().find(x => x.id === rasc.id);
        if (!confirm(`Excluir "${m.nome}"?` + (emUso(m) ? '\n\nAtenção: ele é usado em produtos da Precificação — o custo deles vai ficar menor.' : ''))) return;
        L.dados.materiais = mats().filter(x => x.id !== m.id);
        dlg.close();
        L.salvar('materiais');
      }
    });
  }

  montar();
  ligar();
  atualizar();
  L.aoMudar(atualizar);
})();
