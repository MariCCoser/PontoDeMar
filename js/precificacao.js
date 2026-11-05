/* ============================================================
   PRECIFICAÇÃO — agente responsável: "precificacao"
   preço = (materiais + tempo × valor da hora + tempo × contas da loja por hora)
           × (1 + lucro%) ÷ (1 − taxa de venda%)
   ============================================================ */
(function () {
  const L = Loja;
  const raiz = document.getElementById('aba-precos');
  const CATS = ['Amigurumi', 'Bolsa', 'Chaveiro', 'Acessório', 'Decoração', 'Roupa', 'Outro'];
  const $ = s => raiz.querySelector(s);

  let form = novoForm();

  function novoForm() {
    const c = L.dados.config;
    return { id: null, nome: '', categoria: 'Amigurumi', horas: 0, minutos: 30, itens: [], extras: 0, margem: c.margem, taxa: c.taxaVenda };
  }

  function custoUnit(m) { const q = L.num(m.quantidade); return q > 0 ? L.num(m.preco) / q : 0; }

  function arredondar(p) {
    if (p <= 0) return 0;
    let r = Math.ceil(p) - 0.1;
    if (r < p - 1e-9) r += 1;
    return Math.round(r * 100) / 100;
  }

  function calcular(p) {
    const d = L.dados;
    const mat = (p.itens || []).reduce((s, it) => {
      const m = d.materiais.find(x => x.id === it.materialId);
      return s + (m ? custoUnit(m) * L.num(it.qtd) : 0);
    }, 0);
    const extras = L.num(p.extras);
    const horas = L.num(p.horas) + L.num(p.minutos) / 60;
    const trabalho = horas * L.valorHora();
    const fixos = horas * L.custoFixoHora();
    const custo = mat + extras + trabalho + fixos;
    const lucro = custo * L.num(p.margem) / 100;
    const taxaPct = Math.min(Math.max(L.num(p.taxa), 0), 90);
    const preco = (custo + lucro) / (1 - taxaPct / 100);
    return { mat, extras, horas, trabalho, fixos, custo, lucro, taxa: Math.max(0, preco - custo - lucro), preco, redondo: arredondar(preco) };
  }

  function tempoTexto(p) {
    const h = L.num(p.horas), m = L.num(p.minutos);
    return [h ? h + 'h' : '', m ? m + 'min' : ''].filter(Boolean).join(' ') || '—';
  }

  /* ---------- estrutura da tela (montada uma vez) ---------- */
  function montar() {
    raiz.innerHTML = `
      <div class="cabecalho-aba">
        <h1>💲 Precificação</h1>
        <p>Descubra o preço justo de cada peça — da que leva 5 minutos à que leva 5 horas.</p>
      </div>
      <div id="pr-hora"></div>
      <div id="pr-cronometro"></div>

      <div class="grade-2">
        <div class="cartao">
          <h2>1. Calcular o preço de uma peça</h2>
          <div class="campos">
            <label class="largo">Nome da peça<input id="pr-nome" placeholder="Ex.: Chaveiro de coração"></label>
            <label>Categoria<select id="pr-cat">${CATS.map(c => `<option>${c}</option>`).join('')}</select></label>
          </div>

          <h3>⏱️ Quanto tempo você leva para fazer?</h3>
          <div class="rapidos">
            ${[[0, 5], [0, 15], [0, 30], [1, 0], [2, 0], [3, 0], [5, 0]].map(([h, m]) =>
              `<button type="button" class="chip" data-h="${h}" data-m="${m}">${h ? h + ' h' : m + ' min'}</button>`).join('')}
          </div>
          <div class="campos">
            <label>Horas<input id="pr-horas" type="number" min="0" step="1"></label>
            <label>Minutos<input id="pr-min" type="number" min="0" max="59" step="1"></label>
          </div>

          <h3>🧶 Materiais usados nesta peça <a href="#" data-ir="materiais" class="link-pequeno">ver meus materiais</a></h3>
          <p class="ajuda">Clique no tipo e diga quanto usou. Ex.: 3 g de uma linha, 5 g de outra e 2 olhinhos.</p>
          <div id="pr-itens"></div>
          <div class="rapidos" id="pr-add-botoes"></div>

          <h3>📦 Outros valores</h3>
          <div class="campos">
            <label>Outros custos (R$)<small>embalagem, etiqueta, argola…</small><input id="pr-extras" type="number" min="0" step="0.01"></label>
            <label>Lucro (%)<small>o que sobra para a loja crescer</small><input id="pr-margem" type="number" min="0" step="1"></label>
            <label>Taxa de venda (%)<small>maquininha, Shopee, Elo7… (0 se Pix)</small><input id="pr-taxa" type="number" min="0" max="90" step="0.1"></label>
          </div>
        </div>

        <div class="cartao resultado" id="pr-resultado"></div>
      </div>

      <div class="cartao">
        <h2>Meus produtos e preços</h2>
        <div id="pr-produtos"></div>
      </div>

      <details class="cartao">
        <summary>📖 Como o preço é calculado? (explicação simples)</summary>
        <ol class="explica">
          <li><b>Materiais:</b> quanto custou o fio, enchimento, olhinhos etc. que foram <i>na peça</i>.</li>
          <li><b>Seu trabalho:</b> o tempo que você levou × o valor da sua hora. Seu tempo é custo, não é "de graça"!</li>
          <li><b>Contas da loja</b> (só se você ativar em Finanças da loja): um pedacinho das contas fixas (MEI, internet…) em cada peça.</li>
          <li><b>Lucro:</b> uma porcentagem a mais, para a loja crescer (comprar material melhor, divulgar…). Salário é o seu trabalho; lucro é da loja.</li>
          <li><b>Taxa de venda:</b> se você vende por maquininha ou marketplace, eles ficam com uma parte. O app aumenta o preço para essa parte não sair do seu bolso.</li>
          <li>No fim, arredondamos para um preço "de vitrine" terminando em ,90.</li>
        </ol>
      </details>`;
  }

  function preencher() {
    $('#pr-nome').value = form.nome;
    $('#pr-cat').value = form.categoria;
    $('#pr-horas').value = form.horas;
    $('#pr-min').value = form.minutos;
    $('#pr-extras').value = form.extras;
    $('#pr-margem').value = form.margem;
    $('#pr-taxa').value = form.taxa;
  }

  /* ---------- partes que se atualizam ---------- */
  function renderHora() {
    const vh = L.valorHora(), cf = L.custoFixoHora();
    const contas = L.dados.config.usarFixos ? ` · 🏠 Contas da loja: <b>${L.moeda(cf)}</b> por hora` : '';
    $('#pr-hora').innerHTML = vh > 0
      ? `<div class="faixa-info">⏰ Sua hora vale <b>${L.moeda(vh)}</b>${contas} · <a href="#" data-ir="financeiro">alterar</a></div>`
      : `<div class="aviso">⚠️ Você ainda não definiu <b>quanto vale a sua hora</b>. Vá em <a href="#" data-ir="financeiro">Finanças da loja</a> e preencha (é só uma vez). Sem isso, o seu trabalho entra no preço como R$ 0!</div>`;
  }

  function renderItens() {
    const d = L.dados, box = $('#pr-itens');
    form.itens = form.itens.filter(it => d.materiais.some(m => m.id === it.materialId));
    if (!d.materiais.length) { box.innerHTML = `<p class="vazio">Primeiro cadastre seus materiais na aba <a href="#" data-ir="materiais">🧺 Materiais</a>.</p>`; return; }
    renderBotoesAdd();
    if (!form.itens.length) { box.innerHTML = `<p class="vazio">Nenhum material adicionado ainda.</p>`; return; }
    const PH = { g: 'gramas?', m: 'metros?', un: 'quantos?' };
    box.innerHTML = form.itens.map((it, i) => {
      const m = d.materiais.find(x => x.id === it.materialId);
      return `<div class="item-mat" data-i="${i}">
        <span class="icone-item">${L.ICONE_MAT[m.categoria] || '✨'}</span>
        <select data-campo="materialId">${opcoesMateriais(it.materialId)}</select>
        <input data-campo="qtd" type="number" min="0" step="any" value="${L.esc(it.qtd)}" placeholder="${PH[m.unidade]}">
        <span class="unid">${L.UNID_TXT[m.unidade]}</span>
        <span class="valor" data-custo>${L.moeda(custoUnit(m) * L.num(it.qtd))}</span>
        <button type="button" class="btn-x" data-rem="${i}" title="Tirar">×</button>
      </div>`;
    }).join('') + `<p class="total-itens">Total dos materiais: <b id="pr-tot-mat">${L.moeda(totalMat())}</b></p>`;
  }

  function grupoDe(m) { return L.CATS_MAT.includes(m.categoria) ? m.categoria : 'Outro'; }

  function opcoesMateriais(selecionado) {
    const d = L.dados;
    return L.CATS_MAT.map(cat => {
      const ms = d.materiais.filter(m => grupoDe(m) === cat).sort((a, b) => L.nomeMaterial(a).localeCompare(L.nomeMaterial(b), 'pt-BR'));
      if (!ms.length) return '';
      return `<optgroup label="${L.ICONE_MAT[cat]} ${cat}">${ms.map(x => `<option value="${x.id}" ${x.id === selecionado ? 'selected' : ''}>${L.esc(L.nomeMaterial(x))}</option>`).join('')}</optgroup>`;
    }).join('');
  }

  function renderBotoesAdd() {
    const d = L.dados, box = $('#pr-add-botoes');
    if (!d.materiais.length) { box.innerHTML = `<button type="button" class="btn-sec" data-ir="materiais">+ Cadastrar meus materiais</button>`; return; }
    const cats = L.CATS_MAT.filter(c => d.materiais.some(m => grupoDe(m) === c));
    box.innerHTML = cats.map(c => `<button type="button" class="chip" data-add-cat="${c}">+ ${L.ICONE_MAT[c]} ${c}</button>`).join('') +
      `<a href="#" data-ir="materiais" class="link-pequeno">cadastrar outro material</a>`;
  }

  function totalMat() {
    return form.itens.reduce((s, it) => {
      const m = L.dados.materiais.find(x => x.id === it.materialId);
      return s + (m ? custoUnit(m) * L.num(it.qtd) : 0);
    }, 0);
  }

  function resumoMateriais(p) {
    return (p.itens || []).map(it => {
      const m = L.dados.materiais.find(x => x.id === it.materialId);
      return m ? `${L.num(it.qtd)} ${L.UNID_TXT[m.unidade]} ${L.esc([m.nome, m.tamanho, m.cor].filter(Boolean).join(' '))}` : '';
    }).filter(Boolean).join(' · ');
  }

  function dica(r) {
    if (r.horas <= 0) return `<div class="dica-box">Coloque quanto tempo você leva para fazer a peça.</div>`;
    if (r.horas <= 0.34) return `<div class="dica-box">⚡ <b>Peça rápida.</b> Aqui o material e a embalagem pesam mais que o tempo. Dica: venda também em <b>kit</b> (ex.: 3 chaveiros) — o cliente leva mais e você ganha mais por venda.</div>`;
    if (r.horas >= 4) {
      const pct = r.preco > 0 ? Math.round(r.trabalho / r.preco * 100) : 0;
      return `<div class="dica-box">🕰️ <b>Peça demorada.</b> Seu trabalho é ${pct}% do preço. Não corte o seu tempo para baixar o preço — conte ao cliente que são ${tempoTexto(form)} de trabalho feito à mão.</div>`;
    }
    return `<div class="dica-box">💡 Compare com peças parecidas no mercado. Se ficou bem acima, veja se dá para gastar menos material ou ganhar velocidade — mas não abaixe o valor da sua hora.</div>`;
  }

  function atualizarResultado() {
    const r = calcular(form);
    const partes = [['🧶 Materiais e embalagem', r.mat + r.extras], ['🤲 Seu trabalho', r.trabalho], ['🏠 Contas da loja', r.fixos], ['📈 Lucro da loja', r.lucro], ['💳 Taxa de venda', r.taxa]]
      .map((p, i) => [...p, i])
      .filter(p => p[2] !== 2 || L.dados.config.usarFixos);
    const tot = r.preco || 1;
    $('#pr-resultado').innerHTML = `
      <h2>Preço sugerido</h2>
      <div class="preco-grande">${L.moeda(r.redondo)}</div>
      <p class="ajuda">Valor exato: ${L.moeda(r.preco)} — arredondado para um preço "de vitrine".</p>
      <div class="barra-empilhada">${partes.map(([n, v, i]) => v > 0.004 ? `<span class="seg s${i}" style="width:${v / tot * 100}%" title="${n}: ${L.moeda(v)}"></span>` : '').join('')}</div>
      <table class="tabela-res">
        ${partes.map(([n, v, i]) => `<tr><td><i class="bolinha s${i}"></i>${n}</td><td>${L.moeda(v)}</td></tr>`).join('')}
        <tr class="total"><td>Custo para fazer (sem lucro)</td><td>${L.moeda(r.custo)}</td></tr>
      </table>
      ${dica(r)}
      <div class="acoes">
        <button class="btn" data-acao="salvar">${form.id ? '✔ Atualizar produto' : '✔ Salvar na minha lista'}</button>
        <button class="btn-sec" data-acao="limpar">Nova peça</button>
      </div>`;
  }

  function renderProdutos() {
    const box = $('#pr-produtos');
    const lista = [...L.dados.produtos].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    if (!lista.length) { box.innerHTML = `<p class="vazio">Quando você salvar uma peça na calculadora, ela aparece aqui.</p>`; return; }
    let algumMudou = false;
    const linhas = lista.map(p => {
      const r = calcular(p);
      const mudou = Math.abs(r.redondo - L.num(p.precoSalvo)) >= 0.01;
      if (mudou) algumMudou = true;
      return `<tr>
        <td><b>${L.esc(p.nome)}</b>${resumoMateriais(p) ? `<small class="bloco">${resumoMateriais(p)}</small>` : ''}</td><td>${L.esc(p.categoria)}</td><td>${tempoTexto(p)}</td>
        <td class="num">${L.moeda(r.custo)}</td>
        <td class="num"><b>${L.moeda(L.num(p.precoSalvo))}</b></td>
        <td class="num ${mudou ? 'mudou' : ''}">${L.moeda(r.redondo)}${mudou ? ' ⚠️' : ''}</td>
        <td class="acoes-tab"><button class="btn-link" data-editar="${p.id}">Editar</button><button class="btn-link perigo" data-excluir="${p.id}">Excluir</button></td>
      </tr>`;
    }).join('');
    box.innerHTML = `<table class="tabela"><thead><tr><th>Peça</th><th>Categoria</th><th>Tempo</th><th class="num">Custo</th><th class="num">Preço salvo</th><th class="num">Preço hoje</th><th></th></tr></thead><tbody>${linhas}</tbody></table>
      ${algumMudou ? `<p class="ajuda">⚠️ = o preço de hoje mudou porque você alterou o valor da hora, as contas fixas ou o preço de algum material. Clique em <b>Editar</b> e depois em <b>Atualizar produto</b>.</p>` : ''}`;
  }

  function atualizar() {
    renderHora();
    renderItens();
    renderProdutos();
    atualizarResultado();
  }

  function salvarProduto() {
    if (!String(form.nome).trim()) { alert('Dê um nome para a peça antes de salvar 🙂'); $('#pr-nome').focus(); return; }
    const r = calcular(form);
    const p = JSON.parse(JSON.stringify(form));
    ['horas', 'minutos', 'extras', 'margem', 'taxa'].forEach(k => p[k] = L.num(p[k]));
    p.itens = p.itens.map(it => ({ materialId: it.materialId, qtd: L.num(it.qtd) }));
    p.nome = p.nome.trim();
    p.precoSalvo = r.redondo;
    p.atualizado = L.hoje();
    const lista = L.dados.produtos;
    const i = form.id ? lista.findIndex(x => x.id === form.id) : -1;
    if (i >= 0) lista[i] = p;
    else { p.id = L.id(); lista.push(p); form.id = p.id; }
    L.salvar('precos');
    L.toast(`"${p.nome}" salvo por ${L.moeda(p.precoSalvo)} ✔`);
  }

  /* ---------- eventos ---------- */
  function ligar() {
    const campos = { '#pr-nome': 'nome', '#pr-cat': 'categoria', '#pr-horas': 'horas', '#pr-min': 'minutos', '#pr-extras': 'extras', '#pr-margem': 'margem', '#pr-taxa': 'taxa' };
    Object.entries(campos).forEach(([sel, campo]) => {
      $(sel).addEventListener('input', e => { form[campo] = e.target.value; atualizarResultado(); });
    });

    $('.rapidos').addEventListener('click', e => {
      const b = e.target.closest('[data-h]');
      if (!b) return;
      form.horas = +b.dataset.h; form.minutos = +b.dataset.m;
      preencher(); atualizarResultado();
    });

    $('#pr-add-botoes').addEventListener('click', e => {
      const b = e.target.closest('[data-add-cat]');
      if (!b) return;
      const ms = L.dados.materiais.filter(m => grupoDe(m) === b.dataset.addCat)
        .sort((x, y) => L.nomeMaterial(x).localeCompare(L.nomeMaterial(y), 'pt-BR'));
      if (!ms.length) return;
      form.itens.push({ materialId: ms[0].id, qtd: '' });
      renderItens();
      atualizarResultado();
      const sels = raiz.querySelectorAll('#pr-itens [data-campo=materialId]');
      // se há mais de um material desse tipo, foca na escolha; senão, na quantidade
      (ms.length > 1 ? sels[sels.length - 1] : raiz.querySelectorAll('#pr-itens [data-campo=qtd]')[sels.length - 1]).focus();
    });

    const itens = $('#pr-itens');
    itens.addEventListener('input', e => {
      const row = e.target.closest('[data-i]');
      if (!row) return;
      const it = form.itens[+row.dataset.i];
      it[e.target.dataset.campo] = e.target.value;
      if (e.target.dataset.campo === 'materialId') renderItens();
      else {
        const m = L.dados.materiais.find(x => x.id === it.materialId);
        row.querySelector('[data-custo]').textContent = L.moeda(m ? custoUnit(m) * L.num(it.qtd) : 0);
        $('#pr-tot-mat').textContent = L.moeda(totalMat());
      }
      atualizarResultado();
    });
    itens.addEventListener('click', e => {
      const b = e.target.closest('[data-rem]');
      if (!b) return;
      form.itens.splice(+b.dataset.rem, 1);
      renderItens(); atualizarResultado();
    });

    $('#pr-resultado').addEventListener('click', e => {
      const acao = e.target.closest('[data-acao]')?.dataset.acao;
      if (acao === 'salvar') salvarProduto();
      if (acao === 'limpar') { form = novoForm(); preencher(); renderItens(); atualizarResultado(); $('#pr-nome').focus(); }
    });

    $('#pr-produtos').addEventListener('click', e => {
      const ed = e.target.closest('[data-editar]'), del = e.target.closest('[data-excluir]');
      if (ed) {
        const p = L.dados.produtos.find(x => x.id === ed.dataset.editar);
        form = JSON.parse(JSON.stringify(p));
        preencher(); renderItens(); atualizarResultado();
        raiz.scrollIntoView({ behavior: 'smooth' });
      }
      if (del) {
        const p = L.dados.produtos.find(x => x.id === del.dataset.excluir);
        if (!confirm(`Excluir o produto "${p.nome}"?`)) return;
        L.dados.produtos = L.dados.produtos.filter(x => x.id !== p.id);
        if (form.id === p.id) form.id = null;
        L.salvar('precos');
      }
    });
  }

  // usado pelo cronômetro: leva o tempo medido para a calculadora
  window.Precificacao = {
    usarTempo({ nome, horas, minutos, produtoId }) {
      const p = produtoId && L.dados.produtos.find(x => x.id === produtoId);
      form = p ? JSON.parse(JSON.stringify(p)) : { ...novoForm(), nome: nome || '' };
      form.horas = horas; form.minutos = minutos;
      document.querySelector('nav [data-aba="precos"]').click();
      preencher(); renderItens(); atualizarResultado();
      setTimeout(() => $('#pr-nome').closest('.cartao').scrollIntoView({ behavior: 'smooth' }), 50);
    }
  };

  montar();
  preencher();
  ligar();
  atualizar();
  L.aoMudar(atualizar);
})();
