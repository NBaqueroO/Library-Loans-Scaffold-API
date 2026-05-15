import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Delete,
  Param,
  Query,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiNoContentResponse,
} from '@nestjs/swagger';
import { ItemsService } from './items.service';
import { CreateItemDto, UpdateItemDto, ItemResponseDto } from './dto';
import { ItemType } from '../../database/entities';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Items')
@Controller('items')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ItemsController {
  constructor(private itemsService: ItemsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new item' })
  @ApiCreatedResponse({ type: ItemResponseDto })
  async create(@Body() createItemDto: CreateItemDto): Promise<ItemResponseDto> {
    return this.itemsService.create(createItemDto);
  }

  @Get()
  @ApiOperation({ summary: 'List all active items' })
  @ApiOkResponse({ type: [ItemResponseDto] })
  async findAll(@Query('type') type?: ItemType): Promise<ItemResponseDto[]> {
    return this.itemsService.findAll(type);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get item details' })
  @ApiOkResponse({ type: ItemResponseDto })
  async findOne(@Param('id') id: string): Promise<ItemResponseDto> {
    return this.itemsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an item' })
  @ApiOkResponse({ type: ItemResponseDto })
  async update(
    @Param('id') id: string,
    @Body() updateItemDto: UpdateItemDto,
  ): Promise<ItemResponseDto> {
    return this.itemsService.update(id, updateItemDto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete (soft delete) an item' })
  @ApiNoContentResponse()
  async remove(@Param('id') id: string): Promise<void> {
    return this.itemsService.remove(id);
  }
}
