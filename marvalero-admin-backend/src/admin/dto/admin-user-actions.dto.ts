import { IsEmail, IsPhoneNumber, IsEnum } from 'class-validator';
import { AccountStatus } from '../../generated/prisma/enums.js';

export class ChangeEmailDto {
  @IsEmail()
  email: string;
}

export class ChangePhoneDto {
  @IsPhoneNumber()
  phone: string;
}

export class ChangeStatusDto {
  @IsEnum(AccountStatus)
  status: AccountStatus;
}
