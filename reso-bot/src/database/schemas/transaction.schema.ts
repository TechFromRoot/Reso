import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';

export type TransactionDocument = mongoose.HydratedDocument<Transaction>;

@Schema()
export class Transaction {
  @Prop({ type: mongoose.Schema.Types.BigInt, ref: 'User' })
  chatId: number;

  @Prop()
  TokenInAddress: string;

  @Prop()
  TokenInSymbol: string;

  @Prop()
  TokenInName: string;

  @Prop()
  TokenInAmount: string;

  @Prop()
  TokenInPrice: string;

  @Prop()
  TokenOutAddress: string;

  @Prop()
  TokenOutSymbol: string;

  @Prop()
  TokenOutName: string;

  @Prop()
  TokenOutAmount: string;

  @Prop()
  hash: string;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);
