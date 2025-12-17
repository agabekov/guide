import { useMemo } from 'react';
import Fuse from 'fuse.js';
import type { FAQItem } from '../types';

export const useSearch = (items: FAQItem[], searchQuery: string) => {
  const fuse = useMemo(() => {
    return new Fuse(items, {
      keys: ['question', 'answer', 'category', 'subcategory'],
      threshold: 0.3,
      includeScore: true,
      minMatchCharLength: 2,
    });
  }, [items]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) {
      return items;
    }

    const results = fuse.search(searchQuery);
    return results.map((result) => result.item);
  }, [fuse, searchQuery, items]);

  return searchResults;
};
