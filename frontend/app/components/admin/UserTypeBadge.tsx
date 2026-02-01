// UserTypeBadge.tsx
import { cn } from '@/lib/utils';
import { Building2, User, Star } from 'lucide-react';
import type { User as APIUser } from '@/hooks/useUsers';

interface UserTypeBadgeProps {
  type: APIUser['userType']; 
  className?: string;
}

// Convert uppercase to lowercase for the config lookup
const normalizeType = (type: string): 'business' | 'consumer' | 'influencer' => {
  if (!type) return 'consumer'; // Default fallback
  const lowerType = type.toLowerCase();
  if (lowerType === 'user') return 'consumer'; // Map 'user' to 'consumer'
  if (lowerType === 'business' || lowerType === 'consumer' || lowerType === 'influencer') {
    return lowerType;
  }
  return 'consumer'; // Default fallback
};

const typeConfig = {
  business: {
    label: 'Business',
    icon: Building2,
    className: 'bg-chart-1/10 text-chart-1',
  },
  consumer: {
    label: 'Consumer',
    icon: User,
    className: 'bg-chart-2/10 text-chart-2',
  },
  influencer: {
    label: 'Influencer',
    icon: Star,
    className: 'bg-chart-4/10 text-chart-4',
  },
} as const;

export function UserTypeBadge({ type, className }: UserTypeBadgeProps) {
  const normalizedType = normalizeType(type);
  const config = typeConfig[normalizedType];
  
  if (!config) {
    console.error(`Invalid user type: ${type}`);
    return null; // Or return a default badge
  }
  
  const Icon = config.icon;

  return (
    <span className={cn('status-badge gap-1', config.className, className)}>
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}