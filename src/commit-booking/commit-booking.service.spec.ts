import { Test, TestingModule } from '@nestjs/testing';
import { CommitBookingService } from './commit-booking.service';

describe('CommitBookingService', () => {
  let service: CommitBookingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CommitBookingService],
    }).compile();

    service = module.get<CommitBookingService>(CommitBookingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
