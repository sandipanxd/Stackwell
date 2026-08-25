import { Request } from 'express';
import { RequestUser } from '../auth/strategies/jwt.strategy';

export interface RequestWithUser extends Request {
  user?: RequestUser;
}
