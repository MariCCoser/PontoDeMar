/* ============================================================
   MEU DINHEIRO (finanças pessoais) — agente responsável: "financeiro"
   O salário tirado da loja ("Meu salário (retirada)") entra aqui
   sozinho. Ganhos por fora, gastos e o que guardar ficam aqui.
   Orçamento pela regra Necessidades / Desejos / Guardar.
   ============================================================ */
(function () {
  const L = Loja;
  const raiz = document.getElementById('aba-pessoal');
  const $ = s => raiz.querySelector(s);

  const RETIRADA_LOJA = 'Meu salário (retirada)'; // mesma categoria usada em financeiro.js
  const CAT_ENT = ['Trabalho por fora', 'Presente / ajuda', 'Vendi algo meu', 'Outro'];
  const CAT_GASTO = {
    'Alimentação': 'necessidades',
    'Transporte': 'necessidades',
    'Saúde / farmácia': 'necessidades',
    'Ajuda em casa': 'necessidades',
    'Celular / internet': 'necessidades',
    'Estudos / cursos': 'necessidades',
    'Contas e dívidas': 'necessidades',
    'Lazer / passeios': 'desejos',
    'Roupas e beleza': 'desejos',
    'Delivery / lanches': 'desejos',
    'Compras online': 'desejos',
    'Assinaturas (streaming…)': 'desejos',
    'Presentes': 'desejos',
    'Outro': 'desejos'
  };
  const GRUPOS = [
    { k: 'necessidades', nome: '🏠 Necessidades', ajuda: 'O que você precisa: comida, transporte, saúde, ajudar em casa.' },
    { k: 'desejos', nome: '🎉 Desejos', ajuda: 'O que é gostoso, mas dá para viver sem: passeios, roupas, delivery.' },
    { k: 'guardar', nome: '🐷 Guardar', ajuda: 'Para seus sonhos e emergências.' }
  ];
  const TIPOS = {
    entrada: { rotulo: '💵 Recebi', botao: '💵 Anotar dinheiro recebido', classe: 'btn-verde' },
    gasto: { rotulo: '🛍️ Gastei', botao: '🛍️ Anotar gasto', classe: 'btn-vermelho' },
    guardar: { rotulo: '🐷 Guardei', botao: '🐷 Anotar que guardei', classe: '' }
  };

  let mes = L.hoje().slice(0, 7);
  let tipo = 'gasto';

  const P = () => L.dados.pessoal;
  const soma = (lista, f) => lista.filter(f).reduce((s, l) => s + L.num(l.valor), 0);

  // salário que veio da loja, transformado em entrada pessoal (só leitura)
  function daLoja() {
    return L.dados.lancamentos
      .filter(l => l.tipo === 'saida' && l.categoria === RETIRADA_LOJA)
      .map(l => ({ id: 'loja-' + l.id, tipo: 'entrada', data: l.data, descricao: l.descricao, categoria: 'Salário da loja', valor: L.num(l.valor), daLoja: true }));
  }
  const todos = () => [...P().lancamentos, ...daLoja()];
  const doMes = m => todos().filter(l => (l.data || '').slice(0, 7) === m);

  function nomeMes(m) {
    const [y, mm] = m.split('-').map(Number);
    const t = new Date(y, mm - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    return t.charAt(0).toUpperCase() + t.slice(1);
  }
  function mudarMes(delta) {
    const [y, m] = mes.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    mes = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    atualizar();
  }

  function montar() {
    raiz.innerHTML = `
      <div class="cabecalho-aba">
        <h1>👛 Meu dinheiro</h1>
        <p>O seu dinheiro, <b>separado do da loja</b>. O salário que você tira da loja aparece aqui sozinho; o que ganhar por fora você anota.</p>
      </div>

      <div class="cartao">
        <div class="nav-mes">
          <button class="btn-sec" id="pe-ant" title="Mês anterior">◀</button>
          <h2 id="pe-mes-nome"></h2>
          <button class="btn-sec" id="pe-prox" title="Próximo mês">▶</button>
          <button class="btn-link" id="pe-hoje">ir para o mês atual</button>
        </div>
        <div class="resumo" id="pe-resumo"></div>
      </div>

      <div class="grade-2">
        <div class="cartao">
          <h2>✏️ Anotar</h2>
          <div class="alternar tres">
            ${Object.entries(TIPOS).map(([k, t]) => `<button type="button" data-tipo="${k}" class="t-${k}">${t.rotulo}</button>`).join('')}
          </div>
          <form id="pe-form" class="campos">
            <label class="largo">Descrição<input name="descricao" required placeholder="Ex.: Lanche com as amigas"></label>
            <label id="pe-cat-wrap">Categoria<select name="categoria"></select></label>
            <label id="pe-meta-wrap">Para qual objetivo?<select name="meta"></select></label>
            <label>Valor (R$)<input name="valor" type="number" min="0.01" step="0.01" required></label>
            <label>Data<input name="data" type="date" required></label>
            <button class="btn largo" id="pe-btn"></button>
          </form>
          <p class="ajuda" id="pe-dica-tipo"></p>
        </div>

        <div class="cartao">
          <h2>🧭 Como usar o dinheiro deste mês</h2>
          <div id="pe-orcamento"></div>
          <details class="mini">
            <summary>Ajustar as porcentagens</summary>
            <p class="ajuda">A regra clássica é <b>50% necessidades, 30% desejos, 20% guardar</b>. Morando com a família, essa é uma ótima fase para guardar mais — experimente 30 / 30 / 40.</p>
            <div class="campos">${GRUPOS.map(g => `<label>${g.nome} (%)<input type="number" min="0" max="100" step="1" data-pct="${g.k}" value="${L.num(P().orcamento[g.k])}"></label>`).join('')}</div>
            <p class="ajuda" id="pe-soma"></p>
          </details>
        </div>
      </div>

      <div class="grade-2">
        <div class="cartao">
          <h2>🎯 Meus objetivos</h2>
          <p class="ajuda">Dê um nome para o que você quer juntar dinheiro. Toda vez que guardar, escolha o objetivo em "🐷 Guardei".</p>
          <div id="pe-metas"></div>
          <form id="pe-form-meta" class="campos linha">
            <label class="largo">Objetivo<input name="nome" required list="pe-sugestoes" placeholder="Ex.: Reserva de emergência"></label>
            <label>Quanto quero juntar (R$)<input name="alvo" type="number" min="1" step="1" required></label>
            <button class="btn">Criar</button>
          </form>
          <datalist id="pe-sugestoes"><option>Reserva de emergência</option><option>Celular novo</option><option>Curso</option><option>Viagem</option><option>Material para a loja</option></datalist>
        </div>

        <div class="cartao">
          <h2>📊 Onde gastei este mês</h2>
          <div id="pe-categorias"></div>
        </div>
      </div>

      <div class="cartao">
        <h2>📋 Movimentos do mês</h2>
        <div id="pe-movs"></div>
      </div>

      <details class="cartao">
        <summary>📚 Aprenda a cuidar do seu dinheiro (6 lições rápidas)</summary>
        <ol class="licoes">
          <li><b>Dinheiro da loja não é seu salário.</b> Tudo que você vende é da loja. Você recebe o seu salário pela aba Finanças da loja ("Meu salário (retirada)"), e só ele vem para cá. Assim a loja nunca fica sem dinheiro para comprar material.</li>
          <li><b>Pague-se primeiro.</b> Assim que o dinheiro entrar, já separe a parte de guardar. Quem espera "ver o que sobra" no fim do mês quase nunca guarda nada.</li>
          <li><b>Tenha uma reserva de emergência.</b> O ideal é juntar o equivalente a 3 a 6 meses dos seus gastos. Ela serve para imprevistos (celular quebrou, mês sem vendas), não para compras.</li>
          <li><b>Necessidade ou desejo?</b> Antes de comprar algo que não precisa, espere 24 horas. Se ainda quiser, compre sem culpa — o dinheiro dos desejos existe para isso!</li>
          <li><b>Anote tudo por 30 dias.</b> Até o cafezinho. No fim do mês, olhe o "Onde gastei" — quase sempre tem uma surpresa.</li>
          <li><b>Cuidado com o parcelado e o cartão.</b> Parcela pequena também é gasto de todo mês. Some as parcelas antes de fazer uma nova.</li>
        </ol>
      </details>`;
    $('#pe-form').elements.data.value = L.hoje();
  }

  /* ---------- partes que se atualizam ---------- */
  function renderResumo() {
    const lm = doMes(mes), tudo = todos();
    const ent = soma(lm, l => l.tipo === 'entrada');
    const entLoja = soma(lm, l => l.daLoja);
    const gas = soma(lm, l => l.tipo === 'gasto');
    const gua = soma(lm, l => l.tipo === 'guardar');
    const carteira = soma(tudo, l => l.tipo === 'entrada') - soma(tudo, l => l.tipo !== 'entrada');
    const guardadoTotal = soma(tudo, l => l.tipo === 'guardar');
    $('#pe-mes-nome').textContent = nomeMes(mes);
    $('#pe-resumo').innerHTML = `
      <div class="cartao-num verde"><span>Recebi no mês</span><strong>${L.moeda(ent)}</strong><small>${L.moeda(entLoja)} da loja · ${L.moeda(ent - entLoja)} por fora</small></div>
      <div class="cartao-num vermelho"><span>Gastei no mês</span><strong>${L.moeda(gas)}</strong></div>
      <div class="cartao-num azul"><span>Guardei no mês</span><strong>${L.moeda(gua)}</strong></div>
      <div class="cartao-num ${ent - gas - gua >= 0 ? '' : 'vermelho'}"><span>Ainda livre no mês</span><strong>${L.moeda(ent - gas - gua)}</strong><small>recebi − gastei − guardei</small></div>
      <div class="cartao-num"><span>👛 Na carteira / conta</span><strong>${L.moeda(carteira)}</strong><small>desde o começo, sem contar o guardado</small></div>
      <div class="cartao-num"><span>🐷 Total guardado</span><strong>${L.moeda(guardadoTotal)}</strong><small>desde o começo</small></div>`;
  }

  function renderOrcamento() {
    const lm = doMes(mes), pct = P().orcamento, box = $('#pe-orcamento');
    const ent = soma(lm, l => l.tipo === 'entrada');
    const somaPct = GRUPOS.reduce((s, g) => s + L.num(pct[g.k]), 0);
    $('#pe-soma').innerHTML = somaPct === 100 ? 'Soma: 100% ✔' : `<span class="neg">Soma: ${somaPct}% — o ideal é dar 100%.</span>`;

    if (ent <= 0) {
      box.innerHTML = `<p class="vazio">Quando entrar dinheiro para você neste mês (salário da loja ou ganho por fora), eu mostro aqui quanto usar em cada coisa.</p>
        <p class="ajuda">Regra atual: ${GRUPOS.map(g => `${g.nome} ${L.num(pct[g.k])}%`).join(' · ')}</p>`;
      return;
    }
    const usou = k => k === 'guardar'
      ? soma(lm, l => l.tipo === 'guardar')
      : soma(lm, l => l.tipo === 'gasto' && (CAT_GASTO[l.categoria] || 'desejos') === k);

    box.innerHTML = `<p>Você recebeu <b>${L.moeda(ent)}</b> este mês. O ideal é usar assim:</p>` +
      GRUPOS.map(g => {
        const deveria = ent * L.num(pct[g.k]) / 100, u = usou(g.k), falta = deveria - u;
        const passou = u > deveria + 0.004;
        const largura = deveria > 0 ? Math.min(100, u / deveria * 100) : (u > 0 ? 100 : 0);
        let status;
        if (g.k === 'guardar') status = u >= deveria - 0.004 ? `Guardou ${L.moeda(u)} — meta cumprida! 🎉` : `Já guardou ${L.moeda(u)} · <b>falta guardar ${L.moeda(falta)}</b>`;
        else status = passou ? `<span class="neg">Passou ${L.moeda(-falta)} do combinado</span>` : `Já gastou ${L.moeda(u)} · <b>ainda pode ${L.moeda(falta)}</b>`;
        return `<div class="balde">
          <div class="balde-topo"><span>${g.nome} <small>${L.num(pct[g.k])}%</small></span><b>${L.moeda(deveria)}</b></div>
          <div class="barra"><span class="${passou && g.k !== 'guardar' ? 'passou' : ''}" style="width:${largura}%"></span></div>
          <small>${status}</small></div>`;
      }).join('') +
      `<p class="ajuda">💡 ${GRUPOS.find(g => g.k === 'guardar').ajuda} Guarde logo que o dinheiro entrar!</p>`;
  }

  function renderMetas() {
    const metas = P().metas, box = $('#pe-metas');
    if (!metas.length) { box.innerHTML = `<p class="vazio">Nenhum objetivo ainda. Uma boa primeira ideia: <b>Reserva de emergência</b>.</p>`; return; }
    box.innerHTML = metas.map(m => {
      const g = soma(P().lancamentos, l => l.tipo === 'guardar' && l.metaId === m.id);
      const alvo = L.num(m.alvo), pc = alvo > 0 ? Math.min(100, g / alvo * 100) : 0;
      return `<div class="balde">
        <div class="balde-topo"><span><b>${L.esc(m.nome)}</b></span><span>${L.moeda(g)} de ${L.moeda(alvo)} <button class="btn-x" data-del-meta="${m.id}" title="Excluir objetivo">×</button></span></div>
        <div class="barra"><span class="azul" style="width:${pc}%"></span></div>
        <small>${g >= alvo ? 'Objetivo alcançado! 🎉' : `${Math.round(pc)}% · faltam ${L.moeda(alvo - g)}`}</small></div>`;
    }).join('');
  }

  function renderCategorias() {
    const lm = doMes(mes).filter(l => l.tipo === 'gasto'), box = $('#pe-categorias');
    if (!lm.length) { box.innerHTML = `<p class="vazio">Nenhum gasto anotado neste mês.</p>`; return; }
    const por = {};
    lm.forEach(l => por[l.categoria] = (por[l.categoria] || 0) + L.num(l.valor));
    const lista = Object.entries(por).sort((a, b) => b[1] - a[1]);
    const max = lista[0][1], tot = lista.reduce((s, x) => s + x[1], 0);
    box.innerHTML = lista.map(([c, v]) => `
      <div class="cat-linha">
        <span class="cat-nome">${L.esc(c)} <small>${(CAT_GASTO[c] || 'desejos') === 'necessidades' ? 'necessidade' : 'desejo'}</small></span>
        <span class="cat-barra"><span class="${(CAT_GASTO[c] || 'desejos') === 'necessidades' ? 'nec' : 'des'}" style="width:${v / max * 100}%"></span></span>
        <span class="num">${L.moeda(v)} <small>${Math.round(v / tot * 100)}%</small></span>
      </div>`).join('');
  }

  function renderMovs() {
    const lista = [...doMes(mes)].sort((a, b) => (b.data || '').localeCompare(a.data || ''));
    const box = $('#pe-movs');
    if (!lista.length) { box.innerHTML = `<p class="vazio">Nada anotado em ${nomeMes(mes).toLowerCase()}.</p>`; return; }
    const icone = { entrada: '💵', gasto: '🛍️', guardar: '🐷' };
    const metaNome = id => (P().metas.find(m => m.id === id) || {}).nome;
    box.innerHTML = `<table class="tabela"><thead><tr><th>Dia</th><th>Descrição</th><th>Categoria</th><th class="num">Valor</th><th></th></tr></thead><tbody>
      ${lista.map(l => `<tr>
        <td>${(l.data || '').slice(8, 10)}/${(l.data || '').slice(5, 7)}</td>
        <td>${icone[l.tipo]} ${L.esc(l.descricao)} ${l.daLoja ? '<span class="etiqueta">vem da loja</span>' : ''}</td>
        <td>${L.esc(l.tipo === 'guardar' ? (metaNome(l.metaId) || 'Guardado') : l.categoria)}</td>
        <td class="num ${l.tipo === 'entrada' ? 'pos' : l.tipo === 'gasto' ? 'neg' : ''}">${l.tipo === 'entrada' ? '+' : '−'} ${L.moeda(L.num(l.valor))}</td>
        <td>${l.daLoja ? '' : `<button class="btn-x" data-del="${l.id}" title="Excluir">×</button>`}</td>
      </tr>`).join('')}</tbody></table>
      ${lista.some(l => l.daLoja) ? `<p class="ajuda">O que tem a etiqueta "vem da loja" é o salário anotado em Finanças da loja. Para mudar, edite lá.</p>` : ''}`;
  }

  function renderMetaOpcoes() {
    const sel = $('#pe-form').elements.meta, atual = sel.value;
    sel.innerHTML = `<option value="">Guardado geral</option>` + P().metas.map(m => `<option value="${m.id}">${L.esc(m.nome)}</option>`).join('');
    sel.value = P().metas.some(m => m.id === atual) ? atual : '';
  }

  function setTipo(t) {
    tipo = t;
    raiz.querySelectorAll('[data-tipo]').forEach(b => b.classList.toggle('ativo', b.dataset.tipo === t));
    const f = $('#pe-form').elements;
    const cats = t === 'entrada' ? CAT_ENT : t === 'gasto' ? Object.keys(CAT_GASTO) : [];
    f.categoria.innerHTML = cats.map(c => `<option>${c}</option>`).join('');
    $('#pe-cat-wrap').hidden = t === 'guardar';
    $('#pe-meta-wrap').hidden = t !== 'guardar';
    f.descricao.placeholder = { entrada: 'Ex.: Ajudei numa festa', gasto: 'Ex.: Lanche com as amigas', guardar: 'Ex.: Guardei na poupança' }[t];
    const b = $('#pe-btn');
    b.textContent = TIPOS[t].botao;
    b.className = 'btn largo ' + TIPOS[t].classe;
    $('#pe-dica-tipo').innerHTML = t === 'entrada'
      ? 'O salário da loja <b>não precisa</b> ser anotado aqui: anote em Finanças da loja como "Meu salário (retirada)" que ele aparece sozinho.'
      : t === 'guardar' ? 'Guardar é tirar da carteira e colocar num lugar separado (poupança, cofrinho, outra conta).' : '';
  }

  function atualizar() {
    renderResumo();
    renderOrcamento();
    renderMetas();
    renderCategorias();
    renderMovs();
    renderMetaOpcoes();
  }

  /* ---------- eventos ---------- */
  function ligar() {
    $('#pe-ant').addEventListener('click', () => mudarMes(-1));
    $('#pe-prox').addEventListener('click', () => mudarMes(1));
    $('#pe-hoje').addEventListener('click', () => { mes = L.hoje().slice(0, 7); atualizar(); });
    raiz.querySelectorAll('[data-tipo]').forEach(b => b.addEventListener('click', () => setTipo(b.dataset.tipo)));

    $('#pe-form').addEventListener('submit', e => {
      e.preventDefault();
      const f = e.target.elements;
      const l = { id: L.id(), tipo, data: f.data.value, descricao: f.descricao.value.trim(), categoria: tipo === 'guardar' ? 'Guardado' : f.categoria.value, valor: L.num(f.valor.value) };
      if (tipo === 'guardar' && f.meta.value) l.metaId = f.meta.value;
      if (l.valor <= 0) { alert('Coloque um valor maior que zero.'); return; }
      P().lancamentos.push(l);
      mes = l.data.slice(0, 7);
      f.descricao.value = ''; f.valor.value = '';
      L.salvar('pessoal');
      L.toast({ entrada: 'Dinheiro recebido anotado 💵', gasto: 'Gasto anotado 🛍️', guardar: 'Muito bem, guardou! 🐷' }[tipo]);
      f.descricao.focus();
    });

    $('#pe-movs').addEventListener('click', e => {
      const b = e.target.closest('[data-del]');
      if (!b) return;
      const l = P().lancamentos.find(x => x.id === b.dataset.del);
      if (!confirm(`Excluir "${l.descricao}" (${L.moeda(L.num(l.valor))})?`)) return;
      P().lancamentos = P().lancamentos.filter(x => x.id !== l.id);
      L.salvar('pessoal');
    });

    $('#pe-form-meta').addEventListener('submit', e => {
      e.preventDefault();
      const f = e.target.elements;
      P().metas.push({ id: L.id(), nome: f.nome.value.trim(), alvo: L.num(f.alvo.value) });
      e.target.reset();
      L.salvar('pessoal');
      L.toast('Objetivo criado 🎯');
    });
    $('#pe-metas').addEventListener('click', e => {
      const b = e.target.closest('[data-del-meta]');
      if (!b) return;
      const m = P().metas.find(x => x.id === b.dataset.delMeta);
      if (!confirm(`Excluir o objetivo "${m.nome}"? O dinheiro que você anotou como guardado continua contando no total guardado.`)) return;
      P().metas = P().metas.filter(x => x.id !== m.id);
      L.salvar('pessoal');
    });

    raiz.querySelectorAll('[data-pct]').forEach(inp => inp.addEventListener('input', () => {
      P().orcamento[inp.dataset.pct] = L.num(inp.value);
      L.salvar('pessoal');
    }));
  }

  montar();
  ligar();
  setTipo('gasto');
  atualizar();
  L.aoMudar(atualizar);
})();
