/* ============================================================
   DADOS DA LOJA
   Tudo fica guardado no navegador deste computador (localStorage).
   Use o botão "Fazer backup" para salvar uma cópia em arquivo.
   ============================================================ */
const Loja = (() => {
  const CHAVE = 'croche-loja-v1';
  const ouvintes = [];

  function padrao() {
    return {
      // valorHora: quanto cobrar por hora de crochê (digitado direto)
      // usarFixos: contas fixas só entram nas contas quando a dona ativar; horasMes só serve para dividir essas contas
      config: { valorHora: 0, usarFixos: false, horasMes: 0, margem: 30, taxaVenda: 0, ultimoBackup: null, logo: '' },
      gastosFixos: [],   // { id, nome, valor }
      materiais: [],     // { id, nome, preco, quantidade, unidade: 'g'|'m'|'un', categoria, marca, cor, corHex, tamanho, acabamento, status: 'tenho'|'acabando'|'acabou', notas, compras:[{id, loja, preco, quantidade, data}] }
      produtos: [],      // { id, nome, categoria, horas, minutos, itens:[{materialId,qtd}], extras, margem, taxa, precoSalvo, atualizado }
      trabalhos: [],     // cronômetro: { id, nome, produtoId, segundos, inicio: ms|null (ligado desde), terminado, criado }
      lancamentos: [],   // { id, tipo: 'entrada'|'saida', data: 'AAAA-MM-DD', descricao, categoria, valor }
      divisao: { material: 35, salario: 40, reserva: 15, investir: 10 },
      agenda: [],        // { id, data:'AAAA-MM-DD', tipo:'tarefa'|'post', texto, feito, formato, hora, legenda }
      receitas: [],      // { id, titulo, categoria, fio, agulha, tamanho, tempo, materiais, passos, notas, foto, contador, favorita, criada, atualizada }
      pessoal: {         // dinheiro da dona (separado da loja)
        lancamentos: [], // { id, tipo: 'entrada'|'gasto'|'guardar', data, descricao, categoria, valor, metaId? }
        orcamento: { necessidades: 50, desejos: 30, guardar: 20 },
        metas: []        // { id, nome, alvo }
      }
    };
  }

  function mesclar(d) {
    const p = padrao();
    const dp = d.pessoal || {};
    const r = {
      ...p, ...d,
      config: { ...p.config, ...(d.config || {}) },
      divisao: { ...p.divisao, ...(d.divisao || {}) },
      pessoal: { ...p.pessoal, ...dp, orcamento: { ...p.pessoal.orcamento, ...(dp.orcamento || {}) } }
    };
    const c = r.config, dc = d.config || {};
    // dados antigos: valor da hora vinha de "meta mensal ÷ horas"
    if (!(c.valorHora > 0) && dc.metaMensal > 0 && dc.horasMes > 0) c.valorHora = Math.round(dc.metaMensal / dc.horasMes * 100) / 100;
    if (dc.usarFixos === undefined) c.usarFixos = (r.gastosFixos || []).length > 0;
    // materiais antigos ganham os campos novos
    const CAT_ANTIGA = { 'Olhos e aplicações': 'Olhos', 'Argolas e chaveiros': 'Argolas', 'Alças e fechos': 'Alças' };
    r.materiais = (r.materiais || []).map(m => {
      const n = { categoria: 'Linha / fio', marca: '', cor: '', corHex: '', tamanho: '', acabamento: '', status: 'tenho', notas: '', compras: [], ...m };
      if (CAT_ANTIGA[n.categoria]) n.categoria = CAT_ANTIGA[n.categoria];
      return n;
    });
    return r;
  }

  /* ---------- tipos de material (usados em Materiais e Precificação) ---------- */
  const CATS_MAT = ['Linha / fio', 'Enchimento', 'Olhos', 'Focinhos e aplicações', 'Argolas', 'Chaveiros e mosquetões', 'Alças', 'Fechos, zíperes e botões', 'Embalagem', 'Agulhas e ferramentas', 'Outro'];
  const ICONE_MAT = {
    'Linha / fio': '🧶', 'Enchimento': '☁️', 'Olhos': '👀', 'Focinhos e aplicações': '🎀', 'Argolas': '⭕',
    'Chaveiros e mosquetões': '🔑', 'Alças': '👜', 'Fechos, zíperes e botões': '🔘', 'Embalagem': '📦', 'Agulhas e ferramentas': '🪡', 'Outro': '✨'
  };
  const UNID_TXT = { g: 'g', m: 'm', un: 'un.' };
  function nomeMaterial(m) {
    const extra = [m.tamanho, m.acabamento, m.cor].filter(Boolean).join(' · ');
    return m.nome + (extra ? ' — ' + extra : '');
  }

  function carregar() {
    try {
      const txt = localStorage.getItem(CHAVE);
      return txt ? mesclar(JSON.parse(txt)) : padrao();
    } catch (e) {
      console.error(e);
      return padrao();
    }
  }

  let dados = carregar();

  function salvar(origem) {
    try {
      localStorage.setItem(CHAVE, JSON.stringify(dados));
    } catch (e) {
      alert('Não consegui salvar! O espaço do navegador pode estar cheio (muitas fotos?). Faça um backup e apague algumas fotos.');
    }
    ouvintes.forEach(fn => { try { fn(origem); } catch (e) { console.error(e); } });
  }

  function aoMudar(fn) { ouvintes.push(fn); }

  function id() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  const fmtMoeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  function moeda(v) { return fmtMoeda.format(Number.isFinite(v) ? v : 0); }

  // Aceita "12,50", "1.234,50", "12.5" ou número
  function num(v) {
    if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
    let s = String(v ?? '').trim();
    if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : 0;
  }

  function totalFixos() { return dados.gastosFixos.reduce((s, g) => s + num(g.valor), 0); }
  function fixosMes() { return dados.config.usarFixos ? totalFixos() : 0; }
  function valorHora() { return num(dados.config.valorHora); }
  function custoFixoHora() { const h = num(dados.config.horasMes); return dados.config.usarFixos && h > 0 ? totalFixos() / h : 0; }

  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function hoje() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function toast(msg) {
    let t = document.getElementById('toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
    t.textContent = msg;
    t.classList.add('mostrar');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove('mostrar'), 2200);
  }

  function exportar() {
    dados.config.ultimoBackup = new Date().toISOString();
    salvar('backup');
    const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'backup-lojinha-croche-' + hoje() + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast('Backup baixado! Guarde o arquivo num lugar seguro 💾');
  }

  function importar(arquivo) {
    return arquivo.text().then(txt => {
      const d = JSON.parse(txt);
      if (!d || typeof d !== 'object' || !('config' in d)) throw new Error('Esse arquivo não parece um backup da lojinha.');
      substituir(d, 'importar');
    });
  }

  // troca todos os dados de uma vez (usado ao restaurar backup e ao baixar da nuvem)
  function substituir(d, origem) {
    dados = mesclar(d);
    salvar(origem);
  }

  return {
    get dados() { return dados; },
    salvar, aoMudar, id, moeda, num, totalFixos, fixosMes, valorHora, custoFixoHora,
    esc, hoje, toast, exportar, importar, substituir,
    CATS_MAT, ICONE_MAT, UNID_TXT, nomeMaterial
  };
})();
