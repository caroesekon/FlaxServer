const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const USSDHelper = require('../utils/helper');
const logger = require('../utils/logger');

class USSDController {
  /**
   * Main USSD handler
   */
  static handleUSSD = asyncHandler(async (req, res) => {
    const { sessionId, phoneNumber, text, serviceCode } = req.body;

    logger.info('Incoming USSD Request:', {
      sessionId,
      phoneNumber,
      text,
      serviceCode
    });

    // Log session
    USSDHelper.logSession({ sessionId, phoneNumber, text });

    try {
      // Parse user input
      const userInput = USSDHelper.parseInput(text);
      const currentLevel = userInput.length;

      // Find or create user
      let user = await User.findOne({ phoneNumber });
      if (!user && currentLevel === 1 && !text) {
        // New user, show registration
        return this.showMainMenu(res, true);
      } else if (!user) {
        // Returning user without registration
        await this.createUser(phoneNumber);
        user = await User.findOne({ phoneNumber });
      }

      // Route based on current USSD level
      let response;
      switch (currentLevel) {
        case 1:
          response = await this.showMainMenu(res);
          break;
        case 2:
          response = await this.handleMainMenuSelection(user, userInput[1], res);
          break;
        case 3:
          response = await this.handleSubMenuSelection(user, userInput, res);
          break;
        default:
          response = await this.handleFinalInput(user, userInput, sessionId, res);
      }

      // Send response
      res.setHeader('Content-Type', 'text/plain');
      res.send(response);

    } catch (error) {
      logger.error('USSD Error:', error);
      res.send(USSDHelper.formatResponse('An error occurred. Please try again.', true));
    }
  });

  /**
   * Show main menu
   */
  static showMainMenu(res, isNewUser = false) {
    let menu = '';
    if (isNewUser) {
      menu += 'Welcome to Flax Mobile Money!\n';
      menu += '1. Register\n';
    } else {
      menu += 'Welcome back to Flax\n';
      menu += '1. Send Money\n';
      menu += '2. Check Balance\n';
      menu += '3. Buy Airtime\n';
      menu += '4. My Account\n';
    }
    return USSDHelper.formatResponse(menu);
  }

  /**
   * Create new user
   */
  static async createUser(phoneNumber) {
    try {
      const user = new User({
        phoneNumber,
        balance: 0,
        isActive: true,
      });
      await user.save();
      
      // Create welcome transaction
      await Transaction.create({
        user: user._id,
        type: 'deposit',
        amount: 0,
        description: 'Account created',
        status: 'completed',
      });
      
      logger.info(`New user created: ${phoneNumber}`);
      return user;
    } catch (error) {
      logger.error('User creation error:', error);
      throw error;
    }
  }

  /**
   * Handle main menu selections
   */
  static async handleMainMenuSelection(user, selection, res) {
    switch (selection) {
      case '1':
        if (!user.hasPin()) {
          return USSDHelper.formatResponse(
            'Welcome! Let\'s set up your account.\nEnter your first name:'
          );
        }
        return USSDHelper.formatResponse('Enter recipient\'s phone number:');
      
      case '2':
        if (!user.hasPin()) {
          return USSDHelper.formatResponse('Please set your PIN first\nEnter new 4-digit PIN:', true);
        }
        return USSDHelper.formatResponse(
          `Your balance is: ${USSDHelper.formatCurrency(user.balance)}\n\n1. Back to menu`,
          true
        );
      
      case '3':
        return USSDHelper.formatResponse(
          'Buy Airtime\n1. For myself\n2. For another number\n3. Back'
        );
      
      case '4':
        return USSDHelper.formatResponse(
          `Account Info:\nName: ${user.firstName} ${user.lastName}\nPhone: ${user.phoneNumber}\n\n1. Change PIN\n2. Transaction History\n3. Back`
        );
      
      default:
        return USSDHelper.formatResponse('Invalid option. Please try again.', true);
    }
  }

  /**
   * Handle sub-menu selections (level 3)
   */
  static async handleSubMenuSelection(user, input, res) {
    const mainOption = input[1];
    const subOption = input[2];

    // Handle PIN setup for new users
    if (!user.hasPin() && mainOption === '1') {
      if (user.firstName === '') {
        // First name entered, ask for last name
        user.firstName = subOption;
        await user.save();
        return USSDHelper.formatResponse('Enter your last name:');
      } else if (user.lastName === '') {
        // Last name entered, ask for PIN
        user.lastName = subOption;
        await user.save();
        return USSDHelper.formatResponse('Create a 4-digit PIN:');
      } else {
        // Set PIN
        if (subOption.length !== 4 || isNaN(subOption)) {
          return USSDHelper.formatResponse('Invalid PIN. Enter 4-digit PIN:', true);
        }
        user.pin = subOption;
        await user.save();
        return USSDHelper.formatResponse(
          'Registration successful!\nWelcome to Flax Mobile Money\n1. Continue',
          true
        );
      }
    }

    // Handle Send Money recipient phone
    if (mainOption === '1' && !input[3]) {
      if (USSDHelper.validatePhone(subOption)) {
        return USSDHelper.formatResponse('Enter amount to send (KES):');
      } else {
        return USSDHelper.formatResponse('Invalid phone number. Enter valid number:', true);
      }
    }

    // Handle Buy Airtime
    if (mainOption === '3') {
      if (subOption === '1') {
        return USSDHelper.formatResponse(`Enter airtime amount for ${user.phoneNumber}:`);
      } else if (subOption === '2') {
        return USSDHelper.formatResponse('Enter recipient phone number:');
      }
    }

    return USSDHelper.formatResponse('Invalid selection', true);
  }

  /**
   * Handle final inputs (level 4+)
   */
  static async handleFinalInput(user, input, sessionId, res) {
    const mainOption = input[1];

    // Handle Send Money flow
    if (mainOption === '1' && input.length === 4) {
      const recipientPhone = input[2];
      const amount = parseFloat(input[3]);
      
      if (isNaN(amount) || amount <= 0) {
        return USSDHelper.formatResponse('Invalid amount. Try again.', true);
      }
      
      return USSDHelper.formatResponse(
        `Send KES ${amount} to ${recipientPhone}?\nEnter PIN to confirm:`
      );
    }

    if (mainOption === '1' && input.length === 5) {
      const pin = input[4];
      
      if (pin !== user.pin) {
        // Log failed transaction
        await Transaction.create({
          user: user._id,
          type: 'transfer_sent',
          amount: parseFloat(input[3]),
          recipientPhone: input[2],
          status: 'failed',
          description: 'Wrong PIN',
          sessionId,
        });
        
        return USSDHelper.formatResponse('Wrong PIN. Transaction cancelled.', true);
      }

      const amount = parseFloat(input[3]);
      if (!user.canAfford(amount)) {
        return USSDHelper.formatResponse('Insufficient balance.', true);
      }

      // Process transaction
      const recipient = await User.findOne({ phoneNumber: input[2] });
      user.balance -= amount;
      await user.save();

      if (recipient) {
        recipient.balance += amount;
        await recipient.save();
        
        await Transaction.create({
          user: recipient._id,
          type: 'transfer_received',
          amount,
          recipientPhone: user.phoneNumber,
          status: 'completed',
          description: `Received from ${user.phoneNumber}`,
          sessionId,
        });
      }

      await Transaction.create({
        user: user._id,
        type: 'transfer_sent',
        amount,
        recipientPhone: input[2],
        status: 'completed',
        description: `Sent to ${input[2]}`,
        sessionId,
      });

      return USSDHelper.formatResponse(
        `Transaction successful!\nSent KES ${amount} to ${input[2]}\nNew balance: ${USSDHelper.formatCurrency(user.balance)}`,
        true
      );
    }

    // Handle airtime purchase
    if (mainOption === '3') {
      const amount = parseFloat(input[input.length - 1]);
      const phoneToRecharge = input[2] === '1' ? user.phoneNumber : input[2];
      
      if (!user.canAfford(amount)) {
        return USSDHelper.formatResponse('Insufficient balance.', true);
      }

      user.balance -= amount;
      await user.save();

      await Transaction.create({
        user: user._id,
        type: 'airtime',
        amount,
        recipientPhone: phoneToRecharge,
        status: 'completed',
        description: `Airtime for ${phoneToRecharge}`,
        sessionId,
      });

      return USSDHelper.formatResponse(
        `Airtime purchase successful!\nKES ${amount} sent to ${phoneToRecharge}`,
        true
      );
    }

    // Handle PIN change
    if (mainOption === '4' && input[2] === '1') {
      if (!input[3]) {
        return USSDHelper.formatResponse('Enter current PIN:');
      }
      if (!input[4]) {
        if (input[3] !== user.pin) {
          return USSDHelper.formatResponse('Wrong current PIN.', true);
        }
        return USSDHelper.formatResponse('Enter new 4-digit PIN:');
      }
      if (input[4].length !== 4 || isNaN(input[4])) {
        return USSDHelper.formatResponse('Invalid PIN.', true);
      }
      
      user.pin = input[4];
      await user.save();
      return USSDHelper.formatResponse('PIN changed successfully!', true);
    }

    // Transaction history
    if (mainOption === '4' && input[2] === '2') {
      const transactions = await Transaction.getUserTransactions(user._id, 5);
      
      if (transactions.length === 0) {
        return USSDHelper.formatResponse('No transactions found.', true);
      }

      let history = 'Recent Transactions:\n';
      transactions.forEach(txn => {
        history += `${txn.type}: KES ${txn.amount} (${txn.status})\n`;
      });
      
      return USSDHelper.formatResponse(history, true);
    }

    return USSDHelper.formatResponse('Invalid option.', true);
  }

  /**
   * USSD callback URL for Africa's Talking
   */
  static ussdCallback = asyncHandler(async (req, res) => {
    logger.info('USSD Callback:', req.body);
    res.status(200).send('OK');
  });
}

module.exports = USSDController;