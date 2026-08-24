import { createHash } from 'node:crypto';

const markerAttribute = 'data-editorial-body';
const semanticTags = new Set([
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'p',
  'li',
  'blockquote',
  'hr',
  'a',
  'img',
]);

const namedEntities = new Map([
  ['amp', '&'],
  ['apos', "'"],
  ['bull', '•'],
  ['gt', '>'],
  ['hellip', '…'],
  ['larr', '←'],
  ['ldquo', '“'],
  ['lsquo', '‘'],
  ['lt', '<'],
  ['mdash', '—'],
  ['middot', '·'],
  ['nbsp', ' '],
  ['ndash', '–'],
  ['quot', '"'],
  ['rarr', '→'],
  ['rdquo', '”'],
  ['rsquo', '’'],
]);

function decodeEntities(value = '') {
  return value.replace(/&(#(?:x[\da-f]+|\d+)|[a-z][\da-z]+);/gi, (entity, token) => {
    if (token.startsWith('#')) {
      const hexadecimal = token[1]?.toLowerCase() === 'x';
      const codePoint = Number.parseInt(token.slice(hexadecimal ? 2 : 1), hexadecimal ? 16 : 10);
      return Number.isSafeInteger(codePoint) ? String.fromCodePoint(codePoint) : entity;
    }
    return namedEntities.get(token.toLowerCase()) ?? entity;
  });
}

function normalizedText(value = '') {
  return decodeEntities(
    value
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<[^>]+>/g, ' '),
  ).replace(/\s+/g, ' ').trim();
}

function attributeValue(attributes, name) {
  const match = attributes.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'));
  return match ? decodeEntities(match[1] ?? match[2] ?? match[3] ?? '') : undefined;
}

function elementInnerHtml(html, tag, openingIndex) {
  const tags = new RegExp(`<\\/?${tag}\\b[^>]*>`, 'gi');
  tags.lastIndex = openingIndex;
  let depth = 0;
  let contentStart;

  for (const match of html.matchAll(tags)) {
    const closing = /^<\//.test(match[0]);
    const selfClosing = /\/>$/.test(match[0]);
    if (closing) {
      depth -= 1;
      if (depth === 0 && contentStart !== undefined) {
        return html.slice(contentStart, match.index);
      }
      if (depth < 0) break;
    } else if (!selfClosing) {
      depth += 1;
      if (depth === 1) contentStart = (match.index ?? 0) + match[0].length;
    }
  }

  throw new Error(`Unclosed <${tag}> containing ${markerAttribute}`);
}

export function extractEditorialBody(html) {
  const markedOpenings = [];
  for (const match of html.matchAll(/<([a-z][\w:-]*)\b([^>]*)>/gi)) {
    if (new RegExp(`(?:^|\\s)${markerAttribute}(?:\\s*=|\\s|$)`, 'i').test(match[2])) {
      markedOpenings.push(match);
    }
  }

  if (markedOpenings.length !== 1) {
    throw new Error(`Expected exactly one ${markerAttribute} region; found ${markedOpenings.length}`);
  }

  const [opening] = markedOpenings;
  const tag = opening[1].toLowerCase();
  if (semanticTags.has(tag) && (tag === 'hr' || tag === 'img')) {
    throw new Error(`${markerAttribute} cannot mark a void element`);
  }
  return elementInnerHtml(html, tag, opening.index ?? 0);
}

export function orderedSemanticAtoms(html) {
  const atoms = [];
  const openings = /<(h[1-6]|p|li|blockquote|hr|a|img)\b([^>]*)>/gi;
  for (const match of html.matchAll(openings)) {
    const tag = match[1].toLowerCase();
    const attributes = match[2];
    if (tag === 'hr') {
      atoms.push('hr');
      continue;
    }
    if (tag === 'img') {
      atoms.push(`img:${attributeValue(attributes, 'src') ?? ''}:${attributeValue(attributes, 'alt') ?? ''}`);
      continue;
    }

    const content = elementInnerHtml(html, tag, match.index ?? 0);
    if (tag === 'a') {
      const href = attributeValue(attributes, 'href');
      if (!href) throw new Error('Every canonical body link needs a destination');
      atoms.push(`a:${href}:${normalizedText(content)}`);
    } else {
      atoms.push(`${tag}:${normalizedText(content)}`);
    }
  }
  return atoms;
}

export function renderedEditorialBodyFingerprint(pageHtml) {
  const bodyHtml = extractEditorialBody(pageHtml);
  const text = normalizedText(bodyHtml);
  const atoms = orderedSemanticAtoms(bodyHtml);
  return {
    orderedSemanticSha256: createHash('sha256')
      .update(JSON.stringify({ text, atoms }))
      .digest('hex'),
    semanticAtomCount: atoms.length,
    normalizedTextLength: text.length,
  };
}

export function assertRenderedEditorialBody(pageHtml, expected, label = 'Editorial route') {
  const actual = renderedEditorialBodyFingerprint(pageHtml);
  for (const field of ['orderedSemanticSha256', 'semanticAtomCount', 'normalizedTextLength']) {
    if (actual[field] !== expected[field]) {
      throw new Error(`${label} canonical rendered body content or order drifted (${field})`);
    }
  }
  return actual;
}

export function renderedRelatedPaths(pageHtml) {
  const paths = [];
  for (const opening of pageHtml.matchAll(/<a\b([^>]*)>/gi)) {
    const key = attributeValue(opening[1], 'data-related-path');
    if (key === undefined) continue;
    const cardHtml = elementInnerHtml(pageHtml, 'a', opening.index ?? 0);
    const markedConnections = [...cardHtml.matchAll(/<span\b([^>]*)>([\s\S]*?)<\/span>/gi)]
      .filter((match) => /(?:^|\s)data-related-connection(?:\s*=|\s|$)/i.test(match[1]));
    if (markedConnections.length !== 1) {
      throw new Error(`${key} expected exactly one data-related-connection region; found ${markedConnections.length}`);
    }
    paths.push({ key, text: normalizedText(markedConnections[0][2]) });
  }
  return paths;
}

export function assertRenderedRelatedPaths(pageHtml, expected, label = 'Editorial route') {
  const actual = renderedRelatedPaths(pageHtml);
  if (actual.length !== expected.length) {
    throw new Error(`${label} rendered related-path count drifted`);
  }
  for (const [index, path] of actual.entries()) {
    if (path.key !== expected[index].key) {
      throw new Error(`${label} rendered related-path order drifted at index ${index}`);
    }
    if (path.text !== expected[index].text) {
      throw new Error(`${label} rendered connection text drifted for ${path.key}`);
    }
  }
  return actual;
}
