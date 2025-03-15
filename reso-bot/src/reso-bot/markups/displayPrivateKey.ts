export const displayPrivateKeyMarkup = async (
  privateKeyEVM?: string,
  privateKeySolana?: string,
) => {
  let message = 'Your Private Key is:\n\n';

  if (privateKeyEVM) {
    message += `<code>${privateKeyEVM}</code> (EVM Wallet)\n\n`;
    message += '👉 Import into MetaMask, Coinbase Wallet, etc.\n\n';
  }

  if (privateKeySolana) {
    message += `<code>${privateKeySolana}</code> (Solana Wallet)\n\n`;
    message += '👉 Import into Phantom, Solflare, etc.\n\n';
  }

  if (!privateKeyEVM && !privateKeySolana) {
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
