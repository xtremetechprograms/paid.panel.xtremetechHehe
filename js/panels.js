(function(){
  const $ = id => document.getElementById(id);
  const esc = t => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const COUNTRIES = [['IN','India'],['US','United States'],['GB','United Kingdom'],['DE','Germany'],['FR','France'],['NL','Netherlands'],['SG','Singapore'],['JP','Japan'],['KR','South Korea'],['AU','Australia'],['CA','Canada'],['BR','Brazil'],['AE','United Arab Emirates'],['SA','Saudi Arabia'],['HK','Hong Kong'],['ID','Indonesia'],['PK','Pakistan'],['BD','Bangladesh'],['LK','Sri Lanka'],['NP','Nepal'],['ES','Spain'],['IT','Italy'],['PL','Poland'],['SE','Sweden'],['FI','Finland'],['NO','Norway'],['CH','Switzerland'],['IE','Ireland'],['RU','Russia'],['TR','Turkey'],['ZA','South Africa'],['MX','Mexico'],['AR','Argentina'],['CL','Chile'],['MY','Malaysia'],['TH','Thailand'],['VN','Vietnam'],['PH','Philippines'],['NZ','New Zealand'],['RO','Romania'],['UA','Ukraine']];
  const CNAME = Object.fromEntries(COUNTRIES);
  const PNAME = { pterodactyl:'Pterodactyl', feather:'Feather Panel' };
  const flag = (cc, h) => cc ? `<img class="xt-flag" style="height:${h || 14}px" src="https://flagcdn.com/w40/${esc(String(cc).toLowerCase())}.png" alt="${esc(cc)}" title="${esc(CNAME[String(cc).toUpperCase()] || cc)}" onerror="this.style.display='none'">` : '';
  const shortId = s => (s && (s.identifier || s.shortId || String(s.uuid || '').split('-')[0].slice(0, 8))) || '';
  const ms = s => s && s.createdAt && s.createdAt.toMillis ? s.createdAt.toMillis() : 0;
  const price = s => { const m = String((s && s.cost) || '').replace(/,/g, '').match(/\d+(\.\d+)?/); return m ? parseFloat(m[0]) : 0; };
  const panelOf = s => ((s && s.panel) === 'feather' ? 'feather' : 'pterodactyl');
  const isAdmin = () => document.body.classList.contains('role-admin');

  let cur = 'pterodactyl';
  try{ if(localStorage.getItem('xtPanel') === 'feather') cur = 'feather'; }catch(e){}
  window.XT_PANEL = cur;
  window.XT_DOCS = window.XT_DOCS || {};
  let docs = [];

  async function fetchDocs(){
    const snap = await db.collection('servers').orderBy('createdAt', 'desc').get();
    docs = [];
    snap.forEach(d => { const x = d.data(); window.XT_DOCS[d.id] = x; docs.push({ id:d.id, s:x }); });
    return docs;
  }

  function fillLocations(){
    const sel = $('serverLocation');
    if(sel && sel.options.length < 3) COUNTRIES.forEach(([c, n]) => { const o = document.createElement('option'); o.value = c; o.textContent = n; sel.appendChild(o); });
  }

  function paintAddLabels(){
    const chip = $('addServerPanel'); if(chip) chip.textContent = PNAME[cur];
    const lab = $('serverUuidLabel'); if(lab) lab.textContent = cur === 'feather' ? 'Server UUID (short ID)' : 'Server UUID';
    const inp = $('serverUuid'); if(inp) inp.placeholder = cur === 'feather' ? 'e.g. a1b2c3d4' : 'e.g. 3f29c1a2-...';
  }

  function setPanel(p){
    cur = p === 'feather' ? 'feather' : 'pterodactyl';
    window.XT_PANEL = cur;
    try{ localStorage.setItem('xtPanel', cur); }catch(e){}
    $('panelSelect').value = cur;
    paintAddLabels();
    if(window.XT_LAST_SNAP && isAdmin()) renderServerList(window.XT_LAST_SNAP);
    renderVis();
    checkStatus();
  }

  async function api(path, body){
    const user = auth.currentUser;
    if(!user) throw new Error('Not signed in.');
    const idToken = await user.getIdToken();
    const res = await fetch(`${API_BASE}${path}`, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ idToken, ...body }) });
    let d; try{ d = await res.json(); }catch(e){ throw new Error('Bad backend response.'); }
    if(!res.ok || !d.ok) throw new Error(d.error || 'Request failed.');
    return d;
  }

  let stSeq = 0;
  async function checkStatus(){
    const box = $('panelStatus'), txt = $('panelStatusText'), seq = ++stSeq;
    box.dataset.state = 'wait'; txt.textContent = 'Checking connection…';
    try{
      const d = await api('/panel_status', { panel: cur });
      if(seq !== stSeq) return;
      const map = { online:['ok', `Connected${d.ms ? ' · ' + d.ms + ' ms' : ''}`], rejected:['bad', 'API key rejected'], unreachable:['bad', 'Panel unreachable'], unconfigured:['warn', 'Not configured on the backend (FEATHER_BASE_URL / FEATHER_API_KEY)'], error:['bad', 'Panel returned an error'] };
      const [st, t] = map[d.state] || ['warn', d.state];
      box.dataset.state = st; txt.textContent = `${PNAME[cur]} · ${t}`;
    }catch(e){ if(seq === stSeq){ box.dataset.state = 'bad'; txt.textContent = 'Could not reach the backend'; } }
  }

  function renderVis(){
    const box = $('panelServers');
    const list = docs.filter(d => panelOf(d.s) === cur);
    $('panelCount').textContent = `${list.length} ${PNAME[cur]} server${list.length === 1 ? '' : 's'}`;
    box.replaceChildren();
    if(!list.length){ box.innerHTML = `<p class="server-list-empty">No servers on ${PNAME[cur]} yet.</p>`; return; }
    list.forEach(({ id, s }) => {
      const row = document.createElement('div');
      row.className = 'pn-row';
      row.innerHTML = `<div class="pn-row-main"><div class="pn-row-name">${esc(s.name || 'Unnamed server')}</div><div class="pn-row-meta">${esc(s.category || 'discord')} · ID ${esc(shortId(s) || '—')} · Expires ${esc(s.expiry || '—')} · Cost ${esc(s.cost || '—')}</div></div><span class="pn-badge">${esc(PNAME[panelOf(s)])}</span><div class="pn-row-loc">${flag(s.location, 16)}<select class="pn-loc" title="Server location"><option value="">No location</option>${COUNTRIES.map(([c, n]) => `<option value="${c}"${s.location === c ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select></div>`;
      const sel = row.querySelector('.pn-loc');
      sel.addEventListener('change', async () => {
        try{ await db.collection('servers').doc(id).update({ location: sel.value }); s.location = sel.value; renderVis(); }
        catch(e){ alert('Could not save location: ' + e.message); }
      });
      box.appendChild(row);
    });
  }

  const OWN = ['panelsOverlay','serverTypeOverlay','resourceTypeOverlay','addServerOverlay','removeServerOverlay'];
  const hideOwn = () => OWN.forEach(o => { const e = $(o); if(e) e.classList.remove('show'); });

  $('adminSidebar').addEventListener('click', e => {
    const b = e.target.closest('.sidebar-btn');
    if(!b) return;
    hideOwn();
    if(b.id === 'navAddServer' || b.id === 'navRemoveServer') hideAllScreens();
    if(b.id === 'navPanels'){
      hideAllScreens();
      $('panelsOverlay').classList.add('show');
      $('panelSelect').value = cur;
      checkStatus();
      fetchDocs().then(renderVis).catch(() => { $('panelServers').innerHTML = '<p class="server-list-empty">Could not load servers.</p>'; });
    }
  }, true);

  ['serverTypeClose','resourceTypeClose','addServerClose','removeServerClose'].forEach(id => $(id).addEventListener('click', () => { hideOwn(); $('navHome').click(); }));
  $('panelSelect').addEventListener('change', e => setPanel(e.target.value));
  window.xtAfterRemove = () => $('navHome').click();

  const rm = { q:'', sort:'name-asc', rows:[] };
  function drawRemove(){
    const box = $('removeServerList');
    const q = rm.q.trim().toLowerCase();
    let rows = rm.rows.filter(({ id, s }) => !q || [s.name, s.cost, s.category, shortId(s), s.expiry].some(v => String(v || '').toLowerCase().includes(q)));
    const [k, dir] = rm.sort.split('-'), f = dir === 'desc' ? -1 : 1;
    rows.sort((a, b) => k === 'name' ? f * String(a.s.name || '').localeCompare(String(b.s.name || ''), undefined, { numeric:true, sensitivity:'base' }) : k === 'date' ? f * (ms(a.s) - ms(b.s)) : f * (price(a.s) - price(b.s)));
    $('rmCount').textContent = `${rows.length} of ${rm.rows.length} ${PNAME[cur]} server${rm.rows.length === 1 ? '' : 's'}`;
    box.replaceChildren();
    if(!rows.length){ box.innerHTML = `<p class="server-list-empty">${rm.rows.length ? 'No servers match your search.' : 'No servers yet.'}</p>`; return; }
    rows.forEach(({ id, s }) => {
      const t = ms(s);
      const row = document.createElement('div');
      row.className = 'remove-row';
      row.innerHTML = `<div class="remove-row-info"><div class="remove-row-name">${esc(s.name || 'Unnamed server')}</div><div class="remove-row-meta">${flag(s.location, 12)}${s.location ? ' ' : ''}ID ${esc(shortId(s) || '—')} · Expires ${esc(s.expiry || '—')} · Cost ${esc(s.cost || '—')} · Created ${t ? new Date(t).toLocaleDateString() : '—'}</div></div><button type="button" class="remove-row-btn">Remove</button>`;
      row.querySelector('button').addEventListener('click', () => {
        pendingDeleteId = id;
        $('confirmDeleteName').textContent = s.name || 'Unnamed server';
        $('confirmDeleteOverlay').classList.add('show');
      });
      box.appendChild(row);
    });
  }
  window.xtRemovePanel = async function(){
    $('removeServerSub').textContent = `Select a ${PNAME[cur]} server to remove.`;
    $('rmSearch').value = rm.q = '';
    try{
      await fetchDocs();
      rm.rows = docs.filter(d => panelOf(d.s) === cur);
      drawRemove();
    }catch(e){ $('removeServerList').innerHTML = '<p class="server-list-empty">Could not load servers.</p>'; }
  };
  $('rmSearch').addEventListener('input', e => { rm.q = e.target.value; drawRemove(); });
  $('rmSort').addEventListener('change', e => { rm.sort = e.target.value; drawRemove(); });

  let metaTok = 0;
  async function paintMeta(){
    const el = $('scMeta'); if(!el) return;
    const id = pendingControlDoc, tok = ++metaTok;
    let s = window.XT_DOCS[id];
    if(!s && id && isAdmin()){
      try{ const d = await db.collection('servers').doc(id).get(); if(d.exists){ s = window.XT_DOCS[id] = d.data(); } }catch(e){}
      if(tok !== metaTok) return;
    }
    if(!s){ el.innerHTML = ''; return; }
    const sid = shortId(s);
    el.innerHTML = (sid ? `<span class="sc-sep">/</span><span class="sc-id" role="button" tabindex="0" title="Click to copy server ID">[${esc(sid)}]</span>` : '') + (s.location ? `<span class="sc-sep">/</span><span class="sc-flag">${flag(s.location, 20)}</span>` : '');
    const idEl = el.querySelector('.sc-id');
    if(idEl){
      const copy = async () => {
        try{ await navigator.clipboard.writeText(sid); }
        catch(e){ const t = document.createElement('textarea'); t.value = sid; document.body.appendChild(t); t.select(); try{ document.execCommand('copy'); }catch(_){} t.remove(); }
        idEl.textContent = '[Copied]';
        setTimeout(() => { if(idEl.isConnected) idEl.textContent = `[${sid}]`; }, 900);
      };
      idEl.addEventListener('click', copy);
      idEl.addEventListener('keydown', e => { if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); copy(); } });
    }
  }
  new MutationObserver(paintMeta).observe($('serverControlName'), { childList:true, characterData:true, subtree:true });

  const mb = { users:[], counts:null, h:null, q:'' };
  const fmtDate = t => t ? new Date(t).toLocaleDateString(undefined, { day:'2-digit', month:'short', year:'numeric' }) : '—';
  const fmtTime = t => t ? new Date(t).toLocaleString(undefined, { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }) : '';
  const avatar = u => u.photo ? `<img class="mb-av" src="${esc(u.photo)}" alt="">` : `<span class="mb-av mb-av-t">${esc((u.username || u.email || '?').charAt(0).toUpperCase())}</span>`;
  const xapi = (path, body) => api(path, { docId: pendingControlDoc, ...body });

  function drawMembers(){
    const byOwner = mb.users.filter(u => u.grantedRole === 'owner').length;
    const c = { total: mb.users.length, byOwner, byAdmin: mb.users.length - byOwner };
    $('mbStats').innerHTML = `<span class="mb-chip"><b>${c.total}</b> member${c.total === 1 ? '' : 's'}</span><span class="mb-chip"><b>${c.byOwner}</b> added by owner</span><span class="mb-chip"><b>${c.byAdmin}</b> from admin</span>`;
    const q = mb.q.trim().toLowerCase();
    const rows = mb.users.filter(u => !q || [u.username, u.uid, u.email, u.tag].some(v => String(v || '').toLowerCase().includes(q)));
    const box = $('accList');
    box.replaceChildren();
    if(!rows.length){ box.innerHTML = `<p class="server-list-empty">${mb.users.length ? 'No members match your search.' : 'No members yet.'}</p>`; return; }
    rows.forEach(u => {
      const r = document.createElement('div');
      r.className = 'mb-row';
      r.innerHTML = `${avatar(u)}<div class="mb-name">${esc(u.username)}<small>${esc(u.email)}</small></div><div class="mb-uid" title="${esc(u.uid)}">${esc(u.uid || '—')}</div><div class="mb-date">${fmtDate(u.addedAt)}</div><div><span class="mb-tag">${esc(u.tag)}</span></div>`;
      r.addEventListener('click', () => openDetail(u));
      box.appendChild(r);
    });
  }

  async function openDetail(u){
    $('mbMain').style.display = 'none';
    const box = $('mbDetail');
    box.style.display = '';
    box.innerHTML = '<p class="server-list-empty">Loading…</p>';
    let d;
    try{ d = await xapi('/server_member_detail', { email: u.email }); }
    catch(e){ box.innerHTML = `<button type="button" class="pn-back" id="mbBack">← Back</button><p class="server-list-empty">${esc(e.message)}</p>`; $('mbBack').onclick = closeDetail; return; }
    const m = d.member;
    const logs = (d.logs || []).map(l => `<div class="mb-log"><b>${esc(l.action)}</b><span>${esc(l.detail)}</span><em>${esc(fmtTime(l.ts))}${l.via ? ' · ' + esc(l.via) : ''}</em></div>`).join('') || '<p class="server-list-empty">No activity recorded for this member on this server.</p>';
    box.innerHTML = `
      <button type="button" class="pn-back" id="mbBack">← Back</button>
      <div class="mb-hero">${avatar(m)}<div class="mb-hero-t"><div class="mb-hero-n">${esc(m.username)}</div><div class="mb-hero-s">${esc(m.email)}</div><div class="mb-hero-s">User ID <span class="mb-uid">${esc(m.uid || '—')}</span> · Added ${esc(fmtDate(m.addedAt))} · ${m.grantedRole === 'owner' ? 'Added by owner' : 'From admin'}</div></div><span class="mb-tag">${esc(m.tag)}</span></div>
      <div class="plg-status" id="mbStatus"></div>
      <div class="field"><label for="mbTag">Tag</label><input type="text" id="mbTag" maxlength="24" value="${esc(m.tag)}"></div>
      <div class="field" style="margin-top:14px;"><label for="mbDesc">Description</label><textarea id="mbDesc" class="mb-ta" maxlength="600" placeholder="About this member">${esc(m.description)}</textarea></div>
      <div class="field" style="margin-top:14px;"><label for="mbPersonal">Personal description <span class="mb-priv">Only you can see this</span></label><textarea id="mbPersonal" class="mb-ta" maxlength="1000" placeholder="Private notes, visible only to you">${esc(d.personal)}</textarea></div>
      <div style="display:flex; gap:10px; margin:14px 0 22px; flex-wrap:wrap;"><button type="button" class="plg-btn" id="mbSave">Save</button><button type="button" class="plg-btn" id="mbEdit">Edit access</button><button type="button" class="plg-btn danger" id="mbRemove">Remove</button></div>
      <p class="mm-sub">Logs</p>
      <div class="mb-logs">${logs}</div>`;
    $('mbBack').onclick = closeDetail;
    $('mbSave').onclick = async () => {
      const st = $('mbStatus'); st.classList.remove('err'); st.textContent = 'Saving…';
      try{
        await xapi('/server_member_save', { email: m.email, tag: $('mbTag').value, description: $('mbDesc').value, personal: $('mbPersonal').value });
        const src = mb.users.find(x => x.email === m.email);
        if(src){ src.tag = $('mbTag').value.trim() || src.tag; src.description = $('mbDesc').value; }
        st.textContent = 'Saved.';
      }catch(e){ st.classList.add('err'); st.textContent = e.message; }
    };
    $('mbEdit').onclick = () => { closeDetail(); if(mb.h) mb.h.edit(m); };
    $('mbRemove').onclick = async () => { if(mb.h){ await mb.h.remove(m); closeDetail(); } };
  }
  function closeDetail(){ $('mbDetail').style.display = 'none'; $('mbMain').style.display = ''; drawMembers(); }

  $('mbSearchBtn').addEventListener('click', () => { mb.q = $('mbSearch').value; drawMembers(); });
  $('mbSearch').addEventListener('keydown', e => { if(e.key === 'Enter'){ e.preventDefault(); $('mbSearchBtn').click(); } });
  $('mbSearch').addEventListener('input', e => { if(!e.target.value && mb.q){ mb.q = ''; drawMembers(); } });

  window.xtMembers = {
    render(users, counts, h){
      mb.users = users || []; mb.counts = counts; mb.h = h;
      $('mbDetail').style.display = 'none'; $('mbMain').style.display = '';
      drawMembers();
    }
  };

  fillLocations();
  $('panelSelect').value = cur;
  paintAddLabels();
})();
