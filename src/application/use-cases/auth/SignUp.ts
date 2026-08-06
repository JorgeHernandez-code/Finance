import type { IAuthRepository } from '@/domain/repositories/IAuthRepository';
import { registerSchema, type RegisterInput } from '@/application/dto/auth';

export class SignUp {
  constructor(private readonly authRepository: IAuthRepository) {}

  async execute(input: RegisterInput) {
    const { email, password, fullName } = registerSchema.parse(input);
    return this.authRepository.signUp(email, password, fullName);
  }
}
