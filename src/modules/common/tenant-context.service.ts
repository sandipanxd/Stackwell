import {
  Inject,
  Injectable,
  Scope,
  UnauthorizedException,
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { RequestWithUser } from './request-with-user';

@Injectable({ scope: Scope.REQUEST })
export class TenantContextService {
  constructor(@Inject(REQUEST) private readonly request: RequestWithUser) {}

  getTenantId(): string {
    const tenantId = this.request.user?.tenantId;
    if (!tenantId) {
      throw new UnauthorizedException(
        'No authenticated tenant context on this request',
      );
    }
    return tenantId;
  }

  scope<T extends Record<string, unknown>>(
    filter: T,
  ): T & { tenantId: string } {
    return { ...filter, tenantId: this.getTenantId() };
  }
}
