const test = require('node:test');
const assert = require('node:assert/strict');
const { findRelatedPosts } = require('../assets/js/related-posts.js');

const current = {
  title: 'Agent evaluation workflow',
  url: '/current/',
  tags: ['Agent', '评估']
};

const candidates = [
  {
    title: 'Agent evaluation workflow guide',
    url: '/both/',
    tags: ['Agent', '评估'],
    date: '2026-09-03'
  },
  {
    title: 'Agent workflow patterns',
    url: '/title/',
    tags: [],
    date: '2026-09-05'
  },
  {
    title: 'Unrelated reading',
    url: '/none/',
    tags: ['视觉'],
    date: '2026-09-06'
  },
  {
    title: 'Current duplicate',
    url: '/current/',
    tags: ['Agent'],
    date: '2026-09-07'
  },
  {
    title: 'Hidden',
    url: '/hidden/',
    tags: ['Agent'],
    published: false,
    date: '2026-09-08'
  }
];

test('ranks tags before title-only matches and removes ineligible candidates', () => {
  assert.deepEqual(
    findRelatedPosts(current, candidates).map((item) => item.url),
    ['/both/', '/title/']
  );
});

test('keeps five newest results when scores tie', () => {
  const sameTag = Array.from({ length: 6 }, (_, index) => ({
    title: 'Note ' + index,
    url: '/note-' + index + '/',
    tags: ['Agent'],
    date: '2026-09-0' + (index + 1)
  }));

  assert.deepEqual(
    findRelatedPosts(current, sameTag).map((item) => item.url),
    ['/note-5/', '/note-4/', '/note-3/', '/note-2/', '/note-1/']
  );
});

test('returns an empty result when no topic overlaps', () => {
  assert.deepEqual(
    findRelatedPosts(current, [
      { title: 'Database indexes', url: '/db/', tags: ['SQL'] }
    ]),
    []
  );
});
