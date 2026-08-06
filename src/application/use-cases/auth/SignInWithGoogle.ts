import type { IAuthRepository } from '@/domain/repositories/IAuthRepository';

export class SignInWithGoogle {
  constructor(private readonly authRepository: IAuthRepository) {}

  async execute(redirectTo: string) {
    return this.authRepository.signInWithGoogle(redirectTo);
  }
}
