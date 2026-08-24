import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  isNavigationItemActive,
  navigationItems,
  navigationItemsFor,
} from '../src/data/navigation.ts';

test('the shared navigation model exposes the complete U6 route order', () => {
  assert.deepEqual(navigationItemsFor('primary').map(({ label, href }) => [label, href]), [
    ['About', '/about'],
    ['Research', '/research'],
    ['Practices', '/practices'],
    ['Writing', '/writing'],
    ['Library', '/library'],
    ['Contact', '/contact'],
  ]);
  assert.deepEqual(navigationItemsFor('footer').map(({ label, href }) => [label, href]), [
    ['About', '/about'],
    ['Research', '/research'],
    ['Practices', '/practices'],
    ['Coaching', '/coaching'],
    ['Yoga', '/yoga'],
    ['Photography', '/photography'],
    ['Writing', '/writing'],
    ['Library', '/library'],
    ['Contact', '/contact'],
    ['Third Enlightenment', '/third-enlightenment'],
    ['Principles', '/principles'],
  ]);
});

test('active matching respects path-segment boundaries and the Writing aliases', () => {
  const byLabel = new Map(navigationItems.map((item) => [item.label, item]));
  const active = (label, pathname) => isNavigationItemActive(byLabel.get(label), pathname);

  assert.equal(active('About', '/about'), true);
  assert.equal(active('About', '/about/history'), false);
  assert.equal(active('Research', '/research'), true);
  assert.equal(active('Research', '/research#organizational-work'), true);
  assert.equal(active('Research', '/research?view=questions'), true);
  assert.equal(active('Research', '/research-notes'), false);
  assert.equal(active('Practices', '/practices'), true);
  assert.equal(active('Practices', '/practices/deeper'), false);
  assert.equal(active('Coaching', '/coaching'), true);
  assert.equal(active('Coaching', '/coaching/deeper'), false);
  assert.equal(active('Yoga', '/yoga'), true);
  assert.equal(active('Yoga', '/yoga/deeper'), false);
  assert.equal(active('Photography', '/photography'), true);
  assert.equal(active('Photography', '/photography/deeper'), false);
  assert.equal(active('Writing', '/writing'), true);
  assert.equal(active('Writing', '/essays/strategic-time'), true);
  assert.equal(active('Writing', '/blog/the-dot-collector'), true);
  assert.equal(active('Writing', '/bloggish'), false);
  assert.equal(active('Library', '/library/seeing-like-a-state'), true);
  assert.equal(active('Library', '/libraryish'), false);
  assert.equal(active('Contact', '/contact/follow-up'), true);
  assert.equal(active('Contact', '/contacted'), false);
});
