import { UserDocument } from 'src/database/schemas/user.schema';

export const allFeaturesMarkup = async (user: UserDocument) => {
  return {
    message: `Please Select any action below 👇`,
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
          text: '📊 Portfolio Overview',
          callback_data: JSON.stringify({
            command: '/portfolioOverview',
            language: 'english',
          }),
        },
      ],
      // [
      //   {
      //     text: `${user.enableAgenticAutoSwap ? `⇄ Agentic Auto bridge mode Enabled` : '⇌  Agentic Auto bridge mode Disabled'}`,
      //     callback_data: JSON.stringify({
      //       command: '/disableAgenticSwap',
      //       language: 'english',
      //     }),
      //   },
      // ],
      [
        {
          text: `${user.rebalanceEnabled ? `✅ Auto Rebalancing mode Enabled` : '🔄 Enable Auto Rebalancing agent mode'}`,
          callback_data: JSON.stringify({
            command: '/enableRebalance',
            language: 'english',
          }),
        },
      ],
      [
        {
          text: '🎯 Set Target Allocation',
          callback_data: JSON.stringify({
            command: '/setTargetAllocation',
            language: 'english',
          }),
        },
        {
          text: '	🔼 Set Threshold',
          callback_data: JSON.stringify({
            command: '/setThreshold',
            language: 'english',
          }),
        },
      ],
      [
        {
          text: '📈 Token Insights',
          callback_data: JSON.stringify({
            command: '/tokenInsight',
            language: 'english',
          }),
        },
      ],
      [
        {
          text: '📢 Share',
          language: 'english',
          switch_inline_query:
            'Rebalancr, portfolio management has never been easier!.',
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
