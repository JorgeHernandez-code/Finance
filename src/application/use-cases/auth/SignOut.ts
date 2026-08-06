import type { IAuthRepository } from '@/domain/repositories/IAuthRepository';

export class SignOut {
  constructor(private readonly authRepository: IAuthRepository) {}

  async execute() {
    await this.authRepository.signOut();
  }
}
