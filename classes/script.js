const dataUrl = '../data/classes.js';

const EVOLUTION_CHAINS = [
  {
    baseSlug: 'dune-dancer',
    baseName: 'Dune Dancer',
    primeSlug: 'ridge-striker',
    primeName: 'Ridge Striker',
    apexSlug: 'canyon-temper',
    apexName: 'Canyon Temper',
  },
  {
    baseSlug: 'flash',
    baseName: 'Flash',
    primeSlug: 'helion',
    primeName: 'Hellion',
    apexSlug: 'aster',
    apexName: 'Aster',
  },
  {
    baseSlug: 'shadow-piercer',
    baseName: 'Shadow Piercer',
    primeSlug: 'umbral-howl',
    primeName: 'Umbral Howl',
    apexSlug: 'nocturne-hoarfrost',
    apexName: 'Nocturne Hoarfrost',
  },
  {
    baseSlug: 'sophist',
    baseName: 'Sophist',
    primeSlug: 'conceptualist',
    primeName: 'Conceptualist',
    apexSlug: 'maximist',
    apexName: 'Maximist',
  },
  {
    baseSlug: 'true-scale',
    baseName: 'True Scale',
    primeSlug: 'toll-bearer',
    primeName: 'Toll Bearer',
    apexSlug: 'invisible-hand',
    apexName: 'Invisible Hand',
  },
];

const TIERS = ['base', 'prime', 'apex'];
const TIER_LEVEL = {
  base: 'lvl 1',
  prime: 'lvl 4',
  apex: 'lvl 7',
};

const classList = document.getElementById('class-list');
const classCount = document.getElementById('class-count');
const classTitle = document.getElementById('class-title');
const classMeta = document.getElementById('class-meta');
const cardsSections = document.getElementById('cards-sections');
const evolutionSlider = document.getElementById('evolution-slider');
const evolutionStepBase = document.getElementById('evolution-step-base');
const evolutionStepPrime = document.getElementById('evolution-step-prime');
const evolutionStepApex = document.getElementById('evolution-step-apex');
const evolutionMeta = document.getElementById('evolution-meta');
const classLinkTemplate = document.getElementById('class-link-template');
const cardTemplate = document.getElementById('card-template');

const evolutionState = new Map();
let classes = [];
let classesBySlug = new Map();
let activeClassSlug = null;

async function loadClassData() {
  const response = await fetch(dataUrl);
  if (!response.ok) {
    throw new Error(`Unable to load class data: ${response.status}`);
  }
  return response.json();
}

function formatCardName(fileName) {
  return fileName
    .replace(/^rv-/, '')
    .replace(/\.[^.]+$/, '')
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function buildCardIndex(entries) {
  const index = new Map();

  entries.forEach((entry) => {
    if (!entry || typeof entry.image !== 'string') return;
    const match = entry.image.match(/^classes\/rove\/(base|prime|apex)\/core\/([^/]+)\/.+$/);
    if (!match) return;

    const [, tier, slug] = match;
    const key = `${tier}:${slug}`;
    if (!index.has(key)) {
      index.set(key, new Set());
    }
    index.get(key).add(entry.image);
  });

  return index;
}

function buildClassDefinitions(cardIndex) {
  return EVOLUTION_CHAINS.map((chain) => {
    const tiers = TIERS.map((tier) => {
      const slug = chain[`${tier}Slug`];
      const name = chain[`${tier}Name`];
      const key = `${tier}:${slug}`;
      const cards = Array.from(cardIndex.get(key) || []).sort((a, b) => a.localeCompare(b));
      return {
        tier,
        slug,
        name,
        label: `${tier.charAt(0).toUpperCase() + tier.slice(1)} - ${TIER_LEVEL[tier]} ${name}`,
        cards,
      };
    });

    const totalCards = tiers.reduce((total, item) => total + item.cards.length, 0);
    return {
      slug: chain.baseSlug,
      name: chain.baseName,
      tiers,
      totalCards,
    };
  }).sort((a, b) => a.name.localeCompare(b.name));
}

function getEvolutionStage(classSlug) {
  return evolutionState.get(classSlug) ?? 0;
}

function setEvolutionStage(classSlug, stage) {
  const safeStage = Math.max(0, Math.min(2, Number(stage) || 0));
  evolutionState.set(classSlug, safeStage);
}

function renderClassLinks(activeSlug) {
  classList.innerHTML = '';
  classCount.textContent = `${classes.length} total`;

  classes.forEach((classInfo) => {
    const link = classLinkTemplate.content.firstElementChild.cloneNode(true);
    link.href = `#${classInfo.slug}`;
    link.classList.toggle('is-active', classInfo.slug === activeSlug);
    link.querySelector('.class-link-name').textContent = classInfo.name;
    link.querySelector('.class-link-meta').textContent = `${classInfo.totalCards} total cards`;
    classList.append(link);
  });
}

function renderEvolutionControl(classInfo, stage) {
  const [base, prime, apex] = classInfo.tiers;

  evolutionSlider.value = String(stage);
  evolutionStepBase.textContent = `Base: ${base.name}`;
  evolutionStepPrime.textContent = `Prime: ${prime.name}`;
  evolutionStepApex.textContent = `Apex: ${apex.name}`;

  [evolutionStepBase, evolutionStepPrime, evolutionStepApex].forEach((element, index) => {
    element.classList.toggle('is-active', index <= stage);
  });

  const visibleTierNames = classInfo.tiers
    .slice(0, stage + 1)
    .map((tier) => tier.name)
    .join(' + ');
  evolutionMeta.textContent = `Showing: ${visibleTierNames}`;
}

function createCardsGrid(cards) {
  const grid = document.createElement('div');
  grid.className = 'cards-grid';

  cards.forEach((imagePath) => {
    const fileName = imagePath.split('/').pop() || imagePath;
    const card = cardTemplate.content.firstElementChild.cloneNode(true);
    const img = card.querySelector('img');
    img.src = `../images/${imagePath}`;
    img.alt = formatCardName(fileName);
    card.querySelector('figcaption').textContent = formatCardName(fileName);
    grid.append(card);
  });

  return grid;
}

function renderCardSections(classInfo, stage) {
  cardsSections.innerHTML = '';
  const visibleTiers = classInfo.tiers.slice(0, stage + 1);

  visibleTiers.forEach((tierInfo) => {
    const section = document.createElement('section');
    section.className = 'card-section';

    const heading = document.createElement('h3');
    heading.className = 'card-section-title';
    heading.textContent = `${tierInfo.label} (${tierInfo.cards.length})`;
    section.append(heading);

    if (tierInfo.cards.length) {
      section.append(createCardsGrid(tierInfo.cards));
    } else {
      const empty = document.createElement('p');
      empty.className = 'empty-state';
      empty.textContent = 'No cards found for this tier.';
      section.append(empty);
    }

    cardsSections.append(section);
  });
}

function renderActiveClass() {
  if (!activeClassSlug || !classesBySlug.has(activeClassSlug)) return;

  const classInfo = classesBySlug.get(activeClassSlug);
  const stage = getEvolutionStage(classInfo.slug);
  const visibleCount = classInfo.tiers
    .slice(0, stage + 1)
    .reduce((total, tier) => total + tier.cards.length, 0);

  classTitle.textContent = classInfo.name;
  classMeta.textContent = `${visibleCount} visible cards`;
  renderClassLinks(classInfo.slug);
  renderEvolutionControl(classInfo, stage);
  renderCardSections(classInfo, stage);
}

function renderError(message) {
  classTitle.textContent = 'Unable to load classes';
  classMeta.textContent = '';
  cardsSections.innerHTML = `<p class="empty-state">${message}</p>`;
  classList.innerHTML = '';
  classCount.textContent = '';
}

function resolveActiveSlug() {
  const requestedSlug = window.location.hash.slice(1).trim().toLowerCase();
  const defaultSlug = classes[0]?.slug;
  const safeSlug = classesBySlug.has(requestedSlug) ? requestedSlug : defaultSlug;

  if (!safeSlug) return null;
  if (requestedSlug !== safeSlug) {
    window.location.hash = `#${safeSlug}`;
    return null;
  }
  return safeSlug;
}

async function init() {
  const data = await loadClassData();
  const cardIndex = buildCardIndex(data);
  classes = buildClassDefinitions(cardIndex);

  if (!classes.length) {
    throw new Error('No class evolution data found.');
  }

  classesBySlug = new Map(classes.map((classInfo) => [classInfo.slug, classInfo]));

  const renderFromLocation = () => {
    const slug = resolveActiveSlug();
    if (!slug) return;
    activeClassSlug = slug;
    renderActiveClass();
  };

  evolutionSlider.addEventListener('input', (event) => {
    if (!activeClassSlug) return;
    setEvolutionStage(activeClassSlug, event.target.value);
    renderActiveClass();
  });

  window.addEventListener('hashchange', renderFromLocation);
  renderFromLocation();
}

init().catch((error) => {
  console.error(error);
  renderError(error.message);
});
