/* Hero figure: a grid of cells lit like a saliency map. A few soft peaks rest
   in place; the strongest one follows the pointer. Decorative only. */

(() => {
  const canvas = document.getElementById('field');
  if (!canvas || !canvas.getContext) return;

  const ctx = canvas.getContext('2d');
  const hero = canvas.closest('.hero') || document.body;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const darkScheme = matchMedia('(prefers-color-scheme: dark)');

  const N = 14;
  // Resting attention: x, y, spread, strength (all in 0..1 canvas units).
  const peaks = [
    [.30, .36, .14, 1],
    [.72, .64, .17, .75],
    [.58, .16, .09, .55],
    [.18, .82, .10, .4],
  ];
  const pointer = { x: .5, y: .5, tx: .5, ty: .5, w: 0, tw: 0 };

  let size = 0;
  let dpr = 1;
  let frame = 0;
  let colors = { accent: '#2A3BD6', cell: '#DAD5C8' };

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  function readColors() {
    const style = getComputedStyle(canvas);
    colors = {
      accent: style.getPropertyValue('--accent').trim() || colors.accent,
      cell: style.getPropertyValue('--line').trim() || colors.cell,
    };
  }

  function heatAt(x, y) {
    let heat = 0;
    for (const [px, py, spread, strength] of peaks) {
      const dx = x - px;
      const dy = y - py;
      heat += strength * Math.exp(-(dx * dx + dy * dy) / (2 * spread * spread));
    }
    if (pointer.w > .001) {
      const dx = x - pointer.x;
      const dy = y - pointer.y;
      heat += pointer.w * 1.1 * Math.exp(-(dx * dx + dy * dy) / (2 * .13 * .13));
    }
    return Math.min(heat, 1);
  }

  function roundedRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function draw() {
    if (!size) return;
    ctx.clearRect(0, 0, size, size);

    const pad = size * .06;
    const cell = (size - pad * 2) / N;
    const gap = cell * .16;
    const radius = cell * .24;

    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        const heat = heatAt((i + .5) / N, (j + .5) / N);
        roundedRect(pad + i * cell + gap / 2, pad + j * cell + gap / 2, cell - gap, cell - gap, radius);

        ctx.globalAlpha = 1;
        ctx.fillStyle = colors.cell;
        ctx.fill();

        if (heat > .08) {
          ctx.globalAlpha = Math.min(1, .08 + .92 * Math.pow(heat, 1.35));
          ctx.fillStyle = colors.accent;
          ctx.fill();
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  function step() {
    pointer.x += (pointer.tx - pointer.x) * .14;
    pointer.y += (pointer.ty - pointer.y) * .14;
    pointer.w += (pointer.tw - pointer.w) * .1;
    draw();

    const settling =
      Math.abs(pointer.tx - pointer.x) > .001 ||
      Math.abs(pointer.ty - pointer.y) > .001 ||
      Math.abs(pointer.tw - pointer.w) > .002;
    frame = settling ? requestAnimationFrame(step) : 0;
  }

  function animate() {
    if (!frame) frame = requestAnimationFrame(step);
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width) return;
    size = rect.width;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }

  hero.addEventListener('pointermove', (event) => {
    if (reduceMotion.matches) return;
    const rect = canvas.getBoundingClientRect();
    pointer.tx = clamp((event.clientX - rect.left) / rect.width, -.15, 1.15);
    pointer.ty = clamp((event.clientY - rect.top) / rect.height, -.15, 1.15);
    pointer.tw = 1;
    animate();
  });

  hero.addEventListener('pointerleave', () => {
    pointer.tw = 0;
    animate();
  });

  darkScheme.addEventListener('change', () => {
    readColors();
    draw();
  });

  reduceMotion.addEventListener('change', () => {
    pointer.tw = pointer.w = 0;
    draw();
  });

  readColors();
  new ResizeObserver(resize).observe(canvas);
  resize();
})();
