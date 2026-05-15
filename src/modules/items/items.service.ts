import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateItemDto, UpdateItemDto, ItemResponseDto } from './dto';
import { Item, ItemType, LoanStatus } from '@database/entities';

@Injectable()
export class ItemsService {
  constructor(
    @InjectRepository(Item)
    private itemRepository: Repository<Item>,
  ) {}

  async create(createItemDto: CreateItemDto): Promise<ItemResponseDto> {
    const item = this.itemRepository.create(createItemDto);
    const savedItem = await this.itemRepository.save(item);
    return this.toResponse(savedItem, true);
  }

  async findAll(type?: ItemType): Promise<ItemResponseDto[]> {
    const query = this.itemRepository
      .createQueryBuilder('item')
      .where('item.isActive = :isActive', { isActive: true });

    if (type) {
      query.andWhere('item.type = :type', { type });
    }

    const items = await query.getMany();
    return Promise.all(items.map((item) => this.getWithAvailability(item)));
  }

  async findOne(id: string): Promise<ItemResponseDto> {
    const item = await this.itemRepository.findOne({ where: { id } });

    if (!item) {
      throw new NotFoundException('Item not found');
    }

    return this.getWithAvailability(item);
  }

  async update(id: string, updateItemDto: UpdateItemDto): Promise<ItemResponseDto> {
    const item = await this.itemRepository.findOne({ where: { id } });

    if (!item) {
      throw new NotFoundException('Item not found');
    }

    Object.assign(item, updateItemDto);
    const savedItem = await this.itemRepository.save(item);

    return this.getWithAvailability(savedItem);
  }

  async remove(id: string): Promise<void> {
    const item = await this.itemRepository.findOne({ where: { id } });

    if (!item) {
      throw new NotFoundException('Item not found');
    }

    item.isActive = false;
    await this.itemRepository.save(item);
  }

  private async getWithAvailability(item: Item): Promise<ItemResponseDto> {
    const isAvailable = await this.isItemAvailable(item.id);
    return this.toResponse(item, isAvailable);
  }

  private async isItemAvailable(itemId: string): Promise<boolean> {
    const activeLoans = await this.itemRepository.manager
      .createQueryBuilder('loan', 'loan')
      .where('loan.itemId = :itemId', { itemId })
      .andWhere('loan.status IN (:...statuses)', {
        statuses: [LoanStatus.ACTIVE, LoanStatus.OVERDUE],
      })
      .getCount();

    return activeLoans === 0;
  }

  private toResponse(item: Item, isAvailable: boolean): ItemResponseDto {
    return {
      id: item.id,
      code: item.code,
      title: item.title,
      type: item.type,
      isActive: item.isActive,
      isAvailable,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }
}
