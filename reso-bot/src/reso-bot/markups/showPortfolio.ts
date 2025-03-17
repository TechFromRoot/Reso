export const showPortfolioMarkup = async (userPortfolio) => {
  // Create portfolio message by mapping through tokens
  const portfolioMessage = userPortfolio
    .filter((token) => token.value !== 0)
    .map((token) => {
      return (
        `<b>➤ ${token.name}</b>(${token.network})\n` +
        `- Balance: ${token.balance} ${token.name}\n` +
        `- Value: ${token.value} $\n` +
        `- Price: ${token.price}\n`
      );
    })
    .join('\n');

  return {
    message: `<b>Your Portfolio:</b>\n\n${portfolioMessage}`,
    keyboard: [
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
