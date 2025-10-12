const dataUrl = '../data/classes.js';
const folderPanel = document.getElementById('folder-panel');
const cardPanel = document.getElementById('card-panel');
const breadcrumbs = document.getElementById('breadcrumbs');
const folderTemplate = document.getElementById('folder-card-template');
const imageTemplate = document.getElementById('image-card-template');

async function loadClassData() {
  const response = await fetch(dataUrl);
  if (!response.ok) {
    throw new Error(`Unable to load class data: ${response.status}`);
  }
  return response.json();
}

function buildTree(imagePaths) {
  const root = {
    key: '',
    name: 'Classes',
    children: new Map(),
    files: [],
  };

  for (const path of imagePaths) {
    const segments = path.split('/').slice(1); // remove leading "classes"
    let node = root;

    segments.forEach((segment, index) => {
      const isFile = index === segments.length - 1;
      if (isFile) {
        node.files.push({
          fileName: segment,
          path,
        });
        return;
      }

      if (!node.children.has(segment)) {
        node.children.set(segment, {
          key: segment,
          name: segment,
          parent: node,
          children: new Map(),
          files: [],
        });
      }
      node = node.children.get(segment);
    });
  }

  computeTotals(root);
  return root;
}

function computeTotals(node) {
  let total = node.files.length;
  for (const child of node.children.values()) {
    total += computeTotals(child);
  }
  node.totalFiles = total;
  return total;
}

function formatSegment(segment) {
  if (!segment) return 'Classes';
  if (/^rv-/i.test(segment)) {
    return segment.replace(/\.[^.]+$/, '').replace(/^rv-/, '').replace(/-/g, ' ');
  }
  if (segment === segment.toUpperCase()) {
    return segment;
  }
  return segment
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getNodeForPath(root, pathParts) {
  let node = root;
  for (const part of pathParts) {
    if (!node.children.has(part)) {
      return null;
    }
    node = node.children.get(part);
  }
  return node;
}

function renderBreadcrumbs(pathParts) {
  breadcrumbs.innerHTML = '';

  const createLink = (parts, label, isCurrent) => {
    if (isCurrent) {
      const span = document.createElement('span');
      span.className = 'current';
      span.textContent = label;
      breadcrumbs.append(span);
      return;
    }
    const link = document.createElement('a');
    link.href = `#${parts.filter(Boolean).join('/')}`;
    link.textContent = label;
    breadcrumbs.append(link);
  };

  createLink([], 'Classes', pathParts.length === 0);

  pathParts.forEach((part, index) => {
    const isCurrent = index === pathParts.length - 1;
    const currentParts = pathParts.slice(0, index + 1);
    const label = formatSegment(part);
    createLink(currentParts, label, isCurrent);
  });
}

function renderFolders(node, pathParts) {
  folderPanel.innerHTML = '';
  const folders = Array.from(node.children.values()).sort((a, b) =>
    a.key.localeCompare(b.key)
  );

  if (!folders.length) {
    return;
  }

  const sectionTitle = document.createElement('div');
  sectionTitle.className = 'section-title';
  sectionTitle.innerHTML = `<h2>Folders</h2><span>${folders.length} section${
    folders.length === 1 ? '' : 's'
  }</span>`;
  folderPanel.append(sectionTitle);

  const list = document.createElement('div');
  list.className = 'folder-grid';

  folders.forEach((folder) => {
    const clone = folderTemplate.content.firstElementChild.cloneNode(true);
    const parts = [...pathParts, folder.key];
    clone.href = `#${parts.join('/')}`;
    clone.querySelector('.folder-name').textContent = formatSegment(folder.key);
    clone.querySelector(
      '.folder-meta'
    ).textContent = `${folder.totalFiles} card${folder.totalFiles === 1 ? '' : 's'}`;
    list.append(clone);
  });

  folderPanel.append(list);
}

function renderCards(node) {
  cardPanel.innerHTML = '';
  if (!node.files.length) {
    if (!node.children.size) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.textContent = 'No cards found in this folder.';
      cardPanel.append(empty);
    }
    return;
  }

  const sectionTitle = document.createElement('div');
  sectionTitle.className = 'section-title';
  sectionTitle.innerHTML = `<h2>Cards</h2><span>${node.files.length} image${
    node.files.length === 1 ? '' : 's'
  }</span>`;
  cardPanel.append(sectionTitle);

  const grid = document.createElement('div');
  grid.className = 'image-grid';

  const sortedFiles = [...node.files].sort((a, b) => a.fileName.localeCompare(b.fileName));

  sortedFiles.forEach((file) => {
    const clone = imageTemplate.content.firstElementChild.cloneNode(true);
    const img = clone.querySelector('img');
    img.src = `../images/${file.path}`;
    img.alt = formatSegment(file.fileName);
    clone.querySelector('figcaption').textContent = formatSegment(file.fileName);
    grid.append(clone);
  });

  cardPanel.append(grid);
}

function sanitizePath(pathParts, root) {
  const validParts = [];
  let node = root;
  for (const part of pathParts) {
    if (!node.children.has(part)) break;
    validParts.push(part);
    node = node.children.get(part);
  }
  return validParts;
}

async function init() {
  const data = await loadClassData();
  const uniqueImages = Array.from(
    new Set(
      data
        .map((entry) => entry.image)
        .filter((path) => typeof path === 'string' && path.trim().length > 0)
    )
  );

  const tree = buildTree(uniqueImages);

  const render = () => {
    const rawHash = window.location.hash.slice(1);
    const parts = rawHash ? rawHash.split('/').filter(Boolean) : [];
    const safeParts = sanitizePath(parts, tree);
    if (parts.length !== safeParts.length) {
      window.location.hash = `#${safeParts.join('/')}`;
      return;
    }

    const node = getNodeForPath(tree, safeParts) ?? tree;
    renderBreadcrumbs(safeParts);
    renderFolders(node, safeParts);
    renderCards(node);
  };

  window.addEventListener('hashchange', render);
  render();
}

init().catch((error) => {
  folderPanel.innerHTML = '';
  cardPanel.innerHTML = '';
  const message = document.createElement('div');
  message.className = 'empty-state';
  message.textContent = error.message;
  cardPanel.append(message);
  console.error(error);
});
