import type { IAuthRepository } from '@/domain/repositories/IAuthRepository';
import { loginSchema, type LoginInput } from '@/application/dto/auth';

export class SignIn {
  constructor(private readonly authRepository: IAuthRepository) {}

  async execute(input: LoginInput) {
    const { email, password } = loginSchema.parse(input);
    return this.authRepository.signIn(email, password);
  }
}
