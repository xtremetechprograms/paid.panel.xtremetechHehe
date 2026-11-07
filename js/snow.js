(function(){
  const cv = document.createElement('canvas');
  cv.id = 'xtSnow';
  document.body.appendChild(cv);
  const ctx = cv.getContext('2d', { alpha: true });
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let W = 0, H = 0, dpr = 1, flakes = [], on = false, raf = 0, last = 0, tick = 0;

  const loginVisible = () => {
    const v = document.getElementById('loginView'), m = document.querySelector('.main-stack');
    return !!v && !!m && v.style.display !== 'none' && m.style.display !== 'none';
  };

  function make(initial){
    const z = Math.random();
    return {
      x: Math.random() * W,
      y: initial ? Math.random() * H : -10,
      r: 0.8 + z * 2.8,
      vy: 28 + z * 70,
      sw: 8 + Math.random() * 26,
      ph: Math.random() * 6.283,
      fr: 0.5 + Math.random() * 1.1,
      a: 0.35 + z * 0.6
    };
  }

  function resize(){
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.min(220, Math.round(W * H / 9000));
    while(flakes.length < n) flakes.push(make(true));
    flakes.length = n;
  }

  function frame(t){
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (t - last) / 1000 || 0.016);
    last = t;
    if(++tick % 30 === 0){
      const show = loginVisible();
      if(show !== on){
        on = show;
        document.body.classList.toggle('xt-winter', on);
        cv.style.display = on ? 'block' : 'none';
      }
    }
    if(!on) return;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    const wind = Math.sin(t / 4000) * 14;
    for(let i = 0; i < flakes.length; i++){
      const f = flakes[i];
      f.y += f.vy * dt;
      f.ph += f.fr * dt;
      f.x += (Math.sin(f.ph) * f.sw * 0.6 + wind * f.r * 0.35) * dt;
      if(f.y > H + 10 || f.x < -20 || f.x > W + 20){
        const n = make(false);
        if(f.x < -20 || f.x > W + 20){ n.x = Math.random() * W; }
        flakes[i] = n;
        continue;
      }
      ctx.globalAlpha = f.a;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, 6.2832);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function start(){
    if(raf || reduce) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }

  addEventListener('resize', resize);
  document.addEventListener('visibilitychange', () => {
    if(document.hidden){ cancelAnimationFrame(raf); raf = 0; }
    else start();
  });
  resize();
  cv.style.display = 'none';
  start();
})();
