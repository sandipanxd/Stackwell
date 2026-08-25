import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { loginSchema, refreshSchema, registerSchema } from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { TenantContextService } from '../common/tenant-context.service';
import { RequestWithUser } from '../common/request-with-user';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly tenantContext: TenantContextService,
  ) {}

  @Post('register')
  async register(@Body() body: unknown) {
    const result = registerSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException(result.error.issues);
    }
    return this.authService.register(result.data);
  }

  @Post('login')
  async login(@Body() body: unknown) {
    const result = loginSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException(result.error.issues);
    }
    return this.authService.login(result.data);
  }

  @Post('refresh')
  async refresh(@Body() body: unknown) {
    const result = refreshSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException(result.error.issues);
    }
    return this.authService.refresh(result.data);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: RequestWithUser) {
    return {
      userId: req.user!.userId,
      role: req.user!.role,
      tenantId: this.tenantContext.getTenantId(),
    };
  }
}
