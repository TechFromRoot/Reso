export const welcomeMessageMarkup = async (userName: string) => {
  return {
    message: `Hello @${userName} 👋\n\nWelcome to <b>RESObot</b> \nYour fastest ⚡️ and most secure companion for trading tokens on Sonic SVM! 🚀 \nGet ready to trade smarter and faster with us!\n\n👉🏻 <b>Start To Use</b>:\n- Create or import a wallet.\n- Transfer Sol to wallet\n- Buy a token with just the token address\n\n🚨 Notice 🚨\nSonic SVM Chain is still in its early stages. \nAs a result, liquidity and the variety of tokens available for trading are currently limited. \nWe’re growing fast, and more tokens and liquidity will be available soon!\nThank you for your understanding and early support! 🚀✨ `,

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
          text: '💱 Create Token',
          callback_data: JSON.stringify({
            command: '/createToken',
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
        {
          text: '💰 Assets',
          callback_data: JSON.stringify({
            command: '/checkBalance',
            language: 'english',
          }),
        },
      ],
      [
        // {
        //   text: '🔔 Price Alerts',
        //   callback_data: JSON.stringify({
        //     command: '/priceAlerts',
        //     language: 'english',
        //   }),
        // },
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
