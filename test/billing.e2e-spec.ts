import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { createE2eApp, uniqueId } from './utils/e2e-app';

describe('Billing (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createE2eApp();
  });

  afterAll(async () => {
    await app.close();
  });

  async function signupOwnerAndMember() {
    const slug = `billing-${uniqueId()}`;
    const ownerEmail = `owner-${uniqueId()}@example.com`;
    const memberEmail = `member-${uniqueId()}@example.com`;
    const password = 'password123';

    await request(app.getHttpServer())
      .post('/tenants')
      .send({ name: 'Billing Co', slug })
      .expect(201);
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ tenantSlug: slug, email: ownerEmail, password })
      .expect(201);
    const ownerLoginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ tenantSlug: slug, email: ownerEmail, password })
      .expect(201);
    const ownerAccessToken = (ownerLoginRes.body as { accessToken: string })
      .accessToken;

    await request(app.getHttpServer())
      .post('/users/invite')
      .set('Authorization', `Bearer ${ownerAccessToken}`)
      .send({ email: memberEmail, password, role: 'member' })
      .expect(201);
    const memberLoginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ tenantSlug: slug, email: memberEmail, password })
      .expect(201);
    const memberAccessToken = (memberLoginRes.body as { accessToken: string })
      .accessToken;

    return { ownerAccessToken, memberAccessToken };
  }

  it('gates checkout by auth and role, and returns 503 when the plan has no configured price', async () => {
    await request(app.getHttpServer())
      .post('/billing/checkout')
      .send({ plan: 'pro' })
      .expect(401);

    const { ownerAccessToken, memberAccessToken } =
      await signupOwnerAndMember();

    await request(app.getHttpServer())
      .post('/billing/checkout')
      .set('Authorization', `Bearer ${memberAccessToken}`)
      .send({ plan: 'pro' })
      .expect(403);

    await request(app.getHttpServer())
      .post('/billing/checkout')
      .set('Authorization', `Bearer ${ownerAccessToken}`)
      .send({ plan: 'pro' })
      .expect(503);
  });

  it('rejects webhook requests with an invalid or missing signature', async () => {
    await request(app.getHttpServer())
      .post('/billing/webhook')
      .set('stripe-signature', 'not-a-real-signature')
      .send({ type: 'checkout.session.completed' })
      .expect(400);

    await request(app.getHttpServer())
      .post('/billing/webhook')
      .send({ type: 'checkout.session.completed' })
      .expect(400);
  });
});
