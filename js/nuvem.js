/* ============================================================
   NUVEM (Firebase)
   - Entra com a conta Google da loja.
   - Cada mudança é guardada neste computador E enviada para a nuvem.
   - Em outro computador, é só entrar com a mesma conta.
   Firestore: usuarios/{uid}/partes/geral   → tudo, menos as receitas
              usuarios/{uid}/partes/r_{id}  → uma receita (com foto) por documento
   ============================================================ */
const Nuvem = (() => {
  const L = Loja;
  const cfg = window.FIREBASE_CONFIG || {};
  const PEND = 'croche-nuvem-pendente';   // '1' = há mudanças que ainda não subiram
  const btn = document.getElementById('btn-nuvem');
  if (!btn) return {};

  const temSdk = typeof firebase !== 'undefined';
  if (!cfg.apiKey) { btn.hidden = true; return {}; }
  btn.hidden = false;

  let auth = null, db = null, usuario = null;
  let ultimo = {};          // o que já está na nuvem: chave → json
  let timer = null, enviando = false, denovo = false, pronto = false;

  if (temSdk) {
    firebase.initializeApp(cfg);
    auth = firebase.auth();
    db = firebase.firestore();
  }

  /* ---------- botão do topo ---------- */
  function mostrar(estado) {
    const t = {
      sair: ['☁️ Entrar', 'Entre com a conta Google da loja para guardar tudo na nuvem'],
      carregando: ['☁️ Abrindo…', 'Buscando seus dados na nuvem'],
      pendente: ['☁️ Salvando…', 'Mandando as mudanças para a nuvem'],
      ok: ['☁️ Salvo', 'Tudo guardado na nuvem' + (usuario ? ' (' + usuario.email + ')' : '') + '. Clique para sair.'],
      erro: ['⚠️ Nuvem', 'Não consegui mandar para a nuvem (sem internet?). Está salvo neste computador e vou tentar de novo.']
    }[estado];
    btn.textContent = t[0];
    btn.title = t[1];
    btn.className = 'btn-sec nuvem-' + estado;
  }

  /* ---------- dividir os dados em partes ---------- */
  function partes(d) {
    const { receitas, receitasOrdem, ...geral } = d;
    const lista = receitas || [];
    geral.receitasOrdem = lista.map(r => r.id);
    const p = { geral: JSON.stringify(geral) };
    lista.forEach(r => { p['r_' + r.id] = JSON.stringify(r); });
    return p;
  }

  function juntar(nuvem) {
    const d = JSON.parse(nuvem.geral);
    const ordem = d.receitasOrdem || [];
    delete d.receitasOrdem;
    const recs = Object.keys(nuvem).filter(k => k.startsWith('r_')).map(k => JSON.parse(nuvem[k]));
    recs.sort((a, b) => {
      const ia = ordem.indexOf(a.id), ib = ordem.indexOf(b.id);
      return (ia < 0 ? 1e9 : ia) - (ib < 0 ? 1e9 : ib);
    });
    d.receitas = recs;
    return d;
  }

  function mesmasPartes(a, b) {
    const ka = Object.keys(a), kb = Object.keys(b);
    return ka.length === kb.length && ka.every(k => a[k] === b[k]);
  }

  function colecao() { return db.collection('usuarios').doc(usuario.uid).collection('partes'); }

  /* ---------- enviar ---------- */
  async function enviar() {
    if (!usuario || !pronto) return;
    if (enviando) { denovo = true; return; }
    enviando = true;
    const atual = partes(L.dados);
    const col = colecao();
    const ops = [];
    for (const k in atual) if (atual[k] !== ultimo[k]) ops.push({ k, json: atual[k] });
    for (const k in ultimo) if (!(k in atual)) ops.push({ k, apagar: true });
    try {
      // manda em lotes pequenos (as fotos das receitas podem ser grandes)
      let lote = db.batch(), feitos = [], tam = 0;
      const fechar = async () => {
        if (!feitos.length) return;
        await lote.commit();
        feitos.forEach(o => { if (o.apagar) delete ultimo[o.k]; else ultimo[o.k] = o.json; });
        lote = db.batch(); feitos = []; tam = 0;
      };
      for (const o of ops) {
        const t = o.apagar ? 0 : o.json.length;
        if (feitos.length && (tam + t > 3500000 || feitos.length >= 400)) await fechar();
        if (o.apagar) lote.delete(col.doc(o.k));
        else lote.set(col.doc(o.k), { json: o.json, em: firebase.firestore.FieldValue.serverTimestamp() });
        feitos.push(o); tam += t;
      }
      await fechar();
      if (!denovo) localStorage.removeItem(PEND);
      mostrar('ok');
    } catch (e) {
      console.error('Nuvem:', e);
      mostrar('erro');
      clearTimeout(timer);
      timer = setTimeout(enviar, 30000);
    } finally {
      enviando = false;
      if (denovo) { denovo = false; enviar(); }
    }
  }

  /* ---------- baixar ---------- */
  async function lerNuvem() {
    const snap = await colecao().get();
    const n = {};
    snap.forEach(doc => { n[doc.id] = doc.data().json; });
    return n;
  }

  function temAlgo(d) {
    return d.materiais.length + d.produtos.length + d.lancamentos.length + d.receitas.length + d.pessoal.lancamentos.length > 0;
  }

  async function sincronizarAoEntrar() {
    pronto = false;
    mostrar('carregando');
    try {
      const nuvem = await lerNuvem();
      const local = partes(L.dados);
      if (!nuvem.geral) {
        // nuvem vazia: primeira vez → sobe o que tem neste computador
        ultimo = {};
        pronto = true;
        await enviar();
        if (temAlgo(L.dados)) L.toast('Seus dados foram guardados na nuvem ☁️');
        return;
      }
      ultimo = nuvem;
      if (!mesmasPartes(nuvem, local) && localStorage.getItem(PEND) === '1' && temAlgo(L.dados)) {
        const ficarLocal = confirm(
          'Este computador tem mudanças que ainda não foram para a nuvem.\n\n' +
          'OK = ficar com os dados DESTE computador (e mandar para a nuvem)\n' +
          'Cancelar = usar os dados da NUVEM'
        );
        if (ficarLocal) { pronto = true; await enviar(); return; }
        L.exportar(); // por garantia, baixa uma cópia do que estava aqui
      }
      L.substituir(juntar(nuvem), 'nuvem');
      localStorage.removeItem(PEND);
      pronto = true;
      mostrar('ok');
    } catch (e) {
      console.error('Nuvem:', e);
      mostrar('erro');
      L.toast('Não consegui abrir a nuvem. Seus dados deste computador continuam aqui.');
      setTimeout(() => { if (usuario && !pronto) sincronizarAoEntrar(); }, 30000);
    }
  }

  // voltou para a aba depois de usar em outro computador? busca o que mudou
  async function atualizarSeMudou() {
    if (!usuario || !pronto || enviando || localStorage.getItem(PEND) === '1') return;
    try {
      const nuvem = await lerNuvem();
      if (nuvem.geral && !mesmasPartes(nuvem, ultimo)) {
        ultimo = nuvem;
        L.substituir(juntar(nuvem), 'nuvem');
        L.toast('Atualizei com o que você mudou no outro computador ☁️');
      }
    } catch (e) { console.error('Nuvem:', e); }
  }

  /* ---------- eventos ---------- */
  L.aoMudar(origem => {
    if (origem === 'nuvem') return;
    localStorage.setItem(PEND, '1');
    if (!usuario || !pronto) return;
    mostrar('pendente');
    clearTimeout(timer);
    timer = setTimeout(enviar, 1500);
  });

  btn.addEventListener('click', async () => {
    if (!temSdk) { alert('Para usar a nuvem, o computador precisa estar com internet.'); return; }
    if (location.protocol === 'file:') {
      alert('Para entrar na nuvem, abra a lojinha pelo endereço do site (o link do Firebase), e não pelo arquivo do computador.');
      return;
    }
    if (usuario) {
      if (localStorage.getItem(PEND) === '1') await enviar();
      if (confirm('Você está conectada como ' + usuario.email + '.\n\nQuer sair da nuvem neste computador?')) auth.signOut();
      return;
    }
    try {
      await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
    } catch (e) {
      if (e.code !== 'auth/popup-closed-by-user' && e.code !== 'auth/cancelled-popup-request') {
        console.error(e);
        alert('Não consegui entrar: ' + (e.message || e.code));
      }
    }
  });

  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') atualizarSeMudou(); });

  window.addEventListener('beforeunload', e => {
    if (usuario && (enviando || localStorage.getItem(PEND) === '1')) { e.preventDefault(); e.returnValue = ''; }
  });

  if (temSdk) {
    auth.onAuthStateChanged(u => {
      usuario = u;
      if (u) sincronizarAoEntrar();
      else { pronto = false; ultimo = {}; mostrar('sair'); }
    });
  } else {
    mostrar('sair');
  }

  return { enviar };
})();
