import { Injectable, Logger } from '@nestjs/common';
import * as TelegramBot from 'node-telegram-bot-api';
import { HttpService } from '@nestjs/axios';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from '../database/schemas/user.schema';
import {
  buyTokenMarkup,
  allFeaturesMarkup,
  displayPrivateKeyMarkup,
  exportWalletWarningMarkup,
  resetWalletWarningMarkup,
  showBalanceMarkup,
  walletDetailsMarkup,
  walletFeaturesMarkup,
  welcomeMessageMarkup,
  transactionHistoryMarkup,
  manageAssetMarkup,
  sellTokenMarkup,
} from './markups';
import { WalletService } from 'src/wallet/wallet.service';
import { Session, SessionDocument } from 'src/database/schemas/session.schema';
import { ResoAgentService } from 'src/reso-agent/reso-agent.service';
import { Transaction } from 'src/database/schemas/transaction.schema';

const token = process.env.TELEGRAM_TOKEN;
interface Token {
  address: string;
  programId: string;
  symbol: string;
  name: string;
  decimals: number;
}

@Injectable()
export class ResoBotService {
  private readonly resoBot: TelegramBot;
  private logger = new Logger(ResoBotService.name);

  constructor(
    private readonly resoDefiAgent: ResoAgentService,
    private readonly walletService: WalletService,
    private readonly httpService: HttpService,
    @InjectModel(User.name) private readonly UserModel: Model<User>,
    @InjectModel(Session.name) private readonly SessionModel: Model<Session>,
    @InjectModel(Transaction.name)
    private readonly TransactionModel: Model<Transaction>,
  ) {
    this.resoBot = new TelegramBot(token, { polling: true });
    this.resoBot.on('message', this.handleRecievedMessages);
    this.resoBot.on('callback_query', this.handleButtonCommands);
  }

  handleRecievedMessages = async (msg: any) => {
    this.logger.debug(msg);
    try {
      await this.resoBot.sendChatAction(msg.chat.id, 'typing');

      const [user, session] = await Promise.all([
        this.UserModel.findOne({ chatId: msg.chat.id }),
        this.SessionModel.findOne({ chatId: msg.chat.id }),
      ]);

      const regex2 = /^0x[a-fA-F0-9]{40}$/;
      const regex = /^Swap (?:also )?(\d+\.?\d*) (\w+) (?:to|for) (\w+)$/i;
      const regexAmount = /^\d+(\.\d+)?$/;
      const tokenCreationRegex =
        /create a token with name\s+"([^"]+)",\s+symbol\s+"([^"]+)",\s+uri\s+"([^"]+)"\s*,decimal\s+"(\d+)",\s+initialSupply of (\d+)/;
      const matchCreateToken = msg.text.trim().match(tokenCreationRegex);
      const regexPosition = /\/start\s+position_([a-zA-Z0-9]{43,})/;
      const matchPosition = msg.text.trim().match(regexPosition);
      const swapRegex = /\b(swap)\b/i;
      const match = msg.text.trim().match(regex);
      const match2 = msg.text.trim().match(regex2);
      if (matchPosition) {
        await this.resoBot.deleteMessage(msg.chat.id, msg.message_id);
        const supportedTokens = await this.fetchSupportedTokenList();
        if (supportedTokens) {
          const foundToken = supportedTokens.find(
            (token) =>
              token.address.toLowerCase() === matchPosition[1].toLowerCase(),
          );
          if (foundToken) {
            console.log('Found token:', foundToken);
            const price: any = await this.fetchSupportedTokenPrice(
              foundToken.address,
            );
            const { balance: tokenBalance } =
              await this.walletService.getToken2022Balance(
                user.svmWalletAddress,
                matchPosition[1],
                process.env.SONIC_RPC,
                foundToken.decimals,
                foundToken.programId,
              );
            const { balance: solBalance } =
              await this.walletService.getSolBalance(
                user.svmWalletAddress,
                process.env.SONIC_RPC,
              );
            const pools = await this.fetchPoolInfos(foundToken.address);
            let poolDetails;
            if (pools.length > 0) {
              poolDetails = {
                liquidity: pools[0].tvl,
                createdAt: pools[0].openTime,
              };
            } else {
              poolDetails = {
                liquidity: 0,
                createdAt: '',
              };
            }

            const buyToken = await sellTokenMarkup(
              foundToken,
              price,
              poolDetails,
              tokenBalance,
              solBalance,
            );
            const replyMarkup = { inline_keyboard: buyToken.keyboard };
            await this.resoBot.sendMessage(msg.chat.id, buyToken.message, {
              reply_markup: replyMarkup,
              parse_mode: 'HTML',
            });
            return;
          } else {
            await this.resoBot.sendChatAction(msg.chat.id, 'typing');
            return await this.resoBot.sendMessage(
              msg.chat.id,
              'Token not found/ supported',
            );
          }
        }
        console.log('contract address :', matchPosition[1]);
      }
      if (
        (swapRegex.test(msg.text.trim()) ||
          match ||
          match2 ||
          matchCreateToken) &&
        !session
      ) {
        console.log(msg.text.trim());
        return this.handleAgentprompts(user, msg.text.trim());
      }
      if (regexAmount.test(msg.text.trim()) && session.tokenAmount) {
        // Handle text inputs if not a command
        return this.handleUserTextInputs(msg, session!);
      }
      if (regexAmount.test(msg.text.trim()) && session.sellAmount) {
        // Handle text inputs if not a command
        return this.handleUserTextInputs(msg, session!);
      }
      if (
        msg.text !== '/start' &&
        msg.text !== '/menu' &&
        msg.text !== '/balance' &&
        session
      ) {
        // Handle text inputs if not a command
        return this.handleUserTextInputs(msg, session!);
      } else if (
        msg.text !== '/start' &&
        msg.text !== '/menu' &&
        msg.text !== '/balance' &&
        !session
      ) {
        return this.handleAgentprompts(user, msg.text.trim());
      }
      const command = msg.text!;
      console.log('Command :', command);

      if (command === '/start') {
        console.log('User   ', user);
        const username = msg.from.username;
        if (!user) {
          let uniquecode: string;
          let codeExist: any;
          //loop through to make sure the code does not alread exist
          do {
            uniquecode = await this.generateUniqueAlphanumeric();
            codeExist = await this.UserModel.findOne({
              linkCode: uniquecode,
            });
          } while (codeExist);
          await this.UserModel.create({
            chatId: msg.chat.id,
            userName: username,
            linkCode: uniquecode,
          });
        }

        const welcome = await welcomeMessageMarkup(username);
        if (welcome) {
          const replyMarkup = { inline_keyboard: welcome.keyboard };
          await this.resoBot.sendMessage(msg.chat.id, welcome.message, {
            reply_markup: replyMarkup,
            parse_mode: 'HTML',
          });
        }
        return;
      }

      // Handle /menu command
      if (command === '/menu') {
        const allFeatures = await allFeaturesMarkup();
        if (allFeatures) {
          const replyMarkup = { inline_keyboard: allFeatures.keyboard };
          await this.resoBot.sendMessage(msg.chat.id, allFeatures.message, {
            parse_mode: 'HTML',
            reply_markup: replyMarkup,
          });
        }
      }
      if (command === '/balance') {
        // await this.showBalance(msg.chat.id);
      }
    } catch (error) {
      console.error(error);
    }
  };

  //handler for users inputs
  handleUserTextInputs = async (
    msg: TelegramBot.Message,
    session?: SessionDocument,
    // user?: UserDocument,
  ) => {
    await this.resoBot.sendChatAction(msg.chat.id, 'typing');
    try {
      const regexAmount = /^\d+(\.\d+)?$/;
      //   const regex2 = /^0x[a-fA-F0-9]{40}$/;
      //   const regex = /^Swap (?:also )?(\d+\.?\d*) (\w+) (?:to|for) (\w+)$/i;
      const swapRegex = /\b(swap)\b/i;
      //   const match = msg.text.trim().match(regex);
      //   const match2 = msg.text.trim().match(regex2);
      const tokenCreationRegex =
        /create a token with name\s+"([^"]+)",\s+symbol\s+"([^"]+)",\s+uri\s+"([^"]+)"\s*,decimal\s+"(\d+)",\s+initialSupply of (\d+)/;
      const matchCreateToken = msg.text.trim().match(tokenCreationRegex);
      console.log(msg.text.trim());
      const isTokenAddress = await this.isTokenAddress(msg.text!.trim());

      // detects when a user sends a token address
      if (isTokenAddress.isValid) {
        const supportedTokens = await this.fetchSupportedTokenList();
        if (supportedTokens) {
          const foundToken = supportedTokens.find(
            (token) =>
              token.address.toLowerCase() === msg.text!.trim().toLowerCase(),
          );
          if (foundToken) {
            console.log('Found token:', foundToken);
            const price: any = await this.fetchSupportedTokenPrice(
              foundToken.address,
            );

            const pools = await this.fetchPoolInfos(foundToken.address);
            let poolDetails;
            if (pools.length > 0) {
              poolDetails = {
                liquidity: pools[0].tvl,
                createdAt: pools[0].openTime,
              };
            } else {
              poolDetails = {
                liquidity: 0,
                createdAt: '',
              };
            }

            const buyToken = await buyTokenMarkup(
              foundToken,
              price,
              poolDetails,
            );
            const replyMarkup = { inline_keyboard: buyToken.keyboard };
            await this.resoBot.sendMessage(msg.chat.id, buyToken.message, {
              reply_markup: replyMarkup,
              parse_mode: 'HTML',
            });
            return;
          } else {
            await this.resoBot.sendChatAction(msg.chat.id, 'typing');
            return await this.resoBot.sendMessage(
              msg.chat.id,
              'Token not found/ supported',
            );
          }
        }
      }
      if (regexAmount.test(msg.text.trim()) && session.tokenAmount) {
        //TODO: CALL SWAP FUNCTION HERE
        const user = await this.UserModel.findOne({ chatId: msg.chat.id });
        const encryptedSVMWallet = await this.walletService.decryptSVMWallet(
          `${process.env.DEFAULT_WALLET_PIN}`,
          user.svmWalletDetails,
        );
        if (encryptedSVMWallet.privateKey) {
          const swapHash = await this.resoDefiAgent.botBuyToken(
            encryptedSVMWallet.privateKey,
            session.tokenAmountAddress,
            msg.text.trim(),
            msg.chat.id,
          );
          if (swapHash) {
            return await this.resoBot.sendMessage(msg.chat.id, swapHash);
          }
          return await this.resoBot.sendMessage(
            msg.chat.id,
            'Transaction error, please Try again',
          );
        }
      }
      if (regexAmount.test(msg.text.trim()) && session.sellAmount) {
        //TODO: CALL sell SWAP FUNCTION HERE
        const user = await this.UserModel.findOne({
          chatId: msg.chat.id,
        });
        const encryptedSVMWallet = await this.walletService.decryptSVMWallet(
          `${process.env.DEFAULT_WALLET_PIN}`,
          user.svmWalletDetails,
        );
        if (encryptedSVMWallet.privateKey) {
          const swapHash = await this.resoDefiAgent.botSellToken(
            encryptedSVMWallet.privateKey,
            session.tokenAmountAddress,
            msg.text.trim(),
            msg.chat.id,
          );
          if (swapHash) {
            return await this.resoBot.sendMessage(msg.chat.id, swapHash);
          }
          return await this.resoBot.sendMessage(
            msg.chat.id,
            'Transaction error, please Try again',
          );
        }
      }
      if (matchCreateToken && session.createToken) {
        //TODO: CALL create token
        const user = await this.UserModel.findOne({
          chatId: msg.chat.id,
        });
        const encryptedSVMWallet = await this.walletService.decryptSVMWallet(
          `${process.env.DEFAULT_WALLET_PIN}`,
          user.svmWalletDetails,
        );
        if (encryptedSVMWallet.privateKey) {
          const tokenAddress = await this.resoDefiAgent.createToken(
            encryptedSVMWallet.privateKey,
            matchCreateToken[1],
            matchCreateToken[3],
            matchCreateToken[2],
            parseFloat(matchCreateToken[4]),
            parseFloat(matchCreateToken[5]),
            msg.chat.id,
          );
          if (tokenAddress) {
            return await this.resoBot.sendMessage(
              msg.chat.id,
              `mint address:\n<code>${tokenAddress}</code>`,
              { parse_mode: 'HTML' },
            );
          }
          return await this.resoBot.sendMessage(
            msg.chat.id,
            'Transaction error, please Try again',
          );
        }
      }

      if (swapRegex.test(msg.text.trim())) {
        const user = await this.UserModel.findOne({ chatId: msg.chat.id });
        await this.resoBot.sendChatAction(user.chatId, 'typing');
        const encryptedSVMWallet = await this.walletService.decryptSVMWallet(
          `${process.env.DEFAULT_WALLET_PIN}`,
          user.svmWalletDetails,
        );

        if (encryptedSVMWallet.privateKey) {
          //TODO: CALL SWAP FUNCTION HERE
          const swapHash = await this.resoDefiAgent.swapToken(
            encryptedSVMWallet.privateKey,
            msg.text.trim(),
            msg.chat.id,
          );
          if (swapHash) {
            return await this.resoBot.sendMessage(msg.chat.id, swapHash);
          }
          return await this.resoBot.sendMessage(
            msg.chat.id,
            'Transaction error, please Try again',
          );
        }
      }

      if (session.allocationSetting) {
        const Allocation = await this.validateAllocations(
          msg.text!.trim(),
          msg.chat.id,
        );

        console.log(Allocation);
        if (Allocation) {
          await this.UserModel.updateOne(
            { chatId: msg.chat.id },
            { $set: { targetAllocations: Allocation } },
            { upsert: true },
          );
        }

        // Convert to string (comma-separated)
        const allocationString = Object.entries(Allocation)
          .map(([key, value]) => `${key}: ${value}`)
          .join(', ');
        await this.SessionModel.deleteMany({ chatId: msg.chat.id });
        await this.resoBot.sendMessage(
          msg.chat.id,
          `Allocation succesfully set\n-${allocationString}`,
        );
      }

      if (session.thresholdSetting) {
        const threshold = await this.validateThresholds(
          msg.text!.trim(),
          msg.chat.id,
        );
        if (threshold.upperThreshold && threshold.lowerThreshold) {
          await this.UserModel.updateOne(
            { chatId: msg.chat.id },
            {
              upperThreshold: threshold.upperThreshold,
              lowerThreshold: threshold.lowerThreshold,
            },
          );
        }
        await this.SessionModel.deleteMany({ chatId: msg.chat.id });
        await this.resoBot.sendMessage(
          msg.chat.id,
          `Threshold succesfully set\n- Upper :${threshold.upperThreshold}%\n- Lower : ${threshold.lowerThreshold} %`,
        );
      }

      if (session) {
        // update users answerId
        await this.SessionModel.updateOne(
          { _id: session._id },
          { $push: { userInputId: msg.message_id } },
        );
      }

      // parse incoming message and handle commands
      try {
        //handle import wallet private key
        if (
          session &&
          session.importWallet &&
          session.importWalletPromptInput
        ) {
          await this.resoBot.sendChatAction(msg.chat.id, 'typing');
          const IsValid = await this.isPrivateKey(
            msg.text!.trim(),
            msg.chat.id,
          );
          if (IsValid.isValid) {
            const privateKey = msg.text!.trim();
            console.log(privateKey);
            if (IsValid.walletType === 'solana') {
              const importedWallet =
                this.walletService.getSVMAddressFromPrivateKey(`${privateKey}`);
              console.log(importedWallet);

              // encrypt wallet details with  default
              const encryptedWalletDetails =
                await this.walletService.encryptSVMWallet(
                  process.env.DEFAULT_WALLET_PIN!,
                  privateKey,
                );

              const updatedUser = await this.UserModel.findOneAndUpdate(
                { chatId: msg.chat.id },
                {
                  svmWalletDetails: encryptedWalletDetails.json,
                  svmWalletAddress: importedWallet.address,
                },
                { new: true }, // This ensures the updated document is returned
              );

              const promises: any[] = [];
              const latestSession = await this.SessionModel.findOne({
                chatId: msg.chat.id,
              });
              // loop through  import privateKey prompt to delete them
              for (
                let i = 0;
                i < latestSession!.importWalletPromptInputId.length;
                i++
              ) {
                promises.push(
                  await this.resoBot.deleteMessage(
                    msg.chat.id,
                    latestSession!.importWalletPromptInputId[i],
                  ),
                );
              }
              // loop through to delete all userReply
              for (let i = 0; i < latestSession!.userInputId.length; i++) {
                promises.push(
                  await this.resoBot.deleteMessage(
                    msg.chat.id,
                    latestSession!.userInputId[i],
                  ),
                );
              }

              await this.sendWalletDetails(msg.chat.id, updatedUser);
            }
          }
          return;
        }
      } catch (error) {
        console.error(error);

        return await this.resoBot.sendMessage(
          msg.chat.id,
          `Processing command failed, please try again`,
        );
      }
    } catch (error) {
      console.log(error);
    }
  };

  //handler for users inputs
  handleAgentprompts = async (user: UserDocument, msg: string) => {
    console.log('here');
    console.log(msg);
    await this.resoBot.sendChatAction(user.chatId, 'typing');
    try {
      const regex2 = /^0x[a-fA-F0-9]{64}$/;
      const regex = /^Swap (?:also )?(\d+\.?\d*) (\w+) (?:to|for) (\w+)$/i;
      const swapRegex = /\b(swap)\b/i;
      const match = msg.trim().match(regex);
      const match2 = msg.trim().match(regex2);
      const isTokenAddress = await this.isTokenAddress(msg.trim());

      console.log(isTokenAddress);
      // detects when a user sends a token address
      if (isTokenAddress.isValid) {
        const supportedTokens = await this.fetchSupportedTokenList();
        if (supportedTokens) {
          const foundToken = supportedTokens.find(
            (token) => token.address.toLowerCase() === msg.trim().toLowerCase(),
          );
          if (foundToken) {
            console.log('Found token:', foundToken);
            const price: any = await this.fetchSupportedTokenPrice(
              foundToken.address,
            );

            const pools = await this.fetchPoolInfos(foundToken.address);
            let poolDetails;
            if (pools.length > 0) {
              poolDetails = {
                liquidity: pools[0].tvl,
                createdAt: pools[0].openTime,
              };
            } else {
              poolDetails = {
                liquidity: 0,
                createdAt: '',
              };
            }

            const buyToken = await buyTokenMarkup(
              foundToken,
              price,
              poolDetails,
            );
            const replyMarkup = { inline_keyboard: buyToken.keyboard };
            await this.resoBot.sendMessage(user.chatId, buyToken.message, {
              reply_markup: replyMarkup,
              parse_mode: 'HTML',
            });
            return;
          } else {
            await this.resoBot.sendChatAction(user.chatId, 'typing');
            return await this.resoBot.sendMessage(
              user.chatId,
              'Token not found/ supported',
            );
          }
        }
      }
      if (swapRegex.test(msg.trim())) {
        await this.resoBot.sendChatAction(user.chatId, 'typing');

        const encryptedSolanaWallet = await this.walletService.decryptSVMWallet(
          `${process.env.DEFAULT_WALLET_PIN}`,
          user.svmWalletDetails,
        );

        if (encryptedSolanaWallet.privateKey) {
          //TODO: CALL SWAP TOKEN HERE
          const swapHash = await this.resoDefiAgent.swapToken(
            encryptedSolanaWallet.privateKey,
            msg.trim(),
            user.chatId,
          );
          if (swapHash) {
            return await this.resoBot.sendMessage(user.chatId, swapHash);
          }
          return await this.resoBot.sendMessage(
            user.chatId,
            'Transaction error, please Try again',
          );
        }
      } else if (!match2 && !match) {
        // TODO: ADD AGENTIC CHAT HERE
        const response = { response: 'here' };
        // await this.aegisAgentService.agentChat(msg);
        if (response.response) {
          return await this.resoBot.sendMessage(
            user.chatId,
            response.response,
            {
              parse_mode: 'Markdown',
            },
          );
        }
        return;
      }
    } catch (error) {
      console.log(error);
    }
  };

  handleButtonCommands = async (query: any) => {
    this.logger.debug(query);
    let command: string;
    let buy_addressCommand: string;
    let sell_addressCommand: string;
    let sell_amountPerc: number;
    let buy_amount: number;
    let tokenAddress: string;

    function isJSON(str) {
      try {
        JSON.parse(str);
        return true;
      } catch (e) {
        console.log(e);
        return false;
      }
    }

    if (isJSON(query.data)) {
      const parsedData = JSON.parse(query.data);

      if (parsedData.c) {
        buy_addressCommand = parsedData.c;
        buy_amount = parsedData.a;
        [command, tokenAddress] = buy_addressCommand.split('|');
      } else if (parsedData.s) {
        sell_addressCommand = parsedData.s;
        sell_amountPerc = parsedData.a;
        [command, tokenAddress] = sell_addressCommand.split('|');
      } else if (parsedData.command) {
        command = parsedData.command;
      }
    } else {
      command = query.data;
    }

    const chatId = query.message.chat.id;

    try {
      await this.resoBot.sendChatAction(chatId, 'typing');
      const user = await this.UserModel.findOne({ chatId: chatId });
      let session: SessionDocument;
      switch (command) {
        case '/menu':
          await this.resoBot.sendChatAction(chatId, 'typing');
          await this.sendAllFeature(user);
          return;

        case '/walletFeatures':
          await this.resoBot.sendChatAction(chatId, 'typing');
          await this.sendAllWalletFeature(chatId, user);
          return;

        case '/enableRebalance':
          await this.resoBot.sendChatAction(chatId, 'typing');
          if (user && !user.rebalanceEnabled) {
            await this.UserModel.updateOne(
              { chatId },
              { rebalanceEnabled: true },
            );
            return this.resoBot.sendMessage(chatId, ` Rebalancing Enabled`);
          } else if (user && user.rebalanceEnabled) {
            await this.UserModel.updateOne(
              { chatId },
              { rebalanceEnabled: false },
            );
            return this.resoBot.sendMessage(chatId, ` Rebalancing Disabled`);
          }
          return;

        case '/disableAgenticSwap':
          await this.resoBot.sendChatAction(chatId, 'typing');
          if (user && user.enableAgenticAutoSwap) {
            await this.UserModel.updateOne(
              { chatId },
              { enableAgenticAutoSwap: false },
            );
            return this.resoBot.sendMessage(
              chatId,
              `Agentic auto swap mode disabled`,
            );
          } else if (user && !user.enableAgenticAutoSwap) {
            await this.UserModel.updateOne(
              { chatId },
              { enableAgenticAutoSwap: true },
            );
            return this.resoBot.sendMessage(
              chatId,
              `Agentic auto swap mode enabled`,
            );
          }
          return;

        case '/createWallet':
          await this.resoBot.sendChatAction(chatId, 'typing');
          // check if user already have a wallet
          if (user!.svmWalletAddress) {
            return this.sendWalletDetails(chatId, user);
          }
          const newSVMWallet = await this.walletService.createSVMWallet();
          const [encryptedSVMWalletDetails] = await Promise.all([
            this.walletService.encryptSVMWallet(
              process.env.DEFAULT_WALLET_PIN!,
              newSVMWallet.privateKey,
            ),
          ]);

          // Save user wallet details
          const updatedUser = await this.UserModel.findOneAndUpdate(
            { chatId: chatId },
            {
              svmWalletDetails: encryptedSVMWalletDetails.json,
              svmWalletAddress: newSVMWallet.address,
            },
            { new: true }, // This ensures the updated document is returned
          );
          // Send wallet details to the user
          return await this.sendWalletDetails(chatId, updatedUser);

        case '/linkWallet':
          await this.resoBot.sendChatAction(chatId, 'typing');
          // check if user already have a wallet
          if (user!.svmWalletAddress) {
            await this.resoBot.sendMessage(
              query.message.chat.id,
              `‼️ You already have an SVM wallet\n\nto link a new, make sure to export and secure you old wallets and then click on the reset wallet button`,
            );
            return this.sendWalletDetails(chatId, user);
          }
          // delete any existing session if any
          await this.SessionModel.deleteMany({ chatId: chatId });
          // create a new session
          session = await this.SessionModel.create({
            chatId: chatId,
            importWallet: true,
          });
          if (session) {
            await this.promptWalletPrivateKEY(chatId);
            return;
          }
          return await this.resoBot.sendMessage(
            query.message.chat.id,
            `Processing command failed, please try again`,
          );

        case '/createToken':
          await this.resoBot.sendChatAction(chatId, 'typing');
          // check if user already have a wallet
          if (!user!.svmWalletAddress) {
            await this.resoBot.sendMessage(
              query.message.chat.id,
              `‼️ You need to have a wallet connected before you can create a token`,
            );
          }
          // delete any existing session if any
          await this.SessionModel.deleteMany({ chatId: chatId });
          // create a new session
          session = await this.SessionModel.create({
            chatId: chatId,
            importWallet: true,
          });
          if (session) {
            await this.promptTokenCreation(chatId);
            return;
          }
          return await this.resoBot.sendMessage(
            query.message.chat.id,
            `Processing command failed, please try again`,
          );

        case '/fundWallet':
          if (user?.svmWalletAddress) {
            let message = 'Wallet Address:\n';

            if (user?.svmWalletAddress) {
              message += `<b><code>${user.svmWalletAddress}</code></b>\n\n`;
            }

            message += 'Send SOL to your address above.';

            return await this.resoBot.sendMessage(chatId, message, {
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
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
              },
            });
          }
          return await this.resoBot.sendMessage(
            chatId,
            'You dont have any wallet Address to fund',
          );

        case '/checkBalance':
          return this.showBalance(chatId);

        case '/buyToken':
          return await this.resoBot.sendMessage(
            query.message.chat.id,
            `<b>Buy Token:</b>\n\nTo buy a token, enter the token address`,
            {
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
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
              },
            },
          );

        case '/buy':
          await this.resoBot.sendChatAction(chatId, 'typing');
          const { balance } = await this.walletService.getSolBalance(
            user.svmWalletAddress,
            process.env.SONIC_RPC,
          );
          if (buy_amount == 0) {
            return await this.promptBuyAmount(
              query.message.chat.id,
              balance,
              tokenAddress,
            );
          } else {
            await this.SessionModel.deleteMany({
              chatId: query.message.chat.id,
            });
            //TODO: call swap function here
            const encryptedSVMWallet =
              await this.walletService.decryptSVMWallet(
                `${process.env.DEFAULT_WALLET_PIN}`,
                user.svmWalletDetails,
              );

            if (encryptedSVMWallet.privateKey) {
              const swapHash = await this.resoDefiAgent.botBuyToken(
                encryptedSVMWallet.privateKey,
                tokenAddress,
                `${buy_amount}`,
                query.message.chat.id,
              );
              if (swapHash) {
                return await this.resoBot.sendMessage(
                  query.message.chat.id,
                  swapHash,
                );
              }
              return await this.resoBot.sendMessage(
                query.message.chat.id,
                'Transaction error, please Try again',
              );
            }
            return;
          }

        case '/sel':
          await this.resoBot.sendChatAction(chatId, 'typing');
          if (sell_amountPerc == 0) {
            return await this.promptSellPercentageAmount(
              query.message.chat.id,
              tokenAddress,
            );
          } else {
            await this.SessionModel.deleteMany({
              chatId: query.message.chat.id,
            });

            const encryptedSVMWallet =
              await this.walletService.decryptSVMWallet(
                `${process.env.DEFAULT_WALLET_PIN}`,
                user.svmWalletDetails,
              );
            //TODO: call SELL swap function here
            if (encryptedSVMWallet.privateKey) {
              const swapHash = await this.resoDefiAgent.botSellToken(
                encryptedSVMWallet.privateKey,
                tokenAddress,
                `${sell_amountPerc}`,
                query.message.chat.id,
              );
              if (swapHash) {
                return await this.resoBot.sendMessage(
                  query.message.chat.id,
                  swapHash,
                );
              }
              return await this.resoBot.sendMessage(
                query.message.chat.id,
                'Transaction error, please Try again',
              );
            }
            return;
          }

        case '/transactionHistory':
          const userTransactions = await this.TransactionModel.find({
            chatId: user.chatId,
          });

          if (userTransactions.length > 0) {
            const transactionHistory =
              await transactionHistoryMarkup(userTransactions);

            const replyMarkup = {
              inline_keyboard: transactionHistory.keyboard,
            };

            await this.resoBot.sendMessage(
              query.message.chat.id,
              transactionHistory.message,
              {
                reply_markup: replyMarkup,
                parse_mode: 'HTML',
              },
            );
          }
          return await this.resoBot.sendMessage(
            query.message.chat.id,
            `Your have not performed any transaction..`,
          );

        case '/exportWallet':
          if (!user!.svmWalletAddress) {
            return this.resoBot.sendMessage(chatId, `You Don't have a wallet`);
          }
          return this.showExportWalletWarning(chatId);

        case '/confirmExportWallet':
          // delete any existing session if any
          await this.SessionModel.deleteMany({ chatId: chatId });
          // create a new session
          session = await this.SessionModel.create({
            chatId: chatId,
            exportWallet: true,
          });
          if (session && user!.svmWalletDetails) {
            let decryptedSVMWallet;
            if (user!.svmWalletDetails) {
              decryptedSVMWallet = await this.walletService.decryptSVMWallet(
                process.env.DEFAULT_WALLET_PIN!,
                user!.svmWalletDetails,
              );
            }

            if (decryptedSVMWallet.privateKey) {
              const latestSession = await this.SessionModel.findOne({
                chatId: chatId,
              });
              const deleteMessagesPromises = [
                ...latestSession!.userInputId.map((id) =>
                  this.resoBot.deleteMessage(chatId, id),
                ),
              ];

              // Execute all deletions concurrently
              await Promise.all(deleteMessagesPromises);

              // Display the decrypted private key to the user
              await this.displayWalletPrivateKey(
                chatId,
                decryptedSVMWallet.privateKey || '',
              );

              return;
            }

            // Delete the session after operations
            await this.SessionModel.deleteMany({ chatId: chatId });
          }
          return await this.resoBot.sendMessage(
            query.message.chat.id,
            `Processing command failed, please try again`,
          );

        case '/resetWallet':
          return this.showResetWalletWarning(chatId);

        case '/manageAsset':
          return this.showAsset(chatId);

        case '/confirmReset':
          // delete any existing session if any
          await this.SessionModel.deleteMany({ chatId: chatId });
          // create a new session
          session = await this.SessionModel.create({
            chatId: chatId,
            resetWallet: true,
          });
          if (session) {
            try {
              await this.resoBot.sendChatAction(chatId, 'typing');
              if (!user) {
                return await this.resoBot.sendMessage(
                  chatId,
                  'User not found. Please try again.',
                );
              }

              await this.UserModel.updateOne(
                { chatId: chatId },
                {
                  $unset: {
                    svmWalletAddress: '',
                    svmWalletDetails: '',
                  },
                },
              );

              await this.resoBot.sendMessage(
                chatId,
                'Wallet deleted successfully, you can now create or import a new wallet',
              );
              await this.SessionModel.deleteMany();
              return;
            } catch (error) {
              console.log(error);
            }
          }
          return await this.resoBot.sendMessage(
            query.message.chat.id,
            `Processing command failed, please try again`,
          );

        case '/tokenInsight':
          await this.SessionModel.deleteMany({ chatId: chatId });
          session = await this.SessionModel.create({
            chatId: chatId,
            tokenInsight: true,
          });
          if (session) {
            await this.promptTokenAddress(chatId);
            return;
          }
          return await this.resoBot.sendMessage(
            query.message.chat.id,
            `Processing command failed, please try again`,
          );

        case '/setTargetAllocation':
          await this.resoBot.sendChatAction(chatId, 'typing');
          return await this.setTargetAllocation(chatId);

        case '/setThreshold':
          await this.resoBot.sendChatAction(chatId, 'typing');
          return await this.setThreshold(chatId);

        //   close opened markup and delete session
        case '/closeDelete':
          await this.resoBot.sendChatAction(query.message.chat.id, 'typing');
          await this.SessionModel.deleteMany({
            chatId: chatId,
          });
          return await this.resoBot.deleteMessage(
            query.message.chat.id,
            query.message.message_id,
          );

        case '/close':
          await this.resoBot.sendChatAction(query.message.chat.id, 'typing');
          return await this.resoBot.deleteMessage(
            query.message.chat.id,
            query.message.message_id,
          );

        default:
          return await this.resoBot.sendMessage(
            query.message.chat.id,
            `Processing command failed, please try again`,
          );
      }
    } catch (error) {
      console.log(error);
    }
  };

  sendAllFeature = async (user: UserDocument) => {
    try {
      await this.resoBot.sendChatAction(user.chatId, 'typing');
      const allFeatures = await allFeaturesMarkup();
      if (allFeatures) {
        const replyMarkup = {
          inline_keyboard: allFeatures.keyboard,
        };
        await this.resoBot.sendMessage(user.chatId, allFeatures.message, {
          parse_mode: 'HTML',
          reply_markup: replyMarkup,
        });
      }
    } catch (error) {
      console.log(error);
    }
  };

  sendAllWalletFeature = async (chatId: any, user: UserDocument) => {
    try {
      await this.resoBot.sendChatAction(chatId, 'typing');
      const allWalletFeatures = await walletFeaturesMarkup(user);
      if (allWalletFeatures) {
        const replyMarkup = {
          inline_keyboard: allWalletFeatures.keyboard,
        };
        await this.resoBot.sendMessage(chatId, allWalletFeatures.message, {
          parse_mode: 'HTML',
          reply_markup: replyMarkup,
        });
      }
    } catch (error) {
      console.log(error);
    }
  };

  sendWalletDetails = async (
    ChatId: TelegramBot.ChatId,
    user: UserDocument,
  ) => {
    await this.resoBot.sendChatAction(ChatId, 'typing');
    try {
      const { balance } = await this.walletService.getSolBalance(
        user.svmWalletAddress,
        process.env.SONIC_RPC,
      );
      const walletDetails = await walletDetailsMarkup(
        user.svmWalletAddress,
        balance,
      );
      if (walletDetailsMarkup!) {
        const replyMarkup = {
          inline_keyboard: walletDetails.keyboard,
        };

        return await this.resoBot.sendMessage(ChatId, walletDetails.message, {
          parse_mode: 'HTML',
          reply_markup: replyMarkup,
        });
      }
    } catch (error) {
      console.log(error);
    }
  };

  promptWalletPrivateKEY = async (chatId: TelegramBot.ChatId) => {
    try {
      await this.resoBot.sendChatAction(chatId, 'typing');
      const privateKeyPromptId = await this.resoBot.sendMessage(
        chatId,
        `Please enter wallet's private key`,
        {
          reply_markup: {
            force_reply: true,
          },
        },
      );
      if (privateKeyPromptId) {
        await this.SessionModel.updateOne(
          { chatId: chatId },
          {
            importWalletPromptInput: true,
            $push: { importWalletPromptInputId: privateKeyPromptId.message_id },
          },
        );
      }
    } catch (error) {
      console.log(error);
    }
  };

  promptBuyAmount = async (
    chatId: TelegramBot.ChatId,
    balance: any,
    tokenAddress: string,
  ) => {
    try {
      await this.resoBot.sendChatAction(chatId, 'typing');
      await this.SessionModel.deleteMany({ chatId: chatId });

      await this.SessionModel.create({
        chatId: chatId,
        tokenAmount: true,
        tokenAmountAddress: tokenAddress,
      });
      await this.resoBot.sendMessage(
        chatId,
        `Reply with the amount of SOL you wish to buy(0 - ${balance}, E.g: 0.1)\nAfter submission, it will be bought immediately`,
        {
          reply_markup: {
            force_reply: true,
          },
        },
      );
    } catch (error) {
      console.log(error);
    }
  };

  promptSellPercentageAmount = async (
    chatId: TelegramBot.ChatId,
    tokenAddress: string,
  ) => {
    try {
      await this.resoBot.sendChatAction(chatId, 'typing');
      await this.SessionModel.deleteMany({ chatId: chatId });

      await this.SessionModel.create({
        chatId: chatId,
        sellAmount: true,
        sellTokenAmountAddress: tokenAddress,
      });
      await this.resoBot.sendMessage(
        chatId,
        `Reply with the percentage amount you wish to sell (0 - 100 %)\nAfter submission, it will be sold immediately`,
        {
          reply_markup: {
            force_reply: true,
          },
        },
      );
    } catch (error) {
      console.log(error);
    }
  };

  promptTokenCreation = async (chatId: TelegramBot.ChatId) => {
    try {
      await this.resoBot.sendChatAction(chatId, 'typing');
      return await this.resoBot.sendMessage(
        chatId,
        `create a token with name "MyToken", symbol "MTK", uri "https://example.com/token", decimal "18", initialSupply of 1000000`,
        {
          reply_markup: {
            force_reply: true,
          },
        },
      );
    } catch (error) {
      console.log(error);
    }
  };

  showBalance = async (chatId: TelegramBot.ChatId, showMarkUp = true) => {
    try {
      await this.resoBot.sendChatAction(chatId, 'typing');
      const user = await this.UserModel.findOne({ chatId: chatId });
      if (!user?.svmWalletAddress) {
        return this.resoBot.sendMessage(
          chatId,
          `You don't have any wallet connected`,
        );
      }

      const allTokens: Token[] = await this.fetchSupportedTokenList();
      const tokenArrays = {};

      // Helper function to process tokens for a network
      const processTokens = async (
        network: string,
        tokens: Token[],
        rpc?: string,
      ) => {
        try {
          return (
            await Promise.all(
              tokens.map(async (token) => {
                try {
                  if (
                    token.address ===
                    'So11111111111111111111111111111111111111112'
                  ) {
                    const { balance } = await this.walletService.getSolBalance(
                      user!.svmWalletAddress,
                      rpc,
                    );

                    return {
                      name: token.symbol,
                      balance,
                      network,
                      address: token.address,
                    };
                  } else {
                    const { balance } =
                      await this.walletService.getToken2022Balance(
                        user!.svmWalletAddress,
                        token.address,
                        rpc,
                        token.decimals,
                        token.programId,
                      );
                    console.log(
                      'Blance :',
                      token.name,
                      balance,
                      user.svmWalletAddress,
                    );
                    if (balance > 0) {
                      return {
                        name: token.symbol,
                        balance,
                        network,
                        address: token.address,
                      };
                    }
                  }
                } catch (tokenError) {
                  console.log(
                    `Error fetching token ${token.symbol} on ${network}:`,
                    tokenError,
                  );
                  return null; // Skip this token
                }
              }),
            )
          ).filter(Boolean);
        } catch (networkError) {
          console.log(`Error processing ${network} tokens:`, networkError);
          return []; // Return empty array for this network
        }
      };

      // Process each network independently
      tokenArrays['sonic'] = await processTokens(
        'sonic',
        allTokens,
        process.env.SONIC_RPC,
      );

      const allTokenBalance = [...tokenArrays['sonic']];

      if (showMarkUp) {
        const showBalance = await showBalanceMarkup(allTokenBalance);
        if (showBalance) {
          const replyMarkup = { inline_keyboard: showBalance.keyboard };

          return await this.resoBot.sendMessage(chatId, showBalance.message, {
            parse_mode: 'HTML',
            reply_markup: replyMarkup,
          });
        }
      } else {
        return allTokenBalance;
      }
    } catch (error) {
      console.log('General error in showBalance:', error);
    }
  };

  showAsset = async (chatId: TelegramBot.ChatId) => {
    try {
      const allAssetBalance = await this.showBalance(chatId, false);
      if (allAssetBalance) {
        const showAsset = await manageAssetMarkup(allAssetBalance);
        if (showAsset) {
          const replyMarkup = { inline_keyboard: showAsset.keyboard };

          return await this.resoBot.sendMessage(chatId, showAsset.message, {
            parse_mode: 'HTML',
            reply_markup: replyMarkup,
          });
        }
      }
    } catch (error) {
      console.log(error);
    }
  };

  showExportWalletWarning = async (chatId: TelegramBot.ChatId) => {
    try {
      await this.resoBot.sendChatAction(chatId, 'typing');
      const showExportWarning = await exportWalletWarningMarkup();
      if (showExportWarning) {
        const replyMarkup = { inline_keyboard: showExportWarning.keyboard };

        return await this.resoBot.sendMessage(
          chatId,
          showExportWarning.message,
          {
            parse_mode: 'HTML',
            reply_markup: replyMarkup,
          },
        );
      }
    } catch (error) {
      console.log(error);
    }
  };

  // utitlity functions
  isPrivateKey = async (
    input: string,
    chatId: number,
  ): Promise<{ isValid: boolean; walletType: string | null }> => {
    const latestSession = await this.SessionModel.findOne({ chatId: chatId });
    const trimmedInput = input.trim();

    // Regex for Solana private key (Base58 encoded, usually 44 chars)
    const svmPrivateKeyRegex = /^[1-9A-HJ-NP-Za-km-z]{43,88}$/;

    if (svmPrivateKeyRegex.test(trimmedInput)) {
      return { isValid: true, walletType: 'solana' };
    } else if (latestSession) {
      if (latestSession!.importWallet) {
        this.resoBot.sendMessage(chatId, 'Invalid Private KEY');
      }

      const promises: any[] = [];
      // Loop through import privateKey prompt to delete them
      for (let i = 0; i < latestSession.importWalletPromptInputId.length; i++) {
        try {
          promises.push(
            await this.resoBot.deleteMessage(
              chatId,
              latestSession!.importWalletPromptInputId[i],
            ),
          );
        } catch (error) {
          console.log(error);
        }
      }

      // Loop through to delete all userReply messages
      for (let i = 0; i < latestSession.userInputId.length; i++) {
        try {
          promises.push(
            await this.resoBot.deleteMessage(
              chatId,
              latestSession.userInputId[i],
            ),
          );
        } catch (error) {
          console.log(error);
        }
      }

      return { isValid: false, walletType: null };
    }

    return { isValid: false, walletType: null };
  };

  // utitlity functions
  isTokenAddress = async (input: string): Promise<{ isValid: boolean }> => {
    const trimmedInput = input.trim();
    const tokenAddressRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

    if (tokenAddressRegex.test(trimmedInput)) {
      return { isValid: true };
    }

    return { isValid: false };
  };

  displayWalletPrivateKey = async (
    chatId: TelegramBot.ChatId,
    privateKeySVM: string,
  ) => {
    try {
      await this.resoBot.sendChatAction(chatId, 'typing');
      const displayPrivateKey = await displayPrivateKeyMarkup(privateKeySVM);
      if (displayPrivateKey) {
        const replyMarkup = { inline_keyboard: displayPrivateKey.keyboard };

        const sendPrivateKey = await this.resoBot.sendMessage(
          chatId,
          displayPrivateKey.message,
          {
            parse_mode: 'HTML',
            reply_markup: replyMarkup,
          },
        );
        if (sendPrivateKey) {
          // Delay the message deletion by 1 minute
          setTimeout(async () => {
            try {
              // Delete the message after 1 minute
              await this.resoBot.deleteMessage(
                chatId,
                sendPrivateKey.message_id,
              );
            } catch (error) {
              console.error('Error deleting message:', error);
            }
          }, 60000);
        }
      }
    } catch (error) {
      console.log(error);
    }
  };

  showResetWalletWarning = async (chatId: TelegramBot.ChatId) => {
    try {
      await this.resoBot.sendChatAction(chatId, 'typing');
      const showResetWarning = await resetWalletWarningMarkup();
      if (showResetWarning) {
        const replyMarkup = { inline_keyboard: showResetWarning.keyboard };

        return await this.resoBot.sendMessage(
          chatId,
          showResetWarning.message,
          {
            parse_mode: 'HTML',
            reply_markup: replyMarkup,
          },
        );
      }
    } catch (error) {
      console.log(error);
    }
  };

  //utils function
  generateUniqueAlphanumeric = async (): Promise<string> => {
    const characters =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    while (result.length < 8) {
      const randomChar = characters.charAt(
        Math.floor(Math.random() * characters.length),
      );
      if (!result.includes(randomChar)) {
        result += randomChar;
      }
    }
    return result;
  };

  promptTokenAddress = async (chatId: TelegramBot.ChatId) => {
    try {
      await this.resoBot.sendChatAction(chatId, 'typing');
      const tokenPromptId = await this.resoBot.sendMessage(
        chatId,
        `Please enter the token address`,
        {
          reply_markup: {
            force_reply: true,
          },
        },
      );
      return tokenPromptId;
    } catch (error) {
      console.log(error);
    }
  };

  setTargetAllocation = async (chatId: TelegramBot.ChatId) => {
    try {
      await this.SessionModel.updateOne(
        { chatId },
        { thresholdSetting: false, allocationSetting: true },
        { upsert: true },
      );
      const promptId = await this.resoBot.sendMessage(
        chatId,
        `Input your Target  allocation %: e.g: USDC:40,TRUMP:30,BOBO:20`,
        {
          reply_markup: {
            force_reply: true,
          },
        },
      );

      return promptId;
    } catch (error) {
      console.log(error);
    }
  };

  setThreshold = async (chatId: TelegramBot.ChatId) => {
    try {
      await this.SessionModel.updateOne(
        { chatId },
        { thresholdSetting: true, allocationSetting: false },
        { upsert: true },
      );
      const promptId = await this.resoBot.sendMessage(
        chatId,
        'Input the upper and lower threshold trigger % eg: 5% 5%',
        {
          reply_markup: {
            force_reply: true,
          },
        },
      );

      return promptId;
    } catch (error) {
      console.log(error);
    }
  };

  validateAllocations = async (input: string, chatId: number) => {
    const matches = input.match(/\b[A-Za-z]+:\d+\b/g);

    // 🚩 Error Handling: Invalid Format
    if (!matches || matches.length === 0) {
      await this.resoBot.sendMessage(
        chatId,
        'Invalid input format. Example of valid input: "USDC:40,TRUMP:30,BOBO:20"',
      );
      return; // Exit early if invalid
    }

    // ✅ Conversion: Extract allocations into an object
    const allocations: Record<string, number> = {};
    matches.forEach((pair) => {
      const [key, value] = pair.split(':');
      allocations[key] = parseInt(value, 10);
    });

    // 🚩 Validation: Sum must not exceed 100
    const total = Object.values(allocations).reduce((sum, num) => sum + num, 0);
    if (total > 100) {
      await this.resoBot.sendMessage(
        chatId,
        `Allocations must not exceed 100. Current sum: ${total}`,
      );
      return; // Exit early if invalid
    }

    console.log(allocations);
    return allocations;
  };

  validateThresholds = async (input: string, chatId: number) => {
    const matches = input.match(/(\d{1,3})\s*%/g);

    if (!matches || matches.length !== 2) {
      await this.resoBot.sendMessage(
        chatId,
        'Invalid input format. Example of valid input: 5% 5%',
      );
      return;
    }

    const thresholds = matches.map((value) => parseInt(value.replace('%', '')));

    const invalidValues = thresholds.filter((t) => t < 0 || t > 100);
    if (invalidValues.length > 0) {
      await this.resoBot.sendMessage(
        chatId,
        `Threshold values must be between 0% and 100%. Invalid values: ${invalidValues.join(', ')}%`,
      );
      return; // Exit early if invalid
    }

    console.log(thresholds);
    return { upperThreshold: thresholds[0], lowerThreshold: thresholds[1] };
  };

  fetchSupportedTokenList = async () => {
    try {
      const fetchTokenList = await this.httpService.axiosRef.get(
        'https://api.sega.so/api/mint/list',
      );

      const tokenList = fetchTokenList.data.data;
      if (tokenList && tokenList.mintList.length > 0) {
        const filteredTokens: Token[] = tokenList.mintList.map(
          (token: Token) => {
            return {
              address: token.address,
              programId: token.programId,
              symbol: token.symbol,
              name: token.name,
              decimals: token.decimals,
            };
          },
        );
        return filteredTokens;
      }
    } catch (error) {
      console.log(error);
    }
  };

  fetchSupportedTokenPrice = async (address: string) => {
    try {
      const response = await this.httpService.axiosRef.get(
        `https://api.sega.so/api/mint/price?mints=${address}`,
      );
      const price = Object.values(response.data.data)[0];
      return price;
    } catch (error) {
      console.log(error);
    }
  };

  fetchPoolInfos = async (mint?: string) => {
    try {
      const response = await this.httpService.axiosRef.get(
        `https://api.sega.so/api/pools/info/list?page=1&pageSize=10`,
      );
      const pools = response.data.data.data;
      if (pools && pools.length > 0) {
        if (mint) {
          return this.filterPoolsByMintAddress(pools, mint);
        }
        return pools;
      }
      return;
    } catch (error) {
      console.log(error);
    }
  };

  filterPoolsByMintAddress = (pools, mintBAddress) => {
    const targetMintAAddress = 'So11111111111111111111111111111111111111112';

    return pools.filter(
      (pool) =>
        pool.mintA.address === targetMintAAddress &&
        pool.mintB.address.toLowerCase() === mintBAddress.toLowerCase(),
    );
  };
}
