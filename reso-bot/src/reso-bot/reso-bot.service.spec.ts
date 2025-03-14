import { Test, TestingModule } from '@nestjs/testing';
import { ResoBotService } from './reso-bot.service';

describe('ResoBotService', () => {
  let service: ResoBotService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ResoBotService],
    }).compile();

    service = module.get<ResoBotService>(ResoBotService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
