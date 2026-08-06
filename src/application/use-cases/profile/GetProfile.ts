import type { IProfileRepository } from '@/domain/repositories/IProfileRepository';
import type { Profile } from '@/domain/entities/Profile';

export class GetProfile {
  constructor(private readonly profileRepository: IProfileRepository) {}

  async execute(userId: string): Promise<Profile> {
    return this.profileRepository.getProfile(userId);
  }
}
