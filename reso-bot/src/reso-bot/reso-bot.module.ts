import { Module } from '@nestjs/common';
import { ResoBotService } from './reso-bot.service';
import { DatabaseModule } from 'src/database/database.module';
import { HttpModule } from '@nestjs/axios';
import { WalletModule } from 'src/wallet/wallet.module';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/database/schemas/user.schema';
import { Session, SessionSchema } from 'src/database/schemas/session.schema';
import { ResoAgentModule } from 'src/reso-agent/reso-agent.module';
import {
  Transaction,
  TransactionSchema,
} from 'src/database/schemas/transaction.schema';

@Module({
  imports: [
    ResoAgentModule,
    DatabaseModule,
    HttpModule,
    WalletModule,
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    MongooseModule.forFeature([{ name: Session.name, schema: SessionSchema }]),
    MongooseModule.forFeature([
      { name: Transaction.name, schema: TransactionSchema },
    ]),
  ],
  providers: [ResoBotService],
})
export class ResoBotModule {}
