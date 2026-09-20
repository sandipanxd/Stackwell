import { ExecutionContext, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bullmq';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { validateEnv, EnvConfig } from './config/env.validation';
import { TenantsModule } from './modules/tenants/tenants.module';
import { TenantsService } from './modules/tenants/tenants.service';
import { AuthModule } from './modules/auth/auth.module';
import { CommonModule } from './modules/common/common.module';
import { UsersModule } from './modules/users/users.module';
import { BillingModule } from './modules/billing/billing.module';
import { RequestWithUser } from './modules/common/request-with-user';
import {
  RATE_LIMIT_TTL_MS,
  PUBLIC_RATE_LIMIT,
  getLimitForPlan,
} from './modules/common/plan-limits';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvConfig, true>) => ({
        uri: config.get('MONGODB_URI', { infer: true }),
      }),
    }),
    CommonModule,
    TenantsModule,
    AuthModule,
    UsersModule,
    BillingModule,
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvConfig, true>) => {
        // Pass connection options, not a pre-built ioredis client: BullMQ only
        // closes connections it constructs itself from options. A shared
        // client we build is treated as caller-owned and never gets closed on
        // module destroy, which leaves the event loop open indefinitely
        // (breaks graceful shutdown and hangs anything that calls app.close(),
        // e.g. e2e tests).
        const redisUrl = new URL(config.get('REDIS_URL', { infer: true }));
        return {
          connection: {
            host: redisUrl.hostname,
            port: Number(redisUrl.port) || 6379,
            username: redisUrl.username || undefined,
            password: redisUrl.password || undefined,
            maxRetriesPerRequest: null,
          },
        };
      },
    }),
    ThrottlerModule.forRootAsync({
      imports: [TenantsModule],
      inject: [TenantsService],
      useFactory: (tenantsService: TenantsService) => ({
        throttlers: [
          {
            ttl: RATE_LIMIT_TTL_MS,
            limit: async (context: ExecutionContext) => {
              const req = context.switchToHttp().getRequest<RequestWithUser>();
              if (!req.user) {
                return PUBLIC_RATE_LIMIT;
              }
              const tenant = await tenantsService.findById(req.user.tenantId);
              return getLimitForPlan(tenant?.plan);
            },
          },
        ],
        getTracker: (req: RequestWithUser) =>
          req.user?.tenantId ?? req.ip ?? 'unknown',
      }),
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
