import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { createE2eApp, uniqueId } from './utils/e2e-app';

describe('Users & RBAC (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createE2eApp();
  });

  afterAll(async () => {
    await app.close();
  });

  async function signupAndLogin(role: 'owner' = 'owner') {
    const slug = `rbac-${uniqueId()}`;
    const email = `${role}-${uniqueId()}@example.com`;
    const password = 'password123';

    await request(app.getHttpServer())
      .post('/tenants')
      .send({ name: 'RBAC Co', slug })
      .expect(201);
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ tenantSlug: slug, email, password })
      .expect(201);
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ tenantSlug: slug, email, password })
      .expect(201);

    return {
      slug,
      accessToken: (loginRes.body as { accessToken: string }).accessToken,
    };
  }

  it('lets owners and admins invite teammates, blocks members, and scopes users per tenant', async () => {
    const owner = await signupAndLogin();

    const adminEmail = `admin-${uniqueId()}@example.com`;
    await request(app.getHttpServer())
      .post('/users/invite')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ email: adminEmail, password: 'password123', role: 'admin' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/users/invite')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ email: adminEmail, password: 'password123', role: 'admin' })
      .expect(409);

    const adminLoginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        tenantSlug: owner.slug,
        email: adminEmail,
        password: 'password123',
      })
      .expect(201);
    const adminAccessToken = (adminLoginRes.body as { accessToken: string })
      .accessToken;

    const memberEmail = `member-${uniqueId()}@example.com`;
    await request(app.getHttpServer())
      .post('/users/invite')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({ email: memberEmail, password: 'password123', role: 'member' })
      .expect(201);

    const memberLoginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        tenantSlug: owner.slug,
        email: memberEmail,
        password: 'password123',
      })
      .expect(201);
    const memberAccessToken = (memberLoginRes.body as { accessToken: string })
      .accessToken;

    await request(app.getHttpServer())
      .post('/users/invite')
      .set('Authorization', `Bearer ${memberAccessToken}`)
      .send({
        email: `blocked-${uniqueId()}@example.com`,
        password: 'password123',
        role: 'member',
      })
      .expect(403);

    const listRes = await request(app.getHttpServer())
      .get('/users')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .expect(200);
    const emails = (listRes.body as Array<{ email: string }>).map(
      (u) => u.email,
    );
    expect(emails).toContain(adminEmail);
    expect(emails).toContain(memberEmail);
    expect(emails).toHaveLength(3);

    const tenantB = await signupAndLogin();
    const tenantBListRes = await request(app.getHttpServer())
      .get('/users')
      .set('Authorization', `Bearer ${tenantB.accessToken}`)
      .expect(200);
    const tenantBEmails = (tenantBListRes.body as Array<{ email: string }>).map(
      (u) => u.email,
    );
    expect(tenantBEmails).toHaveLength(1);
    expect(tenantBEmails).not.toContain(adminEmail);
    expect(tenantBEmails).not.toContain(memberEmail);
  });
});
