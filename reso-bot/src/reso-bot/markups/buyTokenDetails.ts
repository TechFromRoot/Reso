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

// const formatTime = (seconds) => {
//   const days = Math.floor(seconds / (24 * 60 * 60));
//   const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
//   const minutes = Math.floor((seconds % (60 * 60)) / 60);
//   const secs = seconds % 60;

//   let timeString = '';

//   if (days > 0) {
//     timeString += `${days}D `;
//   }

//   if (hours > 0) {
//     timeString += `${hours}h `;
//   }

//   if (minutes > 0) {
//     timeString += `${minutes}m `;
//   }

//   if (secs > 0 || (days === 0 && hours === 0 && minutes === 0)) {
//     timeString += `${secs}s`;
//   }

//   return timeString.trim();
// };

export const buyTokenMarkup = async (
  token: Token,
  price: string,
  poolDetails: any,
) => {
  return {
    message: `<a href="${process.env.SONIC_SCAN_URL}address/${token.address}">${token.symbol} | ${token.name}</a>\n<code>${token.address}</code>\n\n🔄 Dex: SEGA / WhiteList ✅\n✅Liquidity: ${formatNumber(poolDetails.liquidity)}\n\nPrice: $${price || 0}\n\nTo buy press one of the buttons below.`,
    keyboard: [
      [
        {
          text: 'close ❌',
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
          text: 'setting',
          callback_data: JSON.stringify({
            command: '/swapConfig',
            language: 'english',
          }),
        },
      ],
    ],
  };
};
