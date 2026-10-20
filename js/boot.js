(async function(){
  const l = window.location;
  if(l.search[1] === '/'){
    const d = l.search.slice(1).split('&').map(s => s.replace(/~and~/g, '&')).join('?');
    history.replaceState(null, null, l.pathname.slice(0, -1) + d + l.hash);
  }
  const B = window.XT_BASE || '/';
  const V = '?v=15';
  const PAGES = ['panels','servers','console','manage','users','config','schedule','plugins','account','customize','api','activity','members','access','worlds','startup','database','backup','advanced','files'];
  const SCRIPTS = ['app','panels'];
  try{
    const html = await Promise.all(PAGES.map(n => fetch(B + 'pages/' + n + '.html' + V).then(r => { if(!r.ok) throw new Error(n); return r.text(); })));
    document.getElementById('pages').innerHTML = html.join('\n');
    await new Promise((resolve, reject) => {
      let left = SCRIPTS.length;
      SCRIPTS.forEach(n => {
        const s = document.createElement('script');
        s.src = B + 'js/' + n + '.js' + V;
        s.async = false;
        s.onload = () => { if(--left === 0) resolve(); };
        s.onerror = () => reject(new Error(n));
        document.body.appendChild(s);
      });
    });
  }catch(e){
    const t = document.getElementById('bootText');
    if(t) t.textContent = 'Failed to load (' + e.message + '). Refresh the page.';
  }
})();
