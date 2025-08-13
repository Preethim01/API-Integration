import { Test, TestingModule } from '@nestjs/testing';
import { CommitBookingController } from './commit-booking.controller';

describe('CommitBookingController', () => {
  let controller: CommitBookingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CommitBookingController],
    }).compile();

    controller = module.get<CommitBookingController>(CommitBookingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
