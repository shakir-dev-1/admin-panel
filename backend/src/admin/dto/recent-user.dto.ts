// src/admin/dto/recent-user.dto.ts
export class RecentUserDto {
  id: string;
  name: string;
  email: string;
  username: string | null;
  phoneNumber: string | null;
  lastLoginAt: Date | null;
  lastLoginDevice: string | null;
  lastLoginIp: string | null;
  businessName: string | null;
  createdAt: Date;
  userType: 'consumer' | 'business' | 'influencer';
}
