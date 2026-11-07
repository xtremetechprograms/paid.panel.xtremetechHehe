(() => {
  const loginView = document.getElementById('loginView');
  if(!loginView) return;
  const body = document.body;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const cv = document.createElement('canvas');
  cv.id = 'snowCanvas';
  cv.setAttribute('aria-hidden', 'true');
  body.appendChild(cv);
  const ctx = cv.getContext('2d', { alpha: true });

  const sprite = document.createElement('canvas');
  sprite.width = sprite.height = 64;
  const sg = sprite.getContext('2d');
  const grad = sg.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.85)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  sg.fillStyle = grad;
  sg.fillRect(0, 0, 64, 64);

  let W = 0, H = 0, dpr = 1, flakes = [], raf = 0, last = 0, wind = 0, windT = 0;

  const spawn = (f, top) => {
    const z = Math.random();
    f.z = z;
    f.r = 1.5 + z * z * 5;
    f.x = Math.random() * (W + 80) - 40;
    f.y = top ? -f.r * 4 - Math.random() * 40 : Math.random() * H;
    f.v = 28 + z * 70;
    f.a = 0.35 + z * 0.6;
    f.p = Math.random() * 6.283;
    f.s = 0.6 + Math.random() * 1.2;
    f.d = 6 + z * 18;
    return f;
  };

  const resize = () => {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.min(160, Math.max(50, Math.round(W * H / 9000)));
    while(flakes.length < n) flakes.push(spawn({}, false));
    flakes.length = n;
  };

  const frame = (t) => {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (t - last) / 1000 || 0.016);
    last = t;
    windT += dt * 0.25;
    wind = Math.sin(windT) * 14 + Math.sin(windT * 0.37) * 8;
    ctx.clearRect(0, 0, W, H);
    for(let i = 0; i < flakes.length; i++){
      const f = flakes[i];
      f.y += f.v * dt;
      f.p += f.s * dt;
      f.x += (Math.sin(f.p) * f.d + wind * (0.4 + f.z)) * dt;
      if(f.y - f.r * 4 > H || f.x < -60 || f.x > W + 60) spawn(f, true);
      const s = f.r * 4;
      ctx.globalAlpha = f.a;
      ctx.drawImage(sprite, f.x - s / 2, f.y - s / 2, s, s);
    }
  };

  const start = () => {
    if(raf || reduce.matches || document.hidden) return;
    resize();
    last = performance.now();
    raf = requestAnimationFrame(frame);
  };
  const stop = () => {
    cancelAnimationFrame(raf);
    raf = 0;
    ctx.clearRect(0, 0, W, H);
  };

  const sync = () => {
    const on = loginView.style.display !== 'none';
    body.classList.toggle('winter', on);
    on ? start() : stop();
  };

  new MutationObserver(sync).observe(loginView, { attributes: true, attributeFilter: ['style'] });
  addEventListener('resize', () => { if(raf) resize(); }, { passive: true });
  document.addEventListener('visibilitychange', () => { document.hidden ? stop() : sync(); });
  reduce.addEventListener('change', sync);
  sync();
})();
