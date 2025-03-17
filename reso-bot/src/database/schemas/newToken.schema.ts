import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';

export type NewTokenDocument = mongoose.HydratedDocument<NewToken>;

@Schema()
export class NewToken {
  @Prop({ type: mongoose.Schema.Types.BigInt, ref: 'User' })
  chatId: number;

  @Prop()
  name: string;

  @Prop()
  symbol: string;

  @Prop()
  uri: string;

  @Prop()
  decimal: string;

  @Prop()
  initialSupply: string;

  @Prop()
  address: string;

  @Prop()
  hash: string;
}

export const NewTokenSchema = SchemaFactory.createForClass(NewToken);
