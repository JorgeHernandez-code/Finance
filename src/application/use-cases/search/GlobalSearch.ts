import type { ISearchRepository } from '@/domain/repositories/ISearchRepository';
import type { SearchResult } from '@/domain/entities/SearchResult';
import { searchQuerySchema } from '@/application/dto/search';

export class GlobalSearch {
  constructor(private readonly searchRepository: ISearchRepository) {}

  async execute(userId: string, rawQuery: string): Promise<SearchResult[]> {
    const query = searchQuerySchema.parse(rawQuery);
    return this.searchRepository.search(userId, query);
  }
}
