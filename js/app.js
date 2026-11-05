/* ============================================================
   APP — troca de abas, tela de Início e backup
   ============================================================ */
(function () {
  const L = Loja;
  const botoes = document.querySelectorAll('nav [data-aba]');

  function abrir(aba) {
    if (!document.getElementById('aba-' + aba)) aba = 'inicio';
    botoes.forEach(b => b.classList.toggle('ativa', b.dataset.aba === aba));
    document.querySelectorAll('.aba').forEach(s => s.classList.toggle('ativa', s.id === 'aba-' + aba));
    try { localStorage.setItem('croche-aba', aba); } catch (e) { /* sem problema */ }
    window.scrollTo(0, 0);
  }

  botoes.forEach(b => b.addEventListener('click', () => abrir(b.dataset.aba)));
  document.addEventListener('click', e => {
    const l = e.target.closest('[data-ir]');
    if (!l) return;
    e.preventDefault();
    if (l.dataset.ir === 'backup') L.exportar();
    else abrir(l.dataset.ir);
  });

  /* ---------- backup ---------- */
  const inp = document.getElementById('inp-importar');
  document.getElementById('btn-backup').addEventListener('click', () => L.exportar());
  document.getElementById('btn-importar').addEventListener('click', () => inp.click());
  inp.addEventListener('change', () => {
    const f = inp.files[0];
    inp.value = '';
    if (!f) return;
    if (!confirm('Isso vai SUBSTITUIR todos os dados atuais pelos do arquivo de backup. Continuar?')) return;
    L.importar(f)
      .then(() => { alert('Backup restaurado! ✔'); location.reload(); })
      .catch(err => alert('Não deu certo: ' + err.message));
  });

  /* ---------- ícone da marca (guardado nos dados, vai junto para a nuvem) ---------- */
  const EMOJI_ICONE = document.getElementById('favicon').href;
  function aplicarLogo() {
    const logo = L.dados.config.logo;
    const img = document.getElementById('marca-logo');
    img.hidden = !logo;
    if (logo) img.src = logo;
    document.getElementById('marca-emoji').hidden = !!logo;
    document.getElementById('favicon').href = logo || EMOJI_ICONE;
  }
  const inpLogo = document.getElementById('inp-logo');
  document.getElementById('marca').addEventListener('click', () => {
    if (L.dados.config.logo && confirm('Quer tirar o ícone da marca?\n\nOK = tirar · Cancelar = escolher outra imagem')) {
      L.dados.config.logo = ''; L.salvar('logo'); return;
    }
    inpLogo.click();
  });
  inpLogo.addEventListener('change', () => {
    const f = inpLogo.files[0];
    inpLogo.value = '';
    if (!f) return;
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.onload = () => {
      // recorta no meio em quadrado e reduz para 128 px (leve e funciona como ícone)
      const lado = Math.min(img.width, img.height), T = 128;
      const c = document.createElement('canvas');
      c.width = c.height = T;
      c.getContext('2d').drawImage(img, (img.width - lado) / 2, (img.height - lado) / 2, lado, lado, 0, 0, T, T);
      L.dados.config.logo = c.toDataURL('image/png');
      URL.revokeObjectURL(url);
      L.salvar('logo');
      L.toast('Ícone da marca colocado! ✨');
    };
    img.onerror = () => { URL.revokeObjectURL(url); alert('Não consegui abrir essa imagem. Tente um arquivo PNG ou JPG.'); };
    img.src = url;
  });
  L.aoMudar(aplicarLogo);
  aplicarLogo();

  /* ---------- Início ---------- */
  function renderInicio() {
    const d = L.dados, vh = L.valorHora();
    const mes = L.hoje().slice(0, 7);
    const lm = d.lancamentos.filter(l => (l.data || '').slice(0, 7) === mes);
    const soma = t => lm.filter(l => l.tipo === t).reduce((s, l) => s + L.num(l.valor), 0);
    const ent = soma('entrada'), sai = soma('saida');

    const passos = [
      [vh > 0, 'Defina quanto vale a sua hora', 'financeiro'],
      [d.pessoal.lancamentos.length > 0 || d.pessoal.metas.length > 0, 'Em "Meu dinheiro", anote um gasto ou crie um objetivo', 'pessoal'],
      [d.materiais.length > 0, 'Cadastre seus materiais e onde comprou', 'materiais'],
      [d.produtos.length > 0, 'Calcule o preço de uma peça e salve', 'precos'],
      [d.lancamentos.length > 0, 'Anote uma venda ou um gasto', 'financeiro'],
      [d.receitas.length > 0, 'Guarde sua primeira receita', 'receitas'],
      [!!d.config.ultimoBackup, 'Faça um backup dos seus dados', 'backup']
    ];
    const feitos = passos.filter(p => p[0]).length;

    let avisoBackup = '';
    const ub = d.config.ultimoBackup ? new Date(d.config.ultimoBackup) : null;
    const temDados = d.lancamentos.length || d.receitas.length || d.produtos.length;
    if (temDados && (!ub || (Date.now() - ub) / 86400000 > 7)) {
      avisoBackup = `<div class="aviso">💾 ${ub ? 'Seu último backup foi há mais de uma semana.' : 'Você ainda não fez nenhum backup.'}
        <a href="#" data-ir="backup">Fazer backup agora</a> — se o navegador for limpo, é ele que salva seus dados.</div>`;
    }

    document.getElementById('aba-inicio').innerHTML = `
      <div class="hero">
        <h1>Boas-vindas à sua lojinha 🧶</h1>
        <p>Aqui você calcula preços, controla o dinheiro e guarda suas receitas — tudo no seu computador, sem internet.</p>
      </div>
      ${avisoBackup}
      <div class="resumo inicio-cards">
        <a href="#" data-ir="financeiro" class="cartao-num verde"><span>⏰ Sua hora vale</span><strong>${vh > 0 ? L.moeda(vh) : '—'}</strong><small>${vh > 0 ? 'definido em Finanças da loja' : 'clique para definir'}</small></a>
        <a href="#" data-ir="financeiro" class="cartao-num"><span>💰 A loja recebeu este mês</span><strong>${L.moeda(ent)}</strong><small>saiu ${L.moeda(sai)}</small></a>
        <a href="#" data-ir="pessoal" class="cartao-num azul"><span>🐷 Você já guardou</span><strong>${L.moeda(d.pessoal.lancamentos.filter(l => l.tipo === 'guardar').reduce((s, l) => s + L.num(l.valor), 0))}</strong><small>no seu dinheiro pessoal</small></a>
        <a href="#" data-ir="precos" class="cartao-num"><span>💲 Peças com preço</span><strong>${d.produtos.length}</strong><small>${d.materiais.filter(m => m.status !== 'tenho').length} materiais para comprar</small></a>
        <a href="#" data-ir="receitas" class="cartao-num"><span>📒 Receitas guardadas</span><strong>${d.receitas.length}</strong><small>${d.receitas.filter(r => r.favorita).length} favoritas</small></a>
      </div>
      <div class="grade-2">
        <div class="cartao">
          <h2>Primeiros passos <small class="ajuda">${feitos} de ${passos.length}</small></h2>
          <div class="progresso"><span style="width:${feitos / passos.length * 100}%"></span></div>
          <ul class="passos-lista">
            ${passos.map(([ok, txt, ir], i) => `<li class="${ok ? 'feito' : ''}">
              <span class="check">${ok ? '✓' : i + 1}</span>
              <span class="txt">${txt}</span>
              ${ok ? '' : `<a href="#" data-ir="${ir}" class="btn-link">fazer</a>`}
            </li>`).join('')}
          </ul>
        </div>
        <div class="cartao">
          <h2>💡 Dicas para começar</h2>
          <ul class="dicas">
            <li><b>Separe o dinheiro da loja do seu.</b> Mesmo que seja uma conta ou um envelope diferente.</li>
            <li><b>Seu tempo vale dinheiro.</b> Se uma bolsa leva 5 horas, essas 5 horas entram no preço.</li>
            <li><b>Anote tudo, até o pequeno.</b> Um novelo aqui, uma embalagem ali… no fim do mês faz diferença.</li>
            <li><b>Tire seu salário pela regra</b> (aba Finanças da loja), não "quando sobra". Ele aparece sozinho em "Meu dinheiro".</li>
            <li><b>Guarde um pouquinho todo mês.</b> A reserva salva nos meses de pouca venda.</li>
            <li><b>Faça backup toda semana</b> no botão 💾 lá em cima. Guarde o arquivo num pen drive ou no e-mail.</li>
          </ul>
        </div>
      </div>`;
  }

  L.aoMudar(renderInicio);
  renderInicio();

  let ini = 'inicio';
  try { ini = localStorage.getItem('croche-aba') || 'inicio'; } catch (e) { /* sem problema */ }
  abrir(ini);
})();
