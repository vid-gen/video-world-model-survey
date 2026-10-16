/* A local, self-contained reader for the authors' original vector timeline. */
(() => {
  'use strict';
  const viewport = document.querySelector('#viewport');
  const sheet = document.querySelector('#sheet');
  const zoomLabel = document.querySelector('#zoom-level');
  const minus = document.querySelector('#zoom-out');
  const plus = document.querySelector('#zoom-in');
  const toggle = document.querySelector('#affiliation-toggle');
  const variants = [document.querySelector('#with-affiliation'), document.querySelector('#without-affiliation')];
  let zoom = 1;
  let fit = true;
  let previousWidth = 0;
  const usableWidth = () => Math.max(200, viewport.clientWidth - (innerWidth <= 560 ? 20 : 36));
  function resize() {
    const width = usableWidth();
    sheet.style.width = `${Math.round(width * zoom)}px`;
    zoomLabel.textContent = fit ? 'Fit' : `${Math.round(zoom * 100)}%`;
    minus.disabled = zoom <= 1;
    plus.disabled = zoom >= 8;
    previousWidth = width;
  }
  function setZoom(next) {
    const oldWidth = usableWidth() * zoom;
    const centerX = (viewport.scrollLeft + viewport.clientWidth / 2) / oldWidth;
    const centerY = viewport.scrollTop / oldWidth;
    zoom = Math.min(8, Math.max(1, next));
    fit = zoom === 1;
    resize();
    viewport.scrollLeft = centerX * usableWidth() * zoom - viewport.clientWidth / 2;
    viewport.scrollTop = centerY * usableWidth() * zoom;
  }
  minus.addEventListener('click', () => setZoom(zoom / 1.4));
  plus.addEventListener('click', () => setZoom(zoom * 1.4));
  document.querySelector('#fit-width').addEventListener('click', () => setZoom(1));
  document.querySelector('#read-size').addEventListener('click', () => setZoom(1800 / usableWidth()));
  const pathButtons = [...document.querySelectorAll('[data-path]')];
  pathButtons.forEach(button => button.addEventListener('click', () => {
    const path = button.dataset.path;
    pathButtons.forEach(other => other.setAttribute('aria-pressed', String(other === button)));
    if (path === 'all') { setZoom(1); return; }
    setZoom(1800 / usableWidth());
    const group = variants[toggle.checked ? 0 : 1].querySelector(`.operation-header[data-operation="${path}"]`);
    const box = group.getBBox();
    viewport.scrollLeft = (box.x + box.width / 2) * usableWidth() * zoom / 2336 - viewport.clientWidth / 2;
  }));
  viewport.addEventListener('keydown', event => {
    if (event.target.closest('a,button,input,select')) return;
    if (event.key === '+' || event.key === '=') { event.preventDefault(); setZoom(zoom * 1.4); }
    if (event.key === '-') { event.preventDefault(); setZoom(zoom / 1.4); }
    if (event.key === '0') { event.preventDefault(); setZoom(1); }
  });
  const yearPositions = new Map([['0', 0], ['2017', 150], ['2021', 280], ['2022', 410], ['2023', 590], ['2024', 960], ['2025', 1430], ['2026', 2220], ['world', 3010]]);
  document.querySelector('#year').addEventListener('change', event => {
    const y = yearPositions.get(event.target.value) || 0;
    viewport.scrollTop = y * usableWidth() * zoom / 2336;
    if (event.target.value === 'world') viewport.scrollLeft = (sheet.offsetWidth - viewport.clientWidth) / 2;
  });
  function affiliations() {
    variants[0].hidden = !toggle.checked;
    variants[1].hidden = toggle.checked;
    document.querySelector('#svg-download').href = toggle.checked ? 'with-affiliations.svg' : 'without-affiliations.svg';
  }
  const params = new URLSearchParams(location.search);
  toggle.checked = params.get('affiliation') !== '0';
  toggle.addEventListener('change', affiliations);
  affiliations();
  document.body.classList.toggle('standalone', window.self === window.top);
  const fullscreen = document.querySelector('#fullscreen');
  if (document.fullscreenEnabled) {
    fullscreen.hidden = false;
    fullscreen.addEventListener('click', async () => {
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
        else await document.documentElement.requestFullscreen();
      } catch (_) { fullscreen.hidden = true; }
    });
    document.addEventListener('fullscreenchange', () => {
      fullscreen.textContent = document.fullscreenElement ? 'Exit full screen ⛶' : 'Full screen ⛶';
      resize();
    });
  }
  if ('ResizeObserver' in window) new ResizeObserver(() => {
    if (usableWidth() !== previousWidth) resize();
  }).observe(viewport);
  else window.addEventListener('resize', resize);
  resize();
  document.documentElement.classList.add('reader-ready');
})();
