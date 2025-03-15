export const exportWalletWarningMarkup = async () => {
  return {
    message: `Are you sure you want to export your Private Key?\n\n‼️ <b>WARNING: EXPORTING YOUR WALLET PRIVATE KEY</b> ‼️\n\nYour private key is a highly sensitive piece of information. <b>Anyone with access to your private key can fully control your wallet and all associated funds</b>.\n• Do not share your private key with anyone.\n• Avoid storing it in unsafe places like public files, unsecured apps, or shared devices.\n•Ensure your private key is stored securely, such as in a hardware wallet or encrypted storage.\n\nAlways handle your private key with extreme caution!`,
    keyboard: [
      [
        {
          text: 'I will Not Share My Private Key, Confirm',
          callback_data: JSON.stringify({
            command: '/confirmExportWallet',
            language: 'english',
          }),
        },
      ],
      [
        {
          text: 'Cancel ❌',
          callback_data: JSON.stringify({
            command: '/closeDelete',
            language: 'english',
          }),
        },
      ],
    ],
  };
};
