import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Dekorator wyciągający zalogowanego użytkownika (lub jego pole) z żądania.
 * Użycie: `@CurrentUser() user` lub `@CurrentUser('userId') userId`.
 */
export const CurrentUser = createParamDecorator((data: string | undefined, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  const user = request.user;
  return data ? user?.[data] : user;
});
