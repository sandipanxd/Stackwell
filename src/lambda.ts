import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { Handler } from 'aws-lambda';
// eslint-disable-next-line @typescript-eslint/no-require-imports -- express's CJS export has no `.default`, and this tsconfig lacks esModuleInterop, so a default import resolves to undefined at runtime.
import express = require('express');
// eslint-disable-next-line @typescript-eslint/no-require-imports -- same as above: serverless-http's CJS export has no `.default`.
import serverless = require('serverless-http');
import { AppModule } from './app.module';

type ServerlessHandler = (event: unknown, context: unknown) => Promise<unknown>;

let cachedHandler: ServerlessHandler | undefined;

async function bootstrapServer(): Promise<ServerlessHandler> {
  const expressApp = express();
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressApp),
    {
      rawBody: true,
    },
  );
  await app.init();
  return serverless(expressApp);
}

// Known limitation, not fixed here: MailModule/BillingModule register BullMQ
// Workers (InviteEmailProcessor, WebhookEventsProcessor) that hold a persistent
// polling connection to Redis. That doesn't fit Lambda's request-scoped
// execution model — a Lambda instance freezes between invocations, so a Worker
// running inside it won't reliably process queued jobs. Deploying this handler
// as-is means invites/webhooks still get enqueued but nothing dependable picks
// them up. Fixing this for a real deployment means either switching to
// SQS-triggered Lambdas instead of BullMQ, or running the workers on a
// separate always-on compute target (e.g. a small ECS/Fargate task) apart
// from this API Lambda — out of scope for this infra pass.
export const handler: Handler = async (event, context) => {
  cachedHandler ??= await bootstrapServer();
  return cachedHandler(event, context);
};
