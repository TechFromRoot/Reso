import { Module } from '@nestjs/common';
import { ResoAgentService } from './reso-agent.service';
import { ResoAgentController } from './reso-agent.controller';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  providers: [ResoAgentService],
  controllers: [ResoAgentController]
})
export class ResoAgentModule {}
