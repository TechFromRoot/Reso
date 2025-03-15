export const walletDetailsMarkup = async (
  evmAddress?: string,
  solanaAddress?: string,
) => {
  console.log(evmAddress);
  const keyboard: any[] = [];

  if (evmAddress) {
    keyboard.push(
      [
        {
          text: '🔎 View on etherscan',
          url: `${process.env.ETHERSCAN_URL}/address/${evmAddress}`,
        },
      ],
      [
        {
          text: '🔎 View on basescan',
          url: `${process.env.BASESCAN_URL}/address/${evmAddress}`,
        },
      ],
      [
        {
          text: '🔎 View on arbiscan',
          url: `${process.env.ABI_SCAN_URL}/address/${evmAddress}`,
        },
      ],
      [
        {
          text: '🔎 View on OP scan',
          url: `${process.env.OP_SCAN_URL}/address/${evmAddress}`,
        },
      ],
      [
        {
          text: '🔎 View on polygonscan',
          url: `${process.env.POLY_SCAN_URL}/address/${evmAddress}`,
        },
      ],
      [
        {
          text: '🔎 View on avalanche snowscan',
          url: `${process.env.SNOW_SCAN_URL}/address/${evmAddress}`,
        },
      ],
    );
  }

  if (solanaAddress) {
    keyboard.push([
      {
        text: '🔎 View on solscan',
        url: `${process.env.SOLSCAN_URL}/address/${solanaAddress}`,
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
  console.log(keyboard);
  return {
    message: `\u2003\u2003\u2003\u2003\u2003\u2003\u2003<b>Your Wallet</b>\n\n${
      evmAddress ? `<b>EVM Address:</b> <code>${evmAddress}</code>\n\n` : ''
    }${solanaAddress ? `<b>Solana Address:</b> <code>${solanaAddress}</code>\n` : ''}\nTap to copy the address and send tokens to deposit.`,
    keyboard,
  };
};
