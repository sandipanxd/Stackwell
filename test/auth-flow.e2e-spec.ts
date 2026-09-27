import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { createE2eApp, uniqueId } from './utils/e2e-app';

describe('Auth flow (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createE2eApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('signs up a tenant, registers its first user as owner, and completes the auth lifecycle', async () => {
    const slug = `auth-${uniqueId()}`;
    const email = `owner-${uniqueId()}@example.com`;
    const password = 'password123';

    await request(app.getHttpServer())
      .post('/tenants')
      .send({ name: 'Auth Flow Co', slug })
      .expect(201);

    await request(app.getHttpServer())
      .post('/tenants')
      .send({ name: 'Auth Flow Co', slug })
      .expect(409);

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ tenantSlug: slug, email, password })
      .expect(201);

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ tenantSlug: slug, email, password: 'wrong-password' })
      .expect(401);

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ tenantSlug: slug, email, password })
      .expect(201);
    const { accessToken, refreshToken } = loginRes.body as {
      accessToken: string;
      refreshToken: string;
    };
    expect(accessToken).toBeDefined();
    expect(refreshToken).toBeDefined();

    await request(app.getHttpServer()).get('/auth/me').expect(401);

    const meRes = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(meRes.body).toMatchObject({ role: 'owner' });

    const refreshRes = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken })
      .expect(201);
    const newAccessToken = (refreshRes.body as { accessToken: string })
      .accessToken;
    expect(newAccessToken).toBeDefined();

    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${newAccessToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: 'not-a-real-token' })
      .expect(401);
  });
});
