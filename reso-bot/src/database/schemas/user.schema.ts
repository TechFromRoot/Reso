import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';

export type UserDocument = mongoose.HydratedDocument<User>;

@Schema()
export class User {
  @Prop({ unique: true })
  chatId: number;

  @Prop()
  userName: string;

  @Prop()
  evmWalletAddress: string;

  @Prop()
  svmWalletAddress: string;

  @Prop()
  evmWalletDetails: string;

  @Prop()
  svmWalletDetails: string;

  @Prop()
  linkCode: string;

  @Prop({ default: 10 })
  buySlippage: string;

  @Prop({ default: 10 })
  sellSlippage: string;

  @Prop({ default: 5 })
  upperThreshold: number;

  @Prop({ default: 5 })
  lowerThreshold: number;

  @Prop({
    type: Map,
    of: Number,
    default: () => new Map<string, number>(),
  })
  targetAllocations: Map<string, number>; // {"MNT": 30, "USDC": 40, "MOE": 30}

  @Prop({ default: false })
  rebalanceEnabled: boolean;

  @Prop({ default: true })
  enableAgenticAutoSwap: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);
