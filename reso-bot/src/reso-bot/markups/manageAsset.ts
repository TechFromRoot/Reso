import * as dotenv from 'dotenv';
dotenv.config();
export const manageAssetMarkup = async (tokens: any, solBalance) => {
  let message = `<b>Assets:</b>\n\nBalance: ${solBalance} SOL\n\n`;

  for (const token of tokens) {
    if (token.name === 'SOL') continue; // Skip SOL token
    message += `➤ <a href="${process.env.BOT_URL}?start=position_${token.address}">/ ${token.name}</a>\nValue: ${token.balance} <b>${token.name}</b>\n\n`;
  }

  return {
    message,
    keyboard: [
      [
        {
          text: 'home',
          callback_data: JSON.stringify({
            command: '/menu',
            language: 'english',
          }),
        },
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
