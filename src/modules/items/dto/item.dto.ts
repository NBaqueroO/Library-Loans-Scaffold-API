import { IsString, IsNotEmpty, IsEnum, MaxLength } from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';
import { ItemType } from '../../../database/entities';

export class CreateItemDto {
  @ApiProperty({ example: 'BK-0042', maxLength: 32 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  code!: string;

  @ApiProperty({ example: 'The Great Gatsby' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @ApiProperty({ enum: ItemType })
  @IsEnum(ItemType)
  type!: ItemType;
}

export class UpdateItemDto extends PartialType(CreateItemDto) {}

export class ItemResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  type!: ItemType;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  isAvailable!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
