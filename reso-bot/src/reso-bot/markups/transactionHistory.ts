import * as dotenv from 'dotenv';
dotenv.config();

export const transactionHistoryMarkup = async (transactions: any) => {
  const message =
    `Transaction History:\n\n` +
    transactions
      .map(
        (tx) =>
          `> ${tx.TokenInAmount} ${tx.TokenInSymbol} for ≈ ${tx.TokenOutAmount} ${tx.TokenOutSymbol}\n` +
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
