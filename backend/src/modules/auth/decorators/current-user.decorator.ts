import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '../../users/entities/user.entity';

export const CurrentUser = createParamDecorator(
  (data: unknown, context: ExecutionContext): User | null => {
    const request = context.switchToHttp().getRequest();
    return request.user ?? null;
  },
);

