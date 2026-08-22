import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { createTenantSchema } from './dto/create-tenant.dto';

@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post()
  async signup(@Body() body: unknown) {
    const result = createTenantSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException(result.error.issues);
    }

    return this.tenantsService.create(result.data);
  }
}
