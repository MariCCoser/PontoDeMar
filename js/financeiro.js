/* ============================================================
   FINANCEIRO — agente responsável: "financeiro"
   Valor da hora (uma vez), contas fixas, entradas/saídas do mês
   e a divisão: contas fixas → material / salário / reserva / investir
   ============================================================ */
(function () {
  const L = Loja;
  const raiz = document.getElementById('aba-financeiro');
  const $ = s => raiz.querySelector(s);

  const CAT_ENT = ['Venda', 'Encomenda', 'Feira / evento', 'Outro'];
  // categoria de saída → "balde" da divisão
  const CAT_SAI = {
    'Material (fios, enchimento…)': 'material',
    'Embalagem': 'material',
    'Conta fixa da loja': 'fixas',
    'Meu salário (retirada)': 'salario',
    'Guardei na reserva': 'reserva',
    'Investimento (ferramentas, cursos)': 'investir',
    'Divulgação / anúncios': 'investir',
    'Transporte / frete': 'outros',
    'Outro': 'outros'
  };
  const BALDES = [
    { k: 'material', nome: '🧶 Repor material', ajuda: 'Fios, enchimento, olhinhos, embalagens.' },
    { k: 'salario', nome: '👛 Seu salário', ajuda: 'O que você pode tirar para você.' },
    { k: 'reserva', nome: '🐷 Reserva da loja', ajuda: 'Guardado para emergências e meses fracos.' },
    { k: 'investir', nome: '🚀 Investir na loja', ajuda: 'Agulhas, divulgação, cursos.' }
  ];

  let mes = L.hoje().slice(0, 7);
  let tipo = 'entrada';

  function montar() {
    const c = L.dados.config;
    raiz.innerHTML = `
      <div class="cabecalho-aba">
        <h1>💰 Finanças da loja</h1>
        <p>Anote o que entra e o que sai <b>da loja</b>. O app te diz quanto pode gastar em material, quanto pode tirar de salário e quanto guardar. Seu dinheiro pessoal fica na aba <a href="#" data-ir="pessoal">👛 Meu dinheiro</a>.</p>
      </div>

      <div class="grade-2">
        <div class="cartao">
          <h2>⏰ Quanto vale a sua hora <span class="etiqueta">preencha só uma vez</span></h2>
          <div class="campos">
            <label class="largo">Quanto quero ganhar por cada hora de crochê (R$)<small>Na Precificação você só diz quantas horas trabalhou naquela peça — o app multiplica por este valor.</small><input id="fi-valorhora" type="number" min="0" step="0.5" value="${L.num(c.valorHora) || ''}" placeholder="Ex.: 15"></label>
          </div>
          <div id="fi-hora-res"></div>
          <details class="mini">
            <summary>Não sei quanto colocar — me ajuda</summary>
            <p class="ajuda">Pense numa peça que você já fez: quanto seria justo ganhar <b>só pelo seu trabalho</b> (sem contar o material)? E quantas horas ela levou?</p>
            <div class="campos linha">
              <label>Quero ganhar (R$)<input id="fi-aj-valor" type="number" min="0" step="1" placeholder="Ex.: 60"></label>
              <label>Levei (horas)<input id="fi-aj-horas" type="number" min="0" step="0.5" placeholder="Ex.: 4"></label>
              <button type="button" class="btn-sec" id="fi-aj-usar">Usar este valor</button>
            </div>
            <p class="ajuda" id="fi-aj-res"></p>
            <p class="ajuda">💡 Para comparar: pesquise o salário mínimo atual e divida por 220 (as horas de um mês de trabalho registrado). Muita gente começa perto desse valor e vai aumentando com a experiência e a procura.</p>
          </details>
          <details class="mini">
            <summary>Padrões da precificação</summary>
            <div class="campos">
              <label>Lucro padrão (%)<input id="fi-margem" type="number" min="0" step="1" value="${L.num(c.margem)}"></label>
              <label>Taxa de venda padrão (%)<small>0 se recebe por Pix/dinheiro</small><input id="fi-taxa" type="number" min="0" max="90" step="0.1" value="${L.num(c.taxaVenda)}"></label>
            </div>
          </details>
        </div>

        <div class="cartao">
          <h2>🏠 Contas fixas da loja</h2>
          <label class="interruptor"><input type="checkbox" id="fi-usar-fixos" ${c.usarFixos ? 'checked' : ''}><span>Minha loja tem contas fixas</span></label>
          <p class="ajuda" id="fi-fixos-off">Sem contas fixas por enquanto — ótimo! Quando elas aparecerem (MEI, internet só da loja, aluguel de espaço…), é só marcar acima. Aí elas entram no preço das peças automaticamente.</p>
          <div id="fi-fixos-area">
            <p class="ajuda">Gastos que existem todo mês, mesmo se você não vender nada.</p>
            <label>Mais ou menos quantas horas você faz crochê por mês?<small>Só serve para dividir as contas entre as peças — um chute serve. Ex.: 3 h/dia × 20 dias = 60</small><input id="fi-horas" type="number" min="0" step="1" value="${L.num(c.horasMes) || ''}" placeholder="Ex.: 60"></label>
            <div id="fi-fixos"></div>
            <form id="fi-form-fixo" class="campos linha">
              <label class="largo">Conta<input name="nome" list="fi-sugestoes" required placeholder="Ex.: MEI (DAS)"></label>
              <label>Valor por mês (R$)<input name="valor" type="number" min="0" step="0.01" required></label>
              <button class="btn">Adicionar</button>
            </form>
          </div>
          <datalist id="fi-sugestoes">
            <option>MEI (DAS)</option><option>Internet (parte da loja)</option><option>Energia (parte da loja)</option>
            <option>Celular / plano</option><option>Aplicativo / site</option><option>Anúncio fixo</option>
          </datalist>
        </div>
      </div>

      <div class="cartao">
        <div class="nav-mes">
          <button class="btn-sec" id="fi-ant" title="Mês anterior">◀</button>
          <h2 id="fi-mes-nome"></h2>
          <button class="btn-sec" id="fi-prox" title="Próximo mês">▶</button>
          <button class="btn-link" id="fi-hoje">ir para o mês atual</button>
        </div>
        <div class="resumo" id="fi-resumo"></div>
      </div>

      <div class="grade-2">
        <div class="cartao">
          <h2>✏️ Anotar movimento</h2>
          <div class="alternar">
            <button type="button" data-tipo="entrada" class="ent">💰 Entrou dinheiro</button>
            <button type="button" data-tipo="saida" class="sai">💸 Saiu dinheiro</button>
          </div>
          <form id="fi-form-mov" class="campos">
            <label class="largo" id="fi-prod-wrap">Vendi um produto da minha lista? (opcional)<select id="fi-prod"></select></label>
            <label class="largo">Descrição<input name="descricao" required placeholder="Ex.: Bolsa de praia para a cliente Ana"></label>
            <label>Categoria<select name="categoria"></select></label>
            <label>Valor (R$)<input name="valor" type="number" min="0.01" step="0.01" required></label>
            <label>Data<input name="data" type="date" required></label>
            <button class="btn largo" id="fi-btn-mov"></button>
          </form>
        </div>

        <div class="cartao">
          <h2>🧭 Para onde vai o dinheiro deste mês</h2>
          <div id="fi-divisao"></div>
          <details class="mini">
            <summary>Ajustar as porcentagens</summary>
            <div class="campos">${BALDES.map(b => `<label>${b.nome} (%)<input type="number" min="0" max="100" step="1" data-pct="${b.k}" value="${L.num(L.dados.divisao[b.k])}"></label>`).join('')}</div>
            <p class="ajuda" id="fi-soma"></p>
          </details>
        </div>
      </div>

      <div class="cartao">
        <h2>📋 Movimentos do mês</h2>
        <div id="fi-movs"></div>
      </div>`;
    $('#fi-form-mov').elements.data.value = L.hoje();
  }

  /* ---------- contas ---------- */
  const doMes = m => L.dados.lancamentos.filter(l => (l.data || '').slice(0, 7) === m);
  const soma = (lista, f) => lista.filter(f).reduce((s, l) => s + L.num(l.valor), 0);

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

  /* ---------- partes que se atualizam ---------- */
  function renderHoraRes() {
    const vh = L.valorHora();
    $('#fi-hora-res').innerHTML = vh > 0
      ? `<div class="valor-hora"><span>Sua hora vale</span><strong>${L.moeda(vh)}</strong><small>Exemplo: uma peça de 3 h = ${L.moeda(vh * 3)} só pelo seu trabalho. Já é usado na Precificação ✔</small></div>`
      : `<p class="vazio">Coloque acima quanto quer ganhar por hora. Se não souber, abra a ajuda logo abaixo.</p>`;
  }

  function renderFixos() {
    const d = L.dados, box = $('#fi-fixos'), usar = !!d.config.usarFixos;
    $('#fi-fixos-area').hidden = !usar;
    $('#fi-fixos-off').hidden = usar;
    if (!usar) return;
    if (!d.gastosFixos.length) { box.innerHTML = `<p class="vazio">Nenhuma conta fixa ainda.</p>`; return; }
    const tot = L.totalFixos(), cfh = L.custoFixoHora();
    box.innerHTML = `<table class="tabela"><tbody>
      ${d.gastosFixos.map(g => `<tr data-id="${g.id}">
        <td><input data-campo="nome" value="${L.esc(g.nome)}"></td>
        <td class="num"><input class="curto" data-campo="valor" type="number" min="0" step="0.01" value="${L.num(g.valor)}"></td>
        <td><button class="btn-x" data-del="${g.id}" title="Excluir">×</button></td></tr>`).join('')}
      </tbody></table>
      <p class="total-linha">Total: <b>${L.moeda(tot)}</b> por mês${cfh > 0 ? ` · isso dá <b>${L.moeda(cfh)}</b> por hora trabalhada` : ''}</p>
      ${cfh > 0 ? '' : `<p class="ajuda neg">Coloque as horas por mês acima para as contas entrarem no preço das peças.</p>`}`;
  }

  function renderResumo() {
    const lm = doMes(mes), todos = L.dados.lancamentos;
    const ent = soma(lm, l => l.tipo === 'entrada');
    const sai = soma(lm, l => l.tipo === 'saida');
    const caixa = soma(todos, l => l.tipo === 'entrada') - soma(todos, l => l.tipo === 'saida');
    const reserva = soma(todos, l => l.tipo === 'saida' && CAT_SAI[l.categoria] === 'reserva');
    $('#fi-mes-nome').textContent = nomeMes(mes);
    $('#fi-resumo').innerHTML = `
      <div class="cartao-num verde"><span>Entrou no mês</span><strong>${L.moeda(ent)}</strong></div>
      <div class="cartao-num vermelho"><span>Saiu no mês</span><strong>${L.moeda(sai)}</strong></div>
      <div class="cartao-num ${ent - sai >= 0 ? '' : 'vermelho'}"><span>Sobrou no mês</span><strong>${L.moeda(ent - sai)}</strong></div>
      <div class="cartao-num"><span>💵 Dinheiro da loja em caixa</span><strong>${L.moeda(caixa)}</strong><small>tudo que entrou − tudo que saiu, desde o início</small></div>
      <div class="cartao-num"><span>🐷 Total guardado na reserva</span><strong>${L.moeda(reserva)}</strong><small>soma de "Guardei na reserva"</small></div>`;
  }

  function renderDivisao() {
    const lm = doMes(mes), pct = L.dados.divisao;
    const ent = soma(lm, l => l.tipo === 'entrada');
    const fixas = L.fixosMes();
    const livre = Math.max(0, ent - fixas);
    const usado = k => soma(lm, l => l.tipo === 'saida' && CAT_SAI[l.categoria] === k);
    const box = $('#fi-divisao');

    const somaPct = BALDES.reduce((s, b) => s + L.num(pct[b.k]), 0);
    $('#fi-soma').innerHTML = somaPct === 100 ? 'Soma: 100% ✔' : `<span class="neg">Soma: ${somaPct}% — o ideal é dar 100%.</span>`;

    if (ent <= 0) {
      box.innerHTML = `<p class="vazio">Quando você anotar as vendas deste mês, eu mostro aqui quanto usar em cada coisa.</p>
        <p class="ajuda">A regra: ${fixas > 0 ? '<b>primeiro</b> paga as contas fixas, <b>depois</b> divide' : 'divida'} o dinheiro das vendas entre material, seu salário, reserva da loja e investimento.</p>`;
      return;
    }

    const linha = (nome, sub, deveria, usou, k) => {
      const pctBarra = deveria > 0 ? Math.min(100, usou / deveria * 100) : (usou > 0 ? 100 : 0);
      const passou = usou > deveria + 0.004;
      const falta = deveria - usou;
      let status;
      if (k === 'reserva') status = usou >= deveria - 0.004 ? `Guardou ${L.moeda(usou)} — meta cumprida! 🎉` : `Já guardou ${L.moeda(usou)} · <b>falta guardar ${L.moeda(falta)}</b>`;
      else if (k === 'salario') status = passou ? `<span class="neg">Tirou ${L.moeda(-falta)} a mais que o recomendado</span>` : `Já tirou ${L.moeda(usou)} · <b>ainda pode tirar ${L.moeda(falta)}</b>`;
      else if (k === 'fixas') status = passou ? `Pagou ${L.moeda(usou)} (mais que o previsto)` : `Já pagou ${L.moeda(usou)} · falta pagar ${L.moeda(falta)}`;
      else status = passou ? `<span class="neg">Passou ${L.moeda(-falta)} do recomendado</span>` : `Já usou ${L.moeda(usou)} · <b>ainda pode ${L.moeda(falta)}</b>`;
      return `<div class="balde">
        <div class="balde-topo"><span>${nome} <small>${sub}</small></span><b>${L.moeda(deveria)}</b></div>
        <div class="barra"><span class="${passou && k !== 'reserva' ? 'passou' : ''}" style="width:${pctBarra}%"></span></div>
        <small>${status}</small></div>`;
    };

    box.innerHTML = `
      ${fixas > 0
        ? `<p>Entrou <b>${L.moeda(ent)}</b>. Primeiro separe <b>${L.moeda(Math.min(fixas, ent))}</b> para as contas fixas. O que sobra (<b>${L.moeda(livre)}</b>) se divide assim:</p>`
        : `<p>Entrou <b>${L.moeda(ent)}</b> de vendas. Divida assim:</p>`}
      ${ent < fixas ? `<div class="aviso">As vendas deste mês ainda não cobriram as contas fixas — faltam <b>${L.moeda(fixas - ent)}</b>. Segure os gastos por enquanto.</div>` : ''}
      ${fixas > 0 ? linha('🏠 Contas fixas', '', fixas, usado('fixas'), 'fixas') : ''}
      ${BALDES.map(b => linha(b.nome, L.num(pct[b.k]) + '%', livre * L.num(pct[b.k]) / 100, usado(b.k), b.k)).join('')}
      <p class="ajuda">Para marcar o que já fez, anote uma <b>saída</b> com a categoria certa — por exemplo "Meu salário (retirada)" ou "Guardei na reserva". O seu salário aparece sozinho na aba <a href="#" data-ir="pessoal">👛 Meu dinheiro</a>.</p>`;
  }

  function renderMovs() {
    const lista = [...doMes(mes)].sort((a, b) => (b.data || '').localeCompare(a.data || ''));
    const box = $('#fi-movs');
    if (!lista.length) { box.innerHTML = `<p class="vazio">Nenhum movimento anotado em ${nomeMes(mes).toLowerCase()}.</p>`; return; }
    box.innerHTML = `<table class="tabela"><thead><tr><th>Dia</th><th>Descrição</th><th>Categoria</th><th class="num">Valor</th><th></th></tr></thead><tbody>
      ${lista.map(l => {
        const ent = l.tipo === 'entrada';
        return `<tr><td>${(l.data || '').slice(8, 10)}/${(l.data || '').slice(5, 7)}</td>
          <td>${ent ? '💰' : '💸'} ${L.esc(l.descricao)}</td><td>${L.esc(l.categoria)}</td>
          <td class="num ${ent ? 'pos' : 'neg'}">${ent ? '+' : '−'} ${L.moeda(L.num(l.valor))}</td>
          <td><button class="btn-x" data-del="${l.id}" title="Excluir">×</button></td></tr>`;
      }).join('')}</tbody></table>`;
  }

  function renderProdOpcoes() {
    const sel = $('#fi-prod'), atual = sel.value;
    const lista = [...L.dados.produtos].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    sel.innerHTML = `<option value="">— não, vou escrever —</option>` +
      lista.map(p => `<option value="${p.id}">${L.esc(p.nome)} — ${L.moeda(L.num(p.precoSalvo))}</option>`).join('');
    sel.value = lista.some(p => p.id === atual) ? atual : '';
  }

  function setTipo(t) {
    tipo = t;
    raiz.querySelectorAll('[data-tipo]').forEach(b => b.classList.toggle('ativo', b.dataset.tipo === t));
    const f = $('#fi-form-mov').elements;
    const cats = t === 'entrada' ? CAT_ENT : Object.keys(CAT_SAI);
    f.categoria.innerHTML = cats.map(c => `<option>${c}</option>`).join('');
    $('#fi-prod-wrap').hidden = t !== 'entrada';
    $('#fi-btn-mov').textContent = t === 'entrada' ? '💰 Anotar entrada' : '💸 Anotar saída';
    $('#fi-btn-mov').className = 'btn largo ' + (t === 'entrada' ? 'btn-verde' : 'btn-vermelho');
  }

  function atualizar() {
    renderHoraRes();
    renderFixos();
    renderResumo();
    renderDivisao();
    renderMovs();
    renderProdOpcoes();
  }

  /* ---------- eventos ---------- */
  function ligar() {
    const cfg = { '#fi-valorhora': 'valorHora', '#fi-horas': 'horasMes', '#fi-margem': 'margem', '#fi-taxa': 'taxaVenda' };
    Object.entries(cfg).forEach(([sel, k]) => {
      $(sel).addEventListener('input', e => { L.dados.config[k] = L.num(e.target.value); L.salvar('financeiro'); });
    });

    $('#fi-usar-fixos').addEventListener('change', e => { L.dados.config.usarFixos = e.target.checked; L.salvar('financeiro'); });

    // ajudante "não sei quanto colocar"
    const ajuda = () => {
      const v = L.num($('#fi-aj-valor').value), h = L.num($('#fi-aj-horas').value);
      $('#fi-aj-res').innerHTML = v > 0 && h > 0 ? `Isso dá <b>${L.moeda(v / h)}</b> por hora.` : '';
      return v > 0 && h > 0 ? Math.round(v / h * 100) / 100 : 0;
    };
    $('#fi-aj-valor').addEventListener('input', ajuda);
    $('#fi-aj-horas').addEventListener('input', ajuda);
    $('#fi-aj-usar').addEventListener('click', () => {
      const vh = ajuda();
      if (!vh) { alert('Preencha quanto quer ganhar e quantas horas levou.'); return; }
      L.dados.config.valorHora = vh;
      $('#fi-valorhora').value = vh;
      L.salvar('financeiro');
      L.toast(`Sua hora agora vale ${L.moeda(vh)} ✔`);
    });

    $('#fi-form-fixo').addEventListener('submit', e => {
      e.preventDefault();
      const f = e.target.elements;
      L.dados.gastosFixos.push({ id: L.id(), nome: f.nome.value.trim(), valor: L.num(f.valor.value) });
      e.target.reset(); f.nome.focus();
      L.salvar('financeiro');
    });
    const fixos = $('#fi-fixos');
    fixos.addEventListener('change', e => {
      const tr = e.target.closest('[data-id]');
      const g = tr && L.dados.gastosFixos.find(x => x.id === tr.dataset.id);
      if (!g) return;
      g[e.target.dataset.campo] = e.target.dataset.campo === 'valor' ? L.num(e.target.value) : e.target.value;
      L.salvar('financeiro');
    });
    fixos.addEventListener('click', e => {
      const b = e.target.closest('[data-del]');
      if (!b) return;
      const g = L.dados.gastosFixos.find(x => x.id === b.dataset.del);
      if (!confirm(`Tirar "${g.nome}" das contas fixas?`)) return;
      L.dados.gastosFixos = L.dados.gastosFixos.filter(x => x.id !== g.id);
      L.salvar('financeiro');
    });

    $('#fi-ant').addEventListener('click', () => mudarMes(-1));
    $('#fi-prox').addEventListener('click', () => mudarMes(1));
    $('#fi-hoje').addEventListener('click', () => { mes = L.hoje().slice(0, 7); atualizar(); });

    raiz.querySelectorAll('[data-tipo]').forEach(b => b.addEventListener('click', () => setTipo(b.dataset.tipo)));

    $('#fi-prod').addEventListener('change', e => {
      const p = L.dados.produtos.find(x => x.id === e.target.value);
      if (!p) return;
      const f = $('#fi-form-mov').elements;
      f.descricao.value = 'Venda: ' + p.nome;
      f.valor.value = L.num(p.precoSalvo);
      f.categoria.value = 'Venda';
    });

    $('#fi-form-mov').addEventListener('submit', e => {
      e.preventDefault();
      const f = e.target.elements;
      const l = { id: L.id(), tipo, data: f.data.value, descricao: f.descricao.value.trim(), categoria: f.categoria.value, valor: L.num(f.valor.value) };
      if (l.valor <= 0) { alert('Coloque um valor maior que zero.'); return; }
      L.dados.lancamentos.push(l);
      mes = l.data.slice(0, 7);
      f.descricao.value = ''; f.valor.value = ''; $('#fi-prod').value = '';
      L.salvar('financeiro');
      L.toast(tipo === 'entrada' ? 'Entrada anotada 💰' : 'Saída anotada 💸');
      f.descricao.focus();
    });

    $('#fi-movs').addEventListener('click', e => {
      const b = e.target.closest('[data-del]');
      if (!b) return;
      const l = L.dados.lancamentos.find(x => x.id === b.dataset.del);
      if (!confirm(`Excluir "${l.descricao}" (${L.moeda(L.num(l.valor))})?`)) return;
      L.dados.lancamentos = L.dados.lancamentos.filter(x => x.id !== l.id);
      L.salvar('financeiro');
    });

    raiz.querySelectorAll('[data-pct]').forEach(inp => inp.addEventListener('input', () => {
      L.dados.divisao[inp.dataset.pct] = L.num(inp.value);
      L.salvar('financeiro');
    }));
  }

  montar();
  ligar();
  setTipo('entrada');
  atualizar();
  L.aoMudar(atualizar);
})();
