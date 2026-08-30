import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { TenantsService } from './tenants.service';
import { createTenantSchema } from './dto/create-tenant.dto';

@ApiTags('tenants')
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @UseGuards(ThrottlerGuard)
  @Post()
  @ApiOperation({ summary: 'Create a new tenant (signup)' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'slug'],
      properties: {
        name: { type: 'string', example: 'Acme' },
        slug: {
          type: 'string',
          example: 'acme',
          description: 'Lowercase, alphanumeric with hyphens',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Tenant created' })
  @ApiResponse({ status: 400, description: 'Invalid payload' })
  @ApiResponse({ status: 409, description: 'Slug already taken' })
  async signup(@Body() body: unknown) {
    const result = createTenantSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException(result.error.issues);
    }

    return this.tenantsService.create(result.data);
  }
}
