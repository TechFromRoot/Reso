export const walletDetailsMarkup = async (
  svmAddress?: string,
  balance?: any,
) => {
  const keyboard: any[] = [];

  if (svmAddress) {
    keyboard.push([
      {
        text: '🔎 View on sonic explorer',
        url: `${process.env.SONIC_SCAN_URL}/address/${svmAddress}`,
      },
    ]);
  }

  keyboard.push(
    [
      {
        text: 'Export wallet',
        callback_data: JSON.stringify({
          command: '/exportWallet',
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
        text: 'Close ❌',
        callback_data: JSON.stringify({
          command: '/close',
          language: 'english',
        }),
      },
    ],
  );
  return {
    message: `<b>Your Wallet</b>\n\n
  ${svmAddress ? `<b>Address:</b> <code>${svmAddress}</code>\n  Balance: ${balance} SOL` : ''}\nTap to copy the address and send tokens to deposit.`,
    keyboard,
  };
};
