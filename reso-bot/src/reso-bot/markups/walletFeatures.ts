import { UserDocument } from 'src/database/schemas/user.schema';

export const walletFeaturesMarkup = async (user: UserDocument) => {
  return {
    message: `Choose an action below to manage your wallet 👇`,
    keyboard: [
      [
        {
          text: `${user.svmWalletAddress ? 'View Wallet 💳' : 'Create wallet 💳'}`,
          callback_data: JSON.stringify({
            command: '/createWallet',
            language: 'english',
          }),
        },
        {
          text: 'Import wallet 🔗',
          callback_data: JSON.stringify({
            command: '/linkWallet',
            language: 'english',
          }),
        },
      ],
      [
        {
          text: 'Fund wallet 💵',
          callback_data: JSON.stringify({
            command: '/fundWallet',
            language: 'english',
          }),
        },
        {
          text: 'Reset wallet',
          callback_data: JSON.stringify({
            command: '/resetWallet',
            language: 'english',
          }),
        },
      ],
      [
        {
          text: 'Export wallet',
          callback_data: JSON.stringify({
            command: '/exportWallet',
            language: 'english',
          }),
        },
        {
          text: 'check Balance',
          callback_data: JSON.stringify({
            command: '/checkBalance',
            language: 'english',
          }),
        },
      ],
      [
        {
          text: 'close ❌',
          callback_data: JSON.stringify({
            command: '/close',
            language: 'english',
          }),
        },
      ],
    ],
  };
};
