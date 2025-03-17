export const resetWalletWarningMarkup = async () => {
  return {
    message: `Are you sure you want to reset your Wallet?\n\n<b>🚨 WARNING: This action is irreversible!</b>\nyour wallet will be deleted from the platform, if there are funds in it, it is adviced you export the wallet before resetting`,
    keyboard: [
      [
        {
          text: 'Confirm',
          callback_data: JSON.stringify({
            command: '/confirmReset',
            language: 'english',
          }),
        },
        {
          text: 'Cancel ❌',
          callback_data: JSON.stringify({
            command: '/close',
            language: 'english',
          }),
        },
      ],
    ],
  };
};
