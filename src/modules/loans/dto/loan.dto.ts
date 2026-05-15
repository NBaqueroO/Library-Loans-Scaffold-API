import { IsUUID, IsDateString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { LoanStatus } from '../../../database/entities';

export class CreateLoanDto {
  @ApiProperty()
  @IsUUID()
  userId!: string;

  @ApiProperty()
  @IsUUID()
  itemId!: string;

  @ApiProperty()
  @IsDateString()
  dueAt!: string;
}

export class LoanResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty()
  itemId!: string;

  @ApiProperty()
  loanedAt!: Date;

  @ApiProperty()
  dueAt!: Date;

  @ApiProperty()
  returnedAt!: Date | null;

  @ApiProperty()
  status!: LoanStatus;

  @ApiProperty()
  fineAmount!: number;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class LoanFilterDto {
  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  userId?: string;

  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  itemId?: string;

  @ApiProperty({ required: false, enum: LoanStatus })
  @IsEnum(LoanStatus)
  @IsOptional()
  status?: LoanStatus;
}
