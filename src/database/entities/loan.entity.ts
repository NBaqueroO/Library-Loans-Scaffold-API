import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, Index, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Item } from './item.entity';

export enum LoanStatus {
  ACTIVE = 'active',
  OVERDUE = 'overdue',
  RETURNED = 'returned',
  LOST = 'lost',
}

@Entity('loans')
@Index(['userId', 'status'])
@Index(['itemId', 'status'])
export class Loan {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ type: 'uuid' })
  itemId!: string;

  @ManyToOne(() => Item, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'itemId' })
  item!: Item;

  @Column({ type: 'timestamp with time zone' })
  loanedAt!: Date;

  @Column({ type: 'timestamp with time zone' })
  dueAt!: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  returnedAt!: Date | null;

  @Column({
    type: 'enum',
    enum: LoanStatus,
    default: LoanStatus.ACTIVE,
  })
  status!: LoanStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.0 })
  fineAmount!: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  updatedAt!: Date;
}
