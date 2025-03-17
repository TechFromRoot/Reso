import { Module } from '@nestjs/common';
import { ResoAgentService } from './reso-agent.service';
import { ResoAgentController } from './reso-agent.controller';
import { HttpModule } from '@nestjs/axios';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Transaction,
  TransactionSchema,
} from 'src/database/schemas/transaction.schema';

@Module({
  imports: [
    HttpModule,
    MongooseModule.forFeature([
      { name: Transaction.name, schema: TransactionSchema },
    ]),
  ],
  providers: [ResoAgentService],
  controllers: [ResoAgentController],
  exports: [ResoAgentService],
})
export class ResoAgentModule {}
