// Config (asegúrate de incluir config.js antes de este script)
const API_KEY = window.APP_CONFIG?.TMDB_API_KEY || '';
const IMAGE_BASE = 'https://image.tmdb.org/t/p/w300';

// DOM refs
const grid = document.getElementById('grid');
const searchInput = document.getElementById('searchInput');
const typeFilter = document.getElementById('typeFilter');
const resultsTitle = document.getElementById('resultsTitle');
const noResults = document.getElementById('noResults');
const modal = document.getElementById('modal');
const modalClose = document.getElementById('modalClose');
const closeBtn = document.getElementById('closeBtn');
const modalPoster = document.getElementById('modalPoster');
const modalTitle = document.getElementById('modalTitle');
const modalMeta = document.getElementById('modalMeta');
const modalOverview = document.getElementById('modalOverview');

if (!API_KEY) {
  console.warn('TMDB API key not found. Create config.js with window.APP_CONFIG.TMDB_API_KEY.');
}

// Util
function debounce(fn, wait=300){
  let t;
  return (...args)=>{ clearTimeout(t); t = setTimeout(()=>fn(...args), wait); };
}

// Render helpers
function createCard(item){
  const poster = item.poster_path ? IMAGE_BASE + item.poster_path : (item.profile_path ? IMAGE_BASE + item.profile_path : 'https://via.placeholder.com/300x450?text=No+Image');
  const title = item.title || item.name || 'Sin título';
  const type = item.media_type === 'movie' ? 'movie' : (item.media_type === 'tv' ? 'series' : (item.media_type || 'unknown'));
  const year = (item.release_date || item.first_air_date || '').slice(0,4) || '—';

  const card = document.createElement('div');
  card.className = 'card';
  card.tabIndex = 0;
  card.innerHTML = `
    <div class="poster"><img src="${poster}" alt="${title} poster" style="width:100%;height:100%;object-fit:cover;border-radius:6px" /></div>
    <div class="meta">
      <div class="title">${title}</div>
      <div class="year-type">${year} · ${type}</div>
    </div>
  `;
  card.addEventListener('click', ()=> openModal({title, year, type, overview: item.overview || item.overview || item.known_for_department || 'Sin descripción.', poster}));
  card.addEventListener('keypress', (e)=> { if(e.key === 'Enter') openModal({title, year, type, overview: item.overview || 'Sin descripción.', poster}) });
  return card;
}

function render(items){
  grid.innerHTML = '';
  if (!items || items.length === 0){
    noResults.hidden = false;
    resultsTitle.textContent = '0 resultados';
    return;
  }
  noResults.hidden = true;
  resultsTitle.textContent = `${items.length} resultado(s)`;
  items.forEach(it => grid.appendChild(createCard(it)));
}

// Modal
function openModal(item){
  modalPoster.src = item.poster || 'https://via.placeholder.com/300x450?text=No+Image';
  modalPoster.alt = `${item.title} poster`;
  modalTitle.textContent = item.title;
  modalMeta.textContent = `${item.year} · ${item.type}`;
  modalOverview.textContent = item.overview || 'Sin descripción.';
  modal.classList.add('show');
  modal.setAttribute('aria-hidden','false');
}
function closeModal(){ modal.classList.remove('show'); modal.setAttribute('aria-hidden','true'); }
modalClose?.addEventListener('click', closeModal);
closeBtn?.addEventListener('click', closeModal);
document.addEventListener('keydown', (e)=> { if(e.key === 'Escape') closeModal(); });

// Search + fetch (TMDB)
async function searchTMDB(query, page=1){
  if (!API_KEY) return [];
  const url = new URL('https://api.themoviedb.org/3/search/multi');
  url.searchParams.set('api_key', API_KEY);
  url.searchParams.set('query', query);
  url.searchParams.set('page', String(page));
  url.searchParams.set('include_adult', 'false');
  const res = await fetch(url);
  if (!res.ok) throw new Error('TMDB request failed');
  const json = await res.json();
  return json.results || [];
}

async function filterAndRender(){
  const q = searchInput.value.trim();
  const t = typeFilter.value; // all | movie | series

  if (!q){
    // if empty, show popular movies as fallback
    try {
      const fallback = await fetchFallback(t);
      render(fallback);
    } catch(e){
      console.error(e);
      render([]);
    }
    return;
  }

  try {
    const items = await searchTMDB(q);
    const filtered = items.filter(it => {
      if (t === 'all') return true;
      if (t === 'movie') return it.media_type === 'movie';
      if (t === 'series') return it.media_type === 'tv';
      return true;
    });
    render(filtered);
  } catch (err){
    console.error(err);
    render([]);
  }
}

// Fallback: fetch popular if query empty
async function fetchFallback(type){
  if (!API_KEY) return [];
  const ep = type === 'movie' ? '/movie/popular' : type === 'series' ? '/tv/popular' : '/trending/all/week';
  const url = `https://api.themoviedb.org/3${ep}?api_key=${API_KEY}&page=1`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const json = await res.json();
  return json.results || [];
}

// Events
searchInput.addEventListener('input', debounce(filterAndRender, 300));
typeFilter.addEventListener('change', filterAndRender);

// Init: set year and initial list
document.getElementById('year') && (document.getElementById('year').textContent = new Date().getFullYear());
filterAndRender();