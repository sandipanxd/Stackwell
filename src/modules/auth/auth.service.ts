import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from '../users/schemas/user.schema';
import { TenantsService } from '../tenants/tenants.service';
import { LoginDto, RefreshDto, RegisterDto } from './dto/auth.dto';
import { EnvConfig } from '../../config/env.validation';

const SALT_ROUNDS = 10;

interface AccessTokenPayload {
  sub: string;
  tenantId: string;
  role: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly tenantsService: TenantsService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<EnvConfig, true>,
  ) {}

  async register(dto: RegisterDto): Promise<UserDocument> {
    const tenant = await this.tenantsService.findBySlug(dto.tenantSlug);
    if (!tenant) {
      throw new NotFoundException(`Tenant "${dto.tenantSlug}" not found`);
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    return this.userModel.create({
      tenantId: tenant._id,
      email: dto.email,
      passwordHash,
      role: 'member',
    });
  }

  async login(
    dto: LoginDto,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const tenant = await this.tenantsService.findBySlug(dto.tenantSlug);
    if (!tenant) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const user = await this.userModel.findOne({
      tenantId: tenant._id,
      email: dto.email,
    });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: AccessTokenPayload = {
      sub: user._id.toString(),
      tenantId: user.tenantId.toString(),
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_ACCESS_SECRET', { infer: true }),
      expiresIn: this.configService.get('JWT_ACCESS_TTL', { infer: true }),
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET', { infer: true }),
      expiresIn: this.configService.get('JWT_REFRESH_TTL', { infer: true }),
    });

    return { accessToken, refreshToken };
  }

  refresh(dto: RefreshDto): { accessToken: string } {
    let verified: AccessTokenPayload;
    try {
      verified = this.jwtService.verify(dto.refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET', { infer: true }),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const payload: AccessTokenPayload = {
      sub: verified.sub,
      tenantId: verified.tenantId,
      role: verified.role,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_ACCESS_SECRET', { infer: true }),
      expiresIn: this.configService.get('JWT_ACCESS_TTL', { infer: true }),
    });

    return { accessToken };
  }
}
