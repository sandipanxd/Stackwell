import * as path from 'path';
import { CfnOutput, Duration, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { HttpApi, HttpMethod } from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';

/**
 * Deploys the Stackwell API as a single Lambda behind an HTTP API.
 *
 * KNOWN LIMITATION (not fixed here, see src/lambda.ts for the full note):
 * the BullMQ Workers registered by MailModule/BillingModule need a persistent
 * process to poll Redis. Lambda instances are request-scoped and freeze
 * between invocations, so deploying this stack as-is means background jobs
 * get enqueued but are not reliably processed. A real deployment would need
 * either SQS-triggered Lambdas instead of BullMQ, or the workers running on a
 * separate always-on compute target (e.g. a small ECS/Fargate task).
 *
 * Config (Mongo URI, JWT secrets, Stripe keys, Redis URL) is passed via CDK
 * context rather than hardcoded — e.g.:
 *   cdk deploy -c mongoUri=... -c jwtAccessSecret=... -c jwtRefreshSecret=... \
 *     -c redisUrl=... -c stripeSecretKey=... -c stripeWebhookSecret=...
 * See README.md for the full list and a production note on moving this to
 * Secrets Manager / SSM Parameter Store instead.
 */
export class StackwellStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const repoRoot = path.join(__dirname, '..', '..');

    const apiFunction = new NodejsFunction(this, 'ApiFunction', {
      entry: path.join(repoRoot, 'src', 'lambda.ts'),
      projectRoot: repoRoot,
      depsLockFilePath: path.join(repoRoot, 'package-lock.json'),
      handler: 'handler',
      runtime: Runtime.NODEJS_24_X,
      memorySize: 256,
      timeout: Duration.seconds(15),
      environment: {
        NODE_ENV: 'production',
        MONGODB_URI: this.node.tryGetContext('mongoUri') ?? '',
        JWT_ACCESS_SECRET: this.node.tryGetContext('jwtAccessSecret') ?? '',
        JWT_REFRESH_SECRET: this.node.tryGetContext('jwtRefreshSecret') ?? '',
        REDIS_URL: this.node.tryGetContext('redisUrl') ?? '',
        STRIPE_SECRET_KEY: this.node.tryGetContext('stripeSecretKey') ?? '',
        STRIPE_WEBHOOK_SECRET:
          this.node.tryGetContext('stripeWebhookSecret') ?? '',
      },
      bundling: {
        minify: true,
        // BullMQ's optional native/heavy deps aren't needed for the API path
        // and some don't bundle cleanly for Lambda; excluding them keeps the
        // bundle correct and small. Background job processing has its own
        // known limitation on this deployment target — see the class doc above.
        // class-transformer/class-validator are optional peer deps NestJS
        // lazy-requires for features this app doesn't use (it validates with
        // Zod instead) — not installed, so esbuild can't resolve them
        // statically even though the code path is never actually hit.
        externalModules: [
          '@nestjs/microservices',
          '@nestjs/websockets',
          'class-transformer',
          'class-transformer/storage',
          'class-validator',
        ],
      },
    });
    // No extra IAM grants: this function never calls another AWS service
    // directly (Mongo/Redis/Stripe are all external), so it keeps CDK's
    // auto-generated default execution role (CloudWatch Logs only).

    const httpApi = new HttpApi(this, 'HttpApi', {
      apiName: 'stackwell-api',
    });

    const integration = new HttpLambdaIntegration(
      'ApiIntegration',
      apiFunction,
    );

    httpApi.addRoutes({
      path: '/{proxy+}',
      methods: [HttpMethod.ANY],
      integration,
    });
    httpApi.addRoutes({
      path: '/',
      methods: [HttpMethod.ANY],
      integration,
    });

    new CfnOutput(this, 'ApiUrl', {
      value: httpApi.apiEndpoint,
      description: 'Base URL of the deployed Stackwell API',
    });
  }
}
