import type { IAuthRepository } from '@/domain/repositories/IAuthRepository';
import { forgotPasswordSchema, type ForgotPasswordInput } from '@/application/dto/auth';

export class RequestPasswordReset {
  constructor(private readonly authRepository: IAuthRepository) {}

  async execute(input: ForgotPasswordInput, redirectTo: string) {
    const { email } = forgotPasswordSchema.parse(input);
    await this.authRepository.requestPasswordReset(email, redirectTo);
  }
}
