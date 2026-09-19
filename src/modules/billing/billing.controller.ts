import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  Post,
  RawBodyRequest,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { BillingService } from './billing.service';
import { createCheckoutSessionSchema } from './dto/create-checkout-session.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { RequestWithUser } from '../common/request-with-user';

@ApiTags('billing')
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @UseGuards(JwtAuthGuard, ThrottlerGuard, RolesGuard)
  @Roles('owner')
  @Post('checkout')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary:
      "Create a Stripe Checkout session to change the tenant's plan (owner only)",
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['plan'],
      properties: {
        plan: { type: 'string', enum: ['pro', 'enterprise'] },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Returns the Stripe Checkout session URL',
  })
  @ApiResponse({ status: 400, description: 'Invalid payload' })
  @ApiResponse({ status: 403, description: 'Caller is not the tenant owner' })
  @ApiResponse({
    status: 503,
    description: 'Billing not configured for the requested plan',
  })
  async checkout(@Req() req: RequestWithUser, @Body() body: unknown) {
    const result = createCheckoutSessionSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException(result.error.issues);
    }
    return this.billingService.createCheckoutSession(
      req.user!.tenantId,
      result.data.plan,
    );
  }

  @Post('webhook')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Stripe webhook endpoint (called by Stripe, not end users)',
  })
  @ApiResponse({ status: 200, description: 'Event processed or acknowledged' })
  @ApiResponse({ status: 400, description: 'Invalid Stripe signature' })
  async webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    await this.billingService.handleWebhookEvent(req.rawBody!, signature);
    return { received: true };
  }
}
