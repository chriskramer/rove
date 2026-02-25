const DATA_URL = '../data/classes.js';
const BASE_PREFIX = 'classes/rove/base/core/';

const classList = document.getElementById('class-list');
const classTitle = document.getElementById('class-title');
const classCount = document.getElementById('class-count');
const cardsGrid = document.getElementById('cards-grid');
const classLinkTemplate = document.getElementById('class-link-template');
const cardTemplate = document.getElementById('card-template');

async function loadData() {
  const response = await fetch(DATA_URL);
  if (!response.ok) {
    throw new Error(`Unable to load class data: ${response.status}`);
  }
  return response.json();
}

function titleCase(value) {
  return value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function labelFromFilename(filename) {
  return filename.replace(/^rv-/, '').replace(/\.png$/i, '').replace(/-/g, ' ');
}

function buildBaseClassIndex(entries) {
  const byClass = new Map();

  for (const entry of entries) {
    if (typeof entry.image !== 'string' || !entry.image.startsWith(BASE_PREFIX)) {
      continue;
    }

    const [classSlug, filename] = entry.image.slice(BASE_PREFIX.length).split('/');
    if (!classSlug || !filename) {
      continue;
    }

    if (!byClass.has(classSlug)) {
      byClass.set(classSlug, {
        slug: classSlug,
        name: titleCase(classSlug),
        images: new Set(),
      });
    }

    byClass.get(classSlug).images.add(entry.image);
  }

  return Array.from(byClass.values())
    .map((item) => ({
      ...item,
      images: Array.from(item.images).sort((a, b) => a.localeCompare(b)),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function renderClassList(classes, activeSlug) {
  classList.innerHTML = '';

  for (const item of classes) {
    const link = classLinkTemplate.content.firstElementChild.cloneNode(true);
    link.href = `#${item.slug}`;
    link.textContent = item.name;
    if (item.slug === activeSlug) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    }
    classList.append(link);
  }
}

function renderCards(activeClass) {
  classTitle.textContent = activeClass.name;
  classCount.textContent = `${activeClass.images.length} cards`;
  cardsGrid.innerHTML = '';

  for (const imagePath of activeClass.images) {
    const filename = imagePath.split('/').pop();
    const card = cardTemplate.content.firstElementChild.cloneNode(true);
    const image = card.querySelector('img');
    const label = card.querySelector('p');

    image.src = `../images/${imagePath}`;
    image.alt = labelFromFilename(filename);
    label.textContent = titleCase(labelFromFilename(filename));

    cardsGrid.append(card);
  }
}

async function init() {
  const data = await loadData();
  const baseClasses = buildBaseClassIndex(data);

  if (!baseClasses.length) {
    throw new Error('No class images found in classes/rove/base/core/.');
  }

  const bySlug = new Map(baseClasses.map((item) => [item.slug, item]));

  const render = () => {
    const slug = window.location.hash.replace('#', '');
    const activeClass = bySlug.get(slug) ?? baseClasses[0];

    if (!bySlug.has(slug)) {
      window.location.hash = `#${activeClass.slug}`;
      return;
    }

    renderClassList(baseClasses, activeClass.slug);
    renderCards(activeClass);
  };

  window.addEventListener('hashchange', render);
  render();
}

init().catch((error) => {
  classList.innerHTML = '';
  classTitle.textContent = 'Error';
  classCount.textContent = '';
  cardsGrid.innerHTML = `<p class="error-message">${error.message}</p>`;
  console.error(error);
});
