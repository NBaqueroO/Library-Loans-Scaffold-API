import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { LoansService } from '../loans.service';
import { Loan, LoanStatus, User, Item, ItemType } from '../../../database/entities';
import { describe, beforeEach, it, expect, jest } from '@jest/globals';

describe('LoansService', () => {
  let service: LoansService;
  let mockLoanRepository: any;
  let mockUserRepository: any;
  let mockItemRepository: any;
  let mockConfigService: any;

  const mockUser: User = {
    id: 'user-id-1',
    email: 'test@example.com',
    passwordHash: 'hashed-password',
    firstName: 'John',
    lastName: 'Doe',
    role: 'member',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as User;

  const mockItem: Item = {
    id: 'item-id-1',
    code: 'BK-001',
    title: 'Test Book',
    type: ItemType.BOOK,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Item;

  const mockLoan: Loan = {
    id: 'loan-id-1',
    userId: 'user-id-1',
    itemId: 'item-id-1',
    loanedAt: new Date(),
    dueAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
    returnedAt: null,
    status: LoanStatus.ACTIVE,
    fineAmount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Loan;

  beforeEach(async () => {
    mockLoanRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    mockUserRepository = {
      findOne: jest.fn(),
    };

    mockItemRepository = {
      findOne: jest.fn(),
      manager: {
        createQueryBuilder: jest.fn(),
      },
    };

    mockConfigService = {
      get: jest.fn((key: string, defaultValue: any) => {
        const config: Record<string, any> = {
          'loans.maxLoanDays': 30,
          'loans.maxActivePerUser': 3,
          'loans.dailyFineRate': 0.5,
        };
        return config[key] ?? defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoansService,
        {
          provide: getRepositoryToken(Loan),
          useValue: mockLoanRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(Item),
          useValue: mockItemRepository,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<LoansService>(LoansService);
  });

  describe('create', () => {
    it('should create a loan successfully', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockItemRepository.findOne.mockResolvedValue(mockItem);
      mockLoanRepository.count.mockResolvedValueOnce(0).mockResolvedValueOnce(0);
      mockLoanRepository.create.mockReturnValue(mockLoan);
      mockLoanRepository.save.mockResolvedValue(mockLoan);

      const result = await service.create({
        userId: 'user-id-1',
        itemId: 'item-id-1',
        dueAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
      });

      expect(result).toEqual(
        expect.objectContaining({
          id: mockLoan.id,
          status: LoanStatus.ACTIVE,
          fineAmount: 0,
        }),
      );
    });

    it('should throw error if item is already loaned (R2)', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockItemRepository.findOne.mockResolvedValue(mockItem);
      mockLoanRepository.count.mockResolvedValueOnce(1); // Item already has a loan

      await expect(
        service.create({
          userId: 'user-id-1',
          itemId: 'item-id-1',
          dueAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw error if user exceeds max active loans (R3)', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockItemRepository.findOne.mockResolvedValue(mockItem);
      mockLoanRepository.count
        .mockResolvedValueOnce(0) // Item check passes
        .mockResolvedValueOnce(3); // User already has 3 loans

      await expect(
        service.create({
          userId: 'user-id-1',
          itemId: 'item-id-1',
          dueAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('returnLoan', () => {
    it('should return a loan and calculate fine correctly (R4)', async () => {
      const daysOverdue = 5;
      const loanOverdue: Loan = {
        ...mockLoan,
        dueAt: new Date(Date.now() - daysOverdue * 24 * 60 * 60 * 1000),
      };

      mockLoanRepository.findOne.mockResolvedValue(loanOverdue);
      mockLoanRepository.save.mockResolvedValue({
        ...loanOverdue,
        status: LoanStatus.OVERDUE,
        fineAmount: daysOverdue * 0.5,
        returnedAt: expect.any(Date),
      });

      const result = await service.returnLoan('loan-id-1');

      expect(result.status).toBe(LoanStatus.OVERDUE);
      expect(result.fineAmount).toBe(2.5); // 5 days * 0.5
      expect(result.returnedAt).toBeDefined();
    });

    it('should throw error if loan is already returned (R5)', async () => {
      const returnedLoan: Loan = {
        ...mockLoan,
        status: LoanStatus.RETURNED,
      };

      mockLoanRepository.findOne.mockResolvedValue(returnedLoan);

      await expect(service.returnLoan('loan-id-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw error if loan is marked as lost (R5)', async () => {
      const lostLoan: Loan = {
        ...mockLoan,
        status: LoanStatus.LOST,
      };

      mockLoanRepository.findOne.mockResolvedValue(lostLoan);

      await expect(service.returnLoan('loan-id-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('markLost', () => {
    it('should mark a loan as lost', async () => {
      mockLoanRepository.findOne.mockResolvedValue(mockLoan);
      mockLoanRepository.save.mockResolvedValue({
        ...mockLoan,
        status: LoanStatus.LOST,
      });

      const result = await service.markLost('loan-id-1');

      expect(result.status).toBe(LoanStatus.LOST);
    });

    it('should throw error if loan is already returned (R5)', async () => {
      const returnedLoan: Loan = {
        ...mockLoan,
        status: LoanStatus.RETURNED,
      };

      mockLoanRepository.findOne.mockResolvedValue(returnedLoan);

      await expect(service.markLost('loan-id-1')).rejects.toThrow(BadRequestException);
    });
  });
});
