import { Module } from '@nestjs/common';
import { ResoAgentService } from './reso-agent.service';
import { ResoAgentController } from './reso-agent.controller';

@Module({
  providers: [ResoAgentService],
  controllers: [ResoAgentController]
})
export class ResoAgentModule {}
