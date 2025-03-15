export const welcomeMessageMarkup = async (userName: string) => {
  console.log(userName);
  return {
    message: `Hi @${userName} 👋, Welcome to <b>AegisX</b> \n\nSecure, Intelligent Cross-Chain Solutions Agent, here is what I can do: 👇\n- Agentic auto cross chain swaps\n- Portfolio Rebalancing\n- AI-Driven Market & sentiment Analysis\n- Automatic Swapping(automatically execute trades to rebalance your portfolio)`,

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
