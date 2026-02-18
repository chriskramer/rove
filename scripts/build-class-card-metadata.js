const fs = require('fs');
const path = require('path');
const { createWorker, PSM } = require('tesseract.js');
const { Jimp, intToRGBA } = require('jimp');

const ROOT = path.resolve(__dirname, '..');
const DATA_PATH = path.join(ROOT, 'data', 'classes.js');
const OUTPUT_PATH = path.join(ROOT, 'data', 'class-card-metadata.json');

const EVOLUTION_CHAINS = [
  {
    base: { tier: 'base', set: 'core', slug: 'dune-dancer' },
    core: {
      prime: { tier: 'prime', set: 'core', slug: 'ridge-striker' },
      apex: { tier: 'apex', set: 'core', slug: 'canyon-temper' },
    },
    xulc: {
      prime: { tier: 'apex', set: 'xulc', slug: 'wellspring-ewer' },
      apex: { tier: 'prime', set: 'xulc', slug: 'fountain-caller' },
    },
  },
  {
    base: { tier: 'base', set: 'core', slug: 'flash' },
    core: {
      prime: { tier: 'prime', set: 'core', slug: 'helion' },
      apex: { tier: 'apex', set: 'core', slug: 'aster' },
    },
    xulc: {
      prime: { tier: 'apex', set: 'xulc', slug: 'tempest' },
      apex: { tier: 'prime', set: 'xulc', slug: 'mistral' },
    },
  },
  {
    base: { tier: 'base', set: 'core', slug: 'shadow-piercer' },
    core: {
      prime: { tier: 'prime', set: 'core', slug: 'umbral-howl' },
      apex: { tier: 'apex', set: 'core', slug: 'nocturne-hoarfrost' },
    },
    xulc: {
      prime: { tier: 'apex', set: 'xulc', slug: 'vesper-sharpshot' },
      apex: { tier: 'prime', set: 'xulc', slug: 'keening-bolt' },
    },
  },
  {
    base: { tier: 'base', set: 'core', slug: 'sophist' },
    core: {
      prime: { tier: 'prime', set: 'core', slug: 'conceptualist' },
      apex: { tier: 'apex', set: 'core', slug: 'maximist' },
    },
    xulc: {
      prime: { tier: 'apex', set: 'xulc', slug: 'kataphatist' },
      apex: { tier: 'prime', set: 'xulc', slug: 'essentialist' },
    },
  },
  {
    base: { tier: 'base', set: 'core', slug: 'true-scale' },
    core: {
      prime: { tier: 'prime', set: 'core', slug: 'toll-bearer' },
      apex: { tier: 'apex', set: 'core', slug: 'invisible-hand' },
    },
    xulc: {
      prime: { tier: 'apex', set: 'xulc', slug: 'zero-sum' },
      apex: { tier: 'prime', set: 'xulc', slug: 'fierce-ransomer' },
    },
  },
];

const TARGET_CLASS_KEYS = new Set(
  EVOLUTION_CHAINS.flatMap((chain) => [
    `${chain.base.tier}:${chain.base.set}:${chain.base.slug}`,
    `${chain.core.prime.tier}:${chain.core.prime.set}:${chain.core.prime.slug}`,
    `${chain.core.apex.tier}:${chain.core.apex.set}:${chain.core.apex.slug}`,
    `${chain.xulc.prime.tier}:${chain.xulc.prime.set}:${chain.xulc.prime.slug}`,
    `${chain.xulc.apex.tier}:${chain.xulc.apex.set}:${chain.xulc.apex.slug}`,
  ])
);

function canonicalName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseAssetNumber(assetno) {
  if (typeof assetno !== 'string') return null;
  const match = assetno.match(/^([a-z])-([0-9]+)$/i);
  if (!match) return null;
  return {
    prefix: match[1].toLowerCase(),
    value: Number(match[2]),
  };
}

function scoreSimilarity(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const aTokens = new Set(a.split(' '));
  const bTokens = new Set(b.split(' '));
  const intersection = [...aTokens].filter((token) => bTokens.has(token)).length;
  if (!intersection) return 0;
  return (2 * intersection) / (aTokens.size + bTokens.size);
}

function fallbackPairKey(card) {
  if (!card.asset) return `${card.tier}:${card.set}:${card.slug}:${card.imagePath}`;
  if (card.asset.prefix === 'a') {
    return `${card.tier}:${card.set}:${card.slug}:a-${card.asset.value}`;
  }
  if (card.asset.prefix === 's') {
    const pairStart = card.asset.value % 2 === 0 ? card.asset.value - 1 : card.asset.value;
    return `${card.tier}:${card.set}:${card.slug}:s-${pairStart}`;
  }
  return `${card.tier}:${card.set}:${card.slug}:${card.asset.prefix}-${card.asset.value}`;
}

function buildCards(entries) {
  const cards = [];
  const seen = new Set();

  for (const entry of entries) {
    if (!entry || typeof entry.image !== 'string') continue;
    const match = entry.image.match(/^classes\/rove\/(base|prime|apex)\/(core|xulc)\/([^/]+)\/.+$/);
    if (!match) continue;

    const [, tier, set, slug] = match;
    const classKey = `${tier}:${set}:${slug}`;
    if (!TARGET_CLASS_KEYS.has(classKey)) continue;
    if (seen.has(entry.image)) continue;
    seen.add(entry.image);

    const fileName = entry.image.split('/').pop() || entry.image;
    const asset = parseAssetNumber(entry.assetno);
    const summonFlag =
      fileName.includes('-front') || fileName.includes('-back') || (asset && asset.prefix === 'a');

    cards.push({
      tier,
      set,
      slug,
      classKey,
      imagePath: entry.image,
      fileName,
      name: entry.name,
      nameCanonical: canonicalName(entry.name),
      assetno: entry.assetno,
      asset,
      isSummons: summonFlag,
      levelUpScore: 0,
      isLevelUp: false,
      ocrTextRaw: '',
      ocrText: '',
      ocrConfidence: 0,
      oppositeName: null,
      pairKey: '',
    });
  }

  cards.sort((a, b) => a.imagePath.localeCompare(b.imagePath));
  return cards;
}

function classifyLevelUpWithinClass(cards) {
  const byClass = new Map();
  for (const card of cards) {
    if (card.isSummons) continue;
    if (!byClass.has(card.classKey)) byClass.set(card.classKey, []);
    byClass.get(card.classKey).push(card);
  }

  for (const classCards of byClass.values()) {
    if (classCards.length < 4) continue;
    const sorted = [...classCards].sort((a, b) => a.levelUpScore - b.levelUpScore);

    let bestGap = 0;
    let splitIndex = -1;
    for (let i = 0; i < sorted.length - 1; i += 1) {
      const gap = sorted[i + 1].levelUpScore - sorted[i].levelUpScore;
      if (gap > bestGap) {
        bestGap = gap;
        splitIndex = i;
      }
    }

    if (splitIndex < 0 || bestGap < 0.018) continue;

    const levelUpCandidates = sorted.slice(splitIndex + 1);
    if (levelUpCandidates.length < 2 || levelUpCandidates.length > Math.ceil(sorted.length * 0.6)) {
      continue;
    }

    for (const candidate of levelUpCandidates) {
      candidate.isLevelUp = true;
    }
  }
}

function buildNameIndex(cards) {
  const byClass = new Map();
  for (const card of cards) {
    if (!byClass.has(card.classKey)) byClass.set(card.classKey, []);
    byClass.get(card.classKey).push(card);
  }
  return byClass;
}

function inferPairingFromOCR(cards) {
  const byClass = buildNameIndex(cards);

  for (const card of cards) {
    const classCards = byClass.get(card.classKey) || [];
    if (!card.ocrText) continue;

    let bestCard = null;
    let bestScore = 0;
    for (const candidate of classCards) {
      if (candidate.imagePath === card.imagePath) continue;
      if (candidate.isSummons !== card.isSummons) continue;
      const score = scoreSimilarity(card.ocrText, candidate.nameCanonical);
      if (score > bestScore) {
        bestScore = score;
        bestCard = candidate;
      }
    }

    if (bestCard && bestScore >= 0.5) {
      card.oppositeName = bestCard.nameCanonical;
      const names = [card.nameCanonical, bestCard.nameCanonical].sort();
      const pairKey = `${card.classKey}:ocr:${names.join('::')}`;
      card.pairKey = pairKey;
      if (!bestCard.pairKey || !bestCard.pairKey.includes(':ocr:')) {
        bestCard.pairKey = pairKey;
      }
    }
  }

  for (const card of cards) {
    if (!card.pairKey) card.pairKey = fallbackPairKey(card);
  }
}

function finalizePairGroups(cards) {
  const groups = new Map();
  for (const card of cards) {
    if (!groups.has(card.pairKey)) groups.set(card.pairKey, []);
    groups.get(card.pairKey).push(card);
  }

  const pairings = {};
  for (const [pairKey, groupCards] of groups) {
    groupCards.sort((a, b) => a.fileName.localeCompare(b.fileName));
    const images = groupCards.map((card) => card.imagePath);
    pairings[pairKey] = {
      cards: images,
      classKey: groupCards[0].classKey,
      inferredBy: pairKey.includes(':ocr:') ? 'ocr' : 'fallback',
    };
  }
  return pairings;
}

async function computeLevelUpScore(imagePath) {
  const fullPath = path.join(ROOT, 'images', imagePath);
  const image = await Jimp.read(fullPath);
  image.greyscale();

  const width = image.bitmap.width;
  const height = image.bitmap.height;
  const cornerSize = Math.max(36, Math.floor(Math.min(width, height) * 0.09));

  const darkRatio = (startX, startY) => {
    let darkCount = 0;
    let totalCount = 0;

    for (let y = startY; y < startY + cornerSize; y += 1) {
      for (let x = startX; x < startX + cornerSize; x += 1) {
        const rgba = intToRGBA(image.getPixelColor(x, y));
        if (rgba.a < 12) continue;
        const lum = rgba.r;
        if (lum < 108) darkCount += 1;
        totalCount += 1;
      }
    }

    return totalCount ? darkCount / totalCount : 0;
  };

  return (darkRatio(0, 0) + darkRatio(width - cornerSize, 0)) / 2;
}

async function ocrBottomText(worker, imagePath) {
  const fullPath = path.join(ROOT, 'images', imagePath);
  const image = await Jimp.read(fullPath);
  const width = image.bitmap.width;
  const height = image.bitmap.height;

  const cropX = Math.floor(width * 0.06);
  const cropY = Math.floor(height * 0.84);
  const cropW = Math.floor(width * 0.88);
  const cropH = Math.floor(height * 0.13);

  const region = image
    .clone()
    .crop({ x: cropX, y: cropY, w: cropW, h: cropH })
    .greyscale()
    .contrast(0.45)
    .normalize();

  const buffer = await region.getBuffer('image/png');
  const result = await worker.recognize(buffer);
  const textRaw = result?.data?.text || '';
  const textCanonical = canonicalName(textRaw);
  const confidence = Number(result?.data?.confidence || 0);

  return {
    raw: textRaw.trim(),
    canonical: textCanonical,
    confidence,
  };
}

async function buildMetadata() {
  const entries = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  const cards = buildCards(entries);

  const worker = await createWorker('eng');
  await worker.setParameters({
    tessedit_pageseg_mode: PSM.SINGLE_LINE,
    preserve_interword_spaces: '1',
  });

  try {
    for (let index = 0; index < cards.length; index += 1) {
      const card = cards[index];
      card.levelUpScore = await computeLevelUpScore(card.imagePath);
      const ocr = await ocrBottomText(worker, card.imagePath);
      card.ocrTextRaw = ocr.raw;
      card.ocrText = ocr.canonical;
      card.ocrConfidence = ocr.confidence;

      if ((index + 1) % 20 === 0 || index + 1 === cards.length) {
        console.log(`Processed ${index + 1}/${cards.length}`);
      }
    }
  } finally {
    await worker.terminate();
  }

  classifyLevelUpWithinClass(cards);
  inferPairingFromOCR(cards);
  const pairings = finalizePairGroups(cards);

  const metadata = {
    generatedAt: new Date().toISOString(),
    source: 'scripts/build-class-card-metadata.js',
    cards: {},
    pairings,
  };

  for (const card of cards) {
    metadata.cards[card.imagePath] = {
      tier: card.tier,
      slug: card.slug,
      classKey: card.classKey,
      name: card.name,
      assetno: card.assetno,
      isSummons: card.isSummons,
      isLevelUp: card.isLevelUp,
      pairKey: card.pairKey,
      ocr: {
        text: card.ocrTextRaw,
        canonical: card.ocrText,
        confidence: card.ocrConfidence,
      },
      levelUpScore: card.levelUpScore,
    };
  }

  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(metadata, null, 2)}\n`, 'utf8');
  console.log(`Wrote metadata: ${OUTPUT_PATH}`);
  console.log(`Cards: ${Object.keys(metadata.cards).length}`);
  console.log(`Pair groups: ${Object.keys(metadata.pairings).length}`);
}

buildMetadata().catch((error) => {
  console.error(error);
  process.exit(1);
});
