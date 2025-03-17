import { Module } from '@nestjs/common';
import { ResoBotService } from './reso-bot.service';
import { DatabaseModule } from 'src/database/database.module';
import { HttpModule } from '@nestjs/axios';
import { WalletModule } from 'src/wallet/wallet.module';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/database/schemas/user.schema';
import { Session, SessionSchema } from 'src/database/schemas/session.schema';

@Module({
  imports: [
    DatabaseModule,
    HttpModule,
    WalletModule,
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    MongooseModule.forFeature([{ name: Session.name, schema: SessionSchema }]),
  ],
  providers: [ResoBotService],
})
export class ResoBotModule {}
