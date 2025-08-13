import { Test, TestingModule } from '@nestjs/testing';
import { FareQuoteController } from './farequote.controller';

describe('FarequoteController', () => {
  let controller: FareQuoteController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FareQuoteController],
    }).compile();

    controller = module.get<FareQuoteController>(FareQuoteController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
