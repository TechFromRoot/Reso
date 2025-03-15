import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { Connection, PublicKey, Keypair, Transaction, VersionedMessage, VersionedTransaction } from '@solana/web3.js';
import bs58 from 'bs58';
import { getOrCreateAssociatedTokenAccount } from '@solana/spl-token';

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

            const [fromMintAddress, toMintAddress] = await Promise.all([
                this.getMintAddress(fromToken),
                this.getMintAddress(toToken)
            ]);

            const inputMint = fromMintAddress;
            const outputMint = toMintAddress;
            const amountInLamports = `${amount * 1000000000}`;
            const slippageBps = "50";
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

            const account = await getOrCreateAssociatedTokenAccount(
                connection,
                userAccount,
                new PublicKey(inputMint),
                userAddress
            );

            const swapUrl = `${this.SEGA_BASE_URL}swap/transaction/${swapType}`
            const swapTrx = await firstValueFrom(
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
            console.log(swapTrx.data.data[0].transaction);

            //Create a new Transaction
            // const transaction = new Transaction();

            // Add all instructions from the array
            // transaction.add(...swapTrx.data.data);

            // // Set recent blockhash and fee payer
            // const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
            // transaction.recentBlockhash = blockhash;
            // transaction.feePayer = userAddress;

            // // console.log(transaction)
            // // Sign the transaction with the private key
            // transaction.sign(userAccount);

            // // Send the signed transaction
            // const signature = await connection.sendRawTransaction(
            //     transaction.serialize(),
            // );

            // Decode the base64 transaction
            const txBuffer = Buffer.from(swapTrx.data.data[0].transaction, "base64");

            // Deserialize into a VersionedTransaction
            const transaction = VersionedTransaction.deserialize(txBuffer);

            // Set recent blockhash and fee payer
            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
            transaction.message.recentBlockhash = blockhash;

            // Sign the transaction
            transaction.sign([userAccount]); // Takes an array of signers

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

            return `https://solscan.io/tx/${signature}`;
        } catch (error) {
            console.error('Error in swapToken:', error);
        }
    }

    processPrompt(prompt: string) {
        try {
            const regex = /(swap|bridge)\s*(\d*\.?\d+)\s*([a-zA-Z0-9]+)\s*(?:to|for)\s*([a-zA-Z0-9]+)/i;

            const match = prompt.match(regex);

            if (!match) {
                throw new Error(
                    "Invalid prompt format. Use: 'Swap 10 ETH for SOL' or 'Bridge 10 USDC to ETH'",
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
        } catch (error) {
            console.error(
                `Error fetching token address for ${tokenSymbol}:`,
                error,
            );
        }
    }
}
