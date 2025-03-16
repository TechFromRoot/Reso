export const displayPrivateKeyMarkup = async (privateKeySVM?: string) => {
  let message = 'Your Private Key is:\n\n';

  if (privateKeySVM) {
    message += `<code>${privateKeySVM}</code>\n\n`;
    message += '👉 Import into backpack, Phantom, Solflare, etc.\n\n';
  }

  if (!privateKeySVM) {
    message = 'No private key available.';
  } else {
    message +=
      '⚠️ This message will auto-delete in 1 minute. If not, please delete it after use.';
  }

  return {
    message,
    keyboard: [
      [
        {
          text: 'Delete 🗑️',
          callback_data: JSON.stringify({
            command: '/close',
            language: 'english',
          }),
        },
      ],
    ],
  };
};
