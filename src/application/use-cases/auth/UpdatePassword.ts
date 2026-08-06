import type { IAuthRepository } from '@/domain/repositories/IAuthRepository';
import { resetPasswordSchema, type ResetPasswordInput } from '@/application/dto/auth';

export class UpdatePassword {
  constructor(private readonly authRepository: IAuthRepository) {}

  async execute(input: ResetPasswordInput) {
    const { password } = resetPasswordSchema.parse(input);
    await this.authRepository.updatePassword(password);
  }
}
