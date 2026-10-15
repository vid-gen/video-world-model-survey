'use strict';

// The entire survey, every figure, and the GitHub bibliography work without JS.
// Enhancement adds figure galleries, an accessible viewer, and library filters.
document.querySelectorAll('[data-gallery]').forEach(gallery => {
  const tabs = [...gallery.querySelectorAll('[data-figure-tab]')];
  const panels = [...gallery.querySelectorAll('[data-figure-panel]')];
  const tabList = gallery.querySelector('.figure-tabs');
  tabList.setAttribute('role', 'tablist');
  function select(id, focus = false) {
    tabs.forEach(tab => {
      const active = tab.dataset.figureTab === id;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      if (active && focus) tab.focus();
    });
    panels.forEach(panel => { panel.hidden = panel.id !== id; });
  }
  tabs.forEach((tab, index) => {
    const id = tab.dataset.figureTab;
    tab.id = 'tab-' + id;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', id);
    const panel = panels.find(item => item.id === id);
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', tab.id);
    panel.tabIndex = 0;
    tab.addEventListener('click', event => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      select(id);
    });
    tab.addEventListener('keydown', event => {
      const target = event.key === 'ArrowRight' ? (index + 1) % tabs.length :
        event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length :
        event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : -1;
      if (target < 0) return;
      event.preventDefault();
      select(tabs[target].dataset.figureTab, true);
    });
  });
  const fromHash = () => {
    const id = location.hash.slice(1);
    if (panels.some(panel => panel.id === id)) select(id);
  };
  select(tabs[0].dataset.figureTab);
  fromHash();
  window.addEventListener('hashchange', fromHash);
});

const chapterLinks = [...document.querySelectorAll('.chapter-nav a')];
const chapters = [...document.querySelectorAll('[data-chapter]')];
let scrollPending = false;
let currentChapter = '';
function updateChapter() {
  scrollPending = false;
  const threshold = window.innerHeight * .35;
  let active = chapters[0];
  for (const chapter of chapters) {
    if (chapter.getBoundingClientRect().top <= threshold) active = chapter;
  }
  if (currentChapter === active.id) return;
  currentChapter = active.id;
  chapterLinks.forEach(link => {
    if (link.hash === '#' + currentChapter) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
  document.getElementById('current-chapter').textContent = active.dataset.chapter;
  document.getElementById('chapter-position').textContent =
    String(chapters.indexOf(active) + 1).padStart(2, '0') + ' / ' + chapters.length;
}
window.addEventListener('scroll', () => {
  if (!scrollPending) { scrollPending = true; requestAnimationFrame(updateChapter); }
}, { passive: true });
window.addEventListener('resize', updateChapter);
window.addEventListener('load', updateChapter);
updateChapter();

const figureDialog = document.getElementById('figure-dialog');
const figureViewport = figureDialog.querySelector('.figure-viewport');
const expandedFigure = document.getElementById('expanded-figure');
const zoomFigure = document.getElementById('zoom-figure');
let figureTrigger = null;
function setFigureZoom(zoomed) {
  figureViewport.classList.toggle('zoomed', zoomed);
  zoomFigure.setAttribute('aria-pressed', String(zoomed));
  zoomFigure.textContent = zoomed ? (figureViewport.classList.contains('tall') ? 'Fit to width' : 'Fit to screen') : 'Zoom in';
  if (!zoomed) { figureViewport.scrollTop = 0; figureViewport.scrollLeft = 0; }
}
document.querySelectorAll('[data-figure]').forEach(link => {
  link.addEventListener('click', event => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    figureTrigger = link;
    const thumbnail = link.querySelector('img');
    expandedFigure.src = link.href;
    expandedFigure.alt = thumbnail.alt;
    // A portrait timeline should open at a readable width, with native scrolling.
    figureViewport.classList.toggle('tall', Number(thumbnail.getAttribute('height')) > Number(thumbnail.getAttribute('width')) * 1.1);
    document.getElementById('figure-title').textContent = link.dataset.title;
    document.getElementById('original-figure').href = link.href;
    setFigureZoom(false);
    figureDialog.showModal();
    document.getElementById('close-figure').focus();
  });
});
zoomFigure.addEventListener('click', () => setFigureZoom(!figureViewport.classList.contains('zoomed')));
expandedFigure.addEventListener('click', () => setFigureZoom(!figureViewport.classList.contains('zoomed')));
document.getElementById('close-figure').addEventListener('click', () => figureDialog.close());
figureDialog.addEventListener('close', () => { if (figureTrigger?.isConnected) figureTrigger.focus(); });

const categoryNames = {
  understanding: 'Reading', generation: 'Writing', unified: 'Sharing',
  'world-models': 'Interacting', evaluation: 'Evaluation', background: 'Foundations'
};
const resourceNames = { code: 'Code', project: 'Project', data: 'Data' };
const pageSize = 24;
const controls = {
  search: document.getElementById('search'), year: document.getElementById('year'),
  venue: document.getElementById('venue'), sort: document.getElementById('sort')
};
const state = { papers: [], filtered: [], category: 'all', page: 1, loaded: false };
let lastLibraryQuery = location.search;
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
  if (paper.resources) {
    const resources = element('div', 'paper-resources');
    for (const [kind, label] of Object.entries(resourceNames)) {
      if (!paper.resources[kind]) continue;
      const resource = element('a', '', `${label} ↗`);
      resource.href = paper.resources[kind];
      resource.target = '_blank';
      resource.rel = 'noopener noreferrer';
      resource.setAttribute('aria-label', `${label} for ${paper.title}`);
      resources.append(resource);
    }
    if (resources.childElementCount) main.append(resources);
  }
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
  lastLibraryQuery = location.search;
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
  lastLibraryQuery = location.search;
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
    Object.hasOwn(categoryNames, paper.category) && typeof paper.url === 'string' && /^https:\/\//.test(paper.url) &&
    (paper.resources === undefined || (paper.resources !== null && typeof paper.resources === 'object' &&
      !Array.isArray(paper.resources) && Object.entries(paper.resources).every(([kind, url]) =>
        Object.hasOwn(resourceNames, kind) && typeof url === 'string' && /^https?:\/\//.test(url))))
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
window.addEventListener('popstate', () => {
  // A chapter anchor changes history too; do not rebuild the bibliography for it.
  if (state.loaded && location.search !== lastLibraryQuery) { readFilters(); filterPapers(true, false); }
});
loadLibrary();
