/* ============================================================
   CRONÔMETRO DE TRABALHO — agente responsável: "precificacao"
   Liga e pausa enquanto faz a peça. Fica salvo: dá para fechar o app
   e continuar outro dia. No fim, leva o tempo para a Precificação.
   Ligado = guarda a hora em que ligou (inicio); o tempo conta mesmo com o app fechado.
   ============================================================ */
(function () {
  const L = Loja;
  const box = document.getElementById('pr-cronometro');
  if (!box) return;

  const flut = document.createElement('div');
  flut.id = 'crono-flutuante';
  flut.hidden = true;
  document.body.appendChild(flut);

  const lista = () => L.dados.trabalhos || (L.dados.trabalhos = []);
  const seg = t => L.num(t.segundos) + (t.inicio ? Math.max(0, (Date.now() - t.inicio) / 1000) : 0);
  const ligado = () => lista().find(t => t.inicio && !t.terminado);

  function relogio(s) {
    s = Math.floor(s);
    const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), ss = s % 60;
    return h + ':' + String(m).padStart(2, '0') + ':' + String(ss).padStart(2, '0');
  }
  function horasMin(s) {
    const total = Math.max(1, Math.round(s / 60));
    return { horas: Math.floor(total / 60), minutos: total % 60 };
  }
  function textoHM(s) { const { horas, minutos } = horasMin(s); return [horas ? horas + 'h' : '', minutos ? minutos + 'min' : ''].filter(Boolean).join(' '); }

  function pausar(t) {
    if (!t.inicio) return;
    t.segundos = seg(t);
    t.inicio = null;
  }

  function ligar(t) {
    lista().forEach(o => { if (o !== t) pausar(o); }); // só um ligado por vez
    t.inicio = Date.now();
  }

  /* ---------- tela ---------- */
  function render() {
    const ativos = lista().filter(t => !t.terminado);
    const terminados = lista().filter(t => t.terminado).slice(-5).reverse();
    const prods = [...L.dados.produtos].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

    box.innerHTML = `
      <div class="cartao crono">
        <h2>⏱️ Cronômetro de trabalho</h2>
        <p class="ajuda">Ligue quando começar a crochetar e pause quando parar. Fica salvo sozinho: pode fechar o app e voltar outro dia para terminar.</p>
        <form class="crono-novo" id="cr-form">
          <input id="cr-nome" placeholder="O que vai fazer? Ex.: Bolsa azul da Ana" list="cr-prods">
          <datalist id="cr-prods">${prods.map(p => `<option value="${L.esc(p.nome)}">`).join('')}</datalist>
          <button class="btn">▶ Começar</button>
        </form>
        ${ativos.length ? `<div class="crono-lista">${ativos.map(t => linha(t)).join('')}</div>` : `<p class="vazio">Nenhum trabalho em andamento.</p>`}
        ${terminados.length ? `<details class="crono-fim"><summary>Terminados (${terminados.length})</summary>
          ${terminados.map(t => `<div class="crono-item terminado">
            <span class="crono-nome">✔ ${L.esc(t.nome)}</span><span class="crono-tempo">${textoHM(seg(t))}</span>
            <span class="crono-botoes"><button class="btn-link" data-preco="${t.id}">Levar para o preço</button><button class="btn-link perigo" data-apagar="${t.id}">Apagar</button></span>
          </div>`).join('')}</details>` : ''}
      </div>`;
    tique();
  }

  function linha(t) {
    const on = !!t.inicio;
    const muito = on && (Date.now() - t.inicio) > 8 * 3600 * 1000;
    return `<div class="crono-item ${on ? 'ligado' : ''}" data-id="${t.id}">
      <span class="crono-nome">${on ? '🟢' : '⏸️'} ${L.esc(t.nome)}${muito ? '<small class="bloco aviso-txt">Ligado há mais de 8 h — esqueceu? Pause e clique em "Ajustar".</small>' : ''}</span>
      <span class="crono-tempo" data-relogio="${t.id}">${relogio(seg(t))}</span>
      <span class="crono-botoes">
        ${on ? `<button class="btn-sec" data-pausar="${t.id}">⏸ Pausar</button>` : `<button class="btn" data-ligar="${t.id}">▶ Continuar</button>`}
        <button class="btn-sec" data-terminar="${t.id}">✔ Terminei</button>
        <button class="btn-link" data-ajustar="${t.id}">Ajustar</button>
        <button class="btn-link perigo" data-apagar="${t.id}">Apagar</button>
      </span>
    </div>`;
  }

  // atualiza só os números (sem redesenhar nem salvar)
  function tique() {
    lista().forEach(t => {
      const el = box.querySelector(`[data-relogio="${t.id}"]`);
      if (el) el.textContent = relogio(seg(t));
    });
    const t = ligado();
    flut.hidden = !t;
    if (t) {
      flut.innerHTML = `<span>🟢 ${L.esc(t.nome)}</span><b>${relogio(seg(t))}</b><button type="button" data-pausar="${t.id}" title="Pausar">⏸</button>`;
      document.title = '⏱ ' + relogio(seg(t)) + ' · Ponto de Mar';
    } else document.title = 'Ponto de Mar';
  }

  /* ---------- ações ---------- */
  function achar(id) { return lista().find(t => t.id === id); }

  function acao(e) {
    const b = e.target.closest('button');
    if (!b) return;
    const d = b.dataset;
    if (d.ligar) { ligar(achar(d.ligar)); L.salvar('cronometro'); }
    if (d.pausar) { pausar(achar(d.pausar)); L.salvar('cronometro'); L.toast('Pausado e salvo ⏸'); }
    if (d.terminar) {
      const t = achar(d.terminar);
      pausar(t);
      t.terminado = true;
      L.salvar('cronometro');
      levarParaPreco(t);
    }
    if (d.preco) levarParaPreco(achar(d.preco));
    if (d.ajustar) {
      const t = achar(d.ajustar);
      const atual = horasMin(seg(t));
      const r = prompt(`Quanto tempo você trabalhou em "${t.nome}"?\nEscreva horas e minutos. Ex.: 2:30 (2 horas e 30 minutos)`, atual.horas + ':' + String(atual.minutos).padStart(2, '0'));
      if (r === null) return;
      const m = r.trim().match(/^(\d+)\s*[:hH]?\s*(\d*)/);
      if (!m) { alert('Não entendi. Escreva assim: 2:30'); return; }
      const novo = (+m[1]) * 3600 + (+(m[2] || 0)) * 60;
      t.segundos = novo;
      if (t.inicio) t.inicio = Date.now();
      L.salvar('cronometro');
    }
    if (d.apagar) {
      const t = achar(d.apagar);
      if (!confirm(`Apagar o cronômetro de "${t.nome}"?`)) return;
      L.dados.trabalhos = lista().filter(x => x !== t);
      L.salvar('cronometro');
    }
  }

  function levarParaPreco(t) {
    const { horas, minutos } = horasMin(seg(t));
    if (!window.Precificacao) return;
    window.Precificacao.usarTempo({ nome: t.nome, horas, minutos, produtoId: t.produtoId });
    L.toast(`${textoHM(seg(t))} de trabalho colocados na calculadora ✔`);
  }

  box.addEventListener('click', acao);
  flut.addEventListener('click', acao);
  box.addEventListener('submit', e => {
    e.preventDefault();
    const inp = box.querySelector('#cr-nome');
    const nome = inp.value.trim();
    if (!nome) { inp.focus(); inp.placeholder = 'Escreva um nome para o trabalho 🙂'; return; }
    const prod = L.dados.produtos.find(p => p.nome.toLowerCase() === nome.toLowerCase());
    const t = { id: L.id(), nome, produtoId: prod ? prod.id : null, segundos: 0, inicio: null, terminado: false, criado: L.hoje() };
    lista().push(t);
    ligar(t);
    L.salvar('cronometro');
    L.toast('Cronômetro ligado! Bom trabalho 🧶');
  });

  setInterval(tique, 1000);
  render();
  L.aoMudar(origem => {
    // não redesenha enquanto ela digita o nome
    const digitando = document.activeElement && document.activeElement.id === 'cr-nome';
    if (digitando && origem !== 'cronometro') { tique(); return; }
    const valor = digitando ? document.activeElement.value : null;
    render();
    if (valor !== null && origem !== 'cronometro') { const i = box.querySelector('#cr-nome'); i.value = valor; i.focus(); }
  });
})();
