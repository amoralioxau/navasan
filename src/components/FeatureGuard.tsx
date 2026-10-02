import { Redirect } from 'expo-router';
import { ReactNode } from 'react';

import { FeatureKey, isFeatureEnabled } from '@/config/features';

type FeatureGuardProps = {
  feature: FeatureKey;
  children: ReactNode;
  /**
   * اگه Feature خاموش بود، کاربر به این مسیر هدایت می‌شه.
   * پیش‌فرض: Dashboard
   */
  fallback?: string;
};

export function FeatureGuard({
  feature,
  children,
  fallback = '/dashboard',
}: FeatureGuardProps) {
  if (!isFeatureEnabled(feature)) {
    return <Redirect href={fallback as any} />;
  }

  return <>{children}</>;
}