'use strict';

function slugify(value = '') {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function uniqueSlug(value) {
  const base = slugify(value) || 'item';
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base}-${suffix}`;
}

module.exports = { slugify, uniqueSlug };
