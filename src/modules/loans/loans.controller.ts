import { Controller, Get, Post, Body, Param, Patch, UseGuards, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
} from '@nestjs/swagger';
import { LoansService } from './loans.service';
import { CreateLoanDto, LoanResponseDto, LoanFilterDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Loans')
@Controller('loans')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LoansController {
  constructor(private loansService: LoansService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new loan' })
  @ApiCreatedResponse({ type: LoanResponseDto })
  async create(@Body() createLoanDto: CreateLoanDto): Promise<LoanResponseDto> {
    return this.loansService.create(createLoanDto);
  }

  @Get()
  @ApiOperation({ summary: 'List loans with optional filters' })
  @ApiOkResponse({ type: [LoanResponseDto] })
  async findAll(@Query() filters: LoanFilterDto): Promise<LoanResponseDto[]> {
    return this.loansService.findAll(filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get loan details' })
  @ApiOkResponse({ type: LoanResponseDto })
  async findOne(@Param('id') id: string): Promise<LoanResponseDto> {
    return this.loansService.findOne(id);
  }

  @Patch(':id/return')
  @ApiOperation({ summary: 'Return a loan and calculate fine if overdue' })
  @ApiOkResponse({ type: LoanResponseDto })
  async returnLoan(@Param('id') id: string): Promise<LoanResponseDto> {
    return this.loansService.returnLoan(id);
  }

  @Patch(':id/mark-lost')
  @ApiOperation({ summary: 'Mark a loan as lost' })
  @ApiOkResponse({ type: LoanResponseDto })
  async markLost(@Param('id') id: string): Promise<LoanResponseDto> {
    return this.loansService.markLost(id);
  }
}
