import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { loginSchema, refreshSchema, registerSchema } from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { TenantContextService } from '../common/tenant-context.service';
import { RequestWithUser } from '../common/request-with-user';

const credentialsBody = {
  type: 'object' as const,
  required: ['tenantSlug', 'email', 'password'],
  properties: {
    tenantSlug: { type: 'string', example: 'acme' },
    email: { type: 'string', example: 'owner@acme.com' },
    password: { type: 'string', example: 'password123', minLength: 8 },
  },
};

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly tenantContext: TenantContextService,
  ) {}

  @UseGuards(ThrottlerGuard)
  @Post('register')
  @ApiOperation({ summary: 'Register a new user under an existing tenant' })
  @ApiBody({ schema: credentialsBody })
  @ApiResponse({ status: 201, description: 'User created' })
  @ApiResponse({ status: 400, description: 'Invalid payload' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async register(@Body() body: unknown) {
    const result = registerSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException(result.error.issues);
    }
    return this.authService.register(result.data);
  }

  @UseGuards(ThrottlerGuard)
  @Post('login')
  @ApiOperation({ summary: 'Log in and receive an access/refresh token pair' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['tenantSlug', 'email', 'password'],
      properties: {
        tenantSlug: { type: 'string', example: 'acme' },
        email: { type: 'string', example: 'owner@acme.com' },
        password: { type: 'string', example: 'password123' },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Returns accessToken and refreshToken',
  })
  @ApiResponse({ status: 400, description: 'Invalid payload' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() body: unknown) {
    const result = loginSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException(result.error.issues);
    }
    return this.authService.login(result.data);
  }

  @UseGuards(ThrottlerGuard)
  @Post('refresh')
  @ApiOperation({ summary: 'Exchange a refresh token for a new access token' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['refreshToken'],
      properties: {
        refreshToken: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Returns a new accessToken' })
  @ApiResponse({ status: 400, description: 'Invalid payload' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  refresh(@Body() body: unknown) {
    const result = refreshSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException(result.error.issues);
    }
    return this.authService.refresh(result.data);
  }

  @UseGuards(JwtAuthGuard, ThrottlerGuard)
  @ApiBearerAuth('access-token')
  @Get('me')
  @ApiOperation({
    summary: 'Get the current authenticated user, scoped to their tenant',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns userId, role, and tenantId',
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  me(@Req() req: RequestWithUser) {
    return {
      userId: req.user!.userId,
      role: req.user!.role,
      tenantId: this.tenantContext.getTenantId(),
    };
  }
}
