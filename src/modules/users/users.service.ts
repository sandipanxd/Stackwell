import { ConflictException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from './schemas/user.schema';
import { TenantContextService } from '../common/tenant-context.service';
import { TenantsService } from '../tenants/tenants.service';
import { MailService } from '../mail/mail.service';
import { InviteUserDto } from './dto/invite-user.dto';

const SALT_ROUNDS = 10;

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly tenantContext: TenantContextService,
    private readonly tenantsService: TenantsService,
    private readonly mailService: MailService,
  ) {}

  async findAllForTenant(): Promise<UserDocument[]> {
    return this.userModel.find(this.tenantContext.scope({}));
  }

  async invite(dto: InviteUserDto): Promise<UserDocument> {
    const existing = await this.userModel.findOne(
      this.tenantContext.scope({ email: dto.email }),
    );
    if (existing) {
      throw new ConflictException(
        `Email "${dto.email}" is already in use for this tenant`,
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    const user = await this.userModel.create(
      this.tenantContext.scope({
        email: dto.email,
        passwordHash,
        role: dto.role,
      }),
    );

    const tenant = await this.tenantsService.findById(
      this.tenantContext.getTenantId(),
    );
    await this.mailService.queueInviteEmail({
      email: dto.email,
      tenantName: tenant?.name ?? 'your team',
      role: dto.role,
    });

    return user;
  }
}
