import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { Connection, PublicKey, Keypair, Transaction, VersionedMessage, VersionedTransaction } from '@solana/web3.js';
import bs58 from 'bs58';
import { getOrCreateAssociatedTokenAccount } from '@solana/spl-token';
import { SonicAgentKit } from '@sendaifun/sonic-agent-kit';
const base64 = require("buffer").Buffer;

@Injectable()
export class ResoAgentService {
    private readonly SEGA_BASE_URL = 'https://api.sega.so/';

    constructor(
        private readonly httpService: HttpService,
    ) { }

    async swapToken(
        privateKey: string,
        prompt: string,
    ) {
        try {
            const {
                fromToken,
                toToken,
                amount
            } = this.processPrompt(prompt);

            const [inputMint, outputMint] = await Promise.all([
                this.getMintAddress(fromToken),
                this.getMintAddress(toToken)
            ]);

            const amountInLamports = `${amount * 1000000000}`;
            const slippageBps = "10";
            const txVersion = "V0";
            const swapType = "swap-base-in";

            const swapComputeUrl = `${this.SEGA_BASE_URL}swap/compute/${swapType}?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amountInLamports}&slippageBps=${slippageBps}&txVersion=${txVersion}`
            const swapCompute = await firstValueFrom(
                this.httpService.get(
                    swapComputeUrl
                )
            );
            console.log(swapCompute.data);

            const userAccount = Keypair.fromSecretKey(bs58.decode(privateKey));
            const userAddress = userAccount.publicKey;

            const connection = new Connection(`https://rpc.mainnet-alpha.sonic.game/`, {
                commitment: 'confirmed',
            });

            await getOrCreateAssociatedTokenAccount(
                connection,
                userAccount,
                new PublicKey(inputMint),
                userAddress
            );

            const swapUrl = `${this.SEGA_BASE_URL}swap/transaction/${swapType}`
            let swapTrx;
            if (fromToken.toLowerCase === "sol") {
                swapTrx = await firstValueFrom(
                    this.httpService.post(
                        swapUrl,
                        {
                            wallet: userAddress,
                            computeUnitPriceMicroLamports: "100",
                            swapResponse: swapCompute.data,
                            txVersion,
                            wrapSol: true,
                            unwrapSol: false,
                            outputAccount: userAddress
                        }
                    )
                );
            } else {
                swapTrx = await firstValueFrom(
                    this.httpService.post(
                        swapUrl,
                        {
                            wallet: userAddress,
                            computeUnitPriceMicroLamports: "100",
                            swapResponse: swapCompute.data,
                            txVersion,
                            wrapSol: false,
                            unwrapSol: true,
                            outputAccount: userAddress
                        }
                    )
                );
            }

            // Decode the base64 transaction
            const txBuffer = Buffer.from(swapTrx.data.data[0].transaction, "base64");

            // Deserialize into a VersionedTransaction
            const transaction = VersionedTransaction.deserialize(txBuffer);

            // Set recent blockhash and fee payer
            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
            transaction.message.recentBlockhash = blockhash;

            // Sign the transaction
            transaction.sign([userAccount]);

            // Send the signed transaction
            const signature = await connection.sendTransaction(transaction, {
                skipPreflight: false,
                preflightCommitment: "confirmed",
            });

            // Confirm the transaction
            const confirmation = await connection.confirmTransaction({
                signature,
                blockhash,
                lastValidBlockHeight
            });

            if (confirmation.value.err) {
                throw new Error('Transaction failed');
            }

            return `https://explorer.sonic.game/tx/${signature}?cluster=mainnet-alpha`;
        } catch (error: any) {
            console.error('Error in swapToken:', error);
            return error.message;
        }
    }

    processPrompt(prompt: string) {
        try {
            const regex = /(swap|bridge)\s*(\d*\.?\d+)\s*([a-zA-Z0-9]+)\s*(?:to|for)\s*([a-zA-Z0-9]+)/i;

            const match = prompt.match(regex);

            if (!match) {
                throw new Error(
                    "Invalid prompt format. Use: 'Swap 10 ETH for SOL'",
                );
            }

            const action = match[1].toLowerCase();
            const amount = parseFloat(match[2]);
            const fromToken = match[3].trim().toUpperCase();
            const toToken = match[4].trim().toUpperCase();

            return {
                action, // 'swap' or 'bridge'
                fromToken,
                toToken,
                amount
            };
        } catch (error: any) {
            console.error(error.message);
            return error.message;
        }
    }


    async getMintAddress(tokenSymbol: string) {
        try {
            const url = `${this.SEGA_BASE_URL}api/mint/list`;
            const response = await firstValueFrom(
                this.httpService.get(
                    url
                )
            );

            const mintList = response.data.data.mintList;

            // Find the token that matches the symbol (case-sensitive)
            const tokenData = mintList.find((token: any) => token.symbol.toLowerCase() === tokenSymbol.toLowerCase());

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

    async createToken(pk: string, name: string, uri: string, symbol: string, decimals: number, initialSupply: number) {
        try {
            const sonicAgentKit = new SonicAgentKit(
                pk,
                "https://api.testnet.sonic.game/",
                // "https://rpc.mainnet-alpha.sonic.game/",
                { OPENAI_API_KEY: "sk-proj-BG0emQJv4YmC3Q2bouuz2boR_otqvLAkBXM_IXLhgBkXViHE-AQqElhlulAcLc4vr7-" }
            );

            const token = await sonicAgentKit.deployToken(
                name,
                uri,
                symbol,
                decimals,
                initialSupply
            );

            console.log(token);
            return token.mint.toString();

        } catch (error: any) {
            console.error(
                `Error creating token:`,
                error.message,
            );
            return error.message;
        }
    }
}
