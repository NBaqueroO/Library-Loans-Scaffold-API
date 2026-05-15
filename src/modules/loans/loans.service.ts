import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Loan, LoanStatus, User, Item } from '@database/entities';
import { CreateLoanDto, LoanResponseDto, LoanFilterDto } from './dto';

@Injectable()
export class LoansService {
  constructor(
    @InjectRepository(Loan)
    private loanRepository: Repository<Loan>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Item)
    private itemRepository: Repository<Item>,
    private configService: ConfigService,
  ) {}

  async create(createLoanDto: CreateLoanDto): Promise<LoanResponseDto> {
    // Validate user exists
    const user = await this.userRepository.findOne({
      where: { id: createLoanDto.userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Validate item exists
    const item = await this.itemRepository.findOne({
      where: { id: createLoanDto.itemId },
    });
    if (!item) {
      throw new NotFoundException('Item not found');
    }

    const loanedAt = new Date();
    const dueAt = new Date(createLoanDto.dueAt);

    // R1: Validate dates
    if (dueAt <= loanedAt) {
      throw new BadRequestException('dueAt must be after loanedAt');
    }

    const maxLoanDays = this.configService.get<number>('loans.maxLoanDays', 30);
    const maxDueDate = new Date(loanedAt);
    maxDueDate.setDate(maxDueDate.getDate() + maxLoanDays);

    if (dueAt > maxDueDate) {
      throw new BadRequestException(`Maximum loan period is ${maxLoanDays} days`);
    }

    // R2: Check item availability
    const activeLoans = await this.loanRepository.count({
      where: [
        { itemId: createLoanDto.itemId, status: LoanStatus.ACTIVE },
        { itemId: createLoanDto.itemId, status: LoanStatus.OVERDUE },
      ],
    });

    if (activeLoans > 0) {
      const existingLoan = await this.loanRepository.findOne({
        where: [
          { itemId: createLoanDto.itemId, status: LoanStatus.ACTIVE },
          { itemId: createLoanDto.itemId, status: LoanStatus.OVERDUE },
        ],
      });
      throw new ConflictException(`Item is already loaned (loan ID: ${existingLoan!.id})`);
    }

    // R3: Check user active loans limit
    const maxActiveLoans = this.configService.get<number>('loans.maxActivePerUser', 3);
    const userActiveLoans = await this.loanRepository.count({
      where: [
        { userId: createLoanDto.userId, status: LoanStatus.ACTIVE },
        { userId: createLoanDto.userId, status: LoanStatus.OVERDUE },
      ],
    });

    if (userActiveLoans >= maxActiveLoans) {
      throw new ConflictException(`User has reached the maximum of ${maxActiveLoans} active loans`);
    }

    const loan = this.loanRepository.create({
      userId: createLoanDto.userId,
      itemId: createLoanDto.itemId,
      loanedAt,
      dueAt,
      status: LoanStatus.ACTIVE,
      fineAmount: 0,
    });

    const savedLoan = await this.loanRepository.save(loan);
    return this.toResponse(savedLoan);
  }

  async findAll(filters?: LoanFilterDto): Promise<LoanResponseDto[]> {
    const query = this.loanRepository.createQueryBuilder('loan');

    if (filters?.userId) {
      query.andWhere('loan.userId = :userId', { userId: filters.userId });
    }

    if (filters?.itemId) {
      query.andWhere('loan.itemId = :itemId', { itemId: filters.itemId });
    }

    if (filters?.status) {
      query.andWhere('loan.status = :status', { status: filters.status });
    }

    const loans = await query.getMany();
    return loans.map((loan) => this.toResponse(loan));
  }

  async findOne(id: string): Promise<LoanResponseDto> {
    const loan = await this.loanRepository.findOne({ where: { id } });

    if (!loan) {
      throw new NotFoundException('Loan not found');
    }

    return this.toResponse(loan);
  }

  async returnLoan(id: string): Promise<LoanResponseDto> {
    const loan = await this.loanRepository.findOne({ where: { id } });

    if (!loan) {
      throw new NotFoundException('Loan not found');
    }

    // R5: Check if loan is already in a terminal state
    if (loan.status === LoanStatus.RETURNED || loan.status === LoanStatus.LOST) {
      throw new BadRequestException(`Cannot return a loan in status ${loan.status}`);
    }

    const returnedAt = new Date();
    loan.returnedAt = returnedAt;

    // R4: Calculate fine for overdue
    const daysOverdue = Math.max(
      0,
      Math.ceil((returnedAt.getTime() - loan.dueAt.getTime()) / (1000 * 60 * 60 * 24)),
    );
    const dailyFineRate = this.configService.get<number>('loans.dailyFineRate', 0.5);
    loan.fineAmount = daysOverdue * dailyFineRate;

    // Update status
    if (daysOverdue > 0) {
      loan.status = LoanStatus.OVERDUE;
    } else {
      loan.status = LoanStatus.RETURNED;
    }

    const savedLoan = await this.loanRepository.save(loan);
    return this.toResponse(savedLoan);
  }

  async markLost(id: string): Promise<LoanResponseDto> {
    const loan = await this.loanRepository.findOne({ where: { id } });

    if (!loan) {
      throw new NotFoundException('Loan not found');
    }

    // R5: Check if loan is already in a terminal state
    if (loan.status === LoanStatus.RETURNED || loan.status === LoanStatus.LOST) {
      throw new BadRequestException(`Cannot mark as lost a loan in status ${loan.status}`);
    }

    loan.status = LoanStatus.LOST;
    const savedLoan = await this.loanRepository.save(loan);
    return this.toResponse(savedLoan);
  }

  private toResponse(loan: Loan): LoanResponseDto {
    return {
      id: loan.id,
      userId: loan.userId,
      itemId: loan.itemId,
      loanedAt: loan.loanedAt,
      dueAt: loan.dueAt,
      returnedAt: loan.returnedAt,
      status: loan.status,
      fineAmount: Number(loan.fineAmount),
      createdAt: loan.createdAt,
      updatedAt: loan.updatedAt,
    };
  }
}
