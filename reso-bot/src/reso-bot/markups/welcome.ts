export const welcomeMessageMarkup = async (userName: string) => {
  return {
    message: `Hello @${userName} 👋\n\nWelcome to <b>RESObot</b> –> your fastest and most secure companion for trading tokens on Sonic SVM! 🚀 Get ready to trade smarter and faster with us!\n\n-Buy a token with just the token address`,

    keyboard: [
      [
        {
          text: 'Lets get started 🚀',
          callback_data: JSON.stringify({
            command: '/menu',
            language: 'english',
          }),
        },
      ],
    ],
  };
};
