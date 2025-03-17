import { Injectable } from '@nestjs/common';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'crypto';
import {
  Keypair,
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import bs58 from 'bs58';
import * as dotenv from 'dotenv';
import {
  getAssociatedTokenAddress,
  getAccount,
  createTransferInstruction,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';

dotenv.config();

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

@Injectable()
export class WalletService {
  private generateKey(password: string): Buffer {
    return createHash('sha256').update(password).digest();
  }

  createSVMWallet = (): Record<string, any> => {
    const keypair = Keypair.generate();
    const privateKey = keypair.secretKey;
    const publicKey = keypair.publicKey;

    return {
      address: publicKey.toBase58(),
      privateKey: bs58.encode(privateKey),
    };
  };

  getSVMAddressFromPrivateKey = (
    privateKey: string,
  ): Record<string, string> => {
    const privateKeyBytes = bs58.decode(privateKey);
    const wallet = Keypair.fromSecretKey(privateKeyBytes);
    return {
      address: wallet.publicKey.toBase58(),
      privateKey: bs58.encode(wallet.secretKey),
    };
  };

  encryptSVMWallet = async (
    password: string,
    privateKey: string,
  ): Promise<Record<string, string>> => {
    const key = this.generateKey(password);
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(privateKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const encryptedWallet = iv.toString('hex') + ':' + encrypted;
    return { json: encryptedWallet };
  };

  decryptSVMWallet = async (
    password: string,
    encryptedWallet: string,
  ): Promise<Record<string, any>> => {
    const key = this.generateKey(password);
    const [ivHex, encrypted] = encryptedWallet.split(':');
    const iv = Buffer.from(ivHex, 'hex');

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return {
      privateKey: decrypted,
      address: this.getSVMAddressFromPrivateKey(decrypted).address,
    };
  };

  getSolBalance = async (
    address: string,
    rpcURL: string,
  ): Promise<Record<string, number>> => {
    try {
      const connection = new Connection(rpcURL, 'confirmed');
      const publicKey = new PublicKey(address);
      const balance = await connection.getBalance(publicKey);
      return {
        balance: balance / LAMPORTS_PER_SOL, // Convert lamports to SOL
      };
    } catch (error) {
      throw new Error(`Failed to get SOL balance: ${error.message}`);
    }
  };

  getSPLTokenBalance = async (
    address: string,
    tokenAddress: string,
    rpcURL: string,
    decimal: number,
  ): Promise<Record<string, number>> => {
    try {
      const connection = new Connection(rpcURL, 'confirmed');
      const publicKey = new PublicKey(address);
      const tokenMint = new PublicKey(tokenAddress);
      // console.log(tokenMint);
      const associatedTokenAddress = await getAssociatedTokenAddress(
        tokenMint,
        publicKey,
        true,
      );
      console.log(
        'Associated Token Address (ATA):',
        associatedTokenAddress.toBase58(),
      );
      // Check if the associated token account exists
      const accountInfo = await connection.getAccountInfo(
        associatedTokenAddress,
      );
      // console.log(accountInfo);
      if (!accountInfo) {
        return {
          balance: 0, // Return 0 if the account does not exist
        };
      }

      const tokenAccount = await getAccount(connection, associatedTokenAddress);
      return {
        balance: Number(tokenAccount.amount) / 10 ** decimal,
      };
    } catch (error) {
      console.log('ERROR', error);
      throw new Error(`Failed to get SPL token balance: ${error.message}`);
    }
  };

  getToken2022Balance = async (
    walletAddress: string,
    tokenMintAddress: string,
    rpcUrl: string,
    decimals: number,
    programId: string,
  ): Promise<Record<string, number>> => {
    // Validate inputs
    if (!walletAddress || !tokenMintAddress || !rpcUrl || decimals < 0) {
      throw new Error('Invalid input parameters');
    }

    // Initialize connection
    const connection = new Connection(rpcUrl, 'confirmed');

    // Convert to PublicKey objects
    let walletPubkey: PublicKey;
    let tokenMintPubkey: PublicKey;
    try {
      walletPubkey = new PublicKey(walletAddress);
      tokenMintPubkey = new PublicKey(tokenMintAddress);
    } catch (error) {
      console.log(error);
      throw new Error('Invalid wallet or token mint address format');
    }

    // Get the associated token account (ATA) for Token-2022
    const associatedTokenAddress = await getAssociatedTokenAddress(
      tokenMintPubkey,
      walletPubkey,
      true, // Allow owner off-curve
      new PublicKey(programId), // Use Token-2022 program ID
    );

    // Fetch token account balance
    try {
      const tokenAccount = await getAccount(
        connection,
        associatedTokenAddress,
        'confirmed',
        new PublicKey(programId), // Specify Token-2022 program
      );

      const balance = Number(tokenAccount.amount) / 10 ** decimals;

      return {
        balance,
      };
    } catch (error) {
      if (error.name === 'TokenAccountNotFoundError') {
        // Return 0 balance if the ATA doesn't exist
        return {
          balance: 0,
        };
      }
      throw new Error(`Failed to fetch Token-2022 balance: ${error.message}`);
    }
  };

  transferSOL = async (
    privateKey: string,
    recipientAddress: string,
    amount: number,
    rpcURL: string,
    description?: string,
  ): Promise<Record<any, unknown>> => {
    try {
      const connection = new Connection(rpcURL, 'confirmed');
      const senderKeypair = Keypair.fromSecretKey(bs58.decode(privateKey));
      const recipientPubkey = new PublicKey(recipientAddress);

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: senderKeypair.publicKey,
          toPubkey: recipientPubkey,
          lamports: amount * LAMPORTS_PER_SOL,
        }),
      );

      const signature = await sendAndConfirmTransaction(
        connection,
        transaction,
        [senderKeypair],
      );

      return {
        signature,
        description,
      };
    } catch (error) {
      throw new Error(`Failed to transfer SOL: ${error.message}`);
    }
  };

  transferSPLToken = async (
    privateKey: string,
    recipientAddress: string,
    amount: number,
    tokenAddress: string,
    rpcURL: string,
    decimal: number,
    description?: string,
  ): Promise<Record<any, unknown>> => {
    try {
      const connection = new Connection(rpcURL, 'confirmed');
      const senderKeypair = Keypair.fromSecretKey(bs58.decode(privateKey));
      const recipientPubkey = new PublicKey(recipientAddress);
      const tokenMint = new PublicKey(tokenAddress);

      const senderATA = await getAssociatedTokenAddress(
        tokenMint,
        senderKeypair.publicKey,
      );
      const recipientATA = await getAssociatedTokenAddress(
        tokenMint,
        recipientPubkey,
      );

      const transaction = new Transaction().add(
        createTransferInstruction(
          senderATA,
          recipientATA,
          senderKeypair.publicKey,
          amount * 10 ** decimal,
          [],
          TOKEN_PROGRAM_ID,
        ),
      );

      const signature = await sendAndConfirmTransaction(
        connection,
        transaction,
        [senderKeypair],
      );

      return {
        signature,
        description,
      };
    } catch (error) {
      throw new Error(`Failed to transfer SPL token: ${error.message}`);
    }
  };
}
