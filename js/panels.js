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

  const OWN = ['panelsOverlay','serverTypeOverlay','resourceTypeOverlay','addServerOverlay','removeServerOverlay','addUserOverlay','addMemberOverlay'];
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


  const syncHome = () => document.body.classList.toggle('in-server', $('navTerminal').style.display !== 'none');
  new MutationObserver(syncHome).observe($('navTerminal'), { attributes:true, attributeFilter:['style'] });
  syncHome();

  const CRED_REF = () => db.collection('config').doc('panelCredentials');
  const CRED_FIELDS = {
    pterodactyl: [['base_url','Panel URL','text'],['client_api_key','Client API key (ptlc_…)','password'],['application_api_key','Application API key (ptla_…)','password']],
    feather: [['base_url','Panel URL','text'],['api_key','Private key','password'],['public_key','Public key','text'],['auth_header','Auth header (default: Authorization)','text'],['auth_format','Auth format (default: Bearer {private})','text']]
  };
  const JSON_MAP = {
    pterodactyl: { panel_base_url:'base_url', client_api_key:'client_api_key', application_api_key:'application_api_key', base_url:'base_url' },
    feather: { feather_base_url:'base_url', feather_api_key:'api_key', feather_public_key:'public_key', feather_auth_header:'auth_header', feather_auth_format:'auth_format', base_url:'base_url', api_key:'api_key', public_key:'public_key', auth_header:'auth_header', auth_format:'auth_format' }
  };
  const SECRET = new Set(['client_api_key','application_api_key','api_key','github_pat']);
  const mask = (k, v) => !v ? '—' : SECRET.has(k) ? '••••••••' + String(v).slice(-4) : v;
  let credDoc = null, credEdit = false, credErr = '';

  async function loadCreds(){
    credErr = '';
    try{ const s = await CRED_REF().get(); credDoc = s.exists ? s.data() : {}; }
    catch(e){ credDoc = null; credErr = /permission/i.test(e.message) ? 'Firestore rules are blocking access to config/panelCredentials. Add the admin rule, then reload.' : e.message; }
    drawCreds();
  }

  function drawCreds(){
    const box = $('credView'), p = $('credSelect').value, fields = CRED_FIELDS[p];
    box.replaceChildren();
    if(credErr){ box.innerHTML = `<div class="cr-box"><p class="cr-err">${esc(credErr)}</p></div>`; return; }
    if(!credDoc){ box.innerHTML = '<div class="cr-box"><p class="subtext">Loading…</p></div>'; return; }
    const cur = credDoc[p] || {}, has = fields.some(([k]) => cur[k]);
    if(has && !credEdit){
      const rows = [...fields.map(([k, l]) => [l, mask(k, cur[k])]), ['GitHub PAT (shared)', mask('github_pat', credDoc.github_pat)]];
      box.innerHTML = `<div class="cr-box"><div class="cr-title">${esc(PNAME[p])} credentials</div>${rows.map(([l, v]) => `<div class="cr-row"><span>${esc(l)}</span><b>${esc(v)}</b></div>`).join('')}<div class="cr-actions"><button type="button" class="plg-btn" id="crChange">Change Credentials</button><button type="button" class="plg-btn danger" id="crDelete">Delete Credentials</button>${credDoc.github_pat ? '<button type="button" class="plg-btn danger" id="crDelPat">Remove GitHub PAT</button>' : ''}</div></div>`;
      $('crChange').onclick = () => { credEdit = true; drawCreds(); };
      $('crDelete').onclick = () => confirmFlow(`Delete ${PNAME[p]} credentials`, fields.map(([k, l]) => [l, mask(k, cur[k]) + '  →  removed']), () => CRED_REF().set({ [p]: firebase.firestore.FieldValue.delete() }, { merge:true }));
      const dp = $('crDelPat');
      if(dp) dp.onclick = () => confirmFlow('Remove GitHub PAT', [['GitHub PAT (shared)', mask('github_pat', credDoc.github_pat) + '  →  removed']], () => CRED_REF().set({ github_pat: firebase.firestore.FieldValue.delete() }, { merge:true }));
      return;
    }
    box.innerHTML = `<div class="cr-box"><div class="cr-title">${esc(PNAME[p])} credentials</div>${fields.map(([k, l, t]) => `<div class="field" style="margin-top:12px;"><label for="cr_${k}">${esc(l)}</label><input type="${t}" id="cr_${k}" autocomplete="off" spellcheck="false" value="${esc(cur[k] || '')}"></div>`).join('')}<div class="field" style="margin-top:12px;"><label for="cr_github_pat">GitHub PAT <span class="mb-priv">Shared by both panels</span></label><input type="password" id="cr_github_pat" autocomplete="off" spellcheck="false" value="${esc(credDoc.github_pat || '')}"></div><div id="crJsonBox" style="display:none; margin-top:12px;"><textarea id="crJson" class="mb-ta" spellcheck="false" placeholder='{"${p === 'feather' ? 'feather_base_url' : 'panel_base_url'}": "...", "github_pat": "..."}'></textarea><div class="cr-actions"><button type="button" class="plg-btn" id="crJsonApply">Apply JSON</button></div></div><div class="plg-status" id="crMsg"></div><div class="cr-actions"><button type="button" class="plg-btn" id="crSave">Save</button><button type="button" class="plg-btn" id="crJsonToggle">Import JSON</button>${has ? '<button type="button" class="plg-btn" id="crCancel">Cancel</button>' : ''}</div></div>`;
    const msg = (m, err) => { $('crMsg').textContent = m || ''; $('crMsg').classList.toggle('err', !!err); };
    $('crJsonToggle').onclick = () => { const b = $('crJsonBox'); b.style.display = b.style.display === 'none' ? '' : 'none'; };
    $('crJsonApply').onclick = () => {
      let o; try{ o = JSON.parse($('crJson').value); }catch(e){ msg('That is not valid JSON.', true); return; }
      if(!o || typeof o !== 'object' || Array.isArray(o)){ msg('JSON must be an object.', true); return; }
      let n = 0;
      Object.entries(o).forEach(([k, v]) => { const f = k === 'github_pat' ? 'github_pat' : JSON_MAP[p][k]; const el = f && $('cr_' + f); if(el && typeof v === 'string'){ el.value = v; n++; } });
      msg(n ? `Filled ${n} field${n === 1 ? '' : 's'} from JSON.` : 'No matching keys found for this configuration.', !n);
    };
    if($('crCancel')) $('crCancel').onclick = () => { credEdit = false; drawCreds(); };
    $('crSave').onclick = () => {
      const next = {};
      fields.forEach(([k]) => { next[k] = $('cr_' + k).value.trim(); });
      const pat = $('cr_github_pat').value.trim();
      const rows = [];
      fields.forEach(([k, l]) => { if((cur[k] || '') !== next[k]) rows.push([l, `${mask(k, cur[k])}  →  ${mask(k, next[k])}`]); });
      if((credDoc.github_pat || '') !== pat) rows.push(['GitHub PAT (shared)', `${mask('github_pat', credDoc.github_pat)}  →  ${mask('github_pat', pat)}`]);
      if(!rows.length){ msg('No changes to save.', true); return; }
      if(next.base_url && !/^(https?:\/\/)?[^\s/]+\.[^\s]+$/i.test(next.base_url)){ msg('Panel URL looks invalid.', true); return; }
      const upd = { [p]: Object.fromEntries(Object.entries(next).filter(([, v]) => v)) };
      if(pat) upd.github_pat = pat;
      confirmFlow(`Update ${PNAME[p]} credentials`, rows, () => CRED_REF().set(upd, { merge:true }));
    };
  }

  function dialog(html){
    let o = $('credDialog');
    if(!o){ o = document.createElement('div'); o.className = 'modal-overlay'; o.id = 'credDialog'; document.body.appendChild(o); }
    o.innerHTML = `<div class="modal-box" style="max-width:440px; text-align:center;">${html}</div>`;
    o.classList.add('show');
    return o;
  }
  const closeDialog = () => { const o = $('credDialog'); if(o) o.classList.remove('show'); };

  function confirmFlow(title, rows, commit){
    const o = dialog(`<h1 class="heading" style="justify-content:center; font-size:18px;">${esc(title)}</h1><div class="cr-list">${rows.map(([l, v]) => `<div class="cr-row"><span>${esc(l)}</span><b>${esc(v)}</b></div>`).join('')}</div><p class="subtext" style="margin:16px 0;">Do you want to make these changes?</p><div style="display:flex; gap:12px;"><button type="button" class="signout" id="cdNo" style="flex:1;">No</button><button type="button" class="submit" id="cdYes" style="flex:1;">Yes</button></div>`);
    $('cdNo').onclick = closeDialog;
    $('cdYes').onclick = () => {
      let left = 5, dead = false;
      dialog(`<div class="cr-spin"></div><h1 class="heading" style="justify-content:center; font-size:18px;">Processing…</h1><p class="subtext" id="cdLeft" style="margin:8px 0 18px;">Applying in ${left}s</p><button type="button" class="signout" id="cdCancel" style="width:100%;">Cancel</button>`);
      const tick = setInterval(async () => {
        if(dead) return;
        left--;
        const el = $('cdLeft');
        if(left > 0){ if(el) el.textContent = `Applying in ${left}s`; return; }
        clearInterval(tick);
        if(el) el.textContent = 'Saving…';
        try{
          await commit();
          try{ await api('/reload_credentials', {}); }catch(e){}
          credEdit = false;
          dialog('<div class="cr-ok"><svg viewBox="0 0 24 24" width="38" height="38" fill="none"><path d="M5 12.5l4.2 4.2L19 7" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></div><h1 class="heading" style="justify-content:center; font-size:18px;">Credentials changed successfully</h1><button type="button" class="submit" id="cdDone" style="width:100%; margin-top:18px;">Done</button>');
          $('cdDone').onclick = closeDialog;
          setTimeout(closeDialog, 3500);
          loadCreds(); checkStatus();
        }catch(e){
          dialog(`<h1 class="heading" style="justify-content:center; font-size:18px; color:var(--error);">Could not save</h1><p class="subtext" style="margin:10px 0 18px;">${esc(/permission/i.test(e.message) ? 'Firestore rules blocked this change.' : e.message)}</p><button type="button" class="signout" id="cdClose" style="width:100%;">Close</button>`);
          $('cdClose').onclick = closeDialog;
        }
      }, 1000);
      $('cdCancel').onclick = () => { dead = true; clearInterval(tick); closeDialog(); };
    };
  }

  $('credSelect').addEventListener('change', () => { credEdit = false; drawCreds(); });
  $('adminSidebar').addEventListener('click', e => { if(e.target.closest('#navPanels')){ credEdit = false; loadCreds(); } }, true);

  window.xtShowAddUser = on => { $('addUserOverlay').classList.toggle('show', !!on); $('serverUsersOverlay').classList.toggle('show', !on); if(on) $('addUserEmail').focus({ preventScroll:true }); };
  window.xtShowAddMember = on => { $('addMemberOverlay').classList.toggle('show', !!on); $('accessOverlay').classList.toggle('show', !on); };
  $('addUserOpen').addEventListener('click', () => window.xtShowAddUser(true));
  $('addUserBack').addEventListener('click', () => window.xtShowAddUser(false));
  $('mbAdd').addEventListener('click', () => { if(window.xtAccReset) window.xtAccReset(); window.xtShowAddMember(true); });
  $('amBack').addEventListener('click', () => { if(window.xtAccReset) window.xtAccReset(); window.xtShowAddMember(false); });

  const views = [...document.querySelectorAll('.manage-view')];
  new MutationObserver(recs => {
    let win = null;
    recs.forEach(r => { const t = r.target; if(t.classList.contains('show') && !(r.oldValue || '').split(/\s+/).includes('show')) win = t; });
    if(win) views.forEach(v => { if(v !== win) v.classList.remove('show'); });
  }).observe(document.getElementById('pages'), { attributes:true, attributeFilter:['class'], attributeOldValue:true, subtree:true });
  const shown = views.filter(v => v.classList.contains('show'));
  shown.slice(0, -1).forEach(v => v.classList.remove('show'));

  fillLocations();
  $('panelSelect').value = cur;
  paintAddLabels();
})();
