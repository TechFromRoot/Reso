export const settingsMarkup = async (
  buySlippage: string,
  sellSlippage: string,
) => {
  return {
    message: `<b>Settings</b>:\n\n<b>SLIPPAGE CONFIG</b>\nCustomize your slippage settings for buys and sells. Tap to edit. `,
    keyboard: [
      [
        {
          text: '--- SLIPPAGE CONFIG ---',
          callback_data: JSON.stringify({
            command: '/refresh',
            language: 'english',
          }),
        },
      ],
      [
        {
          text: `✎ Buy: ${buySlippage}%`,
          callback_data: JSON.stringify({
            command: '/buySlippage',
            language: 'english',
          }),
        },
        {
          text: `✎ Sell: ${sellSlippage}%`,
          callback_data: JSON.stringify({
            command: '/sellSlippage',
            language: 'english',
          }),
        },
      ],
      [
        {
          text: 'Close ❌',
          callback_data: JSON.stringify({
            command: '/close',
            language: 'english',
          }),
        },
      ],
    ],
  };
};
