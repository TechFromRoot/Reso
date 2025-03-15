export const showBalanceMarkup = async (tokens: any) => {
  let message = `\u2003\u2003\u2003\u2003\u2003\u2003\u2003<b>Wallet Balance</b>\n\n`;

  for (const token of tokens) {
    message += `➤ ${token.balance} <b>${token.name}</b> (${token.network})\n`;
  }

  return {
    message,
    keyboard: [
      [
        {
          text: 'Fund wallet 💵',
          callback_data: JSON.stringify({
            command: '/fundWallet',
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
    ],
  };
};
