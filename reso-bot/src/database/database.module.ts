import { Module } from '@nestjs/common';

import * as dotenv from 'dotenv';
import { MongooseModule } from '@nestjs/mongoose';

dotenv.config();

@Module({
  imports: [MongooseModule.forRoot(process.env.MONGO_URI!)],
})
export class DatabaseModule {}
