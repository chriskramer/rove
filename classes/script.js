const classesDataUrl = '../data/classes.js';
const classMetadataUrl = '../data/class-card-metadata.json';
const profileBoardsDataUrl = '../data/profile-boards.js';
const abilitiesDataUrl = '../data/abilities.js';
const traitsDataUrl = '../data/traits.js';
const desktopBackgroundImages = [
  '../images/art/rove/other/pictures/desktop/rv-desktop-silky-village.png',
  '../images/art/rove/other/pictures/desktop/rv-desktop-starling-sanctum.png',
  '../images/art/rove/other/pictures/desktop/rv-desktop-river-market.png',
];

const EVOLUTION_CONFIG = [
  {
    baseSlug: 'dune-dancer',
    baseName: 'Dune Dancer',
    paths: {
      core: {
        label: 'Core',
        prime: { slug: 'ridge-striker', name: 'Ridge Striker', set: 'core' },
        apex: { slug: 'canyon-temper', name: 'Canyon Temper', set: 'core' },
      },
      xulc: {
        label: 'Xulc',
        prime: { slug: 'fountain-caller', name: 'Fountain Caller', set: 'xulc' },
        apex: { slug: 'wellspring-ewer', name: 'Wellspring Ewer', set: 'xulc' },
      },
    },
  },
  {
    baseSlug: 'flash',
    baseName: 'Flash',
    paths: {
      core: {
        label: 'Core',
        prime: { slug: 'helion', name: 'Hellion', set: 'core' },
        apex: { slug: 'aster', name: 'Aster', set: 'core' },
      },
      xulc: {
        label: 'Xulc',
        prime: { slug: 'mistral', name: 'Mistral', set: 'xulc' },
        apex: { slug: 'tempest', name: 'Tempest', set: 'xulc' },
      },
    },
  },
  {
    baseSlug: 'shadow-piercer',
    baseName: 'Shadow Piercer',
    paths: {
      core: {
        label: 'Core',
        prime: { slug: 'umbral-howl', name: 'Umbral Howl', set: 'core' },
        apex: { slug: 'nocturne-hoarfrost', name: 'Nocturne Hoarfrost', set: 'core' },
      },
      xulc: {
        label: 'Xulc',
        prime: {
          slug: 'keening-bolt',
          name: 'Keening Bolt',
          set: 'xulc',
        },
        apex: { slug: 'vesper-sharpshot', name: 'Vesper Sharpshot', set: 'xulc' },
      },
    },
  },
  {
    baseSlug: 'sophist',
    baseName: 'Sophist',
    paths: {
      core: {
        label: 'Core',
        prime: { slug: 'conceptualist', name: 'Conceptualist', set: 'core' },
        apex: { slug: 'maximist', name: 'Maximist', set: 'core' },
      },
      xulc: {
        label: 'Xulc',
        prime: { slug: 'essentialist', name: 'Essentialist', set: 'xulc' },
        apex: { slug: 'kataphatist', name: 'Kataphatist', set: 'xulc' },
      },
    },
  },
  {
    baseSlug: 'true-scale',
    baseName: 'True Scale',
    paths: {
      core: {
        label: 'Core',
        prime: { slug: 'toll-bearer', name: 'Toll Bearer', set: 'core' },
        apex: { slug: 'invisible-hand', name: 'Invisible Hand', set: 'core' },
      },
      xulc: {
        label: 'Xulc',
        prime: { slug: 'fierce-ransomer', name: 'Fierce Ransomer', set: 'xulc' },
        apex: { slug: 'zero-sum', name: 'Zero Sum', set: 'xulc' },
      },
    },
  },
];

const TIERS = ['base', 'prime', 'apex'];
const TIER_LEVEL = { base: 'lvl 1', prime: 'lvl 4', apex: 'lvl 7' };
const TAB_KEYS = ['cards', 'profileBoards', 'abilities', 'traits'];
const TAB_LABELS = {
  cards: 'Cards',
  profileBoards: 'Profile Board',
  abilities: 'Abilities',
  traits: 'Traits',
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
const evolutionPathSelect = document.getElementById('evolution-path-select');
const tabButtons = Array.from(document.querySelectorAll('.tab-btn'));
const classLinkTemplate = document.getElementById('class-link-template');
const cardTemplate = document.getElementById('card-template');

const pathState = new Map();
const stageState = new Map();
let classes = [];
let classesBySlug = new Map();
let activeClassSlug = null;
let activeTab = 'cards';

function applyRandomDesktopBackground() {
  const choice =
    desktopBackgroundImages[Math.floor(Math.random() * desktopBackgroundImages.length)];
  document.body.style.setProperty('--desktop-bg', `url("${choice}")`);
}

function canonicalName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatCardName(fileName) {
  return fileName
    .replace(/^rv-/, '')
    .replace(/\.[^.]+$/, '')
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function classIconUrl(tier, set, slug) {
  return `../images/art/rove/${tier}/${set}/icons/classes/rv-${slug}-class-icon.png`;
}

function buildNameWithIcon(name, tier, set, slug, extraClass = '') {
  const wrapper = document.createElement('span');
  wrapper.className = `name-with-icon${extraClass ? ` ${extraClass}` : ''}`;

  const icon = document.createElement('img');
  icon.className = 'class-icon';
  icon.src = classIconUrl(tier, set, slug);
  icon.alt = `${name} icon`;
  icon.loading = 'lazy';
  icon.addEventListener('error', () => {
    icon.remove();
  });
  wrapper.append(icon);

  const text = document.createElement('span');
  text.textContent = name;
  wrapper.append(text);
  return wrapper;
}

function parseAssetNumber(assetno) {
  if (typeof assetno !== 'string') return null;
  const match = assetno.match(/^([a-z])-([0-9]+)$/i);
  if (!match) return null;
  return { prefix: match[1].toLowerCase(), value: Number(match[2]) };
}

function fallbackPairKey(card) {
  if (!card.asset) return `${card.tier}:${card.set}:${card.slug}:${card.imagePath}`;
  if (card.asset.prefix === 'a') return `${card.tier}:${card.set}:${card.slug}:a-${card.asset.value}`;
  if (card.asset.prefix === 's') {
    const pairStart = card.asset.value % 2 === 0 ? card.asset.value - 1 : card.asset.value;
    return `${card.tier}:${card.set}:${card.slug}:s-${pairStart}`;
  }
  return `${card.tier}:${card.set}:${card.slug}:${card.asset.prefix}-${card.asset.value}`;
}

function genericPairKey(card) {
  const base = card.fileName
    .replace(/\.[^.]+$/, '')
    .replace(/^rv-/, '')
    .replace(/-(ability|trait)-back$/, '')
    .replace(/-(ability|trait)-front$/, '')
    .replace(/-back$/, '')
    .replace(/-front$/, '');
  return `${card.tier}:${card.set}:${card.slug}:${card.kind}:${base}`;
}

function stageKey(classSlug, pathKey) {
  return `${classSlug}:${pathKey}`;
}

function chainNameMap() {
  const map = new Map();
  EVOLUTION_CONFIG.forEach((entry) => {
    const baseName = canonicalName(entry.baseName);
    map.set(`base:core:${baseName}`, entry.baseSlug);

    Object.entries(entry.paths).forEach(([pathKey, pathInfo]) => {
      const primeName = canonicalName(pathInfo.prime.name);
      const apexName = canonicalName(pathInfo.apex.name);
      const primeSourceTier = pathInfo.prime.sourceTier || 'prime';
      const apexSourceTier = pathInfo.apex.sourceTier || 'apex';
      map.set(`${primeSourceTier}:${pathInfo.prime.set}:${primeName}`, pathInfo.prime.slug);
      map.set(`${apexSourceTier}:${pathInfo.apex.set}:${apexName}`, pathInfo.apex.slug);
      if (pathKey === 'core') return;
    });
  });
  return map;
}

const profileBoardNameMap = chainNameMap();

async function loadJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Unable to load ${url}: ${response.status}`);
  return response.json();
}

function makeBaseCard(entry, tier, set, slug, kind) {
  const fileName = entry.image.split('/').pop() || entry.image;
  return {
    kind,
    tier,
    set,
    slug,
    imagePath: entry.image,
    fileName,
    name: entry.name,
    assetno: entry.assetno,
    asset: parseAssetNumber(entry.assetno),
    isSummons: false,
    isLevelUp: false,
    pairKey: '',
  };
}

function buildCardsIndex(entries, metadata) {
  const index = new Map();
  const seen = new Set();
  const metadataCards = metadata?.cards || {};

  entries.forEach((entry) => {
    if (!entry || typeof entry.image !== 'string') return;
    const match = entry.image.match(/^classes\/rove\/(base|prime|apex)\/(core|xulc)\/([^/]+)\/.+$/);
    if (!match) return;

    const [, tier, set, slug] = match;
    const dedupeKey = `${tier}:${set}:${slug}:${entry.image}`;
    if (seen.has(dedupeKey)) return;
    seen.add(dedupeKey);

    const key = `cards:${tier}:${set}:${slug}`;
    if (!index.has(key)) index.set(key, []);

    const card = makeBaseCard(entry, tier, set, slug, 'cards');
    const metadataRow = metadataCards[entry.image] || {};
    card.isSummons =
      typeof metadataRow.isSummons === 'boolean'
        ? metadataRow.isSummons
        : Boolean(card.asset && card.asset.prefix === 'a');
    card.isLevelUp = Boolean(metadataRow.isLevelUp);
    card.pairKey = metadataRow.pairKey || fallbackPairKey(card);

    index.get(key).push(card);
  });

  for (const cards of index.values()) {
    cards.sort((a, b) => a.imagePath.localeCompare(b.imagePath));
  }
  return index;
}

function buildPathIndex(entries, kind) {
  const index = new Map();
  const seen = new Set();

  entries.forEach((entry) => {
    if (!entry || typeof entry.image !== 'string') return;
    let tier = '';
    let set = '';
    let slug = '';

    if (kind === 'profileBoards') {
      const match = entry.image.match(/^profile-boards\/rove\/(base|prime|apex)\/(core|xulc)\/.+$/);
      if (!match) return;
      tier = match[1];
      set = match[2];
      slug = profileBoardNameMap.get(`${tier}:${set}:${canonicalName(entry.name)}`) || '';
      if (!slug) return;
    } else {
      const match = entry.image.match(/^(abilities|traits)\/rove\/(base|prime|apex)\/(core|xulc)\/([^/]+)\/.+$/);
      if (!match) return;
      tier = match[2];
      set = match[3];
      slug = match[4];
    }

    const dedupeKey = `${kind}:${tier}:${set}:${slug}:${entry.image}`;
    if (seen.has(dedupeKey)) return;
    seen.add(dedupeKey);

    const key = `${kind}:${tier}:${set}:${slug}`;
    if (!index.has(key)) index.set(key, []);
    const card = makeBaseCard(entry, tier, set, slug, kind);
    card.pairKey = genericPairKey(card);
    index.get(key).push(card);
  });

  for (const cards of index.values()) {
    cards.sort((a, b) => a.imagePath.localeCompare(b.imagePath));
  }
  return index;
}

function getCardsFor(indices, tabKey, tier, set, slug) {
  const key = `${tabKey}:${tier}:${set}:${slug}`;
  return [...(indices[tabKey].get(key) || [])];
}

function buildClassDefinitions(indices) {
  return EVOLUTION_CONFIG.map((entry) => {
    const paths = {};

    Object.entries(entry.paths).forEach(([pathKey, pathInfo]) => {
      const tiers = [
        {
          tier: 'base',
          set: 'core',
          slug: entry.baseSlug,
          name: entry.baseName,
          label: `Base - ${TIER_LEVEL.base} ${entry.baseName}`,
        },
        {
          tier: 'prime',
          sourceTier: pathInfo.prime.sourceTier || 'prime',
          set: pathInfo.prime.set,
          slug: pathInfo.prime.slug,
          name: pathInfo.prime.name,
          label: `Prime - ${TIER_LEVEL.prime} ${pathInfo.prime.name}`,
        },
        {
          tier: 'apex',
          sourceTier: pathInfo.apex.sourceTier || 'apex',
          set: pathInfo.apex.set,
          slug: pathInfo.apex.slug,
          name: pathInfo.apex.name,
          label: `Apex - ${TIER_LEVEL.apex} ${pathInfo.apex.name}`,
        },
      ].map((tierInfo) => ({
        ...tierInfo,
        cards: getCardsFor(
          indices,
          'cards',
          tierInfo.sourceTier || tierInfo.tier,
          tierInfo.set,
          tierInfo.slug
        ),
        profileBoards: getCardsFor(
          indices,
          'profileBoards',
          tierInfo.sourceTier || tierInfo.tier,
          tierInfo.set,
          tierInfo.slug
        ),
        abilities: getCardsFor(
          indices,
          'abilities',
          tierInfo.sourceTier || tierInfo.tier,
          tierInfo.set,
          tierInfo.slug
        ),
        traits: getCardsFor(
          indices,
          'traits',
          tierInfo.sourceTier || tierInfo.tier,
          tierInfo.set,
          tierInfo.slug
        ),
      }));

      const totalCards = tiers.reduce((sum, item) => sum + item.cards.length, 0);
      paths[pathKey] = {
        key: pathKey,
        label: pathInfo.label,
        tiers,
        totalCards,
      };
    });

    return {
      slug: entry.baseSlug,
      name: entry.baseName,
      paths,
    };
  }).sort((a, b) => a.name.localeCompare(b.name));
}

function getActivePathKey(classSlug) {
  return pathState.get(classSlug) || 'core';
}

function setActivePathKey(classSlug, pathKey) {
  pathState.set(classSlug, pathKey);
}

function getEvolutionStage(classSlug, pathKey) {
  return stageState.get(stageKey(classSlug, pathKey)) ?? 0;
}

function setEvolutionStage(classSlug, pathKey, stage) {
  const safeStage = Math.max(0, Math.min(2, Number(stage) || 0));
  stageState.set(stageKey(classSlug, pathKey), safeStage);
}

function setActiveTab(tabKey) {
  if (!TAB_KEYS.includes(tabKey)) return;
  activeTab = tabKey;
  tabButtons.forEach((button) => {
    button.classList.toggle('is-active', button.dataset.tab === activeTab);
  });
}

function renderClassLinks(activeSlug) {
  classList.innerHTML = '';
  classCount.textContent = `${classes.length} total`;

  classes.forEach((classInfo) => {
    const link = classLinkTemplate.content.firstElementChild.cloneNode(true);
    const activePathKey = getActivePathKey(classInfo.slug);
    const pathInfo = classInfo.paths[activePathKey] || classInfo.paths.core;

    link.href = `#${classInfo.slug}`;
    link.classList.toggle('is-active', classInfo.slug === activeSlug);
    const nameEl = link.querySelector('.class-link-name');
    nameEl.textContent = '';
    nameEl.append(buildNameWithIcon(classInfo.name, 'base', 'core', classInfo.slug));
    link.querySelector('.class-link-meta').textContent = `${pathInfo.label}: ${pathInfo.totalCards} cards`;
    classList.append(link);
  });
}

function renderPathSelector(classInfo, activePathKey) {
  evolutionPathSelect.innerHTML = '';
  Object.values(classInfo.paths).forEach((pathInfo) => {
    const option = document.createElement('option');
    option.value = pathInfo.key;
    option.textContent = pathInfo.label;
    evolutionPathSelect.append(option);
  });
  evolutionPathSelect.value = activePathKey;
}

function renderEvolutionControl(pathInfo, stage) {
  const [base, prime, apex] = pathInfo.tiers;
  evolutionSlider.value = String(stage);
  evolutionStepBase.textContent = '';
  evolutionStepPrime.textContent = '';
  evolutionStepApex.textContent = '';
  evolutionStepBase.append(buildNameWithIcon(`Base: ${base.name}`, base.tier, base.set, base.slug));
  evolutionStepPrime.append(
    buildNameWithIcon(`Prime: ${prime.name}`, prime.tier, prime.set, prime.slug)
  );
  evolutionStepApex.append(buildNameWithIcon(`Apex: ${apex.name}`, apex.tier, apex.set, apex.slug));
  [evolutionStepBase, evolutionStepPrime, evolutionStepApex].forEach((element, index) => {
    element.classList.toggle('is-active', index <= stage);
  });
  const visibleTierNames = pathInfo.tiers
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

function renderCardsTierSection(tierInfo) {
  const section = document.createElement('section');
  section.className = 'card-section';

  const heading = document.createElement('h3');
  heading.className = 'card-section-title';
  heading.textContent = '';
  heading.append(buildNameWithIcon(tierInfo.label, tierInfo.tier, tierInfo.set, tierInfo.slug));
  heading.append(document.createTextNode(` (${tierInfo.cards.length})`));
  section.append(heading);

  const summons = tierInfo.cards.filter((card) => card.isSummons);
  const levelUp = tierInfo.cards.filter((card) => !card.isSummons && card.isLevelUp);
  const starting = tierInfo.cards.filter((card) => !card.isSummons && !card.isLevelUp);

  section.append(createGroupSection('Starting', starting));
  section.append(createGroupSection('Level Up', levelUp));
  if (summons.length) section.append(createGroupSection('Summons', summons));

  return section;
}

function renderGenericTierSection(tierInfo, tabKey) {
  const items = tierInfo[tabKey] || [];
  const section = document.createElement('section');
  section.className = 'card-section';

  const heading = document.createElement('h3');
  heading.className = 'card-section-title';
  heading.textContent = '';
  heading.append(buildNameWithIcon(tierInfo.label, tierInfo.tier, tierInfo.set, tierInfo.slug));
  heading.append(document.createTextNode(` (${items.length})`));
  section.append(heading);

  if (!items.length) {
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent =
      tabKey === 'traits' && tierInfo.tier === 'base'
        ? 'Traits start at Prime evolution.'
        : 'No images found for this tier.';
    section.append(empty);
    return section;
  }

  section.append(createPairGrid(items));
  return section;
}

function renderActiveClass() {
  if (!activeClassSlug || !classesBySlug.has(activeClassSlug)) return;

  const classInfo = classesBySlug.get(activeClassSlug);
  const activePathKey = getActivePathKey(classInfo.slug);
  const pathInfo = classInfo.paths[activePathKey] || classInfo.paths.core;
  const stage = getEvolutionStage(classInfo.slug, activePathKey);
  const visibleTiers = pathInfo.tiers.slice(0, stage + 1);
  const visibleCount = visibleTiers.reduce((total, tierInfo) => {
    if (activeTab === 'cards') return total + tierInfo.cards.length;
    return total + (tierInfo[activeTab] || []).length;
  }, 0);

  classTitle.textContent = '';
  classTitle.append(buildNameWithIcon(classInfo.name, 'base', 'core', classInfo.slug, 'title-icon'));
  classMeta.textContent = `${pathInfo.label}: ${visibleCount} visible ${TAB_LABELS[activeTab].toLowerCase()} images`;
  renderClassLinks(classInfo.slug);
  renderPathSelector(classInfo, activePathKey);
  renderEvolutionControl(pathInfo, stage);
  cardsSections.dataset.tab = activeTab;
  cardsSections.innerHTML = '';

  visibleTiers.forEach((tierInfo) => {
    const section =
      activeTab === 'cards'
        ? renderCardsTierSection(tierInfo)
        : renderGenericTierSection(tierInfo, activeTab);
    cardsSections.append(section);
  });
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
  applyRandomDesktopBackground();

  const [classEntries, metadata, profileBoardsEntries, abilitiesEntries, traitsEntries] =
    await Promise.all([
      loadJson(classesDataUrl),
      loadJson(classMetadataUrl).catch(() => ({})),
      loadJson(profileBoardsDataUrl),
      loadJson(abilitiesDataUrl),
      loadJson(traitsDataUrl),
    ]);

  const indices = {
    cards: buildCardsIndex(classEntries, metadata),
    profileBoards: buildPathIndex(profileBoardsEntries, 'profileBoards'),
    abilities: buildPathIndex(abilitiesEntries, 'abilities'),
    traits: buildPathIndex(traitsEntries, 'traits'),
  };

  classes = buildClassDefinitions(indices);
  if (!classes.length) throw new Error('No class evolution data found.');
  classesBySlug = new Map(classes.map((classInfo) => [classInfo.slug, classInfo]));

  classes.forEach((classInfo) => {
    if (!pathState.has(classInfo.slug)) pathState.set(classInfo.slug, 'core');
  });

  const renderFromLocation = () => {
    const slug = resolveActiveSlug();
    if (!slug) return;
    activeClassSlug = slug;
    renderActiveClass();
  };

  evolutionSlider.addEventListener('input', (event) => {
    if (!activeClassSlug || !classesBySlug.has(activeClassSlug)) return;
    const pathKey = getActivePathKey(activeClassSlug);
    setEvolutionStage(activeClassSlug, pathKey, event.target.value);
    renderActiveClass();
  });

  evolutionPathSelect.addEventListener('change', (event) => {
    if (!activeClassSlug || !classesBySlug.has(activeClassSlug)) return;
    setActivePathKey(activeClassSlug, event.target.value);
    renderActiveClass();
  });

  tabButtons.forEach((button) => {
    button.addEventListener('click', () => {
      setActiveTab(button.dataset.tab);
      renderActiveClass();
    });
  });

  setActiveTab(activeTab);
  window.addEventListener('hashchange', renderFromLocation);
  renderFromLocation();
}

init().catch((error) => {
  console.error(error);
  renderError(error.message);
});
