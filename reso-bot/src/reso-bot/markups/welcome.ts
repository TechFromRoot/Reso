export const welcomeMessageMarkup = async (userName: string) => {
  return {
    message: `Hello @${userName} 👋\n\nWelcome to <b>RESObot</b> –> your fastest and most secure companion for trading tokens on Sonic SVM! 🚀 Get ready to trade smarter and faster with us!\n\n-Buy a token with just the token address`,

    keyboard: [
      [
        {
          text: '💳 Wallet',
          callback_data: JSON.stringify({
            command: '/walletFeatures',
            language: 'english',
          }),
        },
        {
          text: '💱 Trade Tokens',
          callback_data: JSON.stringify({
            command: '/tradeTokens',
            language: 'english',
          }),
        },
      ],
      [
        {
          text: 'Buy',
          callback_data: JSON.stringify({
            command: '/buyToken',
            language: 'english',
          }),
        },
      ],
      [
        {
          text: '🔔 Price Alerts',
          callback_data: JSON.stringify({
            command: '/priceAlerts',
            language: 'english',
          }),
        },
        {
          text: '📜 Transaction History',
          callback_data: JSON.stringify({
            command: '/transactionHistory',
            language: 'english',
          }),
        },
      ],
      [
        {
          text: '⚙️ Settings',
          callback_data: JSON.stringify({
            command: '/settings',
            language: 'english',
          }),
        },
        {
          text: '📢 Share',
          language: 'english',
          switch_inline_query:
            'RESObot, the ultimate trading bot for Sonic SVM!',
        },
      ],
      [
        {
          text: '❓ Help & Support',
          url: `https://t.me/+uvluoEnCbiU5YTBk`,
        },
      ],
    ],
  };
};
