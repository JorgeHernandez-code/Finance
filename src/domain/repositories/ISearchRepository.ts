import type { SearchResult } from '@/domain/entities/SearchResult';

export interface ISearchRepository {
  search(userId: string, query: string): Promise<SearchResult[]>;
}
