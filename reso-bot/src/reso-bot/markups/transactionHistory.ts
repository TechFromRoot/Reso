import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import * as dotenv from 'dotenv';
dotenv.config();

export const transactionHistoryMarkup = async (transactions: any) => {
  const message =
    `<b>Transaction History</b>:\n\n` +
    transactions
      .map(
        (tx) =>
          `> ${tx.TokenInAmount / LAMPORTS_PER_SOL} ${tx.TokenInSymbol} for ≈ ${tx.TokenOutAmount / LAMPORTS_PER_SOL} ${tx.TokenOutSymbol}\n` +
          `signature: <a href="${process.env.SONIC_SCAN_URL}tx/${tx.hash}">${tx.hash}</a>\n`,
      )
      .join('\n');
  return {
    message: message,
    keyboard: [
      [
        {
          text: 'Close',
          callback_data: JSON.stringify({
            command: '/close',
            language: 'english',
          }),
        },
      ],
    ],
  };
};
