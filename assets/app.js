'use strict';

// Progressive enhancement: the survey remains readable without JavaScript.
const operationNames = ['reading', 'writing', 'sharing', 'interacting'];
function showOperation(name) {
  if (!operationNames.includes(name)) return;
  document.querySelectorAll('.operation-panel').forEach(panel => { panel.hidden = panel.id !== name; });
  document.querySelectorAll('[data-operation]').forEach(link => {
    const active = link.dataset.operation === name;
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'true');
    else link.removeAttribute('aria-current');
  });
}
showOperation(operationNames.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'reading');
document.querySelectorAll('a[href]').forEach(link => {
  const name = link.getAttribute('href').slice(1);
  if (operationNames.includes(name)) link.addEventListener('click', () => showOperation(name));
});
window.addEventListener('hashchange', () => showOperation(location.hash.slice(1)));

const traceTime = document.getElementById('trace-time');
function updateTrace() {
  const time = Number(traceTime.value);
  const x = 24 + time * 3.9;
  document.getElementById('trace-car').setAttribute('transform', `translate(${x} 0)`);
  document.getElementById('world-car').setAttribute('transform', `translate(${x} 0)`);
  // The identity changes only while the whole car is occluded.
  const changed = time >= 52;
  document.querySelector('#trace-car path').setAttribute('fill', changed ? '#c8754f' : '#06b0f0');
  const inOcclusion = x >= 194 && x + 80 <= 332;
  document.getElementById('trace-status').textContent = inOcclusion ? 'Hidden from the camera' : changed ? 'A different identity returns' : 'Blue car enters';
  document.getElementById('world-status').textContent = inOcclusion ? 'Identity persists out of view' : time >= 52 ? 'The same blue car returns' : 'Blue car enters';
  document.getElementById('time-value').textContent = `${time}%`;
  traceTime.setAttribute('aria-valuetext', `${time}% through the sequence`);
}
traceTime.addEventListener('input', updateTrace);
updateTrace();

const categoryNames = {
  understanding: 'Reading', generation: 'Writing', unified: 'Sharing',
  'world-models': 'Interacting', evaluation: 'Evaluation', background: 'Foundations'
};
const pageSize = 24;
const controls = {
  search: document.getElementById('search'), year: document.getElementById('year'),
  venue: document.getElementById('venue'), sort: document.getElementById('sort')
};
const state = { papers: [], filtered: [], category: 'all', page: 1, loaded: false };
const list = document.getElementById('paper-list');
const dialog = document.getElementById('bib-dialog');
let returnFocus = null;
let selectedBibtex = '';

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function normalized(text) { return text.normalize('NFKD').replace(/\p{Diacritic}/gu, '').toLowerCase(); }
function openBibtex(paper, button) {
  returnFocus = button;
  selectedBibtex = paper.bibtex;
  document.getElementById('bib-paper-title').textContent = paper.title;
  document.getElementById('bib-content').textContent = selectedBibtex;
  document.getElementById('copy-status').textContent = '';
  dialog.showModal();
  document.getElementById('close-bib').focus();
}
function renderPaper(paper) {
  const row = element('article', 'paper-row');
  const main = element('div', 'paper-main');
  const heading = element('h3');
  const link = element('a', '', paper.title);
  link.href = paper.url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  heading.append(link);
  const names = paper.authors.length > 6 ? `${paper.authors.slice(0, 6).join(', ')}, et al.` : paper.authors.join(', ');
  const meta = element('div', 'paper-meta');
  const category = element('span', 'category-label', categoryNames[paper.category]);
  category.dataset.category = paper.category;
  meta.append(category, element('span', 'venue-label', paper.venue));
  main.append(heading, element('p', 'paper-authors', names), meta);
  const button = element('button', 'bib-button', 'BibTeX');
  button.type = 'button';
  button.setAttribute('aria-label', `View BibTeX for ${paper.title}`);
  button.addEventListener('click', () => openBibtex(paper, button));
  row.append(element('span', 'paper-year', String(paper.year)), main, button);
  return row;
}
function saveFilters() {
  const params = new URLSearchParams();
  if (controls.search.value.trim()) params.set('q', controls.search.value.trim());
  if (state.category !== 'all') params.set('category', state.category);
  if (controls.year.value !== 'all') params.set('year', controls.year.value);
  if (controls.venue.value !== 'all') params.set('venue', controls.venue.value);
  if (controls.sort.value !== 'newest') params.set('sort', controls.sort.value);
  const query = params.toString();
  history.replaceState(null, '', `${location.pathname}${query ? '?' + query : ''}${location.hash}`);
}
function filterPapers(resetPage = true, persist = true) {
  if (!state.loaded) return;
  if (resetPage) state.page = 1;
  const terms = normalized(controls.search.value.trim()).split(/\s+/).filter(Boolean);
  state.filtered = state.papers.filter(paper =>
    (state.category === 'all' || paper.category === state.category) &&
    (controls.year.value === 'all' || String(paper.year) === controls.year.value) &&
    (controls.venue.value === 'all' || paper.venue === controls.venue.value) &&
    terms.every(term => paper.searchText.includes(term))
  );
  state.filtered.sort((a, b) => {
    const title = a.title.localeCompare(b.title, 'en', { sensitivity: 'base' });
    return controls.sort.value === 'title' ? title : controls.sort.value === 'oldest' ? a.year - b.year || title : b.year - a.year || title;
  });
  if (persist) saveFilters();
  renderResults();
}
function renderResults() {
  const total = state.filtered.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  state.page = Math.min(Math.max(1, state.page), pages);
  const offset = (state.page - 1) * pageSize;
  list.replaceChildren();
  if (!total) {
    const empty = element('div', 'no-results');
    const reset = element('button', 'button quiet', 'Clear all filters');
    reset.type = 'button';
    reset.addEventListener('click', resetFilters);
    empty.append(element('h3', '', 'No references match these filters.'), element('p', '', 'Try fewer keywords, a different year, or another research area.'), reset);
    list.append(empty);
  } else {
    const fragment = document.createDocumentFragment();
    state.filtered.slice(offset, offset + pageSize).forEach(paper => fragment.append(renderPaper(paper)));
    list.append(fragment);
  }
  document.getElementById('result-status').textContent = total ? `${offset + 1}–${Math.min(offset + pageSize, total)} of ${total} references${state.category === 'all' ? '' : ' · ' + categoryNames[state.category]}` : '0 matching references';
  document.getElementById('page-status').textContent = `Page ${state.page} of ${pages}`;
  document.getElementById('previous-page').disabled = state.page === 1;
  document.getElementById('next-page').disabled = state.page === pages;
  document.getElementById('pagination').hidden = total <= pageSize;
  document.getElementById('export-bib').hidden = !total;
  document.querySelectorAll('[data-category]').forEach(button => {
    if (button.tagName === 'BUTTON') button.setAttribute('aria-pressed', String(button.dataset.category === state.category));
  });
}
function resetFilters() {
  controls.search.value = '';
  controls.year.value = 'all';
  controls.venue.value = 'all';
  controls.sort.value = 'newest';
  state.category = 'all';
  filterPapers();
}
function readFilters() {
  const params = new URLSearchParams(location.search);
  controls.search.value = params.get('q') || '';
  state.category = Object.hasOwn(categoryNames, params.get('category')) ? params.get('category') : 'all';
  for (const name of ['year', 'venue', 'sort']) {
    const value = params.get(name);
    if ([...controls[name].options].some(option => option.value === value)) controls[name].value = value;
    else controls[name].value = name === 'sort' ? 'newest' : 'all';
  }
}
function isCatalog(value) {
  return value && Array.isArray(value.papers) && value.papers.length > 0 && value.papers.every(paper =>
    typeof paper.title === 'string' && typeof paper.key === 'string' &&
    typeof paper.venue === 'string' && typeof paper.bibtex === 'string' &&
    Number.isInteger(paper.year) && Array.isArray(paper.authors) && paper.authors.every(name => typeof name === 'string') &&
    Object.hasOwn(categoryNames, paper.category) && typeof paper.url === 'string' && /^https:\/\//.test(paper.url)
  ) && new Set(value.papers.map(paper => paper.key)).size === value.papers.length;
}
async function fetchCatalog(url, timeout) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`Catalog request failed: ${response.status}`);
    const data = await response.json();
    if (!isCatalog(data)) throw new Error('Invalid reference catalog');
    return data;
  } finally { clearTimeout(timer); }
}
async function loadLibrary() {
  try {
    // The bundled catalog keeps the library independent of the raw GitHub CDN.
    // The literature repository provides a fallback if that snapshot is unavailable.
    let catalog;
    try { catalog = await fetchCatalog('data/references.json', 8000); }
    catch { catalog = await fetchCatalog('https://raw.githubusercontent.com/vid-gen/awesome-video-world-model/main/data/references.json', 8000); }
    state.papers = catalog.papers.map(paper => ({ ...paper, searchText: normalized([paper.title, ...paper.authors, paper.venue, paper.key].join(' ')) }));
    state.loaded = true;
    document.querySelectorAll('[data-total]').forEach(node => { node.textContent = String(state.papers.length); });
    document.querySelectorAll('[data-count]').forEach(node => { node.textContent = String(node.dataset.count === 'all' ? state.papers.length : state.papers.filter(paper => paper.category === node.dataset.count).length); });
    [...new Set(state.papers.map(paper => paper.year))].sort((a, b) => b - a).forEach(year => controls.year.add(new Option(String(year), String(year))));
    [...new Set(state.papers.map(paper => paper.venue))].sort((a, b) => a.localeCompare(b)).forEach(venue => controls.venue.add(new Option(venue, venue)));
    readFilters();
    document.getElementById('library-tools').hidden = false;
    filterPapers(true, false);
  } catch (error) {
    document.getElementById('result-status').textContent = 'The reference library is temporarily unavailable.';
    document.getElementById('library-error').hidden = false;
    console.error(error);
  }
}
let searchTimer;
controls.search.addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(() => filterPapers(), 120); });
document.getElementById('search-form').addEventListener('submit', event => { event.preventDefault(); clearTimeout(searchTimer); filterPapers(); });
['year', 'venue', 'sort'].forEach(name => controls[name].addEventListener('change', () => filterPapers()));
document.getElementById('clear-search').addEventListener('click', () => { controls.search.value = ''; filterPapers(); controls.search.focus(); });
document.getElementById('reset-filters').addEventListener('click', resetFilters);
document.querySelectorAll('button[data-category]').forEach(button => button.addEventListener('click', () => { state.category = button.dataset.category; filterPapers(); }));
document.querySelectorAll('[data-category-link]').forEach(link => link.addEventListener('click', () => {
  resetFilters();
  state.category = link.dataset.categoryLink;
  filterPapers();
}));
for (const [id, direction] of [['previous-page', -1], ['next-page', 1]]) {
  document.getElementById(id).addEventListener('click', () => {
    state.page += direction;
    renderResults();
    document.querySelector('.results-toolbar').scrollIntoView({ block: 'start' });
  });
}
document.getElementById('export-bib').addEventListener('click', () => {
  const blob = new Blob([state.filtered.map(paper => paper.bibtex).join('\n\n') + '\n'], { type: 'application/x-bibtex;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = element('a');
  link.href = url;
  link.download = `video-world-model-references-${state.filtered.length}.bib`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
document.getElementById('close-bib').addEventListener('click', () => dialog.close());
dialog.addEventListener('close', () => { if (returnFocus?.isConnected) returnFocus.focus(); });
document.getElementById('copy-bib').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(selectedBibtex);
    document.getElementById('copy-status').textContent = 'Copied to clipboard.';
  } catch {
    const range = document.createRange();
    range.selectNodeContents(document.getElementById('bib-content'));
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    document.getElementById('copy-status').textContent = 'Copy was unavailable. The reference is selected for manual copying.';
  }
});
window.addEventListener('popstate', () => { if (state.loaded) { readFilters(); filterPapers(true, false); } });
loadLibrary();
