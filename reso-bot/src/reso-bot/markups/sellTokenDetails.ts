import * as dotenv from 'dotenv';
dotenv.config();

interface Token {
  address: string;
  programId: string;
  symbol: string;
  name: string;
  decimals: number;
}
const formatNumber = (num: number): string => {
  if (num >= 1_000_000_000) {
    return (num / 1_000_000_000).toFixed(1) + 'B'; // Billion
  } else if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1) + 'M'; // Million
  } else if (num >= 1_000) {
    return (num / 1_000).toFixed(1) + 'K'; // Thousand
  } else {
    return num.toString(); // Return the number as is if it's less than 1,000
  }
};

export const sellTokenMarkup = async (
  token: Token,
  price: string,
  poolDetails: any,
  balance: any,
  solBalance: any,
) => {
  return {
    message: `<a href="${process.env.SONIC_SCAN_URL}address/${token.address}">${token.symbol} | ${token.name}</a>\n<code>${token.address}</code>\n\n🔄 Dex: SEGA / WhiteList ✅\n✅Liquidity: $${formatNumber(poolDetails.liquidity)}\n\nPrice: $${price || 0}\n\nBalance: ${formatNumber(parseFloat(balance))}\nSOL balance: ${formatNumber(parseFloat(solBalance))}`,
    keyboard: [
      [
        {
          text: 'Home',
          callback_data: JSON.stringify({
            command: '/menu',
            language: 'english',
          }),
        },
        {
          text: '✅ Swap',
          callback_data: JSON.stringify({
            command: '/refresh',
            language: 'english',
          }),
        },
        {
          text: 'Close ❌',
          callback_data: JSON.stringify({
            command: '/close',
            language: 'english',
          }),
        },
      ],
      [
        {
          text: '🔴 Sell 25%',
          callback_data: JSON.stringify({
            s: `/sel|${token.address}`,
            a: 25,
          }),
        },
        {
          text: '🔴 Sell 100%',
          callback_data: JSON.stringify({
            s: `/sel|${token.address}`,
            a: 100,
          }),
        },
        {
          text: '🔴 Sell X %',
          callback_data: JSON.stringify({
            s: `/sel|${token.address}`,
            a: 0,
          }),
        },
      ],
      [
        {
          text: '🟢Buy 1.0 SOL',
          callback_data: JSON.stringify({
            c: `/buy|${token.address}`,
            a: 1.0,
          }),
        },
        {
          text: '🟢Buy 5 SOL',
          callback_data: JSON.stringify({
            c: `/buy|${token.address}`,
            a: 5,
          }),
        },
        {
          text: '🟢Buy X SOL',
          callback_data: JSON.stringify({
            c: `/buy|${token.address}`,
            a: 0,
          }),
        },
      ],
      [
        {
          text: 'setting',
          callback_data: JSON.stringify({
            command: '/settings',
            language: 'english',
          }),
        },
      ],
    ],
  };
};
