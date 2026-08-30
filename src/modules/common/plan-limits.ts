import { TenantPlan } from '../tenants/schemas/tenant.schema';

export const RATE_LIMIT_TTL_MS = 60_000;
export const PUBLIC_RATE_LIMIT = 10;

const PLAN_LIMITS: Record<TenantPlan, number> = {
  free: 30,
  pro: 120,
  enterprise: 600,
};

export function getLimitForPlan(plan: TenantPlan | undefined): number {
  return PLAN_LIMITS[plan ?? 'free'];
}
