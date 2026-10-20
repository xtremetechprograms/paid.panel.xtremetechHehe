  // ---------------------------------------------------------------
  // 1. PASTE YOUR FIREBASE CONFIG HERE (from Firebase Console >
  //    Project settings > General > Your apps > SDK setup).
  // ---------------------------------------------------------------
  const firebaseConfig = {
    apiKey: "AIzaSyCEHipTNO4izq6K15GG4OXpzFpau9kTNmQ",
    authDomain: "xtremetech-f9434.firebaseapp.com",
    projectId: "xtremetech-f9434",
    storageBucket: "xtremetech-f9434.firebasestorage.app",
    messagingSenderId: "43655532067",
    appId: "1:43655532067:web:f3403587eda5ad74e52b96"
  };

  firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth();
  const db = firebase.firestore();


  // ---------------------------------------------------------------
  // View switching: login form <-> normal user screen <-> admin panel
  // ---------------------------------------------------------------
  const mainStack = document.querySelector('.main-stack');
  const adminBrand = document.getElementById('adminBrand');
  const loginView = document.getElementById('loginView');
  const loggedInView = document.getElementById('loggedInView');
  const adminView = document.getElementById('adminView');
  const adminSidebar = document.getElementById('adminSidebar');
  const serverList = document.getElementById('serverList');
  const bootEl = document.getElementById('bootLoader');
  const bootText = document.getElementById('bootText');
  const showBoot = () => bootEl.classList.remove('hide');
  const hideBoot = () => bootEl.classList.add('hide');
  setTimeout(() => { if(!bootEl.classList.contains('hide')) bootText.textContent = 'Still connecting…'; }, 12000);
  const roleGet = uid => { try{ return localStorage.getItem('xtRole_' + uid); }catch(e){ return null; } };
  const roleSet = (uid, r) => { try{ localStorage.setItem('xtRole_' + uid, r); }catch(e){} };

  const LOGIN_BG = "https://raw.githubusercontent.com/xtremetechprograms/IMAGES/main/LOGIN.png";
  const ADMIN_BG = "https://raw.githubusercontent.com/xtremetechprograms/IMAGES/main/XtremeTechWebsiteBackground.png";

  // Where notify_login.py is running. Change this if you host it
  // somewhere other than your own machine on port 5000.
  let API_BASE = window.API_BASE || (() => { try{ return localStorage.getItem('xtApiBase') || ''; }catch(e){ return ''; } })() || "http://localhost:5000";
  let WS_BASE = API_BASE.replace(/^http/, "ws");
  let BACKEND_URL = `${API_BASE}/notify`;
  function setApiBase(u){
    API_BASE = String(u).trim().replace(/\/+$/, '');
    WS_BASE = API_BASE.replace(/^http/, "ws");
    BACKEND_URL = `${API_BASE}/notify`;
    try{ localStorage.setItem('xtApiBase', API_BASE); }catch(e){}
  }
  if(!window.API_BASE){
    db.collection('config').doc('backend').get().then(s => {
      const u = s.exists ? String(s.data().url || '') : '';
      if(/^https?:\/\//.test(u)) setApiBase(u);
    }).catch(() => {});
    db.collection('config').doc('backend').onSnapshot(s => {
      const u = s.exists ? String(s.data().url || '') : '';
      if(/^https?:\/\//.test(u) && u.replace(/\/+$/, '') !== API_BASE) setApiBase(u);
    }, () => {});
  }
  (function(){
    const nativeFetch = window.fetch.bind(window);
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    async function freshBase(){
      try{
        const s = await db.collection('config').doc('backend').get({ source:'server' });
        const u = s.exists ? String(s.data().url || '').trim().replace(/\/+$/, '') : '';
        if(/^https?:\/\//.test(u)) return u;
      }catch(e){}
      return '';
    }
    window.fetch = async function(input, init){
      const url = typeof input === 'string' ? input : (input && input.url) || '';
      const base = API_BASE;
      if(window.API_BASE || !url.startsWith(base + '/')) return nativeFetch(input, init);
      const path = url.slice(base.length);
      let last;
      for(let i = 0; i < 4; i++){
        const cur = i === 0 ? url : API_BASE + path;
        try{
          return await nativeFetch(cur, init);
        }catch(e){
          if(e && e.name === 'AbortError') throw e;
          last = e;
          if(i === 3) break;
          await sleep(i === 0 ? 800 : 2500);
          const u = await freshBase();
          if(u && u !== API_BASE) setApiBase(u);
        }
      }
      throw last;
    };
  })();

  function setBackground(url){
    document.body.style.backgroundImage = `url('${url}')`;
  }

  const XT_BG = { has:false, useDefault:true, url:'', size:0, quotaMb:500, loaded:false };

  function xtBgSave(){
    try{
      const u = auth.currentUser;
      if(u) localStorage.setItem('xtBg', JSON.stringify({ uid:u.uid, has:XT_BG.has, useDefault:XT_BG.useDefault, url:XT_BG.url }));
    }catch(e){}
  }

  function xtBgCache(){
    if(XT_BG.loaded) return;
    try{
      const c = JSON.parse(localStorage.getItem('xtBg') || 'null');
      const u = auth.currentUser;
      if(c && u && c.uid === u.uid){ XT_BG.has = !!c.has; XT_BG.useDefault = c.useDefault !== false; XT_BG.url = c.url || ''; }
    }catch(e){}
  }

  function xtApplyBg(preview){
    const b = document.body;
    const admin = b.classList.contains('role-admin');
    if(!admin && !b.classList.contains('role-user')) return;
    xtBgCache();
    const saved = XT_BG.has && !XT_BG.useDefault && XT_BG.url ? API_BASE + XT_BG.url : '';
    const src = preview || saved;
    if(src){ hideVideoBackground(); setBackground(src); }
    else if(admin){ hideVideoBackground(); setBackground(ADMIN_BG); }
    else{ showVideoBackground(); }
  }

  const loggedInVideoBg = document.getElementById('loggedInVideoBg');

  const videoMuteToggle = document.getElementById('videoMuteToggle');

  function showVideoBackground(){
    loggedInVideoBg.classList.add('show');
    videoMuteToggle.classList.add('show');
    loggedInVideoBg.play().catch(() => {
      // Autoplay can be blocked by the browser in rare cases -- the
      // static background image behind it is still there as a fallback.
    });
  }

  function hideVideoBackground(){
    loggedInVideoBg.classList.remove('show');
    videoMuteToggle.classList.remove('show');
    loggedInVideoBg.pause();
  }

  videoMuteToggle.addEventListener('click', () => {
    // Browsers only allow enabling audio in direct response to a real
    // click like this one -- it can't be turned on automatically.
    loggedInVideoBg.muted = !loggedInVideoBg.muted;
    videoMuteToggle.classList.toggle('is-unmuted', !loggedInVideoBg.muted);
    videoMuteToggle.title = loggedInVideoBg.muted ? 'Unmute' : 'Mute';
  });

  function showLoginForm(){
    loginView.style.display = '';
    loggedInView.classList.remove('show');
    adminView.style.display = 'none';
    mainStack.style.display = '';
    mainStack.classList.remove('admin-wide');
    adminBrand.classList.remove('show');
    adminSidebar.classList.remove('show');
    serverList.classList.remove('show');
    document.body.classList.remove('admin-mode', 'role-admin', 'role-user', 'acct-mode', 'gear-open');
    stopServerListener();
    hideVideoBackground();
    setBackground(LOGIN_BG);
    XT_BG.has = false; XT_BG.useDefault = true; XT_BG.url = ''; XT_BG.loaded = false;
  }

  function showLoggedIn(){
    loginView.style.display = 'none';
    loggedInView.classList.remove('show'); // the old plain box is retired in favor of the shared panel below
    adminView.style.display = 'none';
    mainStack.style.display = 'none';
    adminBrand.classList.add('show');
    adminSidebar.classList.add('show');
    serverList.classList.remove('show');
    document.body.classList.remove('admin-mode', 'role-admin');
    document.body.classList.add('role-user'); // CSS hides the admin-only sidebar buttons for this role
    showVideoBackground();
    xtApplyBg();
  }

  function showAdminPanel(){
    loginView.style.display = 'none';
    loggedInView.classList.remove('show');
    adminView.style.display = 'none';
    mainStack.style.display = 'none';
    adminBrand.classList.add('show');
    adminSidebar.classList.add('show');
    serverList.classList.add('show');
    document.body.classList.remove('role-user');
    document.body.classList.add('admin-mode', 'role-admin');
    hideVideoBackground();
    setBackground(ADMIN_BG);
    xtApplyBg();
    attachAdminServerListener();
  }

  // Tells the backend someone logged in, so it can (a) email the
  // admin about it and (b) tell the page whether this was the admin
  // account. Nothing here blocks login itself -- if the backend is
  // offline, the person still gets the normal logged-in view, just
  // never the admin panel (fails safe, not open).
  async function checkAdminAndRoute(user){
    loginView.style.display = 'none';
    mainStack.style.display = 'none';
    adminBrand.classList.remove('show');
    adminSidebar.classList.remove('show');
    serverList.classList.remove('show');

    const cached = roleGet(user.uid);
    const verify = (async () => {
      try{
        const idToken = await user.getIdToken();
        const res = await fetch(BACKEND_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken })
        });
        const data = await res.json();
        return data.ok ? (data.is_admin ? 'admin' : 'user') : null;
      }catch(err){
        return null;
      }
    })();

    if(cached === 'admin'){
      showAdminPanel();
      hideBoot();
      const v = await verify;
      if(v) roleSet(user.uid, v);
      if(v === 'user' && auth.currentUser === user) await attachOwnerServerListener(user.email);
      return;
    }

    if(cached === 'user'){
      const owner = attachOwnerServerListener(user.email);
      verify.then(v => { if(v) roleSet(user.uid, v); });
      await owner;
      hideBoot();
      return;
    }

    const v = await verify;
    if(v) roleSet(user.uid, v);
    if(v === 'admin') showAdminPanel();
    else await attachOwnerServerListener(user.email);
    hideBoot();
  }

  auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(() => {});

  // Runs on page load, and again whenever auth state changes (login/logout).
  let authResolved = false;
  setTimeout(() => { if(!authResolved) hideBoot(); }, 8000);
  auth.onAuthStateChanged((user) => {
    authResolved = true;
    if(user){
      showBoot();
      checkAdminAndRoute(user);
    }else{
      showLoginForm();
      hideBoot();
    }
  });

  document.getElementById('signOutBtn').addEventListener('click', () => {
    auth.signOut();
  });

  // Sidebar nav (admin panel only)
  document.getElementById('navLogout').addEventListener('click', () => {
    auth.signOut();
  });

  document.getElementById('navHome').addEventListener('click', () => {
    hideAllScreens();
    document.getElementById('navAddServer').style.display = '';
    document.getElementById('navRemoveServer').style.display = '';
    document.getElementById('navManageServers').style.display = '';
    // Show the server list panel again regardless of role -- both the
    // admin's live listener and attachOwnerServerListener() already
    // populated it once on login, this just needs to reveal it.
    serverList.classList.add('show');
    // Home doesn't open anything -- it just clears whatever popup/panel
    // might currently be open, back to the plain dashboard view.
    document.querySelectorAll('.server-context-btn').forEach(el => el.classList.remove('ctx-visible'));
    closeAddServerModal();
    closeRemoveServerModal();
    closeManageServersModal();
        closeConfirmDelete();
    closeConfirmRemoveUser();
  });

  document.getElementById('btnDiscord').addEventListener('click', () => {
    window.open('https://discord.gg/T6bjwg8KDZ', '_blank', 'noopener,noreferrer');
  });


  // ---------------------------------------------------------------
  // Add Server modal
  // ---------------------------------------------------------------
  const addServerOverlay = document.getElementById('addServerOverlay');
  const addServerForm = document.getElementById('addServerForm');

  const SERVER_KINDS = {
    minecraft: { type: 'dedicated', label: 'Minecraft Server' },
    discord: { type: 'dedicated', label: 'Discord Bots' },
    database: { type: 'dedicated', label: 'Database' },
    cloud_storage: { type: 'cloud', label: 'Cloud Storage' }
  };
  let pendingCategory = 'minecraft';

  function openAddServerModal(category){
    if(SERVER_KINDS[category]) pendingCategory = category;
    document.getElementById('addServerSub').textContent = `Fill in the details for the new ${SERVER_KINDS[pendingCategory].label}.`;
    addServerOverlay.classList.add('show');
  }

  function closeAddServerModal(){
    addServerOverlay.classList.remove('show');
  }

  let pendingTypeAction = null; // 'add' or 'remove'

  function openServerTypeSelector(action){
    pendingTypeAction = action;
    document.getElementById('serverTypeOverlay').classList.add('show');
  }

  document.getElementById('serverTypeClose').addEventListener('click', () => {
    document.getElementById('serverTypeOverlay').classList.remove('show');
  });

  document.getElementById('typeVDS').addEventListener('click', () => {
    alert('VDS is not usable yet.');
  });

  document.getElementById('typeVPS').addEventListener('click', () => {
    alert('VPS is not usable yet.');
  });

  document.getElementById('typeDedicated').addEventListener('click', () => {
    document.getElementById('serverTypeOverlay').classList.remove('show');
    if(pendingTypeAction === 'add') document.getElementById('resourceTypeOverlay').classList.add('show');
    if(pendingTypeAction === 'remove') openRemoveServerModal();
  });

  document.getElementById('typeCloud').addEventListener('click', () => {
    document.getElementById('serverTypeOverlay').classList.remove('show');
    if(pendingTypeAction === 'add') openAddServerModal('cloud_storage');
    if(pendingTypeAction === 'remove') openRemoveServerModal();
  });

  document.getElementById('resourceTypeClose').addEventListener('click', () => {
    document.getElementById('resourceTypeOverlay').classList.remove('show');
  });

  document.querySelectorAll('.resource-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('resourceTypeOverlay').classList.remove('show');
      openAddServerModal(btn.dataset.category);
    });
  });

  if(document.getElementById('navAddServer')) document.getElementById('navAddServer').addEventListener('click', () => openServerTypeSelector('add'));
  document.getElementById('addServerClose').addEventListener('click', closeAddServerModal);
  addServerOverlay.addEventListener('click', (e) => {
    if(false && e.target === addServerOverlay) closeAddServerModal();
  });

  // ---------------------------------------------------------------
  // Remove Server modal: pick one from the list, then confirm
  // ---------------------------------------------------------------
  const removeServerOverlay = document.getElementById('removeServerOverlay');
  const removeServerList = document.getElementById('removeServerList');
  const confirmDeleteOverlay = document.getElementById('confirmDeleteOverlay');
  const confirmDeleteName = document.getElementById('confirmDeleteName');

  let pendingDeleteId = null;

  async function openRemoveServerModal(){
    removeServerOverlay.classList.add('show');
    removeServerList.innerHTML = '<p class="server-list-empty">Loading…</p>';
    if(window.xtRemovePanel){ window.xtRemovePanel(); return; }

    try{
      const snapshot = await db.collection('servers').orderBy('createdAt', 'desc').get();
      if(snapshot.empty){
        removeServerList.innerHTML = '<p class="server-list-empty">No servers yet.</p>';
        return;
      }

      removeServerList.innerHTML = '';
      snapshot.forEach((doc) => {
        const s = doc.data();
        const row = document.createElement('div');
        row.className = 'remove-row';
        row.innerHTML = `
          <div class="remove-row-info">
            <div class="remove-row-name">${s.name || 'Unnamed server'}</div>
            <div class="remove-row-meta">Expires ${s.expiry || '—'} · Cost ${s.cost || '—'}</div>
          </div>
          <button type="button" class="remove-row-btn">Remove</button>
        `;
        row.querySelector('.remove-row-btn').addEventListener('click', () => {
          pendingDeleteId = doc.id;
          confirmDeleteName.textContent = s.name || 'Unnamed server';
          confirmDeleteOverlay.classList.add('show');
        });
        removeServerList.appendChild(row);
      });
    }catch(err){
      removeServerList.innerHTML = '<p class="server-list-empty">Could not load servers.</p>';
    }
  }

  function closeRemoveServerModal(){
    removeServerOverlay.classList.remove('show');
  }

  if(document.getElementById('navRemoveServer')) document.getElementById('navRemoveServer').addEventListener('click', () => openServerTypeSelector('remove'));
  document.getElementById('removeServerClose').addEventListener('click', closeRemoveServerModal);
  removeServerOverlay.addEventListener('click', (e) => {
    if(false && e.target === removeServerOverlay) closeRemoveServerModal();
  });

  function closeConfirmDelete(){
    confirmDeleteOverlay.classList.remove('show');
    pendingDeleteId = null;
  }

  document.getElementById('confirmDeleteCancel').addEventListener('click', closeConfirmDelete);
  confirmDeleteOverlay.addEventListener('click', (e) => {
    if(e.target === confirmDeleteOverlay) closeConfirmDelete();
  });

  document.getElementById('confirmDeleteYes').addEventListener('click', async () => {
    if(!pendingDeleteId) return;
    try{
      await db.collection('servers').doc(pendingDeleteId).delete();
      closeConfirmDelete();
      closeRemoveServerModal();
      if(window.xtAfterRemove) window.xtAfterRemove();
      if(manageServersOverlay.classList.contains('show')) openManageServersModal();
      // The persistent list (serverList) updates on its own via the
      // onSnapshot listener already running -- no manual refresh needed.
    }catch(err){
      alert('Could not remove this server: ' + err.message);
    }
  });


  // ---------------------------------------------------------------
  // Manage Servers modal: assign an email to each server. Whoever
  // logs in with that email sees just that one server's card --
  // handled by attachOwnerServerListener() above, once the admin
  // check comes back false for them.
  // ---------------------------------------------------------------
  const manageServersOverlay = document.getElementById('manageServersOverlay');
  const manageServersBoxes = document.getElementById('manageServersBoxes');

  const serverUsersOverlay = document.getElementById('serverUsersOverlay');
  const serverUsersName = document.getElementById('serverUsersName');
  const serverUsersList = document.getElementById('serverUsersList');

  const addUserEmail = document.getElementById('addUserEmail');
  const addUserPassword = document.getElementById('addUserPassword');
  const addUserPasswordConfirm = document.getElementById('addUserPasswordConfirm');
  const addUserCpuLimit = document.getElementById('addUserCpuLimit');
  const addUserRamLimit = document.getElementById('addUserRamLimit');
  const addUserStorageLimit = document.getElementById('addUserStorageLimit');
  const addUserNetworkLimit = document.getElementById('addUserNetworkLimit');
  const addUserFullAccess = document.getElementById('addUserFullAccess');
  const addUserError = document.getElementById('addUserError');
  const addUserSaveBtn = document.getElementById('addUserSaveBtn');

  let pendingServerDocId = null;
  let pendingControlDoc = null;
  let pendingControlCategory = 'discord';

  const PWR_LINE = {
    start: '\u001b[92m[▶] Starting server…\u001b[0m',
    restart: '\u001b[93m[↻] Restarting server…\u001b[0m',
    stop: '\u001b[93m[■] Stopping server…\u001b[0m'
  };

  function termLine(text){
    const out = document.getElementById('terminalOutput');
    if(!out) return;
    const atBottom = out.scrollHeight - out.scrollTop - out.clientHeight < 40;
    out.appendChild(colorizeConsoleLine(text));
    while(out.childNodes.length > 2000) out.removeChild(out.firstChild);
    if(atBottom) out.scrollTop = out.scrollHeight;
  }

  const PWR_ERR = { 401: 'Session expired, sign in again', 403: 'Permission denied', 404: 'Server not found', 409: 'Server is busy, try again in a moment', 422: 'Panel refused the action', 429: 'Too many requests, slow down', 502: 'Panel request failed', 503: 'Host unavailable' };
  const STATE_UI = { running: ['Online', '#4ade80'], starting: ['Starting', '#facc15'], stopping: ['Stopping', '#fb923c'], offline: ['Offline', '#f87171'] };
  let stateHold = 0;
  let burstTimer = null;

  function setState(state, hold){
    const el = document.getElementById('serverState');
    if(!el || !state) return;
    if(hold) stateHold = Date.now() + hold;
    else if(Date.now() < stateHold && (state === 'offline' || state === 'running')) return;
    const ui = STATE_UI[state] || [state, '#9ca3af'];
    el.textContent = '● ' + ui[0];
    el.style.color = ui[1];
    el.dataset.state = state;
  }

  function burstRefresh(){
    clearInterval(burstTimer);
    let n = 0;
    burstTimer = setInterval(() => {
      if(!pendingControlDoc || ++n > 30){ clearInterval(burstTimer); return; }
      refreshTerminal();
    }, 1000);
  }

  async function directPower(signal){
    const store = (k, v) => { try{ if(v === null) localStorage.removeItem(k); else if(v !== undefined) localStorage.setItem(k, v); return localStorage.getItem(k) || ''; }catch(e){ return ''; } };
    let key = store('xtPanelKey');
    if(!key){
      key = (prompt('Backend is offline. Paste your Pterodactyl client API key to control this server directly (saved only in this browser):') || '').trim();
      if(!key) return false;
      store('xtPanelKey', key);
    }
    const snap = await db.collection('servers').doc(pendingControlDoc).get();
    const uuid = snap.exists ? (snap.data().uuid || '') : '';
    if(!uuid) throw new Error('Server UUID not found');
    const base = (store('xtPanelUrl') || 'https://panel.madflex.dpdns.org').replace(/\/+$/, '');
    let res;
    try{
      res = await fetch(base + '/api/client/servers/' + encodeURIComponent(uuid) + '/power', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + key, 'Accept': 'Application/vnd.pterodactyl.v1+json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ signal })
      });
    }catch(e){
      throw new Error('Panel blocked the browser request, start the server from the panel once');
    }
    if(res.status === 401 || res.status === 403){
      store('xtPanelKey', null);
      throw new Error('Panel rejected the API key, it was cleared, try again');
    }
    if(!res.ok) throw new Error('Panel returned HTTP ' + res.status);
    return true;
  }

  async function sendPower(signal, btn){
    if(!pendingControlDoc || btn.dataset.busy) return;
    const cur = (document.getElementById('serverState') || {}).dataset;
    if(signal === 'start' && cur && (cur.state === 'running' || cur.state === 'starting')) return;
    btn.dataset.busy = '1';
    btn.style.opacity = '0.6';
    termLine(PWR_LINE[signal] || '');
    setState(signal === 'stop' || signal === 'kill' ? 'stopping' : 'starting', 6000);
    try{
      const idToken = await auth.currentUser.getIdToken();
      const res = await fetch(`${API_BASE}/server_power`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, docId: pendingControlDoc, signal })
      });
      let data = null;
      try{ data = await res.json(); }catch(e){}
      if(!res.ok || !data || data.ok === false){
        const e = String((data && data.error) || res.status || '');
        const code = /^\d+$/.test(e) ? +e : res.status;
        termLine('\u001b[91m[✖] Power action failed: ' + (PWR_ERR[code] || (/^\d+$/.test(e) ? 'HTTP ' + e : e) || 'unknown error') + '\u001b[0m');
        stateHold = 0;
        refreshTerminal();
      }else{
        if(data.queued) termLine('\u001b[93m[!] ' + data.message + '\u001b[0m');
        burstRefresh();
      }
    }catch(err){
      termLine('\u001b[93m[!] Backend is offline, sending the signal directly to the panel\u001b[0m');
      try{
        const done = await directPower(signal);
        if(done){
          termLine('\u001b[92m[✔] Signal sent directly to the panel\u001b[0m');
          setState(signal === 'stop' || signal === 'kill' ? 'stopping' : 'starting', 8000);
        }else{
          termLine('\u001b[91m[✖] Cannot reach the backend, check your connection\u001b[0m');
          stateHold = 0;
        }
      }catch(e2){
        termLine('\u001b[91m[✖] ' + (e2 && e2.message ? e2.message : 'Direct power failed') + '\u001b[0m');
        stateHold = 0;
      }
    }finally{
      btn.style.opacity = '';
      setTimeout(() => { delete btn.dataset.busy; }, 600);
    }
  }
  document.getElementById('pwrStart').addEventListener('click', (e) => sendPower('start', e.currentTarget));
  document.getElementById('pwrRestart').addEventListener('click', (e) => sendPower('restart', e.currentTarget));
  document.getElementById('pwrStop').addEventListener('click', (e) => sendPower('stop', e.currentTarget));

  const graphHistory = { cpu: [], memory: [], netIn: [], netOut: [] };
  const graphLimits = { cpu: null, memory: null };

  function pushGraphPoint(key, value, limit){
    const arr = graphHistory[key];
    arr.push(value);
    if(arr.length > 30) arr.shift();
    graphLimits[key] = limit;
    drawGraph(key);
  }

  function pushNetworkPoint(inbound, outbound){
    graphHistory.netIn.push(inbound);
    graphHistory.netOut.push(outbound);
    if(graphHistory.netIn.length > 30) graphHistory.netIn.shift();
    if(graphHistory.netOut.length > 30) graphHistory.netOut.shift();
    drawGraph('network');
  }

  function drawLine(ctx, data, w, h, max, color, fillColor){
    if(data.length < 2) return;
    ctx.beginPath();
    data.forEach((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - (Math.min(v, max) / max) * (h - 6) - 3;
      if(i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
    if(fillColor){
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fillStyle = fillColor;
      ctx.fill();
    }
  }

  function graphMax(key){
    if(key === 'network') return Math.max(...graphHistory.netIn, ...graphHistory.netOut, 1);
    const lim = graphLimits[key];
    if(lim) return lim;
    const peak = Math.max(...graphHistory[key], 0);
    return key === 'cpu' ? Math.max(100, peak) : Math.max(peak, 1);
  }

  function drawGraph(key){
    const idMap = { cpu: 'graphCpu', memory: 'graphMemory', network: 'graphNetwork' };
    const canvas = document.getElementById(idMap[key]);
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    const max = graphMax(key);
    if(key === 'network'){
      drawLine(ctx, graphHistory.netIn, w, h, max, '#3fa9f5', 'rgba(63,169,245,0.12)');
      drawLine(ctx, graphHistory.netOut, w, h, max, '#d2691e', 'rgba(210,105,30,0.12)');
      return;
    }
    drawLine(ctx, graphHistory[key], w, h, max, '#e8a33d', 'rgba(232,163,61,0.15)');
  }

  let logsTimer = null;

  async function refreshTerminal(){
    if(!pendingControlDoc) return;
    try{
      const idToken = await auth.currentUser.getIdToken();
      const res = await fetch(`${API_BASE}/server_console`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, docId: pendingControlDoc })
      });
      const data = await res.json();
      if(!data.ok) return;

      const out = document.getElementById('terminalOutput');
      const atBottom = out.scrollHeight - out.scrollTop - out.clientHeight < 40;
      // logs come from the websocket now, not this poll
      if(atBottom) out.scrollTop = out.scrollHeight;

      const r = data.resources || {};
      const d = data.dedicated;
      setState(d ? d.state : r.current_state);
      document.getElementById('infoAddress').textContent = data.address || '—';
      document.getElementById('infoUptime').textContent = r.uptime ? Math.floor(r.uptime/60000) + 'm' : '—';
      document.getElementById('infoCpu').textContent = (r.cpu_absolute ?? '—') + '%';
      const pl = data.panel_limits || {};
      const down = !!data.panel_unreachable && !data.dedicated;
      const usage = (usedMb, limMb) => down ? '—' : fmtMB(usedMb) + ' / ' + (limMb ? fmtMB(limMb) : 'Unlimited');
      document.getElementById('infoMemory').textContent = usage((r.memory_bytes || 0)/1048576, pl.mem_mb);
      document.getElementById('infoDisk').textContent = usage((r.disk_bytes || 0)/1048576, pl.disk_mb);
      document.getElementById('infoNetIn').textContent = r.network_rx_bytes ? (r.network_rx_bytes/1048576).toFixed(1) + 'MB' : '—';
      document.getElementById('infoNetOut').textContent = r.network_tx_bytes ? (r.network_tx_bytes/1048576).toFixed(1) + 'MB' : '—';

      if(d){
        const fmt = (used, limit, pct, unit) => limit ? `${used}${unit} / ${limit}${unit} (${pct}%)` : `${used}${unit}`;
        document.getElementById('infoCpu').textContent = fmt(d.cpu_used, d.cpu_limit, d.cpu_pct, '%');
        document.getElementById('infoMemory').textContent = usage(d.mem_used_mb || 0, d.mem_limit_mb || pl.mem_mb);
        document.getElementById('infoDisk').textContent = usage(d.disk_used_mb || 0, d.disk_limit_mb || pl.disk_mb);
        document.getElementById('infoAddress').textContent = d.state === 'running' ? 'Running' : 'Offline';
        document.getElementById('infoUptime').textContent = d.state === 'running' ? Math.floor((d.uptime_ms||0)/60000) + 'm' : '—';
      }

      pushGraphPoint('cpu', r.cpu_absolute || 0, (data.limits && data.limits.cpuLimit) || pl.cpu || null);
      pushGraphPoint('memory', r.memory_bytes ? r.memory_bytes/1048576 : 0, (data.limits && data.limits.ramLimit) || pl.mem_mb || null);
      pushNetworkPoint((r.network_rx_bytes||0)/1048576, (r.network_tx_bytes||0)/1048576);
      updateScaleLabels(data.limits || {});
    }catch(err){
      ['infoMemory','infoDisk'].forEach(id => { const el = document.getElementById(id); if(el) el.textContent = '—'; });
    }
  }

  // Left-side up/middle/low labels on each graph box, always tracking
  // this account's own limit for that resource (top = limit, middle =
  // half, low = 0). Falls back to "—" when no limit was set for them.
  function fmtMB(v){
    v = +v || 0;
    if(v >= 1024) return (v/1024).toFixed(2).replace(/\.?0+$/, '') + ' GB';
    return v.toFixed(v < 10 ? 2 : 1).replace(/\.?0+$/, '') + ' MB';
  }

  function updateScaleLabels(){
    const set = (id, t) => { document.getElementById(id).textContent = t; };
    const cpu = graphMax('cpu');
    set('scaleCpuUp', Math.round(cpu) + '%');
    set('scaleCpuMid', Math.round(cpu/2) + '%');
    const ram = graphMax('memory');
    set('scaleMemUp', fmtMB(ram));
    set('scaleMemMid', fmtMB(ram/2));
    const net = graphMax('network');
    set('scaleNetUp', fmtMB(net));
    set('scaleNetMid', fmtMB(net/2));
  }

  function startTerminalPolling(){
    stopTerminalPolling();
    refreshTerminal();
    logsTimer = setInterval(refreshTerminal, 5000);
  }

  function stopTerminalPolling(){
    if(logsTimer){ clearInterval(logsTimer); logsTimer = null; }
  }

  function escapeHtml(s){
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  // Cheap, dependency-free colorizer for raw console text: timestamps,
  // log levels, and numbers get a color -- enough to make a wall of
  // server log lines scannable without a full log-parsing library.
  function colorizeConsoleLine(line){
    let html = escapeHtml(line);
    html = html.replace(/\[?\b(\d{2}:\d{2}:\d{2}(?:\.\d+)?)\]?/g, '<span class="console-time">$&</span>');
    html = html.replace(/\b(ERROR|SEVERE|FATAL|Exception|error)\b/g, '<span class="console-err">$1</span>');
    html = html.replace(/\b(WARN|WARNING|Warn)\b/g, '<span class="console-warn">$1</span>');
    html = html.replace(/\b(INFO|DEBUG)\b/g, '<span class="console-info">$1</span>');
    html = html.replace(/\b(OK|SUCCESS|Done|done)\b/g, '<span class="console-ok">$1</span>');
    html = html.replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="console-num">$1</span>');
    return html;
  }

  // Same idea for the code editor: a small keyword/string/comment/number
  // tokenizer that works reasonably across the languages in the picker,
  // rather than a separate grammar per language.
  const HL_KEYWORDS = ['def','class','function','func','return','if','else','elif','for','while','do','switch',
    'case','break','continue','import','from','export','default','let','const','var','new','this','self',
    'public','private','protected','static','void','null','None','nil','true','false','True','False',
    'try','catch','except','finally','throw','raise','async','await','yield','lambda','struct','enum',
    'interface','extends','implements','package','namespace','using','include','typedef','const','fn'];
  const HL_TYPES = ['int','float','double','bool','boolean','string','String','char','long','short','byte',
    'object','Object','Array','List','Dict','Map','Set','void','var','let','const'];

  function highlightCode(code){
    const kw = HL_KEYWORDS.join('|');
    const ty = HL_TYPES.join('|');
    const master = new RegExp(
      `(#.*$|\\/\\/.*$)|("(?:[^"\\\\]|\\\\.)*"|'(?:[^'\\\\]|\\\\.)*'|\`(?:[^\`\\\\]|\\\\.)*\`)|(\\b(?:${kw})\\b)|(\\b(?:${ty})\\b)|(\\b\\d+(?:\\.\\d+)?\\b)|(\\b[a-zA-Z_]\\w*(?=\\s*\\())`,
      'gm'
    );
    let out = '';
    let last = 0;
    let m;
    while((m = master.exec(code)) !== null){
      out += escapeHtml(code.slice(last, m.index));
      const text = escapeHtml(m[0]);
      if(m[1] !== undefined) out += `<span class="tok-com">${text}</span>`;
      else if(m[2] !== undefined) out += `<span class="tok-str">${text}</span>`;
      else if(m[3] !== undefined) out += `<span class="tok-kw">${text}</span>`;
      else if(m[4] !== undefined) out += `<span class="tok-type">${text}</span>`;
      else if(m[5] !== undefined) out += `<span class="tok-num">${text}</span>`;
      else if(m[6] !== undefined) out += `<span class="tok-fn">${text}</span>`;
      last = master.lastIndex;
    }
    out += escapeHtml(code.slice(last));
    return out + '\n';
  }

  let consoleSocket = null;

  const ANSI_COLORS = {
    30:'#6b7280',31:'#f87171',32:'#4ade80',33:'#facc15',34:'#60a5fa',35:'#c084fc',36:'#22d3ee',37:'#e5e7eb',
    90:'#9ca3af',91:'#fca5a5',92:'#86efac',93:'#fde047',94:'#93c5fd',95:'#d8b4fe',96:'#67e8f9',97:'#ffffff'
  };

  const KEYWORD_RULES = [
    { re: /\b(ERROR|SEVERE|FATAL|CRITICAL|Exception|Traceback|failed|denied|refused)\b/g, color: '#f87171' },
    { re: /\b(WARN|WARNING|deprecated)\b/g, color: '#facc15' },
    { re: /\b(INFO|Done|started|success|ready|listening|connected|online)\b/g, color: '#4ade80' },
    { re: /\b(DEBUG|TRACE)\b/g, color: '#9ca3af' },
    { re: /(https?:\/\/[^\s]+)/g, color: '#22d3ee' },
    { re: /(\[\d{1,2}:\d{2}:\d{2}[^\]]*\])/g, color: '#6b7280' },
    { re: /(\b\d+(?:\.\d+)?(?:ms|s|MB|GB|KB|%)\b)/g, color: '#c084fc' }
  ];

  function highlightKeywords(text, baseColor, bold, frag){
    const marks = [];
    KEYWORD_RULES.forEach(rule => {
      rule.re.lastIndex = 0;
      let m;
      while((m = rule.re.exec(text)) !== null){
        marks.push({ start: m.index, end: m.index + m[0].length, color: rule.color });
        if(m[0].length === 0) rule.re.lastIndex++;
      }
    });
    marks.sort((a, b) => a.start - b.start);
    let pos = 0;
    const push = (t, color) => {
      if(!t) return;
      const span = document.createElement('span');
      span.textContent = t;
      if(color) span.style.color = color;
      if(bold) span.style.fontWeight = '700';
      frag.appendChild(span);
    };
    marks.forEach(mk => {
      if(mk.start < pos) return;
      push(text.slice(pos, mk.start), baseColor);
      push(text.slice(mk.start, mk.end), baseColor || mk.color);
      pos = mk.end;
    });
    push(text.slice(pos), baseColor);
  }

  function colorizeConsoleLine(raw){
    const frag = document.createDocumentFragment();
    const parts = raw.split(/\u001b\[([0-9;]*)m/);
    let color = null, bold = false;
    for(let i = 0; i < parts.length; i++){
      if(i % 2 === 1){
        parts[i].split(';').forEach(code => {
          const n = parseInt(code || '0', 10);
          if(n === 0){ color = null; bold = false; }
          else if(n === 1){ bold = true; }
          else if(ANSI_COLORS[n]){ color = ANSI_COLORS[n]; }
          else if(n === 39){ color = null; }
        });
      }else if(parts[i]){
        highlightKeywords(parts[i], color, bold, frag);
      }
    }
    frag.appendChild(document.createTextNode('\n'));
    return frag;
  }

  let consoleWanted = false;
  let consoleRetry = 0;
  let consoleTimer = null;
  let consolePing = null;

  function consoleAppend(text, cls){
    const out = document.getElementById('terminalOutput');
    if(!out) return;
    const atBottom = out.scrollHeight - out.scrollTop - out.clientHeight < 40;
    out.appendChild(colorizeConsoleLine(String(text).replace(/pterodactyl/gi, 'XtremeTech')));
    while(out.childNodes.length > 2000) out.removeChild(out.firstChild);
    if(atBottom) out.scrollTop = out.scrollHeight;
  }

  async function openConsole(){
    if(!consoleWanted || !pendingControlDoc) return;
    try{
      const idToken = await auth.currentUser.getIdToken();
      if(!consoleWanted) return;
      const sock = new WebSocket(`${WS_BASE}/console_proxy?idToken=${encodeURIComponent(idToken)}&docId=${encodeURIComponent(pendingControlDoc)}`);
      consoleSocket = sock;
      sock.onopen = () => {
        if(consoleRetry){
          const out = document.getElementById('terminalOutput');
          if(out) out.textContent = '';
        }
        consoleRetry = 0;
        clearInterval(consolePing);
        consolePing = setInterval(() => { try{ if(sock.readyState === 1) sock.send('{"event":"ping","args":[]}'); }catch(e){} }, 20000);
      };
      sock.onmessage = (msg) => {
        let payload;
        try{ payload = JSON.parse(msg.data); }catch(e){ return; }
        const a = payload.args && payload.args[0];
        switch(payload.event){
          case 'console output':
          case 'install output':
            consoleAppend(a == null ? '' : a);
            break;
          case 'daemon message':
            consoleAppend('\u001b[93m' + (a == null ? '' : a) + '\u001b[0m');
            break;
          case 'status':
            setState(a);
            break;
          case 'stats':
            try{ const j = typeof a === 'string' ? JSON.parse(a) : a; if(j && j.state) setState(j.state); }catch(e){}
            break;
        }
      };
      sock.onclose = () => {
        clearInterval(consolePing);
        if(consoleSocket !== sock) return;
        consoleSocket = null;
        if(consoleWanted){
          consoleTimer = setTimeout(openConsole, Math.min(10000, 500 * Math.pow(2, consoleRetry++)));
        }
      };
      sock.onerror = () => { try{ sock.close(); }catch(e){} };
    }catch(err){
      if(consoleWanted) consoleTimer = setTimeout(openConsole, Math.min(10000, 500 * Math.pow(2, consoleRetry++)));
    }
  }

  function connectConsoleSocket(){
    disconnectConsoleSocket();
    consoleWanted = true;
    consoleRetry = 0;
    openConsole();
  }

  function disconnectConsoleSocket(){
    consoleWanted = false;
    clearTimeout(consoleTimer);
    clearInterval(consolePing);
    clearInterval(burstTimer);
    if(consoleSocket){
      const s = consoleSocket;
      consoleSocket = null;
      try{ s.close(); }catch(e){}
    }
  }


  document.getElementById('terminalInput').addEventListener('keydown', async (e) => {
    if(e.key !== 'Enter') return;
    const cmd = e.target.value.trim();
    if(!cmd || !pendingControlDoc) return;
    e.target.value = '';
    try{
      const idToken = await auth.currentUser.getIdToken();
      await fetch(`${API_BASE}/server_command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, docId: pendingControlDoc, command: cmd })
      });
      setTimeout(refreshTerminal, 800);
    }catch(err){}
  });


  let pendingServerName = '';

  function hideAllScreens(){
    serverList.classList.remove('show');
    manageServersOverlay.classList.remove('show');
    serverUsersOverlay.classList.remove('show');
    document.getElementById('serverControlOverlay').classList.remove('show');
    document.getElementById('filesOverlay').classList.remove('show');
    document.getElementById('startupOverlay').classList.remove('show');
    document.getElementById('advOverlay').classList.remove('show');
    document.getElementById('backupOverlay').classList.remove('show');
    document.getElementById('dbOverlay').classList.remove('show');
    hideMcViews();
    ['navTerminal','navFiles','navSchedule','navUsers','navDatabase','navBackup','navStartup','navAdvanced','navConfig','navPlugins','navMembers','navAccess','navWorlds']
      .forEach(id => { document.getElementById(id).style.display = 'none'; });
    stopTerminalPolling();
    disconnectConsoleSocket();
  }

  function hideMcViews(){
    document.getElementById('mcBlankOverlay').classList.remove('show');
    document.getElementById('pluginsOverlay').classList.remove('show');
    document.getElementById('mcConfigOverlay').classList.remove('show');
    document.getElementById('scheduleOverlay').classList.remove('show');
    document.getElementById('membersOverlay').classList.remove('show');
    document.getElementById('accessOverlay').classList.remove('show');
    ['accountOverlay','customizeOverlay','apiOverlay','activityOverlay'].forEach(o => document.getElementById(o).classList.remove('show'));
  }

  function showControlNav(){
    const mc = pendingControlCategory === 'minecraft';
    const cloud = pendingControlCategory === 'cloud_storage';
    const sched = document.getElementById('navSchedule');
    if(mc) document.getElementById('navPlugins').before(sched);
    else document.getElementById('navAdvanced').after(sched);
    const on = (id, v) => { document.getElementById(id).style.display = v ? 'flex' : 'none'; };
    on('navTerminal', true);
    on('navFiles', true);
    on('navSchedule', !cloud);
    on('navConfig', mc);
    on('navPlugins', mc);
    on('navMembers', mc);
    on('navAccess', true);
    window.mcCtx = mc;
    on('navWorlds', mc);
    on('navDatabase', true);
    on('navBackup', true);
    on('navStartup', !mc && !cloud);
    on('navAdvanced', !mc && !cloud);
    on('navUsers', !mc);
    if(window.applyMcPerms) window.applyMcPerms();
  }

  let manageData = [];
  const manageSearch = document.getElementById('manageSearch');
  const srvMenu = document.createElement('div');
  srvMenu.className = 'fm-dropdown';
  srvMenu.id = 'srvMenu';
  srvMenu.style.cssText = 'position:fixed;z-index:70;min-width:180px;max-height:60vh;overflow-y:auto;top:0;right:0;';
  document.body.appendChild(srvMenu);
  let menuCtx = null;

  function closeSrvMenu(){ srvMenu.classList.remove('show'); menuCtx = null; }
  function placeSrvMenu(){
    if(!menuCtx) return;
    const r = menuCtx.btn.getBoundingClientRect();
    srvMenu.style.left = 'auto';
    srvMenu.style.right = Math.max(8, window.innerWidth - r.right) + 'px';
    srvMenu.style.top = (r.bottom + 4) + 'px';
    const h = srvMenu.offsetHeight;
    if(r.bottom + 4 + h > window.innerHeight - 8) srvMenu.style.top = Math.max(8, r.top - h - 4) + 'px';
  }
  function paintSrvMenu(view){
    srvMenu.replaceChildren();
    const add = (label, act, cls) => {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = label; b.dataset.act = act;
      if(cls) b.className = cls;
      srvMenu.appendChild(b);
      return b;
    };
    if(view === 'theme'){
      add('← Back', 'back');
      [...document.getElementById('serverBackground').options].filter(o => o.value).forEach(o => {
        const b = add(o.textContent, 'pick', menuCtx.s.backgroundUrl === o.value ? 'cur' : '');
        b.dataset.url = o.value;
      });
    }else{
      add('Info', 'info');
      add('Show current users', 'users');
      add('Add member', 'add');
      add('Send email', 'email');
      add('Remove Member', 'remove');
      add('Rename', 'rename');
      add('Delete Server', 'delete', 'danger');
      add('Change theme', 'theme');
    }
  }

  function showServerInfo(id, s){
    document.getElementById('srvInfoTitle').textContent = s.name || 'Unnamed server';
    const created = s.createdAt && s.createdAt.toDate ? s.createdAt.toDate().toLocaleString() : '—';
    const rows = [['Category', (SERVER_KINDS[s.category] || {}).label || s.category || '—'], ['Expires', s.expiry || '—'], ['Cost', s.cost || '—'], ['UUID', s.uuid || '—'], ['Created', created], ['ID', id]];
    const body = document.getElementById('srvInfoBody');
    body.replaceChildren();
    rows.forEach(([k, v]) => {
      const row = document.createElement('div'); row.className = 'info-box';
      const a = document.createElement('span'); a.textContent = k;
      const b = document.createElement('span'); b.textContent = v; b.style.wordBreak = 'break-all'; b.style.textAlign = 'right';
      row.append(a, b); body.appendChild(row);
    });
    document.getElementById('srvInfoOverlay').classList.add('show');
  }
  document.getElementById('srvInfoClose').addEventListener('click', () => document.getElementById('srvInfoOverlay').classList.remove('show'));
  document.getElementById('srvInfoOverlay').addEventListener('click', (e) => { if(e.target.id === 'srvInfoOverlay') e.currentTarget.classList.remove('show'); });

  async function updateServerDoc(id, patch){
    try{
      await db.collection('servers').doc(id).update(patch);
      const row = manageData.find(x => x.id === id);
      if(row) Object.assign(row.s, patch);
      renderManageList();
    }catch(err){
      alert('Could not update this server: ' + err.message);
    }
  }

  srvMenu.addEventListener('click', async (e) => {
    e.stopPropagation();
    const b = e.target.closest('button');
    if(!b || !menuCtx) return;
    const { id, s } = menuCtx;
    const act = b.dataset.act;
    if(act === 'theme'){ paintSrvMenu('theme'); placeSrvMenu(); return; }
    if(act === 'back'){ paintSrvMenu('main'); placeSrvMenu(); return; }
    closeSrvMenu();
    if(act === 'pick'){ updateServerDoc(id, { backgroundUrl: b.dataset.url }); return; }
    if(act === 'info') showServerInfo(id, s);
    else if(act === 'users') openServerUsersPanel(id, s);
    else if(act === 'email') openMailModal(s.name || '');
    else if(act === 'add') openServerUsersPanel(id, s).then(() => { if(window.xtShowAddUser) window.xtShowAddUser(true); });
    else if(act === 'remove') openServerUsersPanel(id, s).then(() => { serverUsersOverlay.scrollTop = 0; });
    else if(act === 'rename'){
      const name = prompt('Rename server to:', s.name || '');
      if(name && name.trim() && name.trim() !== s.name) updateServerDoc(id, { name: name.trim() });
    }else if(act === 'delete'){
      pendingDeleteId = id;
      confirmDeleteName.textContent = s.name || 'Unnamed server';
      confirmDeleteOverlay.classList.add('show');
    }
  });
  document.addEventListener('click', closeSrvMenu);
  window.addEventListener('resize', closeSrvMenu);
  manageServersOverlay.addEventListener('scroll', closeSrvMenu);

  function renderManageList(){
    closeSrvMenu();
    const q = manageSearch.value.trim().toLowerCase();
    const list = manageData.filter(x => (x.s.name || '').toLowerCase().includes(q));
    manageServersBoxes.innerHTML = '';
    if(!list.length){
      manageServersBoxes.innerHTML = `<p class="server-list-empty">${manageData.length ? 'No servers match your search.' : 'No servers yet.'}</p>`;
      return;
    }
    list.forEach(({ id, s }) => {
      const box = document.createElement('div');
      box.className = 'server-item';
      applyBg(box, s.backgroundUrl);
      box.innerHTML = `
        <div class="server-item-inner">
          <div class="server-item-name">${escapeHtml(s.name || 'Unnamed server')}</div>
          <div class="server-item-meta">
            <div><span>Expires</span>${escapeHtml(s.expiry || '—')}</div>
            <div>Manage users →</div>
          </div>
          <button type="button" class="fm-file-dots srv-dots" title="Options"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="5" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="19" r="1.6" fill="currentColor"/></svg></button>
        </div>
      `;
      const dots = box.querySelector('.srv-dots');
      dots.addEventListener('click', (e) => {
        e.stopPropagation();
        if(menuCtx && menuCtx.id === id && srvMenu.classList.contains('show')){ closeSrvMenu(); return; }
        const row = manageData.find(x => x.id === id);
        menuCtx = { id, s: row ? row.s : s, btn: dots };
        paintSrvMenu('main');
        srvMenu.classList.add('show');
        placeSrvMenu();
      });
      box.addEventListener('click', () => openServerUsersPanel(id, (manageData.find(x => x.id === id) || { s }).s));
      manageServersBoxes.appendChild(box);
    });
  }

  const backendInput = document.getElementById('backendUrlInput');
  const backendStatus = document.getElementById('backendUrlStatus');
  document.getElementById('backendUrlBtn').addEventListener('click', async () => {
    const u = backendInput.value.trim().replace(/\/+$/, '');
    const say = (m, err) => { backendStatus.textContent = m; backendStatus.classList.toggle('err', !!err); };
    if(!/^https:\/\/[^\s/]+(\/\S*)?$/.test(u)){ say('Enter a full https:// link.', true); return; }
    say('Saving…');
    try{
      await db.collection('config').doc('backend').set({ url: u, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
      setApiBase(u);
      say('Saved. The website now uses this link.');
    }catch(err){
      say(err.message, true);
    }
  });

  manageSearch.addEventListener('input', renderManageList);
  manageSearch.addEventListener('keydown', (e) => { if(e.key === 'Enter'){ e.preventDefault(); renderManageList(); } });
  document.getElementById('manageSearchBtn').addEventListener('click', renderManageList);

  async function openManageServersModal(){
    hideAllScreens();
    manageServersOverlay.classList.add('show');
    manageSearch.value = '';
    backendInput.value = API_BASE;
    backendStatus.textContent = '';
    manageServersBoxes.innerHTML = '<p class="server-list-empty">Loading…</p>';

    try{
      const snapshot = await db.collection('servers').orderBy('createdAt', 'desc').get();
      manageData = [];
      snapshot.forEach((doc) => manageData.push({ id: doc.id, s: doc.data() }));
      renderManageList();
    }catch(err){
      manageServersBoxes.innerHTML = '<p class="server-list-empty">Could not load servers.</p>';
    }
  }

  function closeManageServersModal(){
    manageServersOverlay.classList.remove('show');
    serverUsersOverlay.classList.remove('show');
    if(document.body.classList.contains('role-admin')){
      serverList.classList.add('show');
    }
  }

  const mailOv = document.getElementById('adminMailOverlay');
  const mailStatus = document.getElementById('mailStatus');
  const mailF = id => document.getElementById(id);
  function openMailModal(serverName){
    mailF('mailTo').value = '';
    mailF('mailSubject').value = serverName ? 'Your server ' + serverName + ' is ready' : '';
    mailF('mailMessage').value = '';
    mailF('mailBtnLabel').value = 'Open Panel';
    mailF('mailBtnUrl').value = location.origin;
    mailF('mailServer').value = serverName;
    mailStatus.textContent = '';
    mailStatus.classList.remove('err');
    mailOv.classList.add('show');
    mailF('mailTo').focus();
  }
  mailF('adminMailBtn').addEventListener('click', () => openMailModal(''));
  mailF('mailClose').addEventListener('click', () => mailOv.classList.remove('show'));
  mailOv.addEventListener('click', (e) => { if(e.target === mailOv) mailOv.classList.remove('show'); });
  mailF('mailSend').addEventListener('click', async () => {
    const say = (m, err) => { mailStatus.textContent = m; mailStatus.classList.toggle('err', !!err); };
    const to = mailF('mailTo').value.trim();
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)){ say('Enter a valid email.', true); return; }
    const btn = mailF('mailSend');
    btn.disabled = true;
    say('Sending…');
    try{
      const idToken = await auth.currentUser.getIdToken();
      const res = await fetch(`${API_BASE}/admin_send_email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idToken, to,
          subject: mailF('mailSubject').value.trim(),
          message: mailF('mailMessage').value.trim(),
          buttonLabel: mailF('mailBtnLabel').value.trim(),
          buttonUrl: mailF('mailBtnUrl').value.trim(),
          serverName: mailF('mailServer').value
        })
      });
      const data = await res.json().catch(() => ({}));
      if(!res.ok || !data.ok) throw new Error(data.error || 'HTTP ' + res.status);
      say('Email sent.');
    }catch(err){
      say(err.message || 'Could not send.', true);
    }finally{
      btn.disabled = false;
    }
  });

  if(document.getElementById('navManageServers')) document.getElementById('navManageServers').addEventListener('click', openManageServersModal);


  // ---------------------------------------------------------------
  // Server Users panel: shows everyone with access to ONE server,
  // and a form to add a new person (with resource limits).
  // Account creation/updates happen through notify_login.py, NOT the
  // client SDK -- creating a user with the client SDK signs the
  // browser in as that new user, which would kick the admin out of
  // their own session. Python avoids that entirely.
  // ---------------------------------------------------------------
  async function openServerUsersPanel(docId, serverData){
    pendingServerDocId = docId;
    pendingServerName = serverData.name || 'Unnamed server';

    manageServersOverlay.classList.remove('show');
    document.getElementById('serverControlOverlay').classList.remove('show');
    serverUsersOverlay.classList.add('show');
    document.getElementById('addUserOverlay').classList.remove('show');
    serverUsersName.textContent = pendingServerName;

    addUserEmail.value = '';
    addUserPassword.value = '';
    addUserPasswordConfirm.value = '';
    addUserCpuLimit.value = '';
    addUserRamLimit.value = '';
    addUserStorageLimit.value = '';
    addUserNetworkLimit.value = '';
    addUserFullAccess.checked = false;
    addUserError.classList.remove('show');
    paintUserLimitsAccess();

    await refreshServerUsersList();
  }

  async function refreshServerUsersList(){
    if(window.xtUsersLoad) return window.xtUsersLoad(pendingServerDocId);
    serverUsersList.innerHTML = '<p class="server-list-empty">Loading…</p>';
    try{
      const idToken = await auth.currentUser.getIdToken();
      const res = await fetch(`${API_BASE}/server_access_list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, docId: pendingServerDocId })
      });
      const data = await res.json();

      if(!data.ok){
        serverUsersList.innerHTML = '<p class="server-list-empty">Could not load users.</p>';
        return;
      }

      if(!data.users || data.users.length === 0){
        serverUsersList.innerHTML = '<p class="server-list-empty">No users yet.</p>';
        return;
      }

      serverUsersList.innerHTML = '';
      data.users.forEach((u) => {
        const limitParts = [];
        if(u.cpuLimit) limitParts.push(`CPU ${u.cpuLimit}%`);
        if(u.ramLimit) limitParts.push(`RAM ${u.ramLimit}MB`);
        if(u.storageLimit) limitParts.push(`Storage ${u.storageLimit}MB`);
        const limitText = limitParts.length ? limitParts.join(' · ') : 'No limits set';

        const row = document.createElement('div');
        row.className = 'remove-row';
        row.innerHTML = `
          <div class="remove-row-info">
            <div class="remove-row-name">📁 ${u.email}</div>
            <div class="remove-row-meta">${limitText}</div>
          </div>
          <button type="button" class="remove-row-btn">Remove</button>
        `;
        row.querySelector('.remove-row-btn').addEventListener('click', () => {
          pendingRemoveUser = { email: u.email };
          document.getElementById('confirmRemoveUserName').textContent = `${u.email} — ${pendingServerName}`;
          document.getElementById('confirmRemoveUserOverlay').classList.add('show');
        });
        serverUsersList.appendChild(row);
      });
    }catch(err){
      serverUsersList.innerHTML = '<p class="server-list-empty">Could not reach the backend.</p>';
    }
  }

  document.getElementById('serverUsersBack').addEventListener('click', () => {
    serverUsersOverlay.classList.remove('show');
    openManageServersModal();
  });

  document.getElementById('addUserPwToggle').addEventListener('click', () => {
    const btn = document.getElementById('addUserPwToggle');
    const isPw = addUserPassword.type === 'password';
    addUserPassword.type = isPw ? 'text' : 'password';
    btn.textContent = isPw ? 'hide' : 'show';
  });

  document.getElementById('addUserPwConfirmToggle').addEventListener('click', () => {
    const btn = document.getElementById('addUserPwConfirmToggle');
    const isPw = addUserPasswordConfirm.type === 'password';
    addUserPasswordConfirm.type = isPw ? 'text' : 'password';
    btn.textContent = isPw ? 'hide' : 'show';
  });

  const isAdminUser = () => document.body.classList.contains('role-admin');
  function paintUserLimitsAccess(){
    const row = addUserCpuLimit.closest('.duration-row');
    if(row) row.style.display = isAdminUser() ? '' : 'none';
  }

  document.getElementById('navUsers').addEventListener('click', () => {
    if(!pendingControlDoc) return;
    const row = (typeof manageData !== 'undefined' && manageData.find(x => x.id === pendingControlDoc));
    const nameEl = document.getElementById('serverControlName');
    openServerUsersPanel(pendingControlDoc, { name: (row && row.s.name) || (nameEl && nameEl.textContent) || 'Server' });
  });

  addUserSaveBtn.addEventListener('click', async () => {
    if(!pendingServerDocId) return;

    const email = addUserEmail.value.trim();
    const password = addUserPassword.value; // blank = "don't change it"
    const passwordConfirm = addUserPasswordConfirm.value;
    const cpuLimit = addUserCpuLimit.value.trim();
    const ramLimit = addUserRamLimit.value.trim();
    const storageLimit = addUserStorageLimit.value.trim();
    const networkLimit = addUserNetworkLimit.value.trim();

    addUserError.classList.remove('show');

    if(!email){
      addUserError.textContent = 'Enter an email.';
      addUserError.classList.add('show');
      return;
    }

    if(password && password !== passwordConfirm){
      addUserError.textContent = 'Passwords do not match.';
      addUserError.classList.add('show');
      return;
    }

    const label = addUserSaveBtn.querySelector('span');
    label.textContent = 'Saving…';

    try{
      const idToken = await auth.currentUser.getIdToken();
      const res = await fetch(`${API_BASE}/assign_server_access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idToken,
          docId: pendingServerDocId,
          email,
          password,
          cpuLimit: isAdminUser() && cpuLimit ? Number(cpuLimit) : null,
          ramLimit: isAdminUser() && ramLimit ? Number(ramLimit) : null,
          storageLimit: isAdminUser() && storageLimit ? Number(storageLimit) : null,
          networkLimit: isAdminUser() && networkLimit ? Number(networkLimit) : null,
          fullAccess: addUserFullAccess.checked
        })
      });
      const data = await res.json();

      if(!data.ok){
        addUserError.textContent = data.error || 'Could not save this user.';
        addUserError.classList.add('show');
        label.textContent = 'Add User';
        return;
      }

      label.textContent = 'Added';
      addUserEmail.value = '';
      addUserPassword.value = '';
      addUserPasswordConfirm.value = '';
      addUserCpuLimit.value = '';
      addUserRamLimit.value = '';
      addUserStorageLimit.value = '';
      addUserNetworkLimit.value = '';
      setTimeout(() => { label.textContent = 'Add User'; }, 900);
      refreshServerUsersList();
      if(window.xtShowAddUser) window.xtShowAddUser(false);
    }catch(err){
      addUserError.textContent = 'Could not reach the backend -- is notify_login.py running?';
      addUserError.classList.add('show');
      label.textContent = 'Add User';
    }
  });

  let pendingRemoveUser = null; // { email }

  function closeConfirmRemoveUser(){
    document.getElementById('confirmRemoveUserOverlay').classList.remove('show');
    pendingRemoveUser = null;
  }

  document.getElementById('confirmRemoveUserCancel').addEventListener('click', closeConfirmRemoveUser);
  document.getElementById('confirmRemoveUserOverlay').addEventListener('click', (e) => {
    if(e.target === document.getElementById('confirmRemoveUserOverlay')) closeConfirmRemoveUser();
  });

  document.getElementById('confirmRemoveUserYes').addEventListener('click', async () => {
    if(!pendingRemoveUser || !pendingServerDocId) return;
    const yesBtn = document.getElementById('confirmRemoveUserYes');
    yesBtn.textContent = 'Removing…';

    try{
      const idToken = await auth.currentUser.getIdToken();
      const res = await fetch(`${API_BASE}/remove_server_access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, docId: pendingServerDocId, email: pendingRemoveUser.email })
      });
      const data = await res.json();

      if(!data.ok){
        alert('Could not remove this user: ' + (data.error || 'unknown error'));
        yesBtn.textContent = 'Yes, remove';
        return;
      }

      yesBtn.textContent = 'Yes, remove';
      closeConfirmRemoveUser();
      refreshServerUsersList();
    }catch(err){
      alert('Could not reach the backend -- is notify_login.py running?');
      yesBtn.textContent = 'Yes, remove';
    }
  });

  // Populate day / month / year dropdowns
  const daySelect = document.getElementById('serverDay');
  const monthSelect = document.getElementById('serverMonth');
  const yearSelect = document.getElementById('serverYear');

  for(let d = 1; d <= 31; d++){
    daySelect.add(new Option(String(d).padStart(2, '0'), d));
  }

  const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  MONTH_NAMES.forEach((name, i) => {
    monthSelect.add(new Option(name, i + 1));
  });

  const currentYear = new Date().getFullYear();
  for(let y = currentYear; y <= currentYear + 6; y++){
    yearSelect.add(new Option(y, y));
  }

  // Show/hide the API key like the login password field
  // Renders the persistent stacked list from whatever Firestore sends.
  // This runs every time the "servers" collection changes -- including
  // the instant after we add a new one below.
  const CENTER_BGS = ['okmc.png','bamboo.png','mcnethercastle.png','mcend.png','server.png','c2.png','dcbot.png','dcb.png'];
  function applyBg(el, url){
    if(!url) return;
    el.style.backgroundImage = `url('${url}')`;
    el.style.backgroundPosition = CENTER_BGS.some(f => url.includes('/' + f)) ? 'center center' : '';
  }

  function renderServerList(snapshot){
    window.XT_LAST_SNAP = snapshot;
    window.XT_DOCS = window.XT_DOCS || {};
    if(document.body.classList.contains('role-admin')){
      const P = window.XT_PANEL || 'pterodactyl';
      const keep = [];
      snapshot.forEach(d => { const x = d.data(); window.XT_DOCS[d.id] = x; if((x.panel || 'pterodactyl') === P) keep.push(d); });
      snapshot = { empty: !keep.length, forEach: cb => keep.forEach(cb) };
    }else{
      snapshot.forEach(d => { window.XT_DOCS[d.id] = d.data(); });
    }
    if(snapshot.empty){
      serverList.innerHTML = '<p class="server-list-empty">No servers yet.</p>';
      return;
    }

    serverList.innerHTML = '';
    const SECTIONS = [
      { key: 'minecraft', title: 'Minecraft Server', always: false },
      { key: 'discord', title: 'Discord Bots', always: false },
      { key: 'database', title: 'Database', always: false },
      { key: 'cloud_storage', title: 'Cloud Storage', always: false }
    ];
    const sectionBodies = {};
    SECTIONS.forEach(sec => {
      const wrap = document.createElement('div');
      wrap.className = 'server-section';
      wrap.dataset.key = sec.key;
      wrap.innerHTML = `<div class="server-section-title">${sec.title}<span class="server-section-count"></span></div>`;
      sectionBodies[sec.key] = wrap;
    });
    snapshot.forEach((doc) => {
      const s = doc.data();
      const category = sectionBodies[s.category] ? s.category : 'discord';
      const item = document.createElement('div');
      item.className = 'server-item';
      applyBg(item, s.backgroundUrl);
      item.innerHTML = `
        <div class="server-item-inner">
          <div>
            <div class="server-item-name">${s.name || 'Unnamed server'}</div>
            <div class="server-stats-row">
              <div class="stat-box" title="CPU usage">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="6" y="6" width="12" height="12" rx="1.5" stroke="currentColor" stroke-width="1.6"/>
                  <path d="M9 2.5v3M12 2.5v3M15 2.5v3M9 18.5v3M12 18.5v3M15 18.5v3M2.5 9h3M2.5 12h3M2.5 15h3M18.5 9h3M18.5 12h3M18.5 15h3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
                </svg>
                <span class="stat-cpu" id="cpu-${doc.id}">—</span>
              </div>
              <div class="stat-box" title="RAM usage">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="3" y="7" width="18" height="10" rx="1.5" stroke="currentColor" stroke-width="1.6"/>
                  <path d="M7 7V4.5M12 7V4.5M17 7V4.5M7 10.5v3M11 10.5v3M15 10.5v3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
                </svg>
                <span class="stat-ram" id="ram-${doc.id}">—</span>
              </div>
              <div class="stat-box" title="Storage usage">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <ellipse cx="12" cy="5.5" rx="8" ry="2.8" stroke="currentColor" stroke-width="1.6"/>
                  <path d="M4 5.5V12c0 1.5 3.5 2.8 8 2.8s8-1.3 8-2.8V5.5M4 12v6.5c0 1.5 3.5 2.8 8 2.8s8-1.3 8-2.8V12" stroke="currentColor" stroke-width="1.6"/>
                </svg>
                <span class="stat-disk" id="disk-${doc.id}">—</span>
              </div>
            </div>
          </div>
          <div class="server-item-meta">
            <div><span>Expires</span>${s.expiry || '—'}</div>
            <div><span>Cost</span>${s.cost || '—'}</div>
          </div>
        </div>
      `;
      item.addEventListener('click', () => {
        const admin = document.body.classList.contains('role-admin');
        pendingControlDoc = doc.id;
        pendingControlCategory = category;
        document.getElementById('serverControlName').textContent = s.name || 'Unnamed server';
        hideAllScreens();
        document.getElementById('navAddServer').style.display = 'none';
        document.getElementById('navRemoveServer').style.display = 'none';
        document.getElementById('navManageServers').style.display = 'none';
        document.getElementById('serverControlOverlay').classList.add('show');
        showControlNav();
        startTerminalPolling();
        connectConsoleSocket();
      });
      sectionBodies[category].appendChild(item);
      fetchServerStats(doc.id);
    });
    SECTIONS.forEach(sec => {
      const wrap = sectionBodies[sec.key];
      const n = wrap.querySelectorAll('.server-item').length;
      if(!n && !sec.always) return;
      wrap.querySelector('.server-section-count').textContent = n ? `· ${n}` : '';
      if(!n) wrap.insertAdjacentHTML('beforeend', '<p class="server-list-empty">No servers yet.</p>');
      serverList.appendChild(wrap);
    });
  }

  // Asks the Python backend for this server's live CPU/RAM/disk usage.
  // The API key never leaves notify_login.py -- the page only ever
  // sends a Firestore document id and its own login token, and gets
  // back plain numbers.
  async function fetchServerStats(docId){
    const cpuEl = document.getElementById(`cpu-${docId}`);
    const ramEl = document.getElementById(`ram-${docId}`);
    const diskEl = document.getElementById(`disk-${docId}`);
    if(!cpuEl) return; // card wasn't rendered (shouldn't happen)

    try{
      const idToken = await auth.currentUser.getIdToken();
      const res = await fetch(`${API_BASE}/server_stats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, docId })
      });
      const data = await res.json();

      const mb = v => { v = +v || 0; return v >= 1024 ? (v/1024).toFixed(2).replace(/\.?0+$/, '') + 'GB' : v.toFixed(v < 10 ? 2 : 1).replace(/\.?0+$/, '') + 'MB'; };
      if(data.ok){
        cpuEl.title = ramEl.title = diskEl.title = '';
        cpuEl.textContent = `${data.cpu_percent}% / ${data.cpu_limit ? data.cpu_limit + '%' : '∞'}`;
        ramEl.textContent = `${mb(data.memory_mb)} / ${data.ram_limit ? mb(data.ram_limit) : '∞'}`;
        diskEl.textContent = `${mb(data.disk_mb)} / ${data.storage_limit ? mb(data.storage_limit) : '∞'}`;
      }else{
        cpuEl.textContent = ramEl.textContent = diskEl.textContent = '—';
        cpuEl.title = ramEl.title = diskEl.title = data.error || 'Stats unavailable';
      }
    }catch(err){
      cpuEl.textContent = ramEl.textContent = diskEl.textContent = '—';
    }
  }

  setInterval(() => {
    if(!auth.currentUser || !serverList.classList.contains('show') || document.hidden) return;
    document.querySelectorAll('.stat-cpu').forEach(el => fetchServerStats(el.id.slice(4)));
  }, 10000);


  // Only one of these is ever active at a time -- whichever role the
  // signed-in user turns out to be. Keeping a handle to unsubscribe
  // avoids leftover listeners (and Firestore permission-denied noise)
  // when a session switches role or signs out.
  let activeServerListener = null;

  let ownerWatch = null;
  function stopServerListener(){
    clearInterval(ownerWatch);
    ownerWatch = null;
    if(activeServerListener){
      activeServerListener();
      activeServerListener = null;
    }
  }

  // Admin: sees every server. Only attached once we're sure this is
  // the admin account -- Firestore rules wouldn't allow this query
  // for anyone else anyway.
  function attachAdminServerListener(){
    stopServerListener();
    activeServerListener = db.collection('servers').orderBy('createdAt', 'desc').onSnapshot(
      renderServerList,
      (err) => {
        serverList.innerHTML = '<p class="server-list-empty">Could not load servers.</p>';
      }
    );
  }

  // Non-admin: sees only the server(s) an admin has given them access
  // to via Manage Servers -> [server] -> Add User. Firestore rules
  // allow this via the access/{their-email} subcollection doc.
  async function attachOwnerServerListener(email){
    stopServerListener();
    activeServerListener = () => {}; // one-time fetch below, nothing to unsubscribe from

    try{
      const idToken = await auth.currentUser.getIdToken();
      const res = await fetch(`${API_BASE}/my_servers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken })
      });
      const data = await res.json();

      if(res.status === 401 || res.status === 403 || (data.ok && (!data.servers || data.servers.length === 0))){
        serverList.classList.remove('show');
        await auth.signOut();
        showError(data.ok ? 'Your access was removed or has expired.' : 'Your session is no longer valid. Sign in again.');
        return;
      }
      if(!data.ok) throw new Error(data.error || 'Could not load servers.');

      showLoggedIn();
      serverList.classList.add('show');
      renderServerList({
        empty: false,
        forEach: (callback) => data.servers.forEach(s => callback({ id: s.id, data: () => s }))
      });
      ownerWatch = setInterval(watchAccess, 60000);
    }catch(err){
      showLoggedIn();
      serverList.classList.add('show');
      serverList.innerHTML = '<p class="server-list-empty">Could not reach the server. Retrying…</p>';
      clearTimeout(ownerRetry);
      ownerRetry = setTimeout(() => { if(auth.currentUser) attachOwnerServerListener(email); }, 10000);
    }
  }

  let ownerRetry = null;
  async function watchAccess(){
    const u = auth.currentUser;
    if(!u || document.hidden) return;
    try{
      const idToken = await u.getIdToken();
      const res = await fetch(`${API_BASE}/my_servers`, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ idToken }) });
      const data = await res.json();
      if(res.status === 401 || res.status === 403 || (data.ok && (!data.servers || data.servers.length === 0))){
        await auth.signOut();
        showError(data.ok ? 'Your access was removed or has expired.' : 'Your session is no longer valid. Sign in again.');
      }
    }catch(e){
      const c = (e && e.code) || '';
      if(/user-disabled|user-not-found|user-token-expired|invalid-user-token/.test(c)){
        await auth.signOut();
        showError('Your session has ended. Sign in again.');
      }
    }
  }

  addServerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('serverName').value.trim();
    const dayNum = parseInt(daySelect.value, 10);
    const monthIndex = parseInt(monthSelect.value, 10) - 1; // JS Date months are 0-based
    const yearNum = parseInt(yearSelect.value, 10);
    const day = daySelect.value.padStart(2, '0');
    const month = MONTH_NAMES[monthIndex];
    const bgUrl = document.getElementById('serverBackground').value;
    const cost = document.getElementById('serverCost').value.trim();
    const uuid = document.getElementById('serverUuid').value.trim();
    const ownerEmail = document.getElementById('serverOwnerEmail').value.trim().toLowerCase();
    const ownerPass = document.getElementById('serverOwnerPass').value;

    // A real date the backend can do math on (days until expiry),
    // not just the human-readable string shown on the card.
    const expiryDate = new Date(yearNum, monthIndex, dayNum);

    try{
      const ref = await db.collection('servers').add({
        name,
        expiry: `${day} ${month} ${yearNum}`,
        expiryTimestamp: firebase.firestore.Timestamp.fromDate(expiryDate),
        reminderSent: false,
        backgroundUrl: bgUrl,
        cost,
        uuid,
        type: SERVER_KINDS[pendingCategory].type,
        category: pendingCategory,
        panel: window.XT_PANEL || 'pterodactyl',
        location: (document.getElementById('serverLocation') || {}).value || '',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      let note = '';
      try{
        const idToken = await auth.currentUser.getIdToken();
        const post = (p, b) => fetch(`${API_BASE}${p}`, { method:'POST', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify({ idToken, docId:ref.id, ...b }) }).then(r => r.json());
        await post('/server_init', {});
        if(ownerEmail){
          const r = await post('/assign_server_access', { email:ownerEmail, password:ownerPass, fullAccess:true });
          if(!r.ok) note = 'Server created, but the owner was not assigned: ' + (r.error || 'error');
        }
      }catch(e2){ note = 'Server created, but setup failed: ' + e2.message; }
      closeAddServerModal();
      addServerForm.reset();
      if(note) alert(note);
    }catch(err){
      alert('Could not save this server to Firestore: ' + err.message);
    }
  });


  // ---------------------------------------------------------------
  // Captcha: self-contained canvas captcha (client-side only).
  // Good enough to stop casual/scripted form-fills; it is NOT a
  // substitute for server-side bot protection like reCAPTCHA on a
  // real production login. See notes at the end of the chat reply.
  // ---------------------------------------------------------------
  const canvas = document.getElementById('captchaCanvas');
  const ctx = canvas.getContext('2d');
  let captchaText = '';

  function randomChar(){
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I ambiguity
    return chars[Math.floor(Math.random() * chars.length)];
  }

  function drawCaptcha(){
    captchaText = Array.from({length: 5}, randomChar).join('');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // background
    ctx.fillStyle = '#0d0f12';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // noise lines
    for(let i = 0; i < 5; i++){
      ctx.strokeStyle = `rgba(123,128,135,${0.15 + Math.random()*0.2})`;
      ctx.beginPath();
      ctx.moveTo(Math.random()*canvas.width, Math.random()*canvas.height);
      ctx.lineTo(Math.random()*canvas.width, Math.random()*canvas.height);
      ctx.stroke();
    }

    // characters
    const spacing = canvas.width / (captchaText.length + 1);
    for(let i = 0; i < captchaText.length; i++){
      ctx.save();
      const x = spacing * (i + 1);
      const y = canvas.height / 2 + (Math.random()*8 - 4);
      ctx.translate(x, y);
      ctx.rotate((Math.random()*0.5 - 0.25));
      ctx.font = '600 22px "JetBrains Mono", monospace';
      ctx.fillStyle = Math.random() > 0.5 ? '#e8a33d' : '#e8e6e1';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(captchaText[i], 0, 0);
      ctx.restore();
    }

    // noise dots
    for(let i = 0; i < 30; i++){
      ctx.fillStyle = `rgba(123,128,135,${Math.random()*0.3})`;
      ctx.beginPath();
      ctx.arc(Math.random()*canvas.width, Math.random()*canvas.height, 1, 0, Math.PI*2);
      ctx.fill();
    }
  }

  drawCaptcha();
  canvas.addEventListener('click', drawCaptcha);
  document.getElementById('captchaRefresh').addEventListener('click', drawCaptcha);

  // ---------------------------------------------------------------
  // Password visibility toggle
  // ---------------------------------------------------------------
  const pwInput = document.getElementById('password');
  const pwToggle = document.getElementById('pwToggle');
  pwToggle.addEventListener('click', () => {
    const isPw = pwInput.type === 'password';
    pwInput.type = isPw ? 'text' : 'password';
    pwToggle.textContent = isPw ? 'hide' : 'show';
  });

  // ---------------------------------------------------------------
  // Form submit
  // ---------------------------------------------------------------
  const form = document.getElementById('loginForm');
  const errorBox = document.getElementById('formError');
  const submitBtn = document.getElementById('submitBtn');
  const submitLabel = document.getElementById('submitLabel');
  const spinner = document.getElementById('spinner');

  function showError(msg){
    errorBox.textContent = msg;
    errorBox.classList.add('show');
  }

  function clearError(){
    errorBox.classList.remove('show');
    errorBox.textContent = '';
  }

  function setLoading(loading){
    submitBtn.disabled = loading;
    spinner.classList.toggle('show', loading);
    submitLabel.textContent = loading ? 'Signing in…' : 'Sign in';
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const captchaInput = document.getElementById('captchaInput').value.trim();

    if(!email || !password){
      showError('Enter your email and password.');
      return;
    }

    if(captchaInput.toUpperCase() !== captchaText){
      showError('Security code does not match. Try again.');
      drawCaptcha();
      document.getElementById('captchaInput').value = '';
      return;
    }

    setLoading(true);
    try{
      await auth.signInWithEmailAndPassword(email, password);
      // onAuthStateChanged (above) detects this and swaps in the
      // logged-in view automatically — no redirect needed.
    }catch(err){
      const isNetworkError = err.code === 'auth/network-request-failed';
      showError(isNetworkError ? 'Network Connection Failed' : 'Wrong Credentials');
      drawCaptcha();
      document.getElementById('captchaInput').value = '';
    }finally{
      setLoading(false);
    }
  });


  // ---------------------------------------------------------------
  // File Manager (per-server, real backend). Backed by the Flask
  // /list_files, /file_contents, /save_file, /make_dir, /rename_file,
  // /delete_files, /upload_url routes -- each account is transparently
  // confined server-side to its own homeFolder (see notify_login.py).
  // ---------------------------------------------------------------
  (function(){
    const LANGUAGES = ['C++','C+','C#','CSS','CQL','Diff','DockerFile','Git Markdown','Golang','HTML','HTTP',
      'Java Script','Json','Lua','Markdown','MariaDB','MS SQL','MySQL','Nginx','PHP','Plain Text',
      'Postgre SQL','Properties','Pug','Python','Ruby','Rust','Sass','Scss','Shell','Sql','Sqlite',
      'TOML','TypeScript','VUE','XML','YAML'];

    const EXT_LANG = {
      cpp:'C++', cc:'C++', h:'C++', cs:'C#', css:'CSS', cql:'CQL', diff:'Diff',
      dockerfile:'DockerFile', md:'Markdown', go:'Golang', html:'HTML', htm:'HTML',
      http:'HTTP', js:'Java Script', mjs:'Java Script', json:'Json', lua:'Lua',
      php:'PHP', txt:'Plain Text', sql:'Sql', sqlite:'Sqlite', toml:'TOML',
      ts:'TypeScript', tsx:'TypeScript', vue:'VUE', xml:'XML', yaml:'YAML', yml:'YAML',
      py:'Python', rb:'Ruby', rs:'Rust', sass:'Sass', scss:'Scss', sh:'Shell',
      properties:'Properties', pug:'Pug', conf:'Nginx'
    };

    const LANG_EXT = {
      'C++':'cpp','C+':'c','C#':'cs','CSS':'css','CQL':'cql','Diff':'diff','DockerFile':'Dockerfile',
      'Git Markdown':'md','Golang':'go','HTML':'html','HTTP':'http','Java Script':'js','Json':'json',
      'Lua':'lua','Markdown':'md','MariaDB':'sql','MS SQL':'sql','MySQL':'sql','Nginx':'conf','PHP':'php',
      'Plain Text':'txt','Postgre SQL':'sql','Properties':'properties','Pug':'pug','Python':'py','Ruby':'rb',
      'Rust':'rs','Sass':'sass','Scss':'scss','Shell':'sh','Sql':'sql','Sqlite':'sqlite','TOML':'toml',
      'TypeScript':'ts','VUE':'vue','XML':'xml','YAML':'yaml'
    };

    const fmPath = document.getElementById('fmPath');
    const fmList = document.getElementById('fmList');
    const fmSelectAll = document.getElementById('fmSelectAll');
    const fmFileInput = document.getElementById('fmFileInput');
    const fmUploadBtn = document.getElementById('fmUploadBtn');
    const fmUploadProgress = document.getElementById('fmUploadProgress');
    const fmUploadProgressRing = document.getElementById('fmUploadProgressRing');
    const fmUploadProgressLabel = document.getElementById('fmUploadProgressLabel');
    const FM_RING_CIRCUMFERENCE = 97.4;

    function setUploadProgress(percent){
      const offset = FM_RING_CIRCUMFERENCE - (FM_RING_CIRCUMFERENCE * percent / 100);
      fmUploadProgressRing.setAttribute('stroke-dashoffset', offset.toFixed(2));
      fmUploadProgressLabel.textContent = `${Math.round(percent)}%`;
    }

    function uploadOneFile(f, idToken){
      return new Promise((resolve) => {
        const form = new FormData();
        form.append('idToken', idToken);
        form.append('docId', pendingControlDoc);
        form.append('path', currentPath);
        form.append('file', f);

        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${API_BASE}/upload_file`);
        xhr.timeout = 60000;

        xhr.upload.addEventListener('progress', (e) => {
          if(e.lengthComputable) setUploadProgress((e.loaded / e.total) * 100);
        });

        xhr.onload = () => {
          let data;
          try{ data = JSON.parse(xhr.responseText); }
          catch(parseErr){ data = { ok: false, error: `bad response (${xhr.status})` }; }
          if(!data.ok){
            console.error('upload_file failed:', data.error, xhr.status);
            alert(`Upload failed for ${f.name}: ${data.error || xhr.status}`);
          }
          resolve();
        };

        xhr.onerror = () => {
          console.error('upload_file error: network error');
          alert(`Upload failed for ${f.name}: network error`);
          resolve();
        };

        xhr.ontimeout = () => {
          console.error('upload_file error: timed out');
          alert(`Upload failed for ${f.name}: timed out after 60s`);
          resolve();
        };

        xhr.send(form);
      });
    }
    const fmEditorOverlay = document.getElementById('fmEditorOverlay');
    const fmEditorName = document.getElementById('fmEditorName');
    const fmEditorTextarea = document.getElementById('fmEditorTextarea');
    const fmEditorHighlight = document.getElementById('fmEditorHighlight');
    const fmEditorGutter = document.getElementById('fmEditorGutter');
    const fmLangBtn = document.getElementById('fmLangBtn');
    const fmLangLabel = document.getElementById('fmLangLabel');
    const fmLangMenu = document.getElementById('fmLangMenu');
    const fmSaveBtn = document.getElementById('fmSaveBtn');

    let currentPath = '/';     // path relative to this account's own scoped root
    let currentItems = [];     // last list_files() result for the current folder
    let selected = new Set();  // selected item names in the current folder
    let editingFile = null;    // full path of the file currently open in the editor
    let editingLang = 'Plain Text';

    function joinPath(base, name){
      return base === '/' ? '/' + name : base + '/' + name;
    }

    async function fmApi(route, extra){
      const idToken = await auth.currentUser.getIdToken();
      const res = await fetch(`${API_BASE}/${route}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, docId: pendingControlDoc, ...extra })
      });
      return res.json();
    }

    function formatSize(bytes){
      if(bytes === undefined || bytes === null) return '—';
      if(bytes < 1024) return `${bytes} B`;
      if(bytes < 1024*1024) return `${(bytes/1024).toFixed(1)} KB`;
      if(bytes < 1024*1024*1024) return `${(bytes/(1024*1024)).toFixed(1)} MB`;
      return `${(bytes/(1024*1024*1024)).toFixed(1)} GB`;
    }

    function formatDate(ts){
      const d = new Date(ts);
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const day = d.getDate();
      const suffix = (day % 10 === 1 && day !== 11) ? 'st' : (day % 10 === 2 && day !== 12) ? 'nd' : (day % 10 === 3 && day !== 13) ? 'rd' : 'th';
      const m = String(d.getMinutes()).padStart(2,'0');
      return `${months[d.getMonth()]} ${day}${suffix}, ${d.getFullYear()} ${String(d.getHours()).padStart(2,'0')}:${m}`;
    }

    function langForName(name){
      const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : '';
      return EXT_LANG[ext] || 'Plain Text';
    }

    function renderPath(){
      const segs = currentPath === '/' ? [] : currentPath.split('/').filter(Boolean);
      fmPath.innerHTML = '';
      const rootBtn = document.createElement('button');
      rootBtn.type = 'button';
      rootBtn.className = 'fm-path-seg' + (segs.length === 0 ? ' current' : '');
      rootBtn.textContent = 'home/container';
      rootBtn.addEventListener('click', () => { currentPath = '/'; selected.clear(); render(); });
      fmPath.appendChild(rootBtn);

      segs.forEach((seg, i) => {
        const sep = document.createElement('span');
        sep.className = 'fm-path-sep';
        sep.textContent = '/';
        fmPath.appendChild(sep);

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'fm-path-seg' + (i === segs.length - 1 ? ' current' : '');
        btn.textContent = seg;
        btn.addEventListener('click', () => { currentPath = '/' + segs.slice(0, i + 1).join('/'); selected.clear(); render(); });
        fmPath.appendChild(btn);
      });
    }

    function folderIconSvg(){
      return '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 7a1.5 1.5 0 0 1 1.5-1.5H9l2 2h8.5A1.5 1.5 0 0 1 21 9v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18V7z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>';
    }
    function fileIconSvg(){
      return '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 3.5h8l4 4V19.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 19.5v-14A1.5 1.5 0 0 1 5.5 3.5H6z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M14 3.5V8h4.5" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    }

    function closeAllDropdowns(){
      document.querySelectorAll('.fm-dropdown.show').forEach(d => d.classList.remove('show'));
    }

    async function render(){
      renderPath();
      fmList.innerHTML = '<div class="fm-drop-hint">Drop files here to upload</div><div class="fm-empty">Loading…</div>';

      const data = await fmApi('list_files', { path: currentPath });
      if(!data.ok){
        fmList.innerHTML = `<div class="fm-drop-hint">Drop files here to upload</div><div class="fm-empty">${data.error || 'Could not load files.'}</div>`;
        return;
      }

      currentItems = (data.files || []).sort((a, b) => {
        if(a.is_file !== b.is_file) return a.is_file ? 1 : -1;
        return a.name.localeCompare(b.name);
      });

      fmList.innerHTML = '<div class="fm-drop-hint">Drop files here to upload</div>';

      if(currentItems.length === 0){
        const empty = document.createElement('div');
        empty.className = 'fm-empty';
        empty.textContent = 'This folder is empty.';
        fmList.appendChild(empty);
      }

      currentItems.forEach(item => {
        const box = document.createElement('div');
        box.className = 'fm-file-box';

        const check = document.createElement('button');
        check.type = 'button';
        check.className = 'fm-checkbox' + (selected.has(item.name) ? ' checked' : '');
        check.addEventListener('click', (e) => {
          e.stopPropagation();
          if(selected.has(item.name)) selected.delete(item.name); else selected.add(item.name);
          render();
        });
        box.appendChild(check);

        const icon = document.createElement('div');
        icon.className = 'fm-file-icon';
        icon.innerHTML = item.is_file ? (/\.py$/i.test(item.name) ? '<img src="https://cdn.discordapp.com/emojis/1536991920356724786.webp?size=24" alt="" decoding="async">' : fileIconSvg()) : folderIconSvg();
        box.appendChild(icon);

        const nameEl = document.createElement('div');
        nameEl.className = 'fm-file-name';
        nameEl.textContent = item.name;
        box.appendChild(nameEl);

        const sizeEl = document.createElement('div');
        sizeEl.className = 'fm-file-size';
        sizeEl.textContent = item.is_file ? formatSize(item.size) : '—';
        box.appendChild(sizeEl);

        const dateEl = document.createElement('div');
        dateEl.className = 'fm-file-date';
        dateEl.textContent = item.modified_at ? formatDate(new Date(item.modified_at).getTime()) : '—';
        box.appendChild(dateEl);

        const dotsWrap = document.createElement('div');
        dotsWrap.style.position = 'relative';
        const dots = document.createElement('button');
        dots.type = 'button';
        dots.className = 'fm-file-dots';
        dots.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="5" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="19" r="1.6" fill="currentColor"/></svg>';

        const menu = document.createElement('div');
        menu.className = 'fm-dropdown';
        menu.innerHTML = `
          <button type="button" data-act="rename">Rename</button>
          <button type="button" data-act="download">Download</button>
          ${item.is_file && pendingControlCategory === 'cloud_storage' ? '<button type="button" data-act="link">Copy link</button>' : ''}
          <button type="button" class="danger" data-act="delete">Delete</button>
        `;

        dots.addEventListener('click', (e) => {
          e.stopPropagation();
          const willShow = !menu.classList.contains('show');
          closeAllDropdowns();
          if(willShow) menu.classList.add('show');
        });

        menu.addEventListener('click', (e) => {
          const act = e.target.getAttribute('data-act');
          if(!act) return;
          e.stopPropagation();
          menu.classList.remove('show');
          if(act === 'rename') renameItem(item);
          if(act === 'delete') deleteItem(item);
          if(act === 'download') downloadItem(item);
          if(act === 'link') copyLink(item);
        });

        dotsWrap.appendChild(dots);
        dotsWrap.appendChild(menu);
        box.appendChild(dotsWrap);

        box.addEventListener('click', () => {
          if(!item.is_file){
            currentPath = joinPath(currentPath, item.name);
            selected.clear();
            render();
          }else{
            openEditor(item);
          }
        });

        fmList.appendChild(box);
      });

      fmSelectAll.classList.toggle('checked', currentItems.length > 0 && selected.size === currentItems.length);
    }

    async function createDirectory(){
      const name = prompt('New folder name:');
      if(!name) return;
      const data = await fmApi('make_dir', { path: currentPath, name });
      if(!data.ok) alert(data.error || 'Could not create the folder.');
      render();
    }

    async function createNewFile(){
      const name = prompt('New file name (with extension):', 'untitled.txt');
      if(!name) return;
      const path = joinPath(currentPath, name);
      const data = await fmApi('save_file', { path, content: '' });
      if(!data.ok){ alert(data.error || 'Could not create the file.'); return; }
      render();
      openEditor({ name });
    }

    async function uploadFiles(fileList){
      const files = Array.from(fileList || []);
      if(!files.length) return;
      if(!pendingControlDoc){ alert('No server selected.'); return; }

      fmUploadBtn.disabled = true;
      const originalLabel = fmUploadBtn.querySelector('span').textContent;
      fmUploadProgress.style.display = 'block';

      try{
        const idToken = await auth.currentUser.getIdToken();
        for(let i = 0; i < files.length; i++){
          const f = files[i];
          fmUploadBtn.querySelector('span').textContent = files.length > 1
            ? `Uploading ${i + 1}/${files.length}…`
            : `Uploading ${f.name}…`;
          setUploadProgress(0);
          await uploadOneFile(f, idToken);
          await render();
        }
      }finally{
        fmUploadBtn.querySelector('span').textContent = originalLabel;
        fmUploadBtn.disabled = false;
        fmUploadProgress.style.display = 'none';
        setUploadProgress(0);
        render();
      }
    }

    async function renameItem(item){
      const newName = prompt('Rename to:', item.name);
      if(!newName || newName === item.name) return;
      const data = await fmApi('rename_file', { path: currentPath, from: item.name, to: newName });
      if(!data.ok) alert(data.error || 'Could not rename this item.');
      render();
    }

    async function deleteItem(item){
      if(!confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
      const data = await fmApi('delete_files', { path: currentPath, names: [item.name] });
      if(!data.ok) alert(data.error || 'Could not delete this item.');
      selected.delete(item.name);
      render();
    }

    async function downloadItem(item){
      if(!item.is_file) return;
      const data = await fmApi('file_contents', { path: joinPath(currentPath, item.name) });
      if(!data.ok){ alert(data.error || 'Could not download this file.'); return; }
      const blob = new Blob([data.content || ''], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = item.name;
      a.click();
      URL.revokeObjectURL(url);
    }

    async function downloadAll(){
      const btn = document.getElementById('fmDownloadAllBtn');
      const label = btn.querySelector('span');
      const old = label.textContent;
      btn.disabled = true;
      btn.classList.add('loading');
      label.textContent = 'Preparing…';
      try{
        const idToken = await auth.currentUser.getIdToken();
        const res = await fetch(`${API_BASE}/download_all`, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ idToken, docId: pendingControlDoc }) });
        if(!res.ok){
          let m = `Request failed (HTTP ${res.status}).`;
          try{ m = (await res.json()).error || m; }catch(e){}
          throw new Error(m);
        }
        const reader = res.body.getReader();
        const parts = [];
        let got = 0;
        for(;;){
          const { done, value } = await reader.read();
          if(done) break;
          parts.push(value);
          got += value.length;
          label.textContent = `Downloading ${formatSize(got)}`;
        }
        const m = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') || '');
        const url = URL.createObjectURL(new Blob(parts, { type:'application/zip' }));
        const a = document.createElement('a');
        a.href = url; a.download = m ? m[1] : 'server-files.zip';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      }catch(e){ alert(e.message || 'Could not download the files.'); }
      label.textContent = old;
      btn.classList.remove('loading');
      btn.disabled = false;
    }

    async function copyLink(item){
      const data = await fmApi('file_link', { path: joinPath(currentPath, item.name) });
      if(!data.ok || !data.url){ alert(data.error || 'Could not get a link for this file.'); return; }
      try{ await navigator.clipboard.writeText(data.url); alert('Link copied. It expires in about 15 minutes.'); }
      catch(e){ prompt('Copy this link (expires in about 15 minutes):', data.url); }
    }

    async function deleteSelected(){
      if(selected.size === 0) return;
      if(!confirm(`Delete ${selected.size} selected item(s)?`)) return;
      const data = await fmApi('delete_files', { path: currentPath, names: [...selected] });
      if(!data.ok) alert(data.error || 'Could not delete the selected items.');
      selected.clear();
      render();
    }

    // -- Editor --
    function buildLangMenu(){
      fmLangMenu.innerHTML = '';
      LANGUAGES.forEach(lang => {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = lang;
        b.addEventListener('click', () => {
          editingLang = lang;
          fmLangLabel.textContent = lang;
          fmLangMenu.classList.remove('show');
        });
        fmLangMenu.appendChild(b);
      });
    }
    buildLangMenu();

    let gutterCount = 0;
    function syncHighlight(){
      fmEditorHighlight.innerHTML = highlightCode(fmEditorTextarea.value);
      const n = fmEditorTextarea.value.split('\n').length;
      if(n !== gutterCount){
        gutterCount = n;
        let s = '1';
        for(let i = 2; i <= n; i++) s += '\n' + i;
        fmEditorGutter.textContent = s;
      }
      fmEditorGutter.scrollTop = fmEditorTextarea.scrollTop;
    }
    fmEditorTextarea.addEventListener('input', syncHighlight);
    fmEditorTextarea.addEventListener('scroll', () => {
      fmEditorHighlight.scrollTop = fmEditorTextarea.scrollTop;
      fmEditorGutter.scrollTop = fmEditorTextarea.scrollTop;
      fmEditorHighlight.scrollLeft = fmEditorTextarea.scrollLeft;
    });

    async function openEditor(item){
      editingFile = joinPath(currentPath, item.name);
      editingLang = langForName(item.name);
      fmEditorName.textContent = item.name;
      fmEditorTextarea.value = '';
      fmLangLabel.textContent = editingLang;
      fmEditorOverlay.classList.add('show');
      fmEditorTextarea.focus();
      syncHighlight();

      const data = await fmApi('file_contents', { path: editingFile });
      if(data.ok) fmEditorTextarea.value = data.content || '';
      syncHighlight();
    }

    function closeEditor(){
      fmEditorOverlay.classList.remove('show');
      editingFile = null;
    }

    async function saveCurrentFile(){
      if(!editingFile) return;
      const ext = LANG_EXT[editingLang];
      const dir = editingFile.includes('/') ? editingFile.substring(0, editingFile.lastIndexOf('/')) : '/';
      const oldName = editingFile.split('/').pop();
      let finalName = oldName;
      if(ext && !oldName.toLowerCase().endsWith('.' + ext.toLowerCase()) && editingLang !== 'Plain Text'){
        const base = oldName.includes('.') ? oldName.substring(0, oldName.lastIndexOf('.')) : oldName;
        finalName = `${base}.${ext}`;
      }
      const finalPath = joinPath(dir, finalName);

      const data = await fmApi('save_file', { path: finalPath, content: fmEditorTextarea.value });
      if(!data.ok){ alert(data.error || 'Could not save this file.'); return; }
      if(finalName !== oldName){
        await fmApi('delete_files', { path: dir, names: [oldName] });
      }

      editingFile = finalPath;
      fmEditorName.textContent = finalName;
      fmSaveBtn.classList.add('saved');
      fmSaveBtn.textContent = 'Saved';
      setTimeout(() => { fmSaveBtn.classList.remove('saved'); fmSaveBtn.textContent = 'Save'; }, 1200);
    }

    // -- Wiring --
    document.getElementById('fmCreateDirBtn').addEventListener('click', createDirectory);
    document.getElementById('fmNewFileBtn').addEventListener('click', createNewFile);
    document.getElementById('fmDownloadAllBtn').addEventListener('click', downloadAll);
    document.getElementById('fmUploadBtn').addEventListener('click', () => fmFileInput.click());
    fmFileInput.addEventListener('change', () => { uploadFiles(fmFileInput.files); fmFileInput.value = ''; });

    fmSelectAll.addEventListener('click', () => {
      if(selected.size === currentItems.length) selected.clear();
      else currentItems.forEach(item => selected.add(item.name));
      render();
    });

    fmLangBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      fmLangMenu.classList.toggle('show');
    });
    document.addEventListener('click', () => { fmLangMenu.classList.remove('show'); closeAllDropdowns(); });

    fmSaveBtn.addEventListener('click', saveCurrentFile);
    document.getElementById('fmEditorClose').addEventListener('click', closeEditor);

    let fmDragCounter = 0;
    fmList.addEventListener('dragenter', (e) => {
      e.preventDefault();
      fmDragCounter++;
      fmList.classList.add('dragover');
    });
    fmList.addEventListener('dragover', (e) => { e.preventDefault(); });
    fmList.addEventListener('dragleave', (e) => {
      e.preventDefault();
      fmDragCounter = Math.max(0, fmDragCounter - 1);
      if(fmDragCounter === 0) fmList.classList.remove('dragover');
    });
    fmList.addEventListener('drop', (e) => {
      e.preventDefault();
      fmDragCounter = 0;
      fmList.classList.remove('dragover');
      if(e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length){
        uploadFiles(e.dataTransfer.files);
      }
    });

    window.openFilesAt = (p) => {
      ['serverControlOverlay','manageServersOverlay','serverUsersOverlay','startupOverlay'].forEach(o => document.getElementById(o).classList.remove('show'));
      hideMcViews();
      serverList.classList.remove('show');
      currentPath = p;
      selected.clear();
      document.getElementById('filesOverlay').classList.add('show');
      render();
    };

    document.getElementById('navFiles').addEventListener('click', () => {
      document.getElementById('serverControlOverlay').classList.remove('show');
      document.getElementById('manageServersOverlay').classList.remove('show');
      document.getElementById('serverUsersOverlay').classList.remove('show');
      document.getElementById('startupOverlay').classList.remove('show');
      hideMcViews();
      serverList.classList.remove('show');
      currentPath = '/';
      selected.clear();
      document.getElementById('filesOverlay').classList.add('show');
      render();
    });

    [['navWorlds','Worlds']].forEach(([id, title]) => {
      document.getElementById(id).addEventListener('click', () => {
        if(!pendingControlDoc) return;
        ['serverControlOverlay','filesOverlay','manageServersOverlay','serverUsersOverlay','startupOverlay'].forEach(o => document.getElementById(o).classList.remove('show'));
        serverList.classList.remove('show');
        hideMcViews();
        document.getElementById('mcBlankTitle').textContent = title;
        document.getElementById('mcBlankOverlay').classList.add('show');
      });
    });

    // Terminal nav button: re-opens the terminal/stats window for
    // whichever server is currently being controlled, even if the
    // user had navigated away to Files/Manage Servers first.
    document.getElementById('navTerminal').addEventListener('click', () => {
      if(!pendingControlDoc) return;
      document.getElementById('filesOverlay').classList.remove('show');
      document.getElementById('manageServersOverlay').classList.remove('show');
      document.getElementById('serverUsersOverlay').classList.remove('show');
      document.getElementById('startupOverlay').classList.remove('show');
      hideMcViews();
      serverList.classList.remove('show');
      document.getElementById('serverControlOverlay').classList.add('show');
      startTerminalPolling();
    });
  })();

  (function(){
    const startupOverlay = document.getElementById('startupOverlay');
    const startupCommandInput = document.getElementById('startupCommandInput');
    const startupCopyBtn = document.getElementById('startupCopyBtn');

    startupCopyBtn.addEventListener('click', async () => {
      try{
        await navigator.clipboard.writeText(startupCommandInput.value);
      }catch(e){
        startupCommandInput.select();
        document.execCommand('copy');
      }
      const original = startupCopyBtn.innerHTML;
      startupCopyBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="16" height="16"><path d="M5 12.5l4.5 4.5L19 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      setTimeout(() => { startupCopyBtn.innerHTML = original; }, 1200);
    });
    const startupImageSelect = document.getElementById('startupImageSelect');
    const startupVarsBox = document.getElementById('startupVarsBox');
    const startupError = document.getElementById('startupError');
    const startupSaveBtn = document.getElementById('startupSaveBtn');
    let currentVariables = [];

    function boolLike(rules){
      return typeof rules === 'string' && rules.includes('boolean');
    }

    let startupOwn = false;
    let fileChips = [];
    let filesAdd = null;
    let filesHasMain = false;
    let startupExtras = [];
    const EXTRA_RE = /\s+&\s+[^#]*# xt-extra:.*$/s;
    const FILE_RE = /^[A-Za-z0-9_][A-Za-z0-9_\-.\/]{0,120}$/;
    function buildFiles(v){
      const marker = /# xt-extra:(.*)$/.exec(startupCommandInput.value || '');
      startupCommandInput.value = (startupCommandInput.value || '').replace(EXTRA_RE, '').trimEnd();
      const main = v ? String(v.server_value || '').trim() : '';
      const extras = startupExtras.length ? startupExtras : (marker ? marker[1].trim().split(/\s+/).filter(Boolean) : []);
      fileChips = [main, ...extras].filter(Boolean).filter((x, i, a) => a.indexOf(x) === i);
      filesHasMain = !!v;
      const row = document.createElement('div');
      row.className = 'field';
      row.style.marginTop = '18px';
      row.innerHTML = `
        <label>Startup files</label>
        <p class="subtext" style="margin:4px 0 8px; font-size:12px;">Type a file name and press Add. The first file is the main file, the rest start alongside it. Any file type works, like name.py, bot.js or run.sh.</p>
        ${v ? `<input type="hidden" data-env="${v.env_variable}">` : ''}
        <div class="su-chips"></div>
        <div class="mm-bar" style="margin:10px 0 0;"><input type="text" class="su-new" placeholder="File name" autocomplete="off" spellcheck="false"><button type="button" class="plg-btn su-add">Add</button></div>
      `;
      const hid = row.querySelector('[data-env]'), chips = row.querySelector('.su-chips'), inp = row.querySelector('.su-new');
      const paint = () => {
        if(hid) hid.value = fileChips[0] || '';
        chips.replaceChildren();
        fileChips.forEach((f, i) => {
          const c = document.createElement('span'); c.className = 'su-chip'; c.textContent = f + (i === 0 && filesHasMain ? '  · main' : '');
          const x = document.createElement('button'); x.type = 'button'; x.textContent = '×';
          x.addEventListener('click', () => { fileChips.splice(i, 1); paint(); });
          c.appendChild(x); chips.appendChild(c);
        });
      };
      filesAdd = () => {
        const n = inp.value.trim();
        if(!n) return;
        if(!FILE_RE.test(n) || n.includes('..') || n.endsWith('/')){ startupError.textContent = 'Invalid file name: ' + n; return; }
        if(fileChips.length >= 10){ startupError.textContent = 'Up to 10 startup files.'; return; }
        startupError.textContent = '';
        if(!fileChips.includes(n)) fileChips.push(n);
        inp.value = '';
        paint();
      };
      row.querySelector('.su-add').addEventListener('click', filesAdd);
      inp.addEventListener('keydown', e => { if(e.key === 'Enter'){ e.preventDefault(); filesAdd(); } });
      paint();
      return row;
    }
    function renderVariables(){
      let extrasPlaced = false;
      startupVarsBox.innerHTML = '';
      currentVariables.forEach((v) => {
        const isMain = v.env_variable === 'JS_FILE' || /(main|startup|entry)\s*file/i.test(v.name || '');
        if(!startupOwn && !extrasPlaced && isMain){
          startupVarsBox.appendChild(buildFiles(v));
          extrasPlaced = true;
          return;
        }
        const row = document.createElement('div');
        row.className = 'field';
        row.style.marginTop = '18px';

        if(startupOwn && v.env_variable === 'JS_FILE'){
          row.innerHTML = `
            <label>Startup files</label>
            <p class="subtext" style="margin:4px 0 8px; font-size:12px;">Add one or more files, like name.py. All of them start together. Leave empty to auto-detect.</p>
            <input type="hidden" data-env="JS_FILE">
            <div class="su-chips"></div>
            <div class="mm-bar" style="margin:10px 0 0;"><input type="text" class="su-new" placeholder="name.py" autocomplete="off" spellcheck="false"><button type="button" class="plg-btn su-add">Add</button></div>
          `;
          const hid = row.querySelector('[data-env]'), chips = row.querySelector('.su-chips'), inp = row.querySelector('.su-new');
          let files = String(v.server_value || '').split(/[\s,;]+/).filter(Boolean);
          const paint = () => {
            hid.value = files.join(' ');
            chips.replaceChildren();
            files.forEach((f, i) => {
              const c = document.createElement('span'); c.className = 'su-chip'; c.textContent = f;
              const x = document.createElement('button'); x.type = 'button'; x.textContent = '×';
              x.addEventListener('click', () => { files.splice(i, 1); paint(); });
              c.appendChild(x); chips.appendChild(c);
            });
          };
          const add = () => {
            const n = inp.value.trim();
            if(!n) return;
            if(!/^[A-Za-z0-9_][A-Za-z0-9_\-.\/]{0,120}$/.test(n) || n.includes('..') || n.endsWith('/')){ startupError.textContent = 'Invalid file name: ' + n; return; }
            if(files.length >= 10){ startupError.textContent = 'Up to 10 startup files.'; return; }
            startupError.textContent = '';
            if(!files.includes(n)) files.push(n);
            inp.value = '';
            paint();
          };
          row.querySelector('.su-add').addEventListener('click', add);
          inp.addEventListener('keydown', e => { if(e.key === 'Enter'){ e.preventDefault(); add(); } });
          hid._flush = add;
          paint();
          startupVarsBox.appendChild(row);
          return;
        }
        if(boolLike(v.rules)){
          const on = v.server_value === '1' || v.server_value === 1 || v.server_value === true;
          row.innerHTML = `
            <label>${v.name}</label>
            <p class="subtext" style="margin:4px 0 8px; font-size:12px;">${v.description || ''}</p>
            <button type="button" class="toggle-btn" data-env="${v.env_variable}" data-on="${on}" style="width:auto; padding:8px 18px; border-radius:10px; border:1px solid var(--panel-border); background:${on ? 'var(--success)' : 'transparent'}; color:${on ? '#0a1a12' : 'var(--text)'}; cursor:pointer;">${on ? 'On' : 'Off'}</button>
          `;
        }else{
          row.innerHTML = `
            <label>${v.name}</label>
            <p class="subtext" style="margin:4px 0 8px; font-size:12px;">${v.description || ''}</p>
            <input type="${v.secret ? 'password' : 'text'}" autocomplete="off" data-env="${v.env_variable}" value="${(v.server_value ?? '').toString().replace(/"/g,'&quot;')}">
          `;
        }
        startupVarsBox.appendChild(row);
      });
      if(!startupOwn && !extrasPlaced){ startupVarsBox.appendChild(buildFiles(null)); extrasPlaced = true; }

      startupVarsBox.querySelectorAll('.toggle-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          const nowOn = btn.dataset.on !== 'true';
          btn.dataset.on = nowOn;
          btn.textContent = nowOn ? 'On' : 'Off';
          btn.style.background = nowOn ? 'var(--success)' : 'transparent';
          btn.style.color = nowOn ? '#0a1a12' : 'var(--text)';
        });
      });
    }

    let startupReq = 0;
    let startupReady = false;

    function setStartupBusy(busy){
      startupCommandInput.disabled = busy;
      startupImageSelect.disabled = busy;
      startupSaveBtn.disabled = busy;
    }

    function failStartup(msg){
      startupReady = false;
      startupError.textContent = msg;
      startupCommandInput.value = '';
      startupCommandInput.placeholder = '';
      startupImageSelect.innerHTML = '';
      startupVarsBox.innerHTML = '';
      currentVariables = [];
      setStartupBusy(true);
    }

    async function openStartupWindow(){
      if(!pendingControlDoc) return;
      const req = ++startupReq;
      hideAllScreens();
      startupOverlay.classList.add('show');
      startupError.textContent = '';
      startupReady = false;
      startupCommandInput.value = '';
      startupCommandInput.placeholder = 'Loading…';
      startupImageSelect.innerHTML = '';
      startupVarsBox.innerHTML = '<p class="server-list-empty">Loading…</p>';
      setStartupBusy(true);
      showControlNav();

      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 20000);
      try{
        const user = auth.currentUser;
        if(!user) throw new Error('Not signed in.');
        const idToken = await user.getIdToken();
        const res = await fetch(`${API_BASE}/server_startup_info`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken, docId: pendingControlDoc }),
          signal: ctrl.signal
        });
        const raw = await res.text();
        let data;
        try{ data = JSON.parse(raw); }catch(e){ throw new Error(`Bad backend response (HTTP ${res.status}).`); }
        if(req !== startupReq) return;
        if(!res.ok || !data.ok){
          failStartup(data.error || `Could not load startup info (HTTP ${res.status}).`);
          return;
        }

        const own = data.mode === 'own';
        startupOwn = own;
        startupExtras = Array.isArray(data.extras) ? data.extras : [];
        const imgField = startupImageSelect.closest('.field');
        if(imgField) imgField.style.display = own ? 'none' : '';
        startupCommandInput.readOnly = own;
        startupCommandInput.placeholder = '';
        startupCommandInput.value = data.startup_command || data.raw_startup_command || '';
        startupImageSelect.innerHTML = '';
        const images = data.docker_images || {};
        Object.entries(images).forEach(([label, image]) => {
          const opt = document.createElement('option');
          opt.value = image;
          opt.textContent = label;
          startupImageSelect.appendChild(opt);
        });
        if(data.docker_image && !Object.values(images).includes(data.docker_image)){
          const opt = document.createElement('option');
          opt.value = data.docker_image;
          opt.textContent = data.docker_image;
          startupImageSelect.appendChild(opt);
        }
        if(data.docker_image) startupImageSelect.value = data.docker_image;

        currentVariables = Array.isArray(data.variables) ? data.variables : [];
        renderVariables();
        startupReady = true;
        setStartupBusy(false);
      }catch(err){
        if(req !== startupReq) return;
        failStartup(err && err.name === 'AbortError' ? 'Backend timed out.' : ((err && err.message) || 'Could not reach the backend.'));
      }finally{
        clearTimeout(timer);
      }
    }

    startupSaveBtn.addEventListener('click', async () => {
      if(!pendingControlDoc || !startupReady) return;
      startupError.textContent = '';
      const environment = {};
      startupVarsBox.querySelectorAll('[data-env]').forEach((el) => { if(el._flush) el._flush(); });
      if(!startupOwn && filesAdd){
        filesAdd();
        if(startupError.textContent) return;
        startupCommandInput.value = startupCommandInput.value.replace(EXTRA_RE, '').trimEnd();
      }
      if(startupError.textContent) return;
      startupVarsBox.querySelectorAll('[data-env]').forEach((el) => {
        if(el.classList.contains('toggle-btn')){
          environment[el.dataset.env] = el.dataset.on === 'true' ? '1' : '0';
        }else{
          environment[el.dataset.env] = el.value;
        }
      });

      try{
        const idToken = await auth.currentUser.getIdToken();
        const res = await fetch(`${API_BASE}/server_startup_update`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            idToken,
            docId: pendingControlDoc,
            startup: startupCommandInput.value,
            image: startupImageSelect.value,
            environment,
            extras: startupOwn || !filesAdd ? undefined : (filesHasMain ? fileChips.slice(1) : fileChips)
          })
        });
        const data = await res.json();
        if(!data.ok){
          startupError.textContent = data.error || 'Could not save startup settings.';
          return;
        }
        if(data.startup_command) startupCommandInput.value = data.startup_command;
        if(data.note) startupError.textContent = data.note;
        startupSaveBtn.classList.add('saved');
        startupSaveBtn.textContent = 'Saved';
        setTimeout(() => { startupSaveBtn.classList.remove('saved'); startupSaveBtn.textContent = 'Save'; }, 1200);
      }catch(err){
        startupError.textContent = 'Could not reach the backend.';
      }
    });

    document.getElementById('navStartup').addEventListener('click', openStartupWindow);
  })();

(function(){
  const $ = id => document.getElementById(id);
  const overlay = $('pluginsOverlay'), qEl = $('plgQuery'), loaderEl = $('plgLoader'), versionEl = $('plgVersion'), sortEl = $('plgSort');
  const listEl = $('plgList'), statusEl = $('plgStatus'), pageEl = $('plgPage'), prevBtn = $('plgPrev'), nextBtn = $('plgNext');
  let page = 0, total = 0, limit = 20, reqId = 0, metaLoaded = false, timer = null, loadedDoc = null;
  const nf = new Intl.NumberFormat('en', { notation: 'compact' });

  try{ const l = localStorage.getItem('plgLoader'); if(l) loaderEl.value = l; }catch(e){}

  async function api(path, body){
    const user = auth.currentUser;
    if(!user) throw new Error('Not signed in.');
    const idToken = await user.getIdToken();
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken, docId: pendingControlDoc, ...body })
    });
    let data;
    try{ data = await res.json(); }catch(e){ throw new Error(`Bad backend response (HTTP ${res.status}).`); }
    if(!res.ok || !data.ok) throw new Error(data.error || `Request failed (HTTP ${res.status}).`);
    return data;
  }

  function el(tag, cls, text){
    const n = document.createElement(tag);
    if(cls) n.className = cls;
    if(text !== undefined) n.textContent = text;
    return n;
  }

  function setStatus(msg, isErr){
    statusEl.textContent = msg || '';
    statusEl.classList.toggle('err', !!isErr);
  }

  function card(h){
    const c = el('div', 'plg-card');
    const img = el('img', 'plg-icon');
    img.alt = '';
    img.loading = 'lazy';
    if(typeof h.icon_url === 'string' && h.icon_url.startsWith('https://cdn.modrinth.com/')) img.src = h.icon_url;
    const body = el('div', 'plg-body');
    const title = el('div', 'plg-title', h.title || h.slug || 'Untitled');
    title.appendChild(el('span', '', h.author ? `by ${h.author}` : ''));
    body.appendChild(title);
    body.appendChild(el('div', 'plg-desc', h.description || ''));
    const cats = (h.categories || []).slice(0, 3).join(' · ');
    body.appendChild(el('div', 'plg-meta', `${nf.format(h.downloads || 0)} downloads · ${nf.format(h.follows || 0)} follows${cats ? ' · ' + cats : ''}`));
    const btn = el('button', 'plg-btn', 'Install');
    btn.type = 'button';
    btn.addEventListener('click', () => install(h, btn));
    c.append(img, body, btn);
    return c;
  }

  async function install(h, btn){
    btn.disabled = true;
    btn.textContent = 'Installing…';
    setStatus('');
    try{
      const data = await api('/plugin_install', { project_id: h.project_id, loader: loaderEl.value, version: versionEl.value });
      btn.textContent = 'Installed ✓';
      setStatus(`Installed to ${data.directory}: ${data.installed.join(', ')}`);
    }catch(err){
      btn.disabled = false;
      btn.textContent = 'Retry';
      setStatus(err.message || 'Install failed.', true);
    }
  }

  async function search(){
    const id = ++reqId;
    setStatus('Loading…');
    listEl.replaceChildren();
    try{
      const data = await api('/plugin_search', { query: qEl.value.trim(), loader: loaderEl.value, version: versionEl.value, sort: sortEl.value, page });
      if(id !== reqId) return;
      total = data.total || 0;
      limit = data.limit || 20;
      data.hits.forEach(h => listEl.appendChild(card(h)));
      setStatus(data.hits.length ? '' : 'No results.');
      const pages = Math.max(1, Math.ceil(total / limit));
      pageEl.textContent = `Page ${page + 1} / ${pages}`;
      prevBtn.disabled = page <= 0;
      nextBtn.disabled = page + 1 >= pages;
    }catch(err){
      if(id !== reqId) return;
      setStatus(err.message || 'Could not load plugins.', true);
      pageEl.textContent = '';
      prevBtn.disabled = true;
      nextBtn.disabled = true;
    }
  }

  async function loadMeta(){
    try{
      const data = await api('/plugin_meta', {});
      const keep = versionEl.value;
      versionEl.innerHTML = '<option value="">Any version</option>';
      data.versions.forEach(v => versionEl.appendChild(new Option(v, v)));
      versionEl.value = keep;
      metaLoaded = true;
    }catch(err){}
  }

  function restart(){ page = 0; search(); }

  qEl.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(restart, 350); });
  loaderEl.addEventListener('change', () => { try{ localStorage.setItem('plgLoader', loaderEl.value); }catch(e){} restart(); });
  versionEl.addEventListener('change', restart);
  sortEl.addEventListener('change', restart);
  prevBtn.addEventListener('click', () => { if(page > 0){ page--; search(); } });
  nextBtn.addEventListener('click', () => { page++; search(); });

  $('navPlugins').addEventListener('click', () => {
    if(!pendingControlDoc) return;
    ['serverControlOverlay','filesOverlay','manageServersOverlay','serverUsersOverlay','startupOverlay'].forEach(o => $(o).classList.remove('show'));
    serverList.classList.remove('show');
    hideMcViews();
    overlay.classList.add('show');
    if(!metaLoaded) loadMeta();
    if(loadedDoc !== pendingControlDoc || !listEl.children.length){
      loadedDoc = pendingControlDoc;
      page = 0;
      search();
    }
  });
})();

(function(){
  const $ = id => document.getElementById(id);
  const COLORS = { '0':'#000000','1':'#0000aa','2':'#00aa00','3':'#00aaaa','4':'#aa0000','5':'#aa00aa','6':'#ffaa00','7':'#aaaaaa','8':'#555555','9':'#5555ff','a':'#55ff55','b':'#55ffff','c':'#ff5555','d':'#ff55ff','e':'#ffff55','f':'#ffffff' };
  const FORMATS = [['l','Bold'],['o','Italic'],['n','Underline'],['m','Strike'],['k','Magic'],['r','Reset']];
  const statusEl = $('cfgStatus'), motdBox = $('cfgMotd'), motdInput = $('motdInput'), motdPreview = $('motdPreview');
  const switches = ['cfgWhitelist','cfgCracked','cfgFly','cfgForceGm','cfgReqPack'];
  let motd = '', icon = null, loadedDoc = null, busy = false;

  function setStatus(msg, isErr){
    statusEl.textContent = msg || '';
    statusEl.classList.toggle('err', !!isErr);
  }

  async function api(path, body){
    const user = auth.currentUser;
    if(!user) throw new Error('Not signed in.');
    const idToken = await user.getIdToken();
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken, docId: pendingControlDoc, ...body })
    });
    let data;
    try{ data = await res.json(); }catch(e){ throw new Error(`Bad backend response (HTTP ${res.status}).`); }
    if(!res.ok || !data.ok) throw new Error(data.error || `Request failed (HTTP ${res.status}).`);
    return data;
  }

  function renderMc(text, box){
    box.replaceChildren();
    let st = {};
    const lines = String(text || '').split('\n').slice(0, 2);
    lines.forEach(line => {
      const row = document.createElement('div');
      let buf = '';
      const flush = () => {
        if(!buf) return;
        const sp = document.createElement('span');
        sp.textContent = buf;
        if(st.color) sp.style.color = COLORS[st.color];
        if(st.l) sp.style.fontWeight = '700';
        if(st.o) sp.style.fontStyle = 'italic';
        const deco = [st.n ? 'underline' : '', st.m ? 'line-through' : ''].filter(Boolean).join(' ');
        if(deco) sp.style.textDecoration = deco;
        if(st.k) sp.classList.add('mc-magic');
        row.appendChild(sp);
        buf = '';
      };
      for(let i = 0; i < line.length; i++){
        const ch = line[i], nx = (line[i + 1] || '').toLowerCase();
        if((ch === '&' || ch === '\u00a7') && /[0-9a-fk-or]/.test(nx)){
          flush();
          if(COLORS[nx]) st = { color: nx };
          else if(nx === 'r') st = {};
          else st = { ...st, [nx]: true };
          i++;
          continue;
        }
        buf += ch;
      }
      flush();
      box.appendChild(row);
    });
  }

  function setSwitch(id, on){
    const b = $(id);
    b.setAttribute('aria-checked', on ? 'true' : 'false');
    b.nextElementSibling.textContent = on ? 'On' : 'Off';
  }
  const getSwitch = id => $(id).getAttribute('aria-checked') === 'true';
  switches.forEach(id => $(id).addEventListener('click', () => setSwitch(id, !getSwitch(id))));

  function setIcon(b64){
    icon = null;
    const img = $('cfgIconImg');
    if(b64){
      img.src = 'data:image/png;base64,' + b64;
      img.hidden = false;
      $('cfgIconPh').hidden = true;
      $('cfgIcon').classList.add('has');
    }else{
      img.hidden = true;
      $('cfgIconPh').hidden = false;
      $('cfgIcon').classList.remove('has');
    }
  }

  $('cfgIconFile').addEventListener('change', e => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if(!file) return;
    const url = URL.createObjectURL(file);
    const im = new Image();
    im.onload = () => {
      const c = document.createElement('canvas');
      c.width = 64; c.height = 64;
      const side = Math.min(im.width, im.height);
      c.getContext('2d').drawImage(im, (im.width - side) / 2, (im.height - side) / 2, side, side, 0, 0, 64, 64);
      URL.revokeObjectURL(url);
      const b64 = c.toDataURL('image/png').split(',')[1];
      setIcon(b64);
      icon = b64;
    };
    im.onerror = () => { URL.revokeObjectURL(url); setStatus('Could not read that image.', true); };
    im.src = url;
  });

  $('cfgCopy').addEventListener('click', async () => {
    const ip = $('cfgIp').textContent;
    if(!ip || ip === '—') return;
    try{ await navigator.clipboard.writeText(ip); $('cfgCopy').textContent = 'Copied'; setTimeout(() => { $('cfgCopy').textContent = 'Copy'; }, 1200); }catch(e){}
  });

  function packUi(){ $('cfgPackLinkWrap').hidden = $('cfgPackType').value !== 'link'; }
  $('cfgPackType').addEventListener('change', packUi);
  $('cfgSlots').addEventListener('input', () => {
    const n = parseInt($('cfgSlots').value, 10);
    $('cfgSlotsHint').textContent = n > 0 ? `Up to ${n} member${n === 1 ? '' : 's'} can be online at once.` : 'Total members that can be online at once.';
  });

  (function buildTz(){
    let zones = [];
    try{ zones = Intl.supportedValuesOf('timeZone'); }catch(e){}
    if(!zones.length) zones = ['UTC','Asia/Calcutta','Asia/Dubai','Asia/Tokyo','Europe/London','Europe/Berlin','America/New_York','America/Chicago','America/Los_Angeles','Australia/Sydney'];
    if(!zones.includes('UTC')) zones.unshift('UTC');
    const dl = $('cfgTzList');
    zones.forEach(z => { const o = document.createElement('option'); o.value = z; dl.appendChild(o); });
  })();

  (function buildEditor(){
    const sw = $('motdSwatches'), fm = $('motdFmts');
    Object.entries(COLORS).forEach(([k, c]) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'motd-swatch'; b.style.background = c; b.title = '&' + k; b.dataset.code = k;
      sw.appendChild(b);
    });
    FORMATS.forEach(([k, label]) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'plg-btn'; b.textContent = `${label} &${k}`; b.dataset.code = k;
      fm.appendChild(b);
    });
    [sw, fm].forEach(box => box.addEventListener('click', e => {
      const b = e.target.closest('[data-code]');
      if(!b) return;
      const s = motdInput.selectionStart, en = motdInput.selectionEnd;
      motdInput.setRangeText('&' + b.dataset.code, s, en, 'end');
      motdInput.focus();
      motdInput.dispatchEvent(new Event('input'));
    }));
  })();

  motdInput.addEventListener('input', () => {
    const lines = motdInput.value.split('\n');
    if(lines.length > 2) motdInput.value = lines.slice(0, 2).join('\n');
    renderMc(motdInput.value, motdPreview);
  });
  $('cfgEditMotd').addEventListener('click', () => {
    motdInput.value = motd;
    renderMc(motd, motdPreview);
    $('motdOverlay').classList.add('show');
    motdInput.focus();
  });
  const closeMotd = () => $('motdOverlay').classList.remove('show');
  $('motdClose').addEventListener('click', closeMotd);
  $('motdCancel').addEventListener('click', closeMotd);
  $('motdApply').addEventListener('click', () => {
    motd = motdInput.value;
    renderMc(motd, motdBox);
    closeMotd();
  });

  async function load(){
    setStatus('Loading…');
    try{
      const d = await api('/mc_config_get', {});
      const p = d.props || {};
      $('cfgIp').textContent = d.ip || '—';
      motd = d.motd || '';
      renderMc(motd, motdBox);
      setIcon(d.icon);
      $('cfgSlots').value = p['max-players'];
      $('cfgSlots').dispatchEvent(new Event('input'));
      $('cfgGamemode').value = p['gamemode'];
      $('cfgDifficulty').value = p['difficulty'];
      setSwitch('cfgWhitelist', p['white-list'] === 'true');
      setSwitch('cfgCracked', p['online-mode'] === 'false');
      setSwitch('cfgFly', p['allow-flight'] === 'true');
      setSwitch('cfgForceGm', p['force-gamemode'] === 'true');
      $('cfgSpawn').value = p['spawn-protection'];
      setSwitch('cfgReqPack', p['require-resource-pack'] === 'true');
      $('cfgPackType').value = p['resource-pack'] ? 'link' : 'none';
      $('cfgPackLink').value = p['resource-pack'] || '';
      packUi();
      const tz = $('cfgTz');
      tz.value = d.tz || '';
      tz.disabled = !d.tz_supported;
      tz.placeholder = d.tz_supported ? 'Asia/Calcutta' : 'Not supported by this server';
      const env = $('cfgEnv');
      env.innerHTML = '';
      Object.entries(d.images || {}).forEach(([label, image]) => env.appendChild(new Option(label, image)));
      if(d.image && ![...env.options].some(o => o.value === d.image)) env.appendChild(new Option(d.image, d.image));
      env.value = d.image || '';
      env.disabled = !env.options.length;
      loadedDoc = pendingControlDoc;
      setStatus('');
    }catch(err){
      setStatus(err.message || 'Could not load configuration.', true);
    }
  }

  $('cfgSave').addEventListener('click', async () => {
    if(busy) return;
    busy = true;
    const btn = $('cfgSave');
    btn.disabled = true;
    btn.textContent = 'Saving…';
    setStatus('');
    try{
      const body = {
        motd,
        slots: $('cfgSlots').value,
        gamemode: $('cfgGamemode').value,
        difficulty: $('cfgDifficulty').value,
        whitelist: getSwitch('cfgWhitelist'),
        cracked: getSwitch('cfgCracked'),
        fly: getSwitch('cfgFly'),
        force_gamemode: getSwitch('cfgForceGm'),
        spawn_protection: $('cfgSpawn').value,
        require_resource_pack: getSwitch('cfgReqPack'),
        resource_pack: $('cfgPackType').value === 'link' ? $('cfgPackLink').value.trim() : '',
        tz: $('cfgTz').disabled ? '' : $('cfgTz').value.trim(),
        image: $('cfgEnv').disabled ? '' : $('cfgEnv').value
      };
      if(icon) body.icon = icon;
      const d = await api('/mc_config_save', body);
      icon = null;
      setStatus(d.warnings && d.warnings.length ? `Saved. Note: ${d.warnings.join(', ')}.` : 'Saved. Start the server to apply.');
    }catch(err){
      setStatus(err.message || 'Save failed.', true);
    }finally{
      busy = false;
      btn.disabled = false;
      btn.textContent = 'Save changes';
    }
  });

  $('navConfig').addEventListener('click', () => {
    if(!pendingControlDoc) return;
    ['serverControlOverlay','filesOverlay','manageServersOverlay','serverUsersOverlay','startupOverlay'].forEach(o => $(o).classList.remove('show'));
    serverList.classList.remove('show');
    hideMcViews();
    $('mcConfigOverlay').classList.add('show');
    load();
  });
})();

(function(){
  const $ = id => document.getElementById(id);
  const DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const ACTIONS = { restart: 'Restart', stop: 'Stop', start: 'Start' };
  const pad = n => String(n).padStart(2, '0');
  const isNum = v => /^\d+$/.test(String(v));
  const listEl = $('schList'), statusEl = $('schStatus'), errEl = $('schError');
  let items = [], editing = null, days = new Set(), busy = false;

  function setStatus(msg, isErr){ statusEl.textContent = msg || ''; statusEl.classList.toggle('err', !!isErr); }
  function setErr(msg){ errEl.textContent = msg || ''; errEl.classList.toggle('err', !!msg); }
  function el(tag, cls, text){ const n = document.createElement(tag); if(cls) n.className = cls; if(text !== undefined) n.textContent = text; return n; }

  async function api(path, body){
    const user = auth.currentUser;
    if(!user) throw new Error('Not signed in.');
    const idToken = await user.getIdToken();
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken, docId: pendingControlDoc, ...body })
    });
    let data;
    try{ data = await res.json(); }catch(e){ throw new Error(`Bad backend response (HTTP ${res.status}).`); }
    if(!res.ok || !data.ok) throw new Error(data.error || `Request failed (HTTP ${res.status}).`);
    return data;
  }

  function parseCron(c){
    const mi = c.minute, h = c.hour, dm = c.day_of_month, mo = c.month, dw = c.day_of_week;
    if(isNum(mi) && /^\*\/\d+$/.test(h) && dm === '*' && mo === '*' && dw === '*') return { mode: 'hours', every: +h.slice(2), minute: +mi };
    if(isNum(mi) && isNum(h) && dm === '*' && mo === '*'){
      const time = `${pad(h)}:${pad(mi)}`;
      if(dw === '*') return { mode: 'daily', time };
      if(/^[0-6](,[0-6])*$/.test(dw)) return { mode: 'weekly', time, days: dw.split(',').map(Number) };
    }
    return { mode: 'custom' };
  }

  function describe(c){
    const p = parseCron(c);
    if(p.mode === 'hours') return `Every ${p.every === 1 ? 'hour' : p.every + ' hours'} at :${pad(p.minute)}`;
    if(p.mode === 'daily') return `Every day at ${p.time}`;
    if(p.mode === 'weekly') return `${[...new Set(p.days)].sort().map(d => DOW[d]).join(', ')} at ${p.time}`;
    return `Cron: ${c.minute} ${c.hour} ${c.day_of_month} ${c.month} ${c.day_of_week}`;
  }

  const fmtDate = v => { if(!v) return '—'; const d = new Date(v); return isNaN(d) ? '—' : d.toLocaleString(); };

  function card(it){
    const c = el('div', 'plg-card sch-card');
    c.style.flexWrap = 'wrap';
    const body = el('div', 'plg-body');
    const title = el('div', 'plg-title', it.name || 'Untitled');
    title.appendChild(el('span', 'sch-badge', ACTIONS[it.action] || 'Restart'));
    body.appendChild(title);
    body.appendChild(el('div', 'plg-desc', describe(it.cron || {})));
    body.appendChild(el('div', 'plg-meta', `Next: ${it.is_active ? fmtDate(it.next_run_at) : 'paused'} · Last: ${fmtDate(it.last_run_at)}${it.warn ? ' · Warns players' : ''}${it.only_when_online ? ' · Only when online' : ''}`));
    const act = el('div', 'sch-actions');
    const sw = el('button', 'mc-switch');
    sw.type = 'button';
    sw.setAttribute('role', 'switch');
    sw.setAttribute('aria-checked', it.is_active ? 'true' : 'false');
    sw.title = it.is_active ? 'Active' : 'Paused';
    sw.innerHTML = '<span></span>';
    sw.addEventListener('click', async () => {
      const next = sw.getAttribute('aria-checked') !== 'true';
      sw.setAttribute('aria-checked', next ? 'true' : 'false');
      try{ await api('/schedule_active', { schedule_id: it.id, active: next }); await load(); }
      catch(err){ sw.setAttribute('aria-checked', next ? 'false' : 'true'); setStatus(err.message, true); }
    });
    const run = el('button', 'plg-btn', 'Run now'); run.type = 'button';
    run.addEventListener('click', async () => {
      run.disabled = true;
      try{ await api('/schedule_run', { schedule_id: it.id }); setStatus(`"${it.name}" started.`); }
      catch(err){ setStatus(err.message, true); }
      run.disabled = false;
    });
    const edit = el('button', 'plg-btn', 'Edit'); edit.type = 'button';
    edit.addEventListener('click', () => openModal(it));
    const del = el('button', 'plg-btn danger', 'Delete'); del.type = 'button';
    del.addEventListener('click', async () => {
      if(!confirm(`Delete schedule "${it.name}"?`)) return;
      try{ await api('/schedule_delete', { schedule_id: it.id }); setStatus('Deleted.'); await load(); }
      catch(err){ setStatus(err.message, true); }
    });
    act.append(sw, run, edit, del);
    c.append(body, act);
    return c;
  }

  function render(){
    listEl.replaceChildren();
    if(!items.length){
      listEl.appendChild(el('p', 'server-list-empty', 'No schedules yet. Create one to restart your server automatically.'));
      return;
    }
    items.forEach(it => listEl.appendChild(card(it)));
  }

  async function load(){
    try{
      const d = await api('/schedule_list', {});
      items = d.schedules || [];
      render();
    }catch(err){
      setStatus(err.message || 'Could not load schedules.', true);
    }
  }

  function setSwitch(id, on){ const b = $(id); b.setAttribute('aria-checked', on ? 'true' : 'false'); b.nextElementSibling.textContent = on ? 'On' : 'Off'; }
  const getSwitch = id => $(id).getAttribute('aria-checked') === 'true';
  ['schWarn','schOnline','schActive'].forEach(id => $(id).addEventListener('click', () => setSwitch(id, !getSwitch(id))));

  (function buildDays(){
    DOW.forEach((n, i) => {
      const b = el('button', 'sch-day', n);
      b.type = 'button';
      b.dataset.d = i;
      b.addEventListener('click', () => { if(days.has(i)) days.delete(i); else days.add(i); b.classList.toggle('on', days.has(i)); });
      $('schDays').appendChild(b);
    });
  })();

  function syncDays(){ $('schDays').querySelectorAll('.sch-day').forEach(b => b.classList.toggle('on', days.has(+b.dataset.d))); }

  function syncMode(){
    const m = $('schMode').value;
    $('schHoursWrap').hidden = m !== 'hours';
    $('schTimeWrap').hidden = !(m === 'daily' || m === 'weekly');
    $('schDaysWrap').hidden = m !== 'weekly';
    $('schCustomWrap').hidden = m !== 'custom';
    $('schWarn').closest('.cfg-row').hidden = $('schAction').value === 'start';
  }
  $('schMode').addEventListener('change', syncMode);
  $('schAction').addEventListener('change', syncMode);

  function openModal(it){
    editing = it;
    setErr('');
    $('schTitle').textContent = it ? 'Edit schedule' : 'New schedule';
    $('schName').value = it ? it.name : 'Daily restart';
    $('schAction').value = it ? it.action : 'restart';
    const p = it ? parseCron(it.cron || {}) : { mode: 'daily', time: '04:00' };
    $('schMode').value = p.mode;
    $('schEvery').value = String(p.every || 6);
    if(![...$('schEvery').options].some(o => o.value === $('schEvery').value)) $('schEvery').appendChild(new Option($('schEvery').value, $('schEvery').value));
    $('schEvery').value = String(p.every || 6);
    $('schMinute').value = p.minute || 0;
    $('schTime').value = p.time || '04:00';
    days = new Set(p.days || [1]);
    syncDays();
    const c = it ? it.cron || {} : {};
    $('schCMin').value = c.minute ?? '0';
    $('schCHour').value = c.hour ?? '4';
    $('schCDom').value = c.day_of_month ?? '*';
    $('schCMon').value = c.month ?? '*';
    $('schCDow').value = c.day_of_week ?? '*';
    setSwitch('schWarn', it ? it.warn : true);
    setSwitch('schOnline', it ? it.only_when_online : false);
    setSwitch('schActive', it ? it.is_active : true);
    syncMode();
    $('schModal').classList.add('show');
  }
  const closeModal = () => $('schModal').classList.remove('show');
  $('schClose').addEventListener('click', closeModal);
  $('schCancel').addEventListener('click', closeModal);
  $('schNew').addEventListener('click', () => openModal(null));

  function buildCron(){
    const m = $('schMode').value;
    if(m === 'hours'){
      const mi = parseInt($('schMinute').value, 10);
      if(!(mi >= 0 && mi <= 59)) throw new Error('Minute must be 0-59.');
      return { minute: String(mi), hour: `*/${$('schEvery').value}`, day_of_month: '*', month: '*', day_of_week: '*' };
    }
    if(m === 'daily' || m === 'weekly'){
      const t = $('schTime').value;
      if(!/^\d{2}:\d{2}$/.test(t)) throw new Error('Pick a time.');
      const [hh, mm] = t.split(':').map(Number);
      let dw = '*';
      if(m === 'weekly'){
        if(!days.size) throw new Error('Pick at least one day.');
        dw = [...days].sort().join(',');
      }
      return { minute: String(mm), hour: String(hh), day_of_month: '*', month: '*', day_of_week: dw };
    }
    const c = { minute: $('schCMin').value.trim(), hour: $('schCHour').value.trim(), day_of_month: $('schCDom').value.trim(), month: $('schCMon').value.trim(), day_of_week: $('schCDow').value.trim() };
    if(Object.values(c).some(v => !/^[0-9*\/,\-]{1,40}$/.test(v))) throw new Error('Cron fields may only use digits and * / , -');
    return c;
  }

  $('schSave').addEventListener('click', async () => {
    if(busy) return;
    setErr('');
    const name = $('schName').value.trim();
    if(!name){ setErr('Enter a name.'); return; }
    let cron;
    try{ cron = buildCron(); }catch(err){ setErr(err.message); return; }
    busy = true;
    const btn = $('schSave');
    btn.disabled = true;
    btn.textContent = 'Saving…';
    try{
      await api('/schedule_save', {
        schedule_id: editing ? editing.id : null,
        name,
        cron,
        action: $('schAction').value,
        warn: $('schAction').value !== 'start' && getSwitch('schWarn'),
        only_when_online: getSwitch('schOnline'),
        is_active: getSwitch('schActive')
      });
      closeModal();
      setStatus('Saved.');
      await load();
    }catch(err){
      setErr(err.message || 'Save failed.');
    }finally{
      busy = false;
      btn.disabled = false;
      btn.textContent = 'Save';
    }
  });

  $('navSchedule').addEventListener('click', () => {
    if(!pendingControlDoc) return;
    ['serverControlOverlay','filesOverlay','manageServersOverlay','serverUsersOverlay','startupOverlay'].forEach(o => $(o).classList.remove('show'));
    serverList.classList.remove('show');
    hideMcViews();
    $('scheduleOverlay').classList.add('show');
    setStatus('Loading…');
    load().then(() => { if(statusEl.textContent === 'Loading…') setStatus(''); });
  });
})();

(function(){
  const $ = id => document.getElementById(id);
  const esc = t => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const HIDE = ['serverControlOverlay','filesOverlay','manageServersOverlay','serverUsersOverlay','startupOverlay'];
  const PERMS = [['start','Start server'],['stop','Stop server'],['restart','Restart server'],['kill','Kill server'],['console','Console & commands'],['files','Manage files'],['edit_files','Edit files'],['config','Configurations'],['plugins','Plugins'],['schedule','Schedule'],['startup','Startup'],['members','Manage members'],['worlds','Worlds'],['access','Add member']];
  const NAVS = [['navTerminal','console'],['navFiles','files'],['navDatabase','files'],['navSchedule','schedule'],['navConfig','config'],['navPlugins','plugins'],['navMembers','members'],['navWorlds','worlds'],['navAccess','access']];
  const PWR = [['pwrStart','start'],['pwrStop','stop'],['pwrRestart','restart']];

  async function api(path, body){
    const user = auth.currentUser;
    if(!user) throw new Error('Not signed in.');
    const idToken = await user.getIdToken();
    const res = await fetch(`${API_BASE}${path}`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ idToken, docId: pendingControlDoc, ...body }) });
    let data;
    try{ data = await res.json(); }catch(e){ throw new Error(`Bad backend response (HTTP ${res.status}).`); }
    if(!res.ok || !data.ok) throw new Error(data.error || `Request failed (HTTP ${res.status}).`);
    return data;
  }
  function open(id){
    if(!pendingControlDoc) return;
    HIDE.forEach(o => $(o).classList.remove('show'));
    serverList.classList.remove('show');
    hideMcViews();
    $(id).classList.add('show');
  }

  window.applyMcPerms = async function(){
    const doc = pendingControlDoc;
    try{
      const d = await api('/server_perms', {});
      if(doc !== pendingControlDoc) return;
      PWR.forEach(([id]) => { const x = $(id); if(x) x.style.display = ''; });
      if(!d.perms) return;
      NAVS.forEach(([id, p]) => { if(!d.perms[p]) $(id).style.display = 'none'; });
      PWR.forEach(([id, p]) => { const b = $(id); if(b) b.style.display = d.perms[p] ? '' : 'none'; });
    }catch(e){}
  };

  const mm = { tab:'whitelist', data:null, doc:null, busy:false };
  const TITLES = { whitelist:'Whitelisted players', ops:'Operators', banned:'Banned players', bannedIps:'Banned IPs', known:'Players who have joined' };
  const ADD = { whitelist:'whitelist_add', ops:'op_add', banned:'ban', bannedIps:'banip' };
  const REM = { whitelist:'whitelist_remove', ops:'op_remove', banned:'unban', bannedIps:'unbanip' };
  const status = (m, err) => { $('mmStatus').textContent = m || ''; $('mmStatus').classList.toggle('err', !!err); };
  const headImg = n => `<img class="mm-head" loading="lazy" alt="" src="https://mc-heads.net/avatar/${encodeURIComponent(n)}/64">`;
  const IPICO = '<span class="mm-ipico"><svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="1.8"/><path d="M3.5 12h17M12 3.5c2.3 2.4 3.5 5.2 3.5 8.5s-1.2 6.1-3.5 8.5c-2.3-2.4-3.5-5.2-3.5-8.5S9.7 5.9 12 3.5z" stroke="currentColor" stroke-width="1.8"/></svg></span>';

  function card(n, sub, btn, key, danger){
    const el = document.createElement('div');
    el.className = 'mm-card';
    el.innerHTML = `${key === 'ip' ? IPICO : headImg(n)}<div class="mm-name">${esc(n)}${sub ? `<small>${esc(sub)}</small>` : ''}</div>${btn ? `<button type="button" class="plg-btn${danger ? ' danger' : ''}">${btn}</button>` : ''}`;
    return el;
  }
  const has = (lst, f, v) => lst.some(p => String(p[f]).toLowerCase() === v.toLowerCase());

  function render(){
    const d = mm.data, t = mm.tab, list = $('mmList'), pick = $('mmPick'), bar = $('mmBar'), inp = $('mmInput');
    document.querySelectorAll('#mmTabs .mm-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === t));
    list.replaceChildren(); pick.replaceChildren();
    bar.style.display = t === 'known' ? 'none' : 'flex';
    inp.placeholder = t === 'bannedIps' ? 'IP address to ban…' : (t === 'whitelist' || t === 'ops') ? 'Search players or type a name…' : 'Player name to ban…';
    $('mmAdd').textContent = t === 'banned' || t === 'bannedIps' ? 'Ban' : 'Add';
    $('mmListTitle').textContent = d ? TITLES[t] : '';
    if(!d) return;
    const q = inp.value.trim().toLowerCase();
    const rows = d[t];
    if(t === 'whitelist' || t === 'ops'){
      if(q){
        d.known.filter(p => p.name.toLowerCase().includes(q) && !has(rows, 'name', p.name)).slice(0, 12).forEach(p => {
          const c = card(p.name, '', 'Add', 'p');
          c.querySelector('button').addEventListener('click', () => act(ADD[t], { name:p.name }));
          pick.appendChild(c);
        });
      }
    }else if(t === 'banned' && q){
      d.known.filter(p => p.name.toLowerCase().includes(q) && !has(rows, 'name', p.name)).slice(0, 12).forEach(p => {
        const c = card(p.name, '', 'Ban', 'p', true);
        c.querySelector('button').addEventListener('click', () => act('ban', { name:p.name }));
        pick.appendChild(c);
      });
    }
    rows.forEach(p => {
      if(t === 'bannedIps'){
        const c = card(p.ip, p.reason, 'Unban', 'ip', true);
        c.querySelector('button').addEventListener('click', () => act('unbanip', { ip:p.ip }));
        list.appendChild(c);
      }else if(t === 'known'){
        list.appendChild(card(p.name, '', '', 'p'));
      }else{
        const sub = t === 'banned' ? p.reason : t === 'ops' && p.level ? `Level ${p.level}` : '';
        const c = card(p.name, sub, t === 'banned' ? 'Unban' : 'Remove', 'p', true);
        c.querySelector('button').addEventListener('click', () => act(REM[t], { name:p.name }));
        list.appendChild(c);
      }
    });
  }

  async function load(){
    try{
      mm.data = await api('/mc_members_get', {});
      mm.doc = pendingControlDoc;
      status('');
    }catch(e){ status(e.message, true); }
    render();
  }

  async function act(action, extra){
    if(mm.busy) return;
    mm.busy = true;
    status('Working…');
    try{
      const r = await api('/mc_members_action', { action, ...extra });
      $('mmInput').value = '';
      await new Promise(res => setTimeout(res, r.live ? 900 : 100));
      await load();
    }catch(e){ status(e.message, true); }
    mm.busy = false;
  }

  document.querySelectorAll('#mmTabs .mm-tab').forEach(b => b.addEventListener('click', () => { mm.tab = b.dataset.tab; $('mmInput').value = ''; render(); }));
  $('mmInput').addEventListener('input', render);
  $('mmInput').addEventListener('keydown', e => { if(e.key === 'Enter') $('mmAdd').click(); });
  $('mmAdd').addEventListener('click', () => {
    const v = $('mmInput').value.trim();
    if(!v || !ADD[mm.tab]) return;
    act(ADD[mm.tab], mm.tab === 'bannedIps' ? { ip:v } : { name:v });
  });
  $('navMembers').addEventListener('click', () => {
    open('membersOverlay');
    if(mm.doc !== pendingControlDoc){ mm.data = null; mm.tab = 'whitelist'; $('mmInput').value = ''; }
    render();
    load();
  });

  const ac = { perms:{}, users:[], full:false };
  const MC_ONLY = ['config','plugins','members','worlds'];
  const isMc = () => window.mcCtx !== false;
  const visPerms = () => isMc() ? PERMS : PERMS.filter(([k]) => !MC_ONLY.includes(k));
  const aStatus = (m, err) => { $('accStatus').textContent = m || ''; $('accStatus').classList.toggle('err', !!err); };
  function renderPerms(){
    const box = $('accPerms');
    box.replaceChildren();
    visPerms().forEach(([k, label]) => {
      const row = document.createElement('div');
      row.className = 'mm-card';
      row.innerHTML = `<div class="mm-name">${label}</div><button type="button" class="mm-sw${ac.perms[k] ? ' on' : ''}" aria-label="${label}"></button>`;
      row.querySelector('.mm-sw').addEventListener('click', e => { ac.perms[k] = !ac.perms[k]; e.currentTarget.classList.toggle('on', ac.perms[k]); });
      box.appendChild(row);
    });
  }
  function paintSpecs(){
    $('accSpecs').style.display = isMc() ? 'none' : '';
    $('accFull').classList.toggle('on', ac.full);
    $('accLimits').style.display = ac.full || !document.body.classList.contains('role-admin') ? 'none' : '';
  }
  $('accFull').addEventListener('click', () => { ac.full = !ac.full; paintSpecs(); });
  function resetForm(){
    $('accEmail').value = ''; $('accPass').value = ''; $('accEmail').readOnly = false;
    $('accCpu').value = $('accRam').value = $('accDisk').value = ''; $('accExpiry').value = '';
    $('accFormTitle').textContent = 'Add Members';
    ac.full = isMc();
    ac.perms = { start:true, stop:true, restart:true, console:true, files:true };
    paintSpecs();
    renderPerms();
  }
  const dayOf = t => { if(!t) return ''; const d = new Date(t); return isNaN(d) ? '' : d.toISOString().slice(0, 10); };
  function editUser(u){
    $('accEmail').value = u.email; $('accEmail').readOnly = true; $('accPass').value = '';
    $('accFormTitle').textContent = 'Edit Member';
    ac.full = isMc() ? true : !!u.fullAccess;
    $('accCpu').value = u.cpuLimit || ''; $('accRam').value = u.ramLimit || ''; $('accDisk').value = u.storageLimit || '';
    $('accExpiry').value = dayOf(u.expiryTimestamp);
    ac.perms = {}; PERMS.forEach(([k]) => { ac.perms[k] = !u.perms || !!u.perms[k]; });
    paintSpecs();
    renderPerms();
  }
  async function removeUser(u){
    if(!confirm(`Remove access for ${u.email}?`)) return;
    try{ await api('/remove_server_access', { email:u.email }); await loadUsers(); }catch(err){ aStatus(err.message, true); }
  }
  function renderUsers(){
    return;
  }
  async function loadUsers(){
    try{
      const d = await api('/server_access_list', {});
      ac.users = (d.users || []).filter(u => isMc() ? u.fullAccess : true);
      ac.counts = d.counts || null;
      aStatus('');
    }catch(e){ aStatus(e.message, true); }
    renderUsers();
  }
  $('accSave').addEventListener('click', async () => {
    const email = $('accEmail').value.trim();
    if(!email){ aStatus('Enter an email.', true); return; }
    aStatus('Saving…');
    const perms = {};
    PERMS.forEach(([k]) => { perms[k] = (isMc() || !MC_ONLY.includes(k)) ? !!ac.perms[k] : false; });
    const full = isMc() ? true : ac.full;
    try{
      await api('/assign_server_access', { email, password:$('accPass').value, fullAccess:full, perms, cpuLimit: full || !document.body.classList.contains('role-admin') ? null : $('accCpu').value, ramLimit: full || !document.body.classList.contains('role-admin') ? null : $('accRam').value, storageLimit: full || !document.body.classList.contains('role-admin') ? null : $('accDisk').value, expiry: $('accExpiry').value || null });
      resetForm();
      await loadUsers();
      aStatus('Saved.');
    }catch(e){ aStatus(e.message, true); }
  });
  $('accReset').addEventListener('click', resetForm);
  window.xtAccReset = resetForm;
  $('navAccess').addEventListener('click', () => {
    open('accessOverlay');
    resetForm();
    renderUsers();
    loadUsers();
  });
})();

(function(){
  const $ = id => document.getElementById(id);
  async function api(path, body){
    const user = auth.currentUser;
    if(!user) throw new Error('Not signed in.');
    const idToken = await user.getIdToken();
    const res = await fetch(`${API_BASE}${path}`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ idToken, docId: pendingControlDoc, ...body }) });
    let data;
    try{ data = await res.json(); }catch(e){ throw new Error(`Bad backend response (HTTP ${res.status}).`); }
    if(!res.ok || !data.ok) throw new Error(data.error || `Request failed (HTTP ${res.status}).`);
    return data;
  }

  const NAMES = { overworld:'Overworld', nether:'Nether', end:'The End' };
  let cur = null, info = null, busy = false, infoDoc = null;
  const wst = (m, err) => { $('wdStatus').textContent = m || ''; $('wdStatus').classList.toggle('err', !!err); };
  const lock = on => { busy = on; document.querySelectorAll('.wd-opt').forEach(b => b.disabled = on); };

  function tags(){
    document.querySelectorAll('.wd-box').forEach(b => {
      const miss = info && !info.worlds[b.dataset.dim];
      let t = b.querySelector('.wd-tag');
      if(miss && !t){ t = document.createElement('em'); t.className = 'wd-tag'; t.style.fontStyle = 'normal'; t.textContent = 'Not generated'; b.appendChild(t); }
      else if(!miss && t) t.remove();
    });
  }
  async function loadInfo(){
    try{ info = await api('/mc_worlds_info', {}); infoDoc = pendingControlDoc; tags(); }catch(e){}
  }
  function showGrid(){ $('worldsGrid').style.display = ''; $('worldDetail').style.display = 'none'; $('wdGen').style.display = 'none'; cur = null; }
  function showWorld(dim){
    cur = dim;
    $('worldsGrid').style.display = 'none';
    $('worldDetail').style.display = 'block';
    $('wdTitle').textContent = NAMES[dim];
    $('wdGen').style.display = 'none';
    wst('');
  }

  document.querySelectorAll('.wd-box').forEach(b => b.addEventListener('click', () => showWorld(b.dataset.dim)));
  $('wdBack').addEventListener('click', showGrid);
  $('navWorlds').addEventListener('click', () => {
    showGrid();
    if(infoDoc !== pendingControlDoc) info = null;
    tags();
    loadInfo();
  });

  async function download(){
    lock(true); wst('Preparing archive…');
    try{
      const user = auth.currentUser, idToken = await user.getIdToken();
      const res = await fetch(`${API_BASE}/mc_world_download`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ idToken, docId: pendingControlDoc, dim: cur }) });
      if(!res.ok){
        let m = `Request failed (HTTP ${res.status}).`;
        try{ m = (await res.json()).error || m; }catch(e){}
        throw new Error(m);
      }
      wst('Downloading…');
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement('a');
      a.href = url; a.download = `${cur}.tar.gz`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      wst('Downloaded.');
    }catch(e){ wst(e.message, true); }
    lock(false);
  }

  async function upload(file){
    const ext = /\.zip$/i.test(file.name) ? 'zip' : /\.(tar\.gz|tgz)$/i.test(file.name) ? 'tar.gz' : '';
    if(!ext){ wst('Choose a .zip or .tar.gz archive.', true); return; }
    if(!confirm(`Replace the ${NAMES[cur]} with ${file.name}? The current one will be deleted.`)) return;
    lock(true); wst('Uploading…');
    try{
      const user = auth.currentUser, idToken = await user.getIdToken();
      const form = new FormData();
      form.append('idToken', idToken);
      form.append('docId', pendingControlDoc);
      form.append('path', '/');
      form.append('file', new File([file], ext === 'zip' ? '_xt_upload.zip' : '_xt_upload.tar.gz'));
      const res = await fetch(`${API_BASE}/upload_file`, { method:'POST', body: form });
      let data = {};
      try{ data = await res.json(); }catch(e){}
      if(!res.ok || !data.ok) throw new Error(data.error || `Upload failed (HTTP ${res.status}).`);
      wst('Installing world…');
      await api('/mc_world_upload', { dim: cur, ext });
      wst('World replaced.');
      loadInfo();
    }catch(e){ wst(e.message, true); }
    lock(false);
  }

  function files(){
    const p = info && info.worlds[cur];
    if(!p){ wst('This world has not been generated yet.', true); return; }
    window.openFilesAt('/' + p);
  }

  function gen(){
    $('wdGen').style.display = 'block';
    const ow = cur === 'overworld';
    $('wdSeed').style.display = ow ? '' : 'none';
    $('wdSeed').value = '';
    $('wdGenHint').textContent = ow ? 'Deletes the Overworld, Nether and End. A new world is created on next start.' : `Deletes the ${NAMES[cur]}. It is created again on next start.`;
  }
  $('wdGenCancel').addEventListener('click', () => { $('wdGen').style.display = 'none'; });
  $('wdGenGo').addEventListener('click', async () => {
    if(busy) return;
    if(!confirm(`Delete and regenerate ${cur === 'overworld' ? 'all worlds' : NAMES[cur]}? This cannot be undone.`)) return;
    lock(true); wst('Working…');
    try{
      await api('/mc_world_generate', { dim: cur, seed: $('wdSeed').value });
      $('wdGen').style.display = 'none';
      wst('Done. Start the server to generate it.');
      loadInfo();
    }catch(e){ wst(e.message, true); }
    lock(false);
  });

  document.querySelectorAll('.wd-opt').forEach(b => b.addEventListener('click', () => {
    if(busy || !cur) return;
    const o = b.dataset.opt;
    if(o === 'download') download();
    else if(o === 'upload') $('wdFile').click();
    else if(o === 'files') files();
    else gen();
  }));
  $('wdFile').addEventListener('change', () => { const f = $('wdFile').files[0]; $('wdFile').value = ''; if(f) upload(f); });

  const vi = { soft:null, list:[], cache:{} };
  const vst = (m, err) => { $('viStatus').textContent = m || ''; $('viStatus').classList.toggle('err', !!err); };
  const LABEL = { vanilla:'Vanilla', paper:'Paper', folia:'Folia', purpur:'Purpur', fabric:'Fabric' };

  function renderVers(){
    const q = $('viSearch').value.trim().toLowerCase(), box = $('viVers');
    box.replaceChildren();
    vi.list.filter(v => v.toLowerCase().includes(q)).forEach(v => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'vi-ver'; b.textContent = v;
      b.addEventListener('click', () => install(v));
      box.appendChild(b);
    });
  }
  async function pick(soft){
    vi.soft = soft;
    $('viSoft').style.display = 'none';
    $('viPick').style.display = 'block';
    $('viTitle').textContent = LABEL[soft];
    $('viSearch').value = '';
    vi.list = vi.cache[soft] || [];
    renderVers();
    if(vi.list.length) return;
    vst('Loading versions…');
    try{
      const d = await api('/mc_versions', { software: soft });
      vi.cache[soft] = vi.list = d.versions || [];
      vst('');
      renderVers();
    }catch(e){ vst(e.message, true); }
  }
  async function install(v){
    if(busy) return;
    if(!confirm(`Install ${LABEL[vi.soft]} ${v}? This replaces the current server jar.`)) return;
    busy = true;
    document.querySelectorAll('.vi-ver').forEach(b => b.disabled = true);
    vst(`Installing ${LABEL[vi.soft]} ${v}…`);
    try{
      await api('/mc_install', { software: vi.soft, version: v });
      vst(`${LABEL[vi.soft]} ${v} installed. Start the server to use it.`);
    }catch(e){ vst(e.message, true); }
    busy = false;
    document.querySelectorAll('.vi-ver').forEach(b => b.disabled = false);
  }
  document.querySelectorAll('.vi-box').forEach(b => b.addEventListener('click', () => pick(b.dataset.soft)));
  $('viBack').addEventListener('click', () => { $('viPick').style.display = 'none'; $('viSoft').style.display = ''; vst(''); });
  $('viSearch').addEventListener('input', renderVers);
})();

(function(){
  const $ = id => document.getElementById(id);
  const body = document.body;
  const OVERLAYS = ['serverControlOverlay','filesOverlay','manageServersOverlay','serverUsersOverlay','startupOverlay'];
  const MINE = ['accountOverlay','customizeOverlay','apiOverlay','activityOverlay'];

  async function apiU(path, payload){
    const user = auth.currentUser;
    if(!user) throw new Error('Not signed in.');
    const idToken = await user.getIdToken();
    const res = await fetch(`${API_BASE}${path}`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ idToken, ...payload }) });
    let data;
    try{ data = await res.json(); }catch(e){ throw new Error(`Bad backend response (HTTP ${res.status}).`); }
    if(!res.ok || !data.ok) throw new Error(data.error || `Request failed (HTTP ${res.status}).`);
    return data;
  }
  function openGlobal(id){
    OVERLAYS.forEach(o => $(o).classList.remove('show'));
    serverList.classList.remove('show');
    hideMcViews();
    $(id).classList.add('show');
  }
  const say = (el, m, err) => { $(el).textContent = m || ''; $(el).classList.toggle('err', !!err); };

  $('navHome').addEventListener('click', () => { body.classList.remove('acct-mode'); MINE.forEach(o => $(o).classList.remove('show')); });

  const P = { name:'', email:'', photo:'' };
  function paintProfile(){
    $('acName').textContent = P.name;
    $('acEmail').textContent = P.email;
    $('emEmail').value = P.email;
    $('acUser').value = P.name;
    const dp = $('acDp');
    dp.style.backgroundImage = P.photo ? `url(${P.photo})` : '';
    dp.textContent = P.photo ? '' : (P.name || '?').charAt(0).toUpperCase();
    const nav = $('navAccount');
    nav.classList.toggle('has-dp', !!P.photo);
    nav.querySelector('img').src = P.photo || '';
  }
  async function loadProfile(){
    try{
      const d = await apiU('/account_get', {});
      P.name = d.username; P.email = d.email; P.photo = d.photo || '';
      if(d.bg && window.xtBgSync){ window.xtBgSync(d.bg); }
      paintProfile();
      return d;
    }catch(e){ say('acStatus', e.message, true); }
  }
  auth.onAuthStateChanged(u => { if(u) setTimeout(loadProfile, 0); });

  const openSettings = () => {
    body.classList.add('acct-mode');
    openGlobal('accountOverlay');
    say('acStatus', '');
    loadProfile();
  };
  $('navAccount').addEventListener('click', openSettings);
  $('navGear').addEventListener('click', openSettings);

  $('acUserSave').addEventListener('click', async () => {
    try{
      await apiU('/account_profile', { username: $('acUser').value });
      await loadProfile();
      say('acStatus', 'Username saved.');
    }catch(e){ say('acStatus', e.message, true); }
  });

  function shrink(file){
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const S = 160, c = document.createElement('canvas');
        c.width = c.height = S;
        const m = Math.min(img.width, img.height);
        c.getContext('2d').drawImage(img, (img.width - m)/2, (img.height - m)/2, m, m, 0, 0, S, S);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read that image.')); };
      img.src = url;
    });
  }
  $('acPhoto').addEventListener('click', () => $('acFile').click());
  $('acFile').addEventListener('change', async () => {
    const f = $('acFile').files[0]; $('acFile').value = '';
    if(!f) return;
    try{
      await apiU('/account_profile', { photo: await shrink(f) });
      await loadProfile();
      say('acStatus', 'Photo updated.');
    }catch(e){ say('acStatus', e.message, true); }
  });
  $('acPhotoDel').addEventListener('click', async () => {
    try{ await apiU('/account_profile', { photo: '' }); await loadProfile(); say('acStatus', 'Photo removed.'); }
    catch(e){ say('acStatus', e.message, true); }
  });

  const authMsg = e => {
    const c = e && e.code || '';
    if(/wrong-password|invalid-credential|invalid-login/.test(c)) return 'Password is incorrect.';
    if(c.includes('weak-password')) return 'New password must be at least 6 characters.';
    if(c.includes('too-many-requests')) return 'Too many attempts. Try again later.';
    return e.message || 'Something went wrong.';
  };
  async function reauth(password){
    const u = auth.currentUser;
    await u.reauthenticateWithCredential(firebase.auth.EmailAuthProvider.credential(u.email, password));
    return u;
  }

  $('pwSave').addEventListener('click', async () => {
    const o = $('pwOld').value, n = $('pwNew').value, c = $('pwNew2').value;
    if(!o || !n || !c){ say('acStatus', 'Fill in all password fields.', true); return; }
    if(n !== c){ say('acStatus', 'New passwords do not match.', true); return; }
    if(n === o){ say('acStatus', 'New password must be different.', true); return; }
    try{
      const u = await reauth(o);
      await u.updatePassword(n);
      $('pwOld').value = $('pwNew').value = $('pwNew2').value = '';
      say('acStatus', 'Password updated.');
    }catch(e){ say('acStatus', authMsg(e), true); }
  });

  $('emSave').addEventListener('click', async () => {
    const p = $('emPass').value, n = $('emNew').value.trim();
    if(!p || !n){ say('acStatus', 'Enter your password and the new email.', true); return; }
    try{
      const u = await reauth(p);
      await u.getIdToken(true);
      await apiU('/account_email', { newEmail: n });
      await u.reload();
      await u.getIdToken(true);
      $('emPass').value = $('emNew').value = '';
      await loadProfile();
      say('acStatus', 'Email updated.');
    }catch(e){ say('acStatus', authMsg(e), true); }
  });

  let shownKey = '', shownRec = null;
  function saveKeyJson(){
    if(!shownRec) return;
    const blob = new Blob([JSON.stringify(shownRec, null, 2)], { type:'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'xtremetech-api-key-' + shownRec.key.slice(-4) + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
  const el = (tag, cls, text) => { const x = document.createElement(tag); if(cls) x.className = cls; if(text != null) x.textContent = text; return x; };
  const KEY_SVG = '<svg viewBox="0 0 24 24" fill="none"><circle cx="8" cy="15" r="4" stroke="currentColor" stroke-width="1.8"/><path d="M11 12l8.5-8.5M16 7l2.5 2.5M13.5 9.5L16 12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const TRASH_SVG = '<svg viewBox="0 0 24 24" fill="none"><path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 12.5h9l1-12.5M10 11v5M14 11v5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function keyBox(k){
    const box = el('div', 'ak-box');
    const ic = el('div', 'ak-ic'); ic.innerHTML = KEY_SVG;
    const main = el('div', 'ak-main');
    const ips = el('div', 'ak-ips');
    if(k.ips && k.ips.length) k.ips.forEach(ip => ips.appendChild(el('span', 'ak-ip', ip)));
    else ips.appendChild(el('span', 'ak-ip any', 'Any IP'));
    main.append(el('div', 'ak-hint', k.hint), el('div', 'ak-meta', k.created ? 'Created ' + new Date(k.created).toLocaleString() : ''), ips);
    const del = el('button', 'ak-del'); del.type = 'button'; del.title = 'Delete'; del.innerHTML = TRASH_SVG;
    del.addEventListener('click', async () => {
      if(!confirm('Delete this key? It stops working immediately.')) return;
      del.disabled = true;
      try{ await apiU('/api_key_revoke', { id: k.id }); say('apStatus', 'Key deleted.'); loadKeys(); }
      catch(e){ say('apStatus', e.message, true); del.disabled = false; }
    });
    box.append(ic, main, del);
    return box;
  }
  async function loadKeys(){
    try{
      const d = await apiU('/api_keys_list', {});
      const list = $('apList');
      list.replaceChildren();
      if(!d.keys.length) list.appendChild(el('div', 'db-empty', 'No API keys yet.'));
      d.keys.forEach(k => list.appendChild(keyBox(k)));
    }catch(e){ say('apStatus', e.message, true); }
  }
  $('navApi').addEventListener('click', () => { shownKey = ''; shownRec = null; $('apNew').style.display = 'none'; openGlobal('apiOverlay'); say('apStatus', ''); loadKeys(); });
  $('apGen').addEventListener('click', async () => {
    const ips = $('apIps').value.split(/[\s,;]+/).filter(Boolean);
    $('apGen').disabled = true;
    try{
      const d = await apiU('/api_key_generate', { ips });
      shownKey = d.key;
      shownRec = { key: d.key, header: 'X-API-Key', api_base: API_BASE, allowed_ips: d.ips || [], created: new Date().toISOString() };
      saveKeyJson();
      $('apKey').textContent = d.key;
      $('apNew').style.display = 'flex';
      $('apIps').value = '';
      say('apStatus', 'Copy it now. It will not be shown again.');
      loadKeys();
    }catch(e){ say('apStatus', e.message, true); }
    $('apGen').disabled = false;
  });
  $('apJson').addEventListener('click', saveKeyJson);
  $('apCopy').addEventListener('click', async () => {
    try{ await navigator.clipboard.writeText(shownKey); say('apStatus', 'Copied.'); }catch(e){ say('apStatus', 'Copy failed. Select the key manually.', true); }
  });

  const KIND = {
    'Signed in':'auth', 'Changed email':'auth',
    'Console command':'cmd',
    'Edited file':'warn', 'Renamed file':'warn', 'Changed startup':'warn', 'Regenerated world':'warn', 'Members':'warn', 'Ran schedule':'warn', 'Saved configuration':'warn',
    'Uploaded file':'file', 'Created folder':'file', 'Uploaded world':'file', 'Downloaded world':'file',
    'Deleted files':'bad', 'Deleted schedule':'bad', 'Removed access':'bad', 'Revoked API key':'bad',
    'Installed plugin':'ok', 'Installed version':'ok', 'Installed libraries':'ok', 'Added startup file':'ok', 'Granted access':'ok', 'Generated API key':'ok', 'Saved schedule':'ok'
  };
  function kindOf(x){
    if(x.action === 'Power'){
      const d = String(x.detail || '').toLowerCase();
      return d === 'start' ? 'ok' : d === 'restart' ? 'warn' : 'bad';
    }
    return KIND[x.action] || 'auth';
  }
  async function loadActivity(){
    say('atStatus', 'Loading…');
    try{
      const d = await apiU('/activity_list', {});
      const box = $('atList');
      box.replaceChildren();
      d.items.forEach(x => {
        const row = document.createElement('div');
        row.className = 'ac-act k-' + kindOf(x);
        const av = document.createElement('div'); av.className = 'ac-av';
        const avi = document.createElement('i');
        if(P.photo) avi.style.backgroundImage = 'url("' + P.photo + '")';
        else avi.textContent = (P.name || '?').charAt(0).toUpperCase();
        av.appendChild(avi);
        const info = document.createElement('div');
        const who = document.createElement('span'); who.className = 'ac-who'; who.textContent = P.name || P.email;
        const t = document.createElement('b'); t.textContent = x.action;
        const s = document.createElement('small');
        s.textContent = [x.detail, x.server, x.via === 'api' ? 'via API' : ''].filter(Boolean).join(' · ');
        info.append(who, t, s);
        const tm = document.createElement('time');
        tm.textContent = x.ts ? new Date(x.ts).toLocaleString() : '';
        row.append(av, info, tm);
        box.appendChild(row);
      });
      say('atStatus', d.items.length ? '' : 'No activity yet.');
    }catch(e){ say('atStatus', e.message, true); }
  }
  $("navActivity").addEventListener("click", async () => { openGlobal("activityOverlay"); if(!P.name) await loadProfile(); loadActivity(); });
  $('atRefresh').addEventListener('click', loadActivity);
})();

(function(){
  const $ = id => document.getElementById(id);
  const esc = t => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const ICON = {
    tick: '<svg viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.5 4.5L19 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    cross: '<svg viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    file: '<svg viewBox="0 0 24 24" fill="none"><path d="M7 3.5h7l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-9.5A1.5 1.5 0 0 1 5.5 19V5A1.5 1.5 0 0 1 7 3.5z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M14 3.5V8h4" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none"><path d="M14 6l-6 6 6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    reload: '<svg viewBox="0 0 24 24" fill="none"><path d="M20 12a8 8 0 1 1-2.5-5.8M20 4v4.5h-4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };
  const PIP_RE = /^[A-Za-z0-9][A-Za-z0-9._\-\[\],~=<>!]{0,100}$/;
  const MAX_COUNT = 1048576;
  const ov = $('advOverlay'), input = $('advInput'), box = $('advResults'), statusEl = $('advStatus');
  const lines = new Map(), pend = new Set();
  let index = [], loading = null, loadDoc = null, chosen = null, doc = null;

  async function api(path, body){
    const user = auth.currentUser;
    if(!user) throw new Error('Not signed in.');
    const idToken = await user.getIdToken();
    const res = await fetch(`${API_BASE}${path}`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ idToken, docId: pendingControlDoc, ...body }) });
    let data;
    try{ data = await res.json(); }catch(e){ throw new Error(`Bad backend response (HTTP ${res.status}).`); }
    if(!res.ok || !data.ok) throw new Error(data.error || `Request failed (HTTP ${res.status}).`);
    return data;
  }

  const setStatus = (m, err) => { statusEl.textContent = m || ''; statusEl.classList.toggle('err', !!err); };
  const msgBox = t => { box.innerHTML = `<div class="adv-empty">${esc(t)}</div>`; };

  function loadIndex(fresh){
    if(loading && !fresh && loadDoc === pendingControlDoc) return loading;
    loadDoc = pendingControlDoc;
    const p = api('/startup_file_index', { fresh: !!fresh })
      .then(d => { if(loadDoc === pendingControlDoc) index = Array.isArray(d.files) ? d.files : []; })
      .finally(() => { if(loading === p) loading = null; });
    loading = p;
    return p;
  }

  const lineText = f => lines.has(f.path) ? lines.get(f.path) : (f.size > MAX_COUNT ? '—' : '…');

  async function countLines(f){
    if(lines.has(f.path) || pend.has(f.path) || f.size > MAX_COUNT) return;
    pend.add(f.path);
    try{
      const d = await api('/file_contents', { path: '/' + f.path });
      const c = String(d.content || '');
      lines.set(f.path, c ? c.split('\n').length - (c.endsWith('\n') ? 1 : 0) : 0);
    }catch(e){
      lines.set(f.path, '—');
    }
    pend.delete(f.path);
    const el = box.querySelector(`[data-l="${CSS.escape(f.path)}"]`);
    if(el) el.textContent = lines.get(f.path);
  }

  function rows(list){
    box.innerHTML = list.map(f => {
      const i = f.path.lastIndexOf('/');
      return `<button type="button" class="adv-row" data-p="${esc(f.path)}"><span class="adv-lines" data-l="${esc(f.path)}">${esc(lineText(f))}</span><span class="adv-rname">${esc(f.name)}</span><span class="adv-rdir">${i > 0 ? esc(f.path.slice(0, i)) : ''}</span></button>`;
    }).join('');
    list.forEach(countLines);
  }

  function live(){
    chosen = null;
    const q = input.value.trim().toLowerCase();
    if(!q){ box.innerHTML = ''; return; }
    if(loading){ msgBox('Loading…'); loading.then(live, () => {}); return; }
    const rank = f => f.name.toLowerCase().startsWith(q) ? 0 : 1;
    const m = index.filter(f => f.path.toLowerCase().includes(q)).sort((a, b) => rank(a) - rank(b) || a.path.length - b.path.length).slice(0, 8);
    if(!m.length){ msgBox('No matching files'); return; }
    rows(m);
  }

  function foundBox(f){
    chosen = f;
    box.innerHTML = `<div class="adv-found"><div class="adv-logo">${ICON.file}</div><div class="adv-fbody"><div class="adv-fname" title="${esc(f.path)}">${esc(f.path)}</div><div class="adv-acts"><button type="button" class="adv-ibtn ok" id="advConfirm">${ICON.tick}<span>Confirm</span></button><button type="button" class="adv-ibtn no" id="advCancel">${ICON.cross}<span>Cancel</span></button></div></div></div>`;
  }

  function missBox(){
    chosen = null;
    box.innerHTML = `<div class="adv-found"><div class="adv-logo bad">${ICON.cross}</div><div class="adv-fbody"><div class="adv-fname bad">No file found</div><div class="adv-acts"><button type="button" class="adv-ibtn" id="advBack">${ICON.back}<span>Back</span></button><button type="button" class="adv-ibtn" id="advReload">${ICON.reload}<span>Reload</span></button></div></div></div>`;
  }

  async function search(){
    const q = input.value.trim().replace(/^\.?\/+/, '');
    if(!q) return;
    setStatus('');
    if(loading){
      msgBox('Loading…');
      try{ await loading; }catch(e){ setStatus(e.message, true); return; }
    }
    const hit = index.filter(f => f.path === q || f.name === q);
    if(hit.length === 1) foundBox(hit[0]);
    else if(hit.length > 1) rows(hit);
    else missBox();
  }

  async function reload(){
    msgBox('Loading…');
    try{ await loadIndex(true); }catch(e){ setStatus(e.message, true); }
    search();
  }

  const filesBox = $('advFiles');
  let filesReq = 0;
  async function loadFiles(){
    const req = ++filesReq;
    try{
      const d = await api('/startup_files_list', {});
      if(req !== filesReq) return;
      const list = Array.isArray(d.files) ? d.files : [];
      filesBox.replaceChildren();
      if(!list.length){ filesBox.innerHTML = '<div class="adv-empty">No startup files added yet.</div>'; return; }
      list.forEach(name => {
        const row = document.createElement('div'); row.className = 'adv-file';
        const ic = document.createElement('div'); ic.className = 'adv-fic'; ic.innerHTML = ICON.file;
        const p = document.createElement('div'); p.className = 'adv-fpath'; p.textContent = name; p.title = name;
        const rm = document.createElement('button'); rm.type = 'button'; rm.className = 'adv-ibtn no'; rm.style.padding = '8px 12px'; rm.innerHTML = ICON.cross + '<span>Remove</span>';
        rm.addEventListener('click', async () => {
          rm.disabled = true;
          try{
            const r = await api('/startup_file_remove', { file: name });
            setStatus(r.note || `${name} removed.`);
            row.remove();
            if(!filesBox.children.length) loadFiles();
          }catch(e){ setStatus(e.message, true); rm.disabled = false; }
        });
        row.append(ic, p, rm);
        filesBox.appendChild(row);
      });
    }catch(e){ if(req === filesReq) filesBox.innerHTML = `<div class="adv-empty">${esc(e.message)}</div>`; }
  }

  async function confirmAdd(){
    if(!chosen) return;
    const f = chosen, b = $('advConfirm');
    b.disabled = true;
    try{
      const d = await api('/startup_file_add', { file: f.path });
      setStatus(d.note || `${f.path} added to startup files.`);
      input.value = '';
      box.innerHTML = '';
      chosen = null;
      loadFiles();
    }catch(e){
      setStatus(e.message, true);
      b.disabled = false;
    }
  }

  async function pipInstall(){
    const out = $('pipStatus'), btn = $('pipBtn'), field = $('pipInput');
    const set = (m, err) => { out.textContent = m; out.classList.toggle('err', !!err); };
    const pk = field.value.trim().split(/\s+/).filter(Boolean);
    if(!pk.length){ set('Enter at least one library.', true); return; }
    if(pk.length > 20 || pk.some(t => !PIP_RE.test(t))){ set('Invalid library name.', true); return; }
    btn.disabled = true;
    set('Starting install…');
    try{
      await api('/pip_install', { packages: pk.join(' ') });
      set('Install started. Output is in the Terminal.');
      field.value = '';
    }catch(e){
      set(e.message, true);
    }
    btn.disabled = false;
  }

  async function shellRun(){
    const out = $('shellStatus'), btn = $('shellBtn'), field = $('shellInput');
    const set = (m, err) => { out.textContent = m; out.classList.toggle('err', !!err); };
    const cmd = field.value.trim();
    if(!cmd){ set('Enter a command.', true); return; }
    btn.disabled = true;
    set('Running…');
    try{
      await api('/server_shell', { command: cmd });
      set('Command sent. Output is in the Terminal.');
      field.value = '';
    }catch(e){
      set(e.message, true);
    }
    btn.disabled = false;
  }

  async function probeAdmin(){
    const wrap = $('shellWrap');
    wrap.style.display = 'none';
    const d0 = doc;
    try{
      const d = await api('/server_perms', {});
      if(d0 === doc && d.admin) wrap.style.display = '';
    }catch(e){}
  }

  $('shellBtn').addEventListener('click', shellRun);
  $('shellInput').addEventListener('keydown', e => { if(e.key === 'Enter'){ e.preventDefault(); shellRun(); } });

  box.addEventListener('click', e => {
    const t = e.target.closest('button');
    if(!t) return;
    if(t.classList.contains('adv-row')){
      const f = index.find(x => x.path === t.dataset.p);
      if(f){ input.value = f.path; foundBox(f); }
    }else if(t.id === 'advConfirm') confirmAdd();
    else if(t.id === 'advCancel' || t.id === 'advBack') live();
    else if(t.id === 'advReload') reload();
  });

  input.addEventListener('input', live);
  input.addEventListener('keydown', e => { if(e.key === 'Enter'){ e.preventDefault(); search(); } });
  $('advSearchBtn').addEventListener('click', search);
  $('pipBtn').addEventListener('click', pipInstall);
  $('pipInput').addEventListener('keydown', e => { if(e.key === 'Enter'){ e.preventDefault(); pipInstall(); } });

  $('navAdvanced').addEventListener('click', () => {
    if(!pendingControlDoc) return;
    hideAllScreens();
    ov.classList.add('show');
    showControlNav();
    if(doc !== pendingControlDoc){
      doc = pendingControlDoc;
      index = [];
      lines.clear();
      pend.clear();
    }
    chosen = null;
    input.value = '';
    box.innerHTML = '';
    setStatus('');
    filesBox.innerHTML = '<div class="adv-empty">Loading…</div>';
    $('shellStatus').textContent = '';
    probeAdmin();
    loadFiles();
    loadIndex(false).catch(e => setStatus(e.message, true));
  });

  const fmtSize = n => { n = +n || 0; const u = ['B', 'KB', 'MB', 'GB']; let i = 0; while(n >= 1024 && i < 3){ n /= 1024; i++; } return (i ? n.toFixed(1) : n) + ' ' + u[i]; };
  const dbStatus = (m, err) => { $('dbStatus').textContent = m || ''; $('dbStatus').classList.toggle('err', !!err); };
  const DB_SVG = '<svg viewBox="0 0 24 24" fill="none"><ellipse cx="12" cy="6" rx="7.5" ry="2.8" stroke="currentColor" stroke-width="1.8"/><path d="M4.5 6v6c0 1.55 3.36 2.8 7.5 2.8s7.5-1.25 7.5-2.8V6M4.5 12v6c0 1.55 3.36 2.8 7.5 2.8s7.5-1.25 7.5-2.8v-6" stroke="currentColor" stroke-width="1.8"/></svg>';
  let dbReq = 0;
  async function loadDb(){
    const req = ++dbReq, list = $('dbList');
    list.replaceChildren();
    dbStatus('Loading…');
    try{
      const d = await api('/db_files', {});
      if(req !== dbReq) return;
      dbStatus('');
      if(!d.files.length){
        const e = document.createElement('div');
        e.className = 'db-empty';
        e.textContent = 'There is no databases on this server yet';
        list.appendChild(e);
        return;
      }
      d.files.forEach(f => {
        const box = document.createElement('div'); box.className = 'fm-file-box db-box';
        const ic = document.createElement('div'); ic.className = 'fm-file-icon'; ic.innerHTML = DB_SVG;
        const nm = document.createElement('div'); nm.className = 'fm-file-name'; nm.textContent = f.path; nm.title = f.path;
        const meta = document.createElement('div'); meta.className = 'db-meta';
        const t = f.modified ? new Date(f.modified) : null;
        meta.textContent = fmtSize(f.size) + (t && !isNaN(t) ? ' · ' + t.toLocaleDateString() : '');
        box.append(ic, nm, meta);
        list.appendChild(box);
      });
    }catch(e){ if(req === dbReq) dbStatus(e.message, true); }
  }

  $('navDatabase').addEventListener('click', () => {
    if(!pendingControlDoc) return;
    hideAllScreens();
    $('dbOverlay').classList.add('show');
    showControlNav();
    loadDb();
  });

  const tip = $('sbTip'), sidebar = $('adminSidebar');
  sidebar.addEventListener('mouseover', e => {
    const b = e.target.closest('.sidebar-btn[data-label]');
    if(!b) return;
    const r = b.getBoundingClientRect();
    tip.textContent = b.dataset.label;
    tip.style.left = (r.right + 19) + 'px';
    tip.style.top = (r.top + r.height / 2) + 'px';
    tip.classList.add('show');
  });
  sidebar.addEventListener('mouseout', e => {
    const b = e.target.closest('.sidebar-btn');
    if(b && !b.contains(e.relatedTarget)) tip.classList.remove('show');
  });
  sidebar.addEventListener('click', () => tip.classList.remove('show'));
  sidebar.addEventListener('scroll', () => tip.classList.remove('show'));

  $('navBackup').addEventListener('click', () => {
    if(!pendingControlDoc) return;
    hideAllScreens();
    $('backupOverlay').classList.add('show');
    showControlNav();
  });

  $('adminSidebar').addEventListener('click', e => {
    const b = e.target.closest('.sidebar-btn');
    if(!b || b.id === 'navAdvanced' || b.id === 'navBackup' || b.id === 'navDatabase') return;
    ov.classList.remove('show');
    $('backupOverlay').classList.remove('show');
    $('dbOverlay').classList.remove('show');
  }, true);
})();

(function(){
  const $ = id => document.getElementById(id);
  const TYPES = ['image/jpeg','image/png','image/webp','image/gif'];
  const SHOWN = ['serverControlOverlay','filesOverlay','manageServersOverlay','serverUsersOverlay','startupOverlay'];
  let pending = '';
  let unlocked = false;

  const say = (m, err) => { const e = $('cuStatus'); e.textContent = m || ''; e.classList.toggle('err', !!err); };
  const fmt = n => n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';

  async function api(path, payload){
    const user = auth.currentUser;
    if(!user) throw new Error('Not signed in.');
    const idToken = await user.getIdToken();
    const res = await fetch(`${API_BASE}${path}`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ idToken, ...payload }) });
    let data;
    try{ data = await res.json(); }catch(e){ throw new Error(`Bad backend response (HTTP ${res.status}).`); }
    if(!res.ok || !data.ok) throw new Error(data.error || `Request failed (HTTP ${res.status}).`);
    return data;
  }

  function sync(bg){
    XT_BG.has = !!bg.has;
    XT_BG.useDefault = bg.useDefault !== false;
    XT_BG.url = bg.url || '';
    XT_BG.size = bg.size || 0;
    XT_BG.quotaMb = bg.quotaMb || 500;
    XT_BG.loaded = true;
    if(XT_BG.has) unlocked = !XT_BG.useDefault;
    xtBgSave();
    xtApplyBg(pending);
    paint();
  }
  window.xtBgSync = sync;

  function paint(){
    $('cuDefault').checked = !unlocked;
    $('cuApply').disabled = !pending || !unlocked;
    $('cuUndo').disabled = !pending;
    $('cuDrop').classList.toggle('locked', !unlocked);
    const src = pending || (XT_BG.has && XT_BG.url ? API_BASE + XT_BG.url : '');
    const drop = $('cuDrop');
    drop.style.backgroundImage = src ? `url('${src}')` : '';
    drop.classList.toggle('has', !!src);
    $('cuInfo').textContent = XT_BG.has ? `Saved background: ${fmt(XT_BG.size)} of ${XT_BG.quotaMb} MB. Applying a new one deletes the old.` : 'No custom background saved yet.';
  }

  function shrink(file){
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
        const w = Math.max(1, Math.round(img.naturalWidth * k)), h = Math.max(1, Math.round(img.naturalHeight * k));
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        let q = 0.86, mime = 'image/webp', out = c.toDataURL(mime, q);
        if(!out.startsWith('data:image/webp')){ mime = 'image/jpeg'; out = c.toDataURL(mime, q); }
        while(out.length * 0.75 > 1.2 * 1048576 && q > 0.3){ q -= 0.08; out = c.toDataURL(mime, q); }
        res(out);
      };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('bad image')); };
      img.src = url;
    });
  }

  async function pick(file){
    if(!file) return;
    if(!unlocked) return say('Turn off the default background first to add a custom one.', true);
    if(!TYPES.includes(file.type)) return say('Use a JPG, PNG, WEBP or GIF image.', true);
    if(file.size > 30 * 1048576) return say('That image is too large.', true);
    say('Preparing image…');
    try{ pending = await shrink(file); }
    catch(e){ pending = ''; return say('Could not read that image.', true); }
    xtApplyBg(pending);
    paint();
    say('Preview loaded. Press Apply to keep it or Undo to discard.');
  }

  const drop = $('cuDrop');
  drop.addEventListener('click', () => $('cuFile').click());
  drop.addEventListener('keydown', e => { if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); $('cuFile').click(); } });
  ['dragenter','dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('drag'); }));
  ['dragleave','drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('drag'); }));
  drop.addEventListener('drop', e => pick(e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]));
  $('cuFile').addEventListener('change', e => { pick(e.target.files[0]); e.target.value = ''; });

  $('cuApply').addEventListener('click', async () => {
    if(!pending || !unlocked) return;
    $('cuApply').disabled = true; $('cuUndo').disabled = true;
    say('Uploading…');
    try{
      const d = await api('/bg_set', { image: pending });
      pending = '';
      unlocked = true;
      sync(d.bg);
      say('Background applied.');
    }catch(e){
      say(e.message, true);
      paint();
    }
  });

  $('cuUndo').addEventListener('click', () => {
    pending = '';
    xtApplyBg();
    paint();
    say('Reverted.');
  });

  $('cuDefault').addEventListener('change', async () => {
    const want = $('cuDefault').checked;
    if(!want && !XT_BG.has){ unlocked = true; paint(); say('Default off. Add a custom background.'); return; }
    if(want && !XT_BG.has){ unlocked = false; pending = ''; xtApplyBg(); paint(); say('Default background on. Custom uploads are blocked.'); return; }
    if(want){ pending = ''; }
    try{
      const d = await api('/bg_mode', { useDefault: want });
      unlocked = !want;
      sync(d.bg);
      say(want ? 'Default background loaded.' : 'Custom background loaded.');
    }catch(e){
      say(e.message, true);
      paint();
    }
  });

  $('navCustomize').addEventListener('click', async () => {
    SHOWN.forEach(o => $(o).classList.remove('show'));
    serverList.classList.remove('show');
    hideMcViews();
    $('customizeOverlay').classList.add('show');
    pending = '';
    say('');
    xtApplyBg();
    paint();
    try{ sync((await api('/account_get', {})).bg); }catch(e){}
  });

  $('adminSidebar').addEventListener('click', e => {
    const b = e.target.closest('.sidebar-btn');
    if(b && b.id !== 'navCustomize' && pending){ pending = ''; xtApplyBg(); paint(); }
  }, true);
})();

(function(){
  const BASE = window.XT_BASE || '/';
  const PAGE_NAV = { console: 'navTerminal', files: 'navFiles', startup: 'navStartup', schedule: 'navSchedule', users: 'navUsers', database: 'navDatabase', backup: 'navBackup', advanced: 'navAdvanced', config: 'navConfig', plugins: 'navPlugins', members: 'navMembers', access: 'navAccess', worlds: 'navWorlds' };
  const OV_PAGE = { serverControlOverlay: 'console', filesOverlay: 'files', startupOverlay: 'startup', scheduleOverlay: 'schedule', pluginsOverlay: 'plugins', mcConfigOverlay: 'config', membersOverlay: 'members', accessOverlay: 'access', mcBlankOverlay: 'worlds', dbOverlay: 'database', backupOverlay: 'backup', advOverlay: 'advanced', serverUsersOverlay: 'users' };
  const OV_GLOBAL = { manageServersOverlay: 'manage', accountOverlay: 'account', customizeOverlay: 'customize', apiOverlay: 'api', activityOverlay: 'activity' };
  const GLOBAL_NAV = { manage: 'navManageServers', account: 'navAccount', customize: 'navCustomize', api: 'navApi', activity: 'navActivity' };
  const $ = id => document.getElementById(id);
  let applying = false;
  let timer = null;
  let ready = false;
  let wasIn = false;

  function rel(){
    const p = location.pathname;
    return p.startsWith(BASE) ? p.slice(BASE.length) : p.replace(/^\/+/, '');
  }

  function parse(){
    const seg = rel().split('/').filter(Boolean).map(decodeURIComponent);
    if(!seg.length) return { home: true };
    if(GLOBAL_NAV[seg[0]]) return { global: seg[0] };
    return { id: seg[0], page: PAGE_NAV[seg[1]] ? seg[1] : 'console' };
  }

  function current(){
    for(const k in OV_GLOBAL){
      const el = $(k);
      if(el && el.classList.contains('show')) return OV_GLOBAL[k];
    }
    for(const k in OV_PAGE){
      const el = $(k);
      if(el && el.classList.contains('show')){
        const page = OV_PAGE[k];
        const id = page === 'users' ? (typeof pendingServerDocId !== 'undefined' && pendingServerDocId) || '' : (typeof pendingControlDoc !== 'undefined' && pendingControlDoc) || '';
        return id ? id + '/' + page : 'manage';
      }
    }
    return '';
  }

  function sync(){
    if(applying || !ready || !auth.currentUser) return;
    const want = current();
    const have = rel().replace(/\/+$/, '');
    if(want === have || (want.endsWith('/console') && want.slice(0, -8) === have)) return;
    history.pushState(null, '', BASE + want);
    const m = want.split('/');
    document.title = 'XtremeTech' + (want ? ' · ' + (m[1] || m[0]) : '');
  }

  function queueSync(){
    clearTimeout(timer);
    timer = setTimeout(sync, 90);
  }

  function toast(msg){
    const t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;left:50%;top:18px;transform:translateX(-50%);background:#1a1d24;color:#fff;border:1px solid rgba(255,255,255,.2);padding:10px 16px;border-radius:10px;z-index:99999;font:500 13px Inter,sans-serif';
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3500);
  }

  const wait = ms => new Promise(r => setTimeout(r, ms));

  async function findCard(id){
    for(let i = 0; i < 50; i++){
      const el = document.getElementById('cpu-' + id);
      const card = el && el.closest('.server-item');
      if(card) return card;
      await wait(200);
    }
    return null;
  }

  async function apply(){
    if(!auth.currentUser) return;
    const r = parse();
    applying = true;
    try{
      if(r.home){
        if(current()) $('navHome').click();
      }else if(r.global){
        const nav = $(GLOBAL_NAV[r.global]);
        if(nav) nav.click();
      }else{
        const card = await findCard(r.id);
        if(!card){
          toast('You do not have access to that server');
          history.replaceState(null, '', BASE);
          $('navHome').click();
          return;
        }
        const open = typeof pendingControlDoc !== 'undefined' && pendingControlDoc === r.id && $('serverControlOverlay').classList.contains('show');
        if(!open) card.click();
        if(r.page !== 'console'){
          await wait(150);
          const nav = $(PAGE_NAV[r.page]);
          if(nav && nav.style.display !== 'none') nav.click();
          else history.replaceState(null, '', BASE + r.id);
        }
      }
    }finally{
      await wait(200);
      applying = false;
      document.title = 'XtremeTech' + (r.id ? ' · ' + r.page : '');
    }
  }

  const obs = new MutationObserver(queueSync);
  Object.keys(OV_PAGE).concat(Object.keys(OV_GLOBAL)).forEach(k => { const el = $(k); if(el) obs.observe(el, { attributes: true, attributeFilter: ['class'] }); });
  if($('serverList')) obs.observe($('serverList'), { attributes: true, attributeFilter: ['class'] });

  window.addEventListener('popstate', () => { if(ready) apply(); });

  auth.onAuthStateChanged(u => {
    if(u){
      ready = true;
      wasIn = true;
      apply();
    }else{
      ready = false;
      if(wasIn && rel()) history.replaceState(null, '', BASE);
      wasIn = false;
    }
  });
})();
