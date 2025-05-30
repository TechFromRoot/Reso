import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ResoBotModule } from './reso-bot/reso-bot.module';
import { ResoAgentModule } from './reso-agent/reso-agent.module';
import { DatabaseModule } from './database/database.module';
import { WalletModule } from './wallet/wallet.module';

@Module({
  imports: [ResoBotModule, ResoAgentModule, DatabaseModule, WalletModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
