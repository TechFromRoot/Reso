import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import {
  Connection,
  PublicKey,
  Keypair,
  VersionedTransaction,
  Transaction,
  TransactionMessage,
} from '@solana/web3.js';
import bs58 from 'bs58';
import {
  getOrCreateAssociatedTokenAccount,
  TOKEN_2022_PROGRAM_ID,
} from '@solana/spl-token';
import { SonicAgentKit } from '@sendaifun/sonic-agent-kit';
import { InjectModel } from '@nestjs/mongoose';
import { Transaction as dbTransaction } from 'src/database/schemas/transaction.schema';
import { Model } from 'mongoose';
import { WalletService } from 'src/wallet/wallet.service';

@Injectable()
export class ResoAgentService {
  private readonly SEGA_BASE_URL = 'https://api.sega.so/';
  private readonly SOLAR_BASE_URL = 'https://sonicapi.solarstudios.co';

  constructor(
    private readonly httpService: HttpService,
    private readonly walletService: WalletService,
    @InjectModel(dbTransaction.name)
    private readonly TransactionModel: Model<dbTransaction>,
  ) {}

  // https://sonicapi.solarstudios.co/transaction/swap-base-in
  //https://api.solarstudios.co/mint/list
  // https://sonicapi.solarstudios.co/mint/price?mints=mrujEYaN1oyQXDHeYNxBYpxWKVkQ2XsGxfznpifu4aL
  // https://sonicapi.solarstudios.co/check-tx
  // https://sonicapi.solarstudios.co/send-tx
  // https://sonicapi.solarstudios.co/transaction/swap-base-in

  async compareBuyPriceCompute(
    tokenMint: string,
    amount: string,
  ): Promise<any> {
    const inputMint = 'So11111111111111111111111111111111111111112';
    const outputMint = tokenMint;
    const amountInLamportsSega = `${Math.floor(Number(amount) * 1000000000)}`;
    const amountInLamportsSolar = `${Math.floor(Number(amount) * 10 ** 7)}`;
    const slippageBps = '10';
    const txVersion = 'V0';
    const swapType = 'swap-base-in';

    const swapComputeUrlSegaDex = `${this.SEGA_BASE_URL}swap/compute/${swapType}?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amountInLamportsSega}&slippageBps=${slippageBps}&txVersion=${txVersion}`;
    const swapComputeUrlSolarDex = `${this.SOLAR_BASE_URL}/compute/${swapType}?inputMint=${inputMint}&outputMint=${outputMint}&amount=${Number(amountInLamportsSolar) * 100}&slippageBps=${slippageBps}&txVersion=${txVersion}`;

    let segaResult = null;
    let solarResult = null;
    let segaError = null;
    let solarError = null;

    // Try Sega request
    try {
      const swapComputeSegaDex = await firstValueFrom(
        this.httpService.get(swapComputeUrlSegaDex),
      );
      segaResult = swapComputeSegaDex.data;
    } catch (error) {
      console.error('Sega request failed:', error);
      segaError = error;
    }

    // Try Solar request
    try {
      const swapComputeSolarDex = await firstValueFrom(
        this.httpService.get(swapComputeUrlSolarDex),
      );
      solarResult = swapComputeSolarDex.data;
    } catch (error) {
      console.error('Solar request failed:', error);
      solarError = error;
    }

    // If both requests failed, throw an error
    if (segaError && solarError) {
      throw new Error('Both Sega and Solar swap requests failed');
    }

    let optimal;
    if (segaResult && solarResult) {
      // check stables
      if (
        outputMint.toLocaleLowerCase() ===
          `HbDgpvHVxeNSRCGEUFvapCYmtYfqxexWcCbxtYecruy8`.toLocaleLowerCase() ||
        outputMint.toLocaleLowerCase() ===
          `qPzdrTCvxK3bxoh2YoTZtDcGVgRUwm37aQcC3abFgBy`.toLocaleLowerCase()
      ) {
        const segaOutput = parseFloat(segaResult.data.outputAmount) / 10 ** 9;
        const solarOutput = parseFloat(solarResult.data.outputAmount) / 10 ** 6;
        if (segaOutput >= solarOutput) {
          optimal = { swapCompute: segaResult, dex: 'SEGA' };
        } else {
          optimal = { swapCompute: solarResult, dex: 'SOLAR' };
        }
      }
      const segaOutput = parseFloat(segaResult.data.outputAmount) / 10 ** 9;
      const solarOutput = parseFloat(solarResult.data.outputAmount) / 10 ** 9;
      // console.log(segaOutput, solarOutput);
      if (segaOutput >= solarOutput) {
        optimal = { swapCompute: segaResult, dex: 'SEGA' };
      } else {
        optimal = { swapCompute: solarResult, dex: 'SOLAR' };
      }
    } else {
      if (segaResult) {
        optimal = { swapCompute: segaResult, dex: 'SEGA' };
      } else {
        if (
          outputMint.toLocaleLowerCase() ===
            `HbDgpvHVxeNSRCGEUFvapCYmtYfqxexWcCbxtYecruy8`.toLocaleLowerCase() ||
          outputMint.toLocaleLowerCase() ===
            `qPzdrTCvxK3bxoh2YoTZtDcGVgRUwm37aQcC3abFgBy`.toLocaleLowerCase()
        ) {
          optimal = { swapCompute: solarResult, dex: 'SOLAR' };
        } else {
          optimal = { swapCompute: solarResult, dex: 'SOLAR' };
        }
      }
    }
    // Return whatever results we have
    return {
      ...optimal,
    };
  }

  async compareSellPriceCompute(
    tokenMint: string,
    amount: string,
  ): Promise<any> {
    const inputMint = tokenMint;
    const outputMint = 'So11111111111111111111111111111111111111112';
    const amountInLamportsSega = `${Math.floor(Number(amount) * 1000000000)}`;
    const amountInLamportsSolar = `${Math.floor(Number(amount) * 10 ** 7)}`;
    const slippageBps = '10';
    const txVersion = 'V0';
    const swapType = 'swap-base-in';

    const swapComputeUrlSegaDex = `${this.SEGA_BASE_URL}swap/compute/${swapType}?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amountInLamportsSega}&slippageBps=${slippageBps}&txVersion=${txVersion}`;
    const swapComputeUrlSolarDex = `${this.SOLAR_BASE_URL}/compute/${swapType}?inputMint=${inputMint}&outputMint=${outputMint}&amount=${Number(amountInLamportsSolar) * 100}&slippageBps=${slippageBps}&txVersion=${txVersion}`;

    let segaResult = null;
    let solarResult = null;
    let segaError = null;
    let solarError = null;

    // Try Sega request
    try {
      const swapComputeSegaDex = await firstValueFrom(
        this.httpService.get(swapComputeUrlSegaDex),
      );
      segaResult = swapComputeSegaDex.data;
    } catch (error) {
      console.error('Sega request failed:', error);
      segaError = error;
    }

    // Try Solar request
    try {
      const swapComputeSolarDex = await firstValueFrom(
        this.httpService.get(swapComputeUrlSolarDex),
      );
      solarResult = swapComputeSolarDex.data;
    } catch (error) {
      console.error('Solar request failed:', error);
      solarError = error;
    }

    // If both requests failed, throw an error
    if (segaError && solarError) {
      throw new Error('Both Sega and Solar swap requests failed');
    }

    let optimal;
    if (segaResult && solarResult) {
      // check stables
      if (
        outputMint.toLocaleLowerCase() ===
          `HbDgpvHVxeNSRCGEUFvapCYmtYfqxexWcCbxtYecruy8`.toLocaleLowerCase() ||
        outputMint.toLocaleLowerCase() ===
          `qPzdrTCvxK3bxoh2YoTZtDcGVgRUwm37aQcC3abFgBy`.toLocaleLowerCase()
      ) {
        const segaOutput = parseFloat(segaResult.data.outputAmount) / 10 ** 9;
        const solarOutput = parseFloat(solarResult.data.outputAmount) / 10 ** 6;
        if (segaOutput >= solarOutput) {
          optimal = { swapCompute: segaResult, dex: 'SEGA' };
        } else {
          optimal = { swapCompute: solarResult, dex: 'SOLAR' };
        }
      }
      const segaOutput = parseFloat(segaResult.data.outputAmount) / 10 ** 9;
      const solarOutput = parseFloat(solarResult.data.outputAmount) / 10 ** 9;
      // console.log(segaOutput, solarOutput);
      if (segaOutput >= solarOutput) {
        optimal = { swapCompute: segaResult, dex: 'SEGA' };
      } else {
        optimal = { swapCompute: solarResult, dex: 'SOLAR' };
      }
    } else {
      if (segaResult) {
        optimal = { swapCompute: segaResult, dex: 'SEGA' };
      } else {
        if (
          outputMint.toLocaleLowerCase() ===
            `HbDgpvHVxeNSRCGEUFvapCYmtYfqxexWcCbxtYecruy8`.toLocaleLowerCase() ||
          outputMint.toLocaleLowerCase() ===
            `qPzdrTCvxK3bxoh2YoTZtDcGVgRUwm37aQcC3abFgBy`.toLocaleLowerCase()
        ) {
          optimal = { swapCompute: solarResult, dex: 'SOLAR' };
        } else {
          optimal = { swapCompute: solarResult, dex: 'SOLAR' };
        }
      }
    }
    // Return whatever results we have
    return {
      ...optimal,
      solarResult,
    };
  }

  async botBuyToken(
    privateKey: string,
    tokenMint: string,
    amount: string,
    chatId: number,
  ) {
    try {
      const inputMint = 'So11111111111111111111111111111111111111112';
      const outputMint = tokenMint;

      const userAccount = Keypair.fromSecretKey(bs58.decode(privateKey));
      const userAddress = userAccount.publicKey;

      const { balance } = await this.walletService.getSolBalance(
        String(userAddress),
        process.env.SONIC_RPC,
      );

      if (balance < parseFloat(amount)) {
        return 'Insufficient balance.';
      }

      const optimalCompute = await this.compareBuyPriceCompute(
        outputMint,
        amount,
      );
      const swapType = 'swap-base-in';
      const txVersion = 'V0';

      if (!optimalCompute) {
        return 'No available pool.';
      }

      const connection = new Connection(
        `https://rpc.mainnet-alpha.sonic.game/`,
        { commitment: 'confirmed' },
      );

      // Ensure ATAs exist for both input and output tokens
      await getOrCreateAssociatedTokenAccount(
        connection,
        userAccount,
        new PublicKey(inputMint),
        userAddress,
      );

      // Create ATA for outputMint (Token-2022)
      const outputATA = await getOrCreateAssociatedTokenAccount(
        connection,
        userAccount,
        new PublicKey(outputMint),
        userAddress,
        false, // allowOwnerOffCurve: false (default)
        'confirmed',
        {}, // Default options
        TOKEN_2022_PROGRAM_ID, // Specify Token-2022 Program ID
      );

      let swapTrx;
      if (optimalCompute.dex === `SEGA`) {
        const swapUrl = `${this.SEGA_BASE_URL}swap/transaction/${swapType}`;
        swapTrx = await firstValueFrom(
          this.httpService.post(swapUrl, {
            wallet: userAddress,
            computeUnitPriceMicroLamports: '100',
            swapResponse: optimalCompute.swapCompute.data,
            txVersion,
            wrapSol: true,
            unwrapSol: false,
            outputAccount: outputATA.address, // Use ATA instead of userAddress
          }),
        );
      } else {
        const swapUrl = `${this.SOLAR_BASE_URL}/transaction/${swapType}`;
        swapTrx = await firstValueFrom(
          this.httpService.post(swapUrl, {
            wallet: userAddress,
            computeUnitPriceMicroLamports: '100',
            swapResponse: optimalCompute.swapCompute,
            txVersion,
            wrapSol: true,
            unwrapSol: false,
            outputAccount: outputATA.address, // Use ATA instead of userAddress
          }),
        );
      }

      const txBuffer = Buffer.from(swapTrx.data.data[0].transaction, 'base64');
      const latestBlockhash = await connection.getLatestBlockhash();
      const blockhash = latestBlockhash.blockhash;
      const lastValidBlockHeight = latestBlockhash.lastValidBlockHeight;

      let transaction: VersionedTransaction;
      try {
        transaction = VersionedTransaction.deserialize(txBuffer);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (error) {
        const legacyTx = Transaction.from(txBuffer);
        transaction = new VersionedTransaction(
          new TransactionMessage({
            payerKey: userAddress,
            recentBlockhash: blockhash,
            instructions: legacyTx.instructions,
          }).compileToV0Message(),
        );
      }

      transaction.message.recentBlockhash = blockhash;
      transaction.sign([userAccount]);

      const signature = await connection.sendTransaction(transaction, {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });

      const confirmation = await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      });

      if (confirmation.value.err) {
        throw new Error('Transaction failed');
      }

      const inputTokenDetails = await this.getTokenDetails(
        optimalCompute.swapCompute.data.inputMint,
      );
      const outputTokenDetails = await this.getTokenDetails(
        optimalCompute.swapCompute.data.outputMint,
      );
      const tokenInPrice: any = await this.fetchSupportedTokenPrice(
        optimalCompute.swapCompute.data.inputMint,
      );

      const transactionDetails = new this.TransactionModel({
        chatId: chatId,
        TokenInAddress: optimalCompute.swapCompute.data.inputMint,
        TokenInSymbol: inputTokenDetails.symbol,
        TokenInName: inputTokenDetails.name,
        TokenInAmount: optimalCompute.swapCompute.data.inputAmount,
        TokenInPrice: tokenInPrice,
        TokenOutAddress: optimalCompute.swapCompute.data.outputMint,
        TokenOutSymbol: outputTokenDetails.symbol,
        TokenOutName: outputTokenDetails.name,
        TokenOutAmount: optimalCompute.swapCompute.data.outputAmount,
        hash: signature,
      });

      await transactionDetails.save();
      return `https://explorer.sonic.game/tx/${signature}?cluster=mainnet-alpha`;
    } catch (error: any) {
      console.error('Error in swapToken:', error);
      return 'Error buying token. Please confirm you have enough balance and try again.';
    }
  }

  async botSellToken(
    privateKey: string,
    tokenMint: string,
    amountPercent: string,
    chatId: number,
  ) {
    try {
      const inputMint = tokenMint;
      const outputMint = 'So11111111111111111111111111111111111111112';
      const inputTokenDetails = await this.getTokenDetails(inputMint);
      const outputTokenDetails = await this.getTokenDetails(outputMint);

      const userAccount = Keypair.fromSecretKey(bs58.decode(privateKey));
      const userAddress = userAccount.publicKey;

      const { balance } = await this.walletService.getToken2022Balance(
        String(userAddress),
        inputMint,
        process.env.SONIC_RPC,
        Number(inputTokenDetails.decimal),
        inputTokenDetails.programId,
      );

      const amount = (balance * parseFloat(amountPercent)) / 100;
      if (balance < amount) {
        return 'Insufficient balance.';
      }

      const optimalCompute = await this.compareSellPriceCompute(
        inputMint,
        `${amount}`,
      );
      const swapType = 'swap-base-in';
      const txVersion = 'V0';

      if (!optimalCompute) {
        return 'No available pool.';
      }

      const connection = new Connection(
        `https://rpc.mainnet-alpha.sonic.game/`,
        {
          commitment: 'confirmed',
        },
      );

      let swapTrx;
      if (optimalCompute.dex === `SEGA`) {
        const swapUrl = `${this.SEGA_BASE_URL}swap/transaction/${swapType}`;
        swapTrx = await firstValueFrom(
          this.httpService.post(swapUrl, {
            wallet: userAddress,
            computeUnitPriceMicroLamports: '100',
            swapResponse: optimalCompute.swapCompute,
            txVersion,
            wrapSol: false,
            unwrapSol: true,
            outputAccount: userAddress,
          }),
        );
      } else {
        const swapUrl = `${this.SOLAR_BASE_URL}/transaction/${swapType}`;
        swapTrx = await firstValueFrom(
          this.httpService.post(swapUrl, {
            wallet: userAddress,
            computeUnitPriceMicroLamports: '100',
            swapResponse: optimalCompute.swapCompute,
            txVersion,
            wrapSol: false,
            unwrapSol: true,
            outputAccount: userAddress,
          }),
        );
      }

      const txBuffer = Buffer.from(swapTrx.data.data[0].transaction, 'base64');
      const latestBlockhash = await connection.getLatestBlockhash();
      const blockhash = latestBlockhash.blockhash;
      const lastValidBlockHeight = latestBlockhash.lastValidBlockHeight;

      let transaction: VersionedTransaction;
      try {
        transaction = VersionedTransaction.deserialize(txBuffer);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (error) {
        const legacyTx = Transaction.from(txBuffer);
        transaction = new VersionedTransaction(
          new TransactionMessage({
            payerKey: userAddress,
            recentBlockhash: blockhash,
            instructions: legacyTx.instructions,
          }).compileToV0Message(),
        );
      }

      transaction.message.recentBlockhash = blockhash;
      transaction.sign([userAccount]);

      const signature = await connection.sendTransaction(transaction, {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });

      const confirmation = await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      });

      if (confirmation.value.err) {
        throw new Error('Transaction failed');
      }

      const tokenInPrice: any = await this.fetchSupportedTokenPrice(
        optimalCompute.swapCompute.data.inputMint,
      );
      const transactionDetails = new this.TransactionModel({
        chatId: chatId,
        TokenInAddress: optimalCompute.swapCompute.data.inputMint,
        TokenInSymbol: inputTokenDetails.symbol,
        TokenInName: inputTokenDetails.name,
        TokenInAmount: optimalCompute.swapCompute.data.inputAmount,
        TokenInPrice: tokenInPrice,
        TokenOutAddress: optimalCompute.swapCompute.data.outputMint,
        TokenOutSymbol: outputTokenDetails.symbol,
        TokenOutName: outputTokenDetails.name,
        TokenOutAmount: optimalCompute.swapCompute.data.outputAmount,
        hash: signature,
      });
      await transactionDetails.save();
      return `https://explorer.sonic.game/tx/${signature}?cluster=mainnet-alpha`;
    } catch (error: any) {
      console.error('Error in swapToken:', error);
      return 'Error selling token. Please confirm you have enough balance/gas fee and try again.';
    }
  }

  async swapToken(privateKey: string, prompt: string, chatId: number) {
    try {
      const { fromToken, toToken, amount } = this.processPrompt(prompt);

      const [inputMint, outputMint, isAvailable] = await Promise.all([
        this.getMintAddress(fromToken),
        this.getMintAddress(toToken),
        this.isPoolAvailable(fromToken, toToken),
      ]);

      if (!isAvailable) {
        return 'Pool is not available.';
      }

      const userAccount = Keypair.fromSecretKey(bs58.decode(privateKey));
      const userAddress = userAccount.publicKey;

      let inputBalance;
      const token = await this.getTokenDetails(inputMint);

      if (inputMint === 'So11111111111111111111111111111111111111112') {
        const { balance } = await this.walletService.getSolBalance(
          String(userAddress),
          process.env.SONIC_RPC,
        );

        inputBalance = balance;
      } else {
        const { balance } = await this.walletService.getToken2022Balance(
          String(userAddress),
          inputMint,
          process.env.SONIC_RPC,
          token.decimal,
          token.programId,
        );

        inputBalance = balance;
      }
      if (inputBalance < amount) {
        return 'Insufficient balance.';
      }

      const amountInLamports = `${Math.floor(amount * 1000000000)}`;
      const slippageBps = '10';
      const txVersion = 'V0';
      const swapType = 'swap-base-in';

      const swapComputeUrl = `${this.SEGA_BASE_URL}swap/compute/${swapType}?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amountInLamports}&slippageBps=${slippageBps}&txVersion=${txVersion}`;
      const swapCompute = await firstValueFrom(
        this.httpService.get(swapComputeUrl),
      );

      const connection = new Connection(
        `https://rpc.mainnet-alpha.sonic.game/`,
        {
          commitment: 'confirmed',
        },
      );

      if (inputMint !== 'So11111111111111111111111111111111111111112') {
        await getOrCreateAssociatedTokenAccount(
          connection,
          userAccount,
          new PublicKey(inputMint),
          userAddress,
        );
      }

      const swapUrl = `${this.SEGA_BASE_URL}swap/transaction/${swapType}`;
      let swapTrx;
      if (fromToken.toLowerCase() === 'sol') {
        swapTrx = await firstValueFrom(
          this.httpService.post(swapUrl, {
            wallet: userAddress,
            computeUnitPriceMicroLamports: '100',
            swapResponse: swapCompute.data,
            txVersion,
            wrapSol: true,
            unwrapSol: false,
            outputAccount: userAddress,
          }),
        );
      } else {
        swapTrx = await firstValueFrom(
          this.httpService.post(swapUrl, {
            wallet: userAddress,
            computeUnitPriceMicroLamports: '100',
            swapResponse: swapCompute.data,
            txVersion,
            wrapSol: false,
            unwrapSol: true,
            outputAccount: userAddress,
          }),
        );
      }

      // Decode the base64 transaction
      const txBuffer = Buffer.from(swapTrx.data.data[0].transaction, 'base64');

      // Deserialize into a VersionedTransaction
      const transaction = VersionedTransaction.deserialize(txBuffer);

      // Set recent blockhash and fee payer
      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash();
      transaction.message.recentBlockhash = blockhash;

      // Sign the transaction
      transaction.sign([userAccount]);

      // Send the signed transaction
      const signature = await connection.sendTransaction(transaction, {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });

      // Confirm the transaction
      const confirmation = await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      });

      if (confirmation.value.err) {
        throw new Error('Transaction failed');
      }
      const inputTokenDetails = await this.getTokenDetails(
        swapCompute.data.data.inputMint,
      );
      const outputTokenDetails = await this.getTokenDetails(
        swapCompute.data.data.outputMint,
      );
      const tokenInPrice: any = await this.fetchSupportedTokenPrice(
        swapCompute.data.data.inputMint,
      );
      const transactionDetails = new this.TransactionModel({
        chatId: chatId,
        TokenInAddress: swapCompute.data.data.inputMint,
        TokenInSymbol: inputTokenDetails.symbol,
        TokenInName: inputTokenDetails.name,
        TokenInAmount: swapCompute.data.data.inputAmount,
        TokenInPrice: tokenInPrice,
        TokenOutAddress: swapCompute.data.data.outputMint,
        TokenOutSymbol: outputTokenDetails.symbol,
        TokenOutName: outputTokenDetails.name,
        TokenOutAmount: swapCompute.data.data.outputAmount,
        hash: signature,
      });
      await transactionDetails.save();
      return `https://explorer.sonic.game/tx/${signature}?cluster=mainnet-alpha`;
    } catch (error: any) {
      console.error('Error in swapToken:', error);
      return 'Error buying token. Please confirm you have enough balance and try again.';
    }
  }

  processPrompt(prompt: string) {
    try {
      const regex =
        /(swap|bridge)\s*(\d*\.?\d+)\s*([a-zA-Z0-9]+)\s*(?:to|for)\s*([a-zA-Z0-9]+)/i;

      const match = prompt.match(regex);

      if (!match) {
        throw new Error("Invalid prompt format. Use: 'Swap 10 ETH for SOL'");
      }

      const action = match[1].toLowerCase();
      const amount = parseFloat(match[2]);
      const fromToken = match[3].trim().toUpperCase();
      const toToken = match[4].trim().toUpperCase();

      return {
        action, // 'swap' or 'bridge'
        fromToken,
        toToken,
        amount,
      };
    } catch (error: any) {
      console.error(error.message);
      return error.message;
    }
  }

  async getMintAddress(tokenSymbol: string) {
    try {
      const url = `${this.SEGA_BASE_URL}api/mint/list`;
      const response = await firstValueFrom(this.httpService.get(url));

      const mintList = response.data.data.mintList;

      // Find the token that matches the symbol (case-sensitive)
      const tokenData = mintList.find(
        (token: any) =>
          token.symbol.toLowerCase() === tokenSymbol.toLowerCase(),
      );

      if (!tokenData) {
        throw new Error(`Token with symbol '${tokenSymbol}' not found.`);
      }

      return tokenData.address;
    } catch (error: any) {
      console.error(
        `Error fetching token address for ${tokenSymbol}:`,
        error.message,
      );
      return error.message;
    }
  }

  async getTokenDetails(address: string) {
    try {
      const url = `${this.SEGA_BASE_URL}api/mint/list`;
      const response = await firstValueFrom(this.httpService.get(url));

      const mintList = response.data.data.mintList;

      // Find the token that matches the symbol (case-sensitive)
      const tokenData = mintList.find(
        (token: any) => token.address.toLowerCase() === address.toLowerCase(),
      );

      if (!tokenData) {
        throw new Error(`Token with address '${address}' not found.`);
      }

      return {
        address: tokenData.address,
        symbol: tokenData.symbol,
        name: tokenData.name,
        decimal: tokenData.decimals,
        programId: tokenData.programId,
      };
    } catch (error: any) {
      console.error(
        `Error fetching token details for ${address}:`,
        error.message,
      );
      return error.message;
    }
  }

  fetchSupportedTokenPrice = async (address: string) => {
    try {
      const response = await this.httpService.axiosRef.get(
        `https://api.sega.so/api/mint/price?mints=${address}`,
      );
      const price = Object.values(response.data.data)[0];
      return price;
    } catch (error) {
      console.error(error);
    }
  };

  async isPoolAvailable(token1: string, token2: string) {
    const url = `${this.SEGA_BASE_URL}api/pools/info/list?page=1&pageSize=20`;
    const pools = await firstValueFrom(this.httpService.get(url));

    if (token1.toLowerCase() === 'sol') {
      token1 = 'WSOL';
    } else if (token2.toLowerCase() === 'sol') {
      token2 = 'WSOL';
    }

    return pools.data.data.data.some(
      (pool) =>
        (pool.mintA.symbol.trim().toLowerCase() ===
          token1.trim().toLowerCase() &&
          pool.mintB.symbol.trim().toLowerCase() ===
            token2.trim().toLowerCase()) ||
        (pool.mintA.symbol.trim().toLowerCase() ===
          token2.trim().toLowerCase() &&
          pool.mintB.symbol.trim().toLowerCase() ===
            token1.trim().toLowerCase()),
    );
  }

  async createToken(
    pk: string,
    name: string,
    uri: string,
    symbol: string,
    decimals: number,
    initialSupply: number,
    chatId: number,
  ) {
    try {
      const sonicAgentKit = new SonicAgentKit(
        pk,
        'https://rpc.mainnet-alpha.sonic.game/',
        {
          OPENAI_API_KEY: process.env.OPENAI_API_KEY,
        },
      );

      const token = await sonicAgentKit.deployToken(
        name,
        uri,
        symbol,
        decimals,
        initialSupply,
      );

      return token.mint.toString();
    } catch (error: any) {
      console.error(`Error creating token:`, error.message);
      return 'Error creating token. Please confirm you have enough balance and try again.';
    }
  }
}
