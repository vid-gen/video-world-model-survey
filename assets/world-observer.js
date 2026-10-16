/* A conceptual, deterministic observation scene. No model inference or real
   camera access: every frame is a crop of the same illustrated world state. */
(() => {
  'use strict';
  const root = document.querySelector('#world-observer');
  if (!root) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const ns = 'http://www.w3.org/2000/svg';
  const crops = [
    { name: 'Riverside', box: [-200, -55, 265, 168] },
    { name: 'Wide view', box: [-215, -95, 430, 245] },
    { name: 'Courtyard', box: [5, -75, 215, 145] }
  ];
  function svgElement(tag, attrs = {}) {
    const element = document.createElementNS(ns, tag);
    for (const [key, value] of Object.entries(attrs)) element.setAttribute(key, value);
    return element;
  }
  const use = id => svgElement('use', { href: `#${id}` });
  function makeView() {
    const svg = svgElement('svg', { viewBox: crops[0].box.join(' '), 'aria-hidden': 'true' });
    const subject = svgElement('g');
    subject.append(use('observer-subject'));
    svg.append(use('observer-base'), subject, use('observer-front'));
    return { svg, subject };
  }
  function inside(point, polygon) {
    let hit = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const a = polygon[i], b = polygon[j];
      if ((a[1] > point.y) !== (b[1] > point.y) && point.x < (b[0] - a[0]) * (point.y - a[1]) / (b[1] - a[1]) + a[0]) hit = !hit;
    }
    return hit;
  }
  async function initialize() {
    const response = await fetch(root.dataset.scene);
    if (!response.ok) throw new Error('Scene unavailable');
    const doc = new DOMParser().parseFromString(await response.text(), 'image/svg+xml');
    if (doc.querySelector('parsererror') || doc.documentElement.localName !== 'svg') throw new Error('Invalid scene');
    const world = document.importNode(doc.documentElement, true);
    root.querySelector('.observer-world').append(world);
    const feed = makeView();
    root.querySelector('.observer-feed').append(feed.svg);
    const frames = Array.from({ length: 4 }, () => {
      const button = document.createElement('button');
      button.type = 'button';
      const view = makeView();
      const label = document.createElement('span');
      button.append(view.svg, label);
      root.querySelector('.observer-filmstrip').append(button);
      return { ...view, button, label, time: 0 };
    });
    const route = world.querySelector('#observer-route');
    const length = route.getTotalLength();
    const marker = world.querySelector('[data-subject]');
    const region = world.querySelector('[data-view-field]');
    const slider = root.querySelector('input[type="range"]');
    const play = root.querySelector('.observer-play');
    const reverse = root.querySelector('.observer-reverse');
    const message = root.querySelector('.observer-message');
    const status = root.querySelector('.observer-visibility');
    const duration = root.querySelector('.observer-duration');
    const timestamp = root.querySelector('.observer-timestamp');
    const viewButtons = [...root.querySelectorAll('[data-observer-view]')];
    const buildings = [
      [[57, 9], [57, -32], [81, -43], [102, -34], [102, 7], [81, -2]],
      [[105, 23], [105, -32], [127, -43], [144, -36], [144, 19], [127, 12]],
      [[62, 43], [62, 21], [80, 12], [101, 20], [101, 42], [80, 34]]
    ];
    let time = 0;
    let direction = 1;
    let selected = 0;
    let intentToPlay = !reduced.matches;
    let visible = false;
    let running = false;
    let request = null;
    let lastTick = 0;
    let lastSample = null;
    let visibilityState = '';
    function pointAt(value) { return route.getPointAtLength(length * Math.max(0, Math.min(16, value)) / 16); }
    function position(element, value) {
      const point = pointAt(value);
      element.setAttribute('transform', `translate(${point.x.toFixed(2)} ${point.y.toFixed(2)})`);
      return point;
    }
    function samples() {
      const sample = Math.floor(time / 1.5);
      if (sample === lastSample) return;
      lastSample = sample;
      frames.forEach((frame, i) => {
        const value = (sample - 3 + i) * 1.5;
        frame.time = value;
        frame.button.disabled = value < 0;
        frame.svg.style.visibility = value < 0 ? 'hidden' : 'visible';
        frame.label.textContent = value < 0 ? '—' : `${value.toFixed(1)} s`;
        frame.button.setAttribute('aria-label', value < 0 ? 'No earlier frame' : `View sampled frame at ${value.toFixed(1)} seconds`);
        position(frame.subject, Math.max(0, value));
      });
    }
    function paint() {
      const point = position(marker, time);
      position(feed.subject, time);
      const [x, y, width, height] = crops[selected].box;
      let observation = 'Object visible';
      if (point.x < x || point.x > x + width || point.y - 7 < y || point.y - 7 > y + height) observation = 'Outside this view';
      else if (buildings.some(polygon => inside({ x: point.x, y: point.y - 7 }, polygon))) observation = 'Behind the buildings';
      if (observation !== visibilityState) {
        status.textContent = observation;
        root.querySelector('.observer-video').dataset.observation = observation === 'Object visible' ? 'visible' : 'hidden';
        visibilityState = observation;
      }
      slider.value = time.toFixed(2);
      slider.setAttribute('aria-valuetext', `${time.toFixed(1)} seconds of 16`);
      duration.textContent = `${time.toFixed(1)} / 16 s`;
      timestamp.textContent = `${time.toFixed(1).padStart(4, '0')} s`;
      root.dataset.time = time.toFixed(2);
      samples();
    }
    function updatePlayback() {
      const shouldRun = intentToPlay && visible && !document.hidden;
      root.dataset.playing = String(shouldRun);
      play.setAttribute('aria-label', intentToPlay ? 'Pause animation' : 'Play animation');
      play.firstElementChild.textContent = intentToPlay ? 'Ⅱ' : '▶';
      root.querySelector('[data-play-label]').textContent = intentToPlay ? 'Pause' : 'Play';
      if (shouldRun && !running) {
        running = true;
        lastTick = 0;
        request = requestAnimationFrame(tick);
      } else if (!shouldRun) {
        if (request !== null) cancelAnimationFrame(request);
        request = null;
        running = false;
      }
    }
    function tick(now) {
      const delta = lastTick ? Math.min((now - lastTick) / 1000, .1) : 0;
      lastTick = now;
      time = Math.max(0, Math.min(16, time + delta * direction));
      paint();
      if ((direction === 1 && time >= 16) || (direction === -1 && time <= 0)) {
        intentToPlay = false;
        message.textContent = 'End of the trace. Replay, reverse motion, or choose another view.';
        updatePlayback();
      } else request = requestAnimationFrame(tick);
    }
    play.addEventListener('click', () => {
      intentToPlay = !intentToPlay;
      if (intentToPlay && direction === 1 && time >= 16) time = 0;
      if (intentToPlay && direction === -1 && time <= 0) time = 16;
      message.textContent = intentToPlay ? 'Follow the purple object as the world changes.' : 'Paused. Scrub the trace or change the view.';
      paint();
      updatePlayback();
    });
    slider.addEventListener('input', () => {
      intentToPlay = false;
      time = Number(slider.value);
      paint();
      updatePlayback();
      message.textContent = 'Paused. Each sampled frame comes from this same scene.';
    });
    reverse.addEventListener('click', () => {
      direction *= -1;
      reverse.setAttribute('aria-pressed', String(direction === -1));
      if (direction === -1 && time <= 0) time = 16;
      if (direction === 1 && time >= 16) time = 0;
      message.textContent = direction === -1 ? 'Motion reversed. The video follows the changed world trajectory.' : 'Forward motion restored.';
      paint();
      // Respect reduced motion: changing direction never starts playback.
    });
    frames.forEach(frame => frame.button.addEventListener('click', () => {
      intentToPlay = false;
      time = frame.time;
      paint();
      updatePlayback();
      message.textContent = `Paused at the sampled frame, ${time.toFixed(1)} seconds.`;
    }));
    viewButtons.forEach(button => button.addEventListener('click', () => setView(Number(button.dataset.observerView))));
    function setView(index) {
      selected = index;
      const { name, box } = crops[index];
      feed.svg.setAttribute('viewBox', box.join(' '));
      frames.forEach(frame => frame.svg.setAttribute('viewBox', box.join(' ')));
      ['x', 'y', 'width', 'height'].forEach((attribute, i) => region.setAttribute(attribute, box[i]));
      world.querySelectorAll('[data-camera]').forEach(camera => { camera.dataset.active = String(Number(camera.dataset.camera) === index); });
      viewButtons.forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.observerView) === index)));
      root.querySelector('.observer-view-name').textContent = name;
      message.textContent = `${name}: a different crop of the same world, at the same time.`;
      paint();
    }
    root.querySelector('.observer-experience').hidden = false;
    root.querySelector('.observer-fallback').hidden = true;
    setView(0);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(entries => {
        visible = entries[0].isIntersecting;
        updatePlayback();
      }, { threshold: .15 }).observe(root);
    } else { visible = true; updatePlayback(); }
    document.addEventListener('visibilitychange', updatePlayback);
    reduced.addEventListener('change', () => {
      if (reduced.matches) { intentToPlay = false; updatePlayback(); }
    });
    if (reduced.matches) message.textContent = 'Animation paused for reduced motion. Use Play or the time slider to explore.';
  }
  // No external dependency: the static original-world illustration remains if
  // the enhancement cannot be loaded.
  initialize().catch(() => { root.dataset.unavailable = 'true'; });
})();
