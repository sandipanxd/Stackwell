import { ConflictException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Tenant, TenantDocument } from './schemas/tenant.schema';
import { CreateTenantDto } from './dto/create-tenant.dto';

@Injectable()
export class TenantsService {
  constructor(
    @InjectModel(Tenant.name)
    private readonly tenantModel: Model<TenantDocument>,
  ) {}

  async create(dto: CreateTenantDto): Promise<TenantDocument> {
    const existing = await this.tenantModel.findOne({ slug: dto.slug });
    if (existing) {
      throw new ConflictException(`Tenant slug "${dto.slug}" is already taken`);
    }

    return this.tenantModel.create({
      name: dto.name,
      slug: dto.slug,
      plan: 'free',
    });
  }

  async findBySlug(slug: string): Promise<TenantDocument | null> {
    return this.tenantModel.findOne({ slug });
  }

  async findById(id: string): Promise<TenantDocument | null> {
    return this.tenantModel.findById(id);
  }

  async updateBilling(
    id: string,
    updates: Partial<
      Pick<Tenant, 'plan' | 'stripeCustomerId' | 'stripeSubscriptionId'>
    >,
  ): Promise<TenantDocument | null> {
    return this.tenantModel.findByIdAndUpdate(id, updates, { new: true });
  }
}
