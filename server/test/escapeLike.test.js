const test = require('node:test');
const assert = require('node:assert/strict');
const { escapeLike } = require('../lib/escapeLike');

test('%を含む検索語がエスケープされる', () => {
  assert.equal(escapeLike('50%引き'), '50\\%引き');
});

test('_を含む検索語がエスケープされる', () => {
  assert.equal(escapeLike('a_b'), 'a\\_b');
});

test('バックスラッシュ自身もエスケープされる', () => {
  assert.equal(escapeLike('a\\b'), 'a\\\\b');
});

test('特殊文字が無ければそのまま', () => {
  assert.equal(escapeLike('学校'), '学校');
});
