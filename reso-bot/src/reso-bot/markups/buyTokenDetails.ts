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
    return num.toFixed(4); // Return the number as is if it's less than 1,000
  }
};

const formatPoolDetails = (
  pools: { liquidity: number; createdAt: string; source: string }[],
) => {
  return pools
    .map(
      (pool) =>
        `🔄 Dex: ${pool.source} | Liquidity: $${formatNumber(pool.liquidity)}`,
    )
    .join('\n');
};

export const buyTokenMarkup = async (
  token: Token,
  price: string,
  poolDetails: { liquidity: number; createdAt: string; source: string }[],
) => {
  return {
    message: `<a href="${process.env.SONIC_SCAN_URL}address/${token.address}">${token.symbol} | ${token.name}</a>\n<code>${token.address}</code>\n\n${formatPoolDetails(poolDetails)}\n\nPrice: $${price || 0}\n\nTo buy, press one of the buttons below.`,
    keyboard: [
      [
        {
          text: 'Close ❌',
          callback_data: JSON.stringify({
            command: '/close',
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
          text: 'Refresh',
          callback_data: JSON.stringify({
            command: '/refresh',
            language: 'english',
          }),
        },
      ],
      [
        {
          text: '🟢Buy 0.1 SOL',
          callback_data: JSON.stringify({
            c: `/buy|${token.address}`,
            a: 0.1,
          }),
        },
        {
          text: '🟢Buy 0.5 SOL',
          callback_data: JSON.stringify({
            c: `/buy|${token.address}`,
            a: 0.5,
          }),
        },
        {
          text: '🟢Buy 1 SOL',
          callback_data: JSON.stringify({
            c: `/buy|${token.address}`,
            a: 1,
          }),
        },
      ],
      [
        {
          text: '🟢Buy 3 SOL',
          callback_data: JSON.stringify({
            c: `/buy|${token.address}`,
            a: 3,
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
          text: '🟢Buy x SOL',
          callback_data: JSON.stringify({
            c: `/buy|${token.address}`,
            a: 0,
          }),
        },
      ],
      [
        {
          text: 'Setting',
          callback_data: JSON.stringify({
            command: '/settings',
            language: 'english',
          }),
        },
      ],
    ],
  };
};
