import type { IProfileRepository } from '@/domain/repositories/IProfileRepository';
import type { Profile } from '@/domain/entities/Profile';
import { profileInputSchema, type ProfileInputDto } from '@/application/dto/profile';

export class UpdateProfile {
  constructor(private readonly profileRepository: IProfileRepository) {}

  async execute(userId: string, rawInput: ProfileInputDto): Promise<Profile> {
    const input = profileInputSchema.parse(rawInput);
    return this.profileRepository.updateProfile(userId, input);
  }
}
