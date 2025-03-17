export const allFeaturesMarkup = async () => {
  return {
    message: `Please Select any action below 👇\u2003\u2003\u2003\u2003\u2003\u2003\u2003\u2003\u2003\u2003 : `,
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
          text: '💱 create a Token',
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
            command: '/manageAsset',
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
