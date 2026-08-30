import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
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
import { UsersService } from './users.service';
import { inviteUserSchema } from './dto/invite-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';

@ApiTags('users')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, ThrottlerGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: "List the caller's tenant teammates" })
  @ApiResponse({ status: 200, description: 'Users in the current tenant' })
  async list() {
    return this.usersService.findAllForTenant();
  }

  @UseGuards(RolesGuard)
  @Roles('owner', 'admin')
  @Post('invite')
  @ApiOperation({
    summary: 'Invite a new teammate into the current tenant (owner/admin only)',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email', 'password', 'role'],
      properties: {
        email: { type: 'string', example: 'teammate@acme.com' },
        password: { type: 'string', example: 'password123', minLength: 8 },
        role: { type: 'string', enum: ['admin', 'member'], example: 'member' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'User created' })
  @ApiResponse({ status: 400, description: 'Invalid payload' })
  @ApiResponse({ status: 403, description: 'Caller is not an owner or admin' })
  @ApiResponse({
    status: 409,
    description: 'Email already in use for this tenant',
  })
  async invite(@Body() body: unknown) {
    const result = inviteUserSchema.safeParse(body);
    if (!result.success) {
      throw new BadRequestException(result.error.issues);
    }
    return this.usersService.invite(result.data);
  }
}
