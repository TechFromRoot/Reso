import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import {
  Connection,
  PublicKey,
  Keypair,
  VersionedTransaction,
} from '@solana/web3.js';
import bs58 from 'bs58';
import { getOrCreateAssociatedTokenAccount } from '@solana/spl-token';
import { SonicAgentKit } from '@sendaifun/sonic-agent-kit';
import { InjectModel } from '@nestjs/mongoose';
import { Transaction } from 'src/database/schemas/transaction.schema';
import { Model } from 'mongoose';
import { WalletService } from 'src/wallet/wallet.service';

@Injectable()
export class ResoAgentService {
  private readonly SEGA_BASE_URL = 'https://api.sega.so/';

  constructor(
    private readonly httpService: HttpService,
    private readonly walletService: WalletService,
    @InjectModel(Transaction.name)
    private readonly TransactionModel: Model<Transaction>,
  ) {}

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

      const amountInLamports = `${Math.floor(Number(amount) * 1000000000)}`;
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

      await getOrCreateAssociatedTokenAccount(
        connection,
        userAccount,
        new PublicKey(inputMint),
        userAddress,
      );

      const swapUrl = `${this.SEGA_BASE_URL}swap/transaction/${swapType}`;

      const swapTrx = await firstValueFrom(
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
        swapCompute.data.inputMint,
      );
      const outputTokenDetails = await this.getTokenDetails(
        swapCompute.data.outputMint,
      );
      const tokenInPrice: any = await this.fetchSupportedTokenPrice(
        swapCompute.data.inputMint,
      );
      const transactionDetails = new this.TransactionModel({
        chatId: chatId,
        TokenInAddress: swapCompute.data.inputMint,
        TokenInSymbol: inputTokenDetails.symbol,
        TokenInName: inputTokenDetails.name,
        TokenInAmount: swapCompute.data.inputAmount,
        TokenInPrice: tokenInPrice,
        TokenOutAddress: swapCompute.data.outputMint,
        TokenOutSymbol: outputTokenDetails.symbol,
        TokenOutName: outputTokenDetails.name,
        TokenOutAmount: swapCompute.data.outputAmount,
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
      console.log(amount);
      if (balance < amount) {
        return 'Insufficient balance.';
      }

      const amountInLamports = `${Math.floor(Number(amount) * 1000000000)}`;
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

      const swapUrl = `${this.SEGA_BASE_URL}swap/transaction/${swapType}`;

      const swapTrx = await firstValueFrom(
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
      const tokenInPrice: any = await this.fetchSupportedTokenPrice(
        swapCompute.data.inputMint,
      );
      const transactionDetails = new this.TransactionModel({
        chatId: chatId,
        TokenInAddress: swapCompute.data.inputMint,
        TokenInSymbol: inputTokenDetails.symbol,
        TokenInName: inputTokenDetails.name,
        TokenInAmount: swapCompute.data.inputAmount,
        TokenInPrice: tokenInPrice,
        TokenOutAddress: swapCompute.data.outputMint,
        TokenOutSymbol: outputTokenDetails.symbol,
        TokenOutName: outputTokenDetails.name,
        TokenOutAmount: swapCompute.data.outputAmount,
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
      console.log(swapCompute);

      const connection = new Connection(
        `https://rpc.mainnet-alpha.sonic.game/`,
        {
          commitment: 'confirmed',
        },
      );

      await getOrCreateAssociatedTokenAccount(
        connection,
        userAccount,
        new PublicKey(inputMint),
        userAddress,
      );

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
        swapCompute.data.inputMint,
      );
      const outputTokenDetails = await this.getTokenDetails(
        swapCompute.data.outputMint,
      );
      const tokenInPrice: any = await this.fetchSupportedTokenPrice(
        swapCompute.data.inputMint,
      );
      const transactionDetails = new this.TransactionModel({
        chatId: chatId,
        TokenInAddress: swapCompute.data.inputMint,
        TokenInSymbol: inputTokenDetails.symbol,
        TokenInName: inputTokenDetails.name,
        TokenInAmount: swapCompute.data.inputAmount,
        TokenInPrice: tokenInPrice,
        TokenOutAddress: swapCompute.data.outputMint,
        TokenOutSymbol: outputTokenDetails.symbol,
        TokenOutName: outputTokenDetails.name,
        TokenOutAmount: swapCompute.data.outputAmount,
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
        'https://api.testnet.sonic.game/',
        // "https://rpc.mainnet-alpha.sonic.game/",
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
