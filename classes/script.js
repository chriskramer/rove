const classesDataUrl = '../data/classes.js';
const classMetadataUrl = '../data/class-card-metadata.json';

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
const TIER_LEVEL = { base: 'lvl 1', prime: 'lvl 4', apex: 'lvl 7' };

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

function formatCardName(fileName) {
  return fileName
    .replace(/^rv-/, '')
    .replace(/\.[^.]+$/, '')
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function parseAssetNumber(assetno) {
  if (typeof assetno !== 'string') return null;
  const match = assetno.match(/^([a-z])-([0-9]+)$/i);
  if (!match) return null;
  return { prefix: match[1].toLowerCase(), value: Number(match[2]) };
}

function fallbackPairKey(card) {
  if (!card.asset) return `${card.tier}:${card.slug}:${card.imagePath}`;
  if (card.asset.prefix === 'a') return `${card.tier}:${card.slug}:a-${card.asset.value}`;
  if (card.asset.prefix === 's') {
    const pairStart = card.asset.value % 2 === 0 ? card.asset.value - 1 : card.asset.value;
    return `${card.tier}:${card.slug}:s-${pairStart}`;
  }
  return `${card.tier}:${card.slug}:${card.asset.prefix}-${card.asset.value}`;
}

async function loadJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Unable to load ${url}: ${response.status}`);
  }
  return response.json();
}

function buildCardIndex(entries, metadata) {
  const index = new Map();
  const seen = new Set();
  const metadataCards = metadata?.cards || {};

  entries.forEach((entry) => {
    if (!entry || typeof entry.image !== 'string') return;
    const match = entry.image.match(/^classes\/rove\/(base|prime|apex)\/core\/([^/]+)\/.+$/);
    if (!match) return;
    if (seen.has(entry.image)) return;
    seen.add(entry.image);

    const [, tier, slug] = match;
    const key = `${tier}:${slug}`;
    if (!index.has(key)) index.set(key, []);

    const fileName = entry.image.split('/').pop() || entry.image;
    const asset = parseAssetNumber(entry.assetno);
    const metadataRow = metadataCards[entry.image] || {};

    const card = {
      tier,
      slug,
      imagePath: entry.image,
      fileName,
      name: entry.name,
      assetno: entry.assetno,
      asset,
      isSummons:
        typeof metadataRow.isSummons === 'boolean'
          ? metadataRow.isSummons
          : fileName.includes('-front') || fileName.includes('-back'),
      isLevelUp: Boolean(metadataRow.isLevelUp),
      pairKey: metadataRow.pairKey || '',
    };

    if (!card.pairKey) card.pairKey = fallbackPairKey(card);
    index.get(key).push(card);
  });

  for (const cards of index.values()) {
    cards.sort((a, b) => a.imagePath.localeCompare(b.imagePath));
  }

  return index;
}

function buildClassDefinitions(cardIndex) {
  return EVOLUTION_CHAINS.map((chain) => {
    const tiers = TIERS.map((tier) => {
      const slug = chain[`${tier}Slug`];
      const name = chain[`${tier}Name`];
      const key = `${tier}:${slug}`;
      const cards = [...(cardIndex.get(key) || [])];
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

function createCardFigure(card) {
  const node = cardTemplate.content.firstElementChild.cloneNode(true);
  const img = node.querySelector('img');
  img.src = `../images/${card.imagePath}`;
  img.alt = formatCardName(card.fileName);
  node.querySelector('figcaption').textContent = formatCardName(card.fileName);
  return node;
}

function createPairGrid(cards) {
  const pairMap = new Map();
  cards.forEach((card) => {
    if (!pairMap.has(card.pairKey)) pairMap.set(card.pairKey, []);
    pairMap.get(card.pairKey).push(card);
  });

  const grid = document.createElement('div');
  grid.className = 'pair-grid';
  const pairs = Array.from(pairMap.values()).sort((a, b) => {
    const aAsset = a[0]?.asset?.value ?? Number.MAX_SAFE_INTEGER;
    const bAsset = b[0]?.asset?.value ?? Number.MAX_SAFE_INTEGER;
    return aAsset - bAsset || a[0].fileName.localeCompare(b[0].fileName);
  });

  pairs.forEach((pairCards) => {
    pairCards.sort((a, b) => a.fileName.localeCompare(b.fileName));
    const pair = document.createElement('div');
    pair.className = 'card-pair';
    pairCards.forEach((card) => pair.append(createCardFigure(card)));
    grid.append(pair);
  });

  return grid;
}

function createGroupSection(title, cards) {
  const section = document.createElement('section');
  section.className = 'group-section';

  const heading = document.createElement('h4');
  heading.className = 'group-title';
  heading.textContent = `${title} (${cards.length})`;
  section.append(heading);

  if (!cards.length) {
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = 'No cards in this group.';
    section.append(empty);
    return section;
  }

  section.append(createPairGrid(cards));
  return section;
}

function renderTierSection(tierInfo) {
  const section = document.createElement('section');
  section.className = 'card-section';

  const heading = document.createElement('h3');
  heading.className = 'card-section-title';
  heading.textContent = `${tierInfo.label} (${tierInfo.cards.length})`;
  section.append(heading);

  const summons = tierInfo.cards.filter((card) => card.isSummons);
  const levelUp = tierInfo.cards.filter((card) => !card.isSummons && card.isLevelUp);
  const starting = tierInfo.cards.filter((card) => !card.isSummons && !card.isLevelUp);

  section.append(createGroupSection('Starting', starting));
  section.append(createGroupSection('Level Up', levelUp));
  if (summons.length) section.append(createGroupSection('Summons', summons));

  return section;
}

function renderActiveClass() {
  if (!activeClassSlug || !classesBySlug.has(activeClassSlug)) return;

  const classInfo = classesBySlug.get(activeClassSlug);
  const stage = getEvolutionStage(classInfo.slug);
  const visibleTiers = classInfo.tiers.slice(0, stage + 1);
  const visibleCount = visibleTiers.reduce((total, tier) => total + tier.cards.length, 0);

  classTitle.textContent = classInfo.name;
  classMeta.textContent = `${visibleCount} visible cards`;
  renderClassLinks(classInfo.slug);
  renderEvolutionControl(classInfo, stage);
  cardsSections.innerHTML = '';
  visibleTiers.forEach((tierInfo) => cardsSections.append(renderTierSection(tierInfo)));
}

function renderError(message) {
  classTitle.textContent = 'Unable to load classes';
  classMeta.textContent = '';
  cardsSections.innerHTML = `<p class=\"empty-state\">${message}</p>`;
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
  const [classEntries, metadata] = await Promise.all([
    loadJson(classesDataUrl),
    loadJson(classMetadataUrl).catch(() => ({})),
  ]);

  const cardIndex = buildCardIndex(classEntries, metadata);
  classes = buildClassDefinitions(cardIndex);
  if (!classes.length) throw new Error('No class evolution data found.');
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
