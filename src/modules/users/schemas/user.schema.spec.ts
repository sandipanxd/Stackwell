import { Types } from 'mongoose';
import { UserSchema } from './user.schema';

describe('UserSchema toJSON', () => {
  it('strips passwordHash from the serialized output', () => {
    const transform = UserSchema.get('toJSON')?.transform as
      | ((
          doc: unknown,
          ret: Record<string, unknown>,
        ) => Record<string, unknown>)
      | undefined;

    expect(transform).toBeDefined();

    const ret = {
      _id: new Types.ObjectId(),
      email: 'owner@acme.com',
      passwordHash: 'hashed-password',
      role: 'member',
    };

    const result = transform!({}, ret);

    expect(result.passwordHash).toBeUndefined();
    expect(result.email).toBe('owner@acme.com');
  });
});
