import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type TenantPlan = 'free' | 'pro' | 'enterprise';
export type TenantDocument = HydratedDocument<Tenant>;

@Schema({ timestamps: true })
export class Tenant {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  slug: string;

  @Prop({
    required: true,
    enum: ['free', 'pro', 'enterprise'],
    default: 'free',
  })
  plan: TenantPlan;
}

export const TenantSchema = SchemaFactory.createForClass(Tenant);
