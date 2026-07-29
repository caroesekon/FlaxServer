const User = require('../models/User');
const Transaction = require('../models/Transaction');
const USSDHelper = require('../utils/helper');
const logger = require('../utils/logger');

class USSDController {
  /**
   * Main USSD handler
   */
  static handleUSSD = async (req, res) => {
    const { sessionId, phoneNumber, text, serviceCode } = req.body;

    console.log('USSD Request received:', { sessionId, phoneNumber, text });
    logger.info('Incoming USSD Request:', { sessionId, phoneNumber, text, serviceCode });

    res.setHeader('Content-Type', 'text/plain');

    try {
      let response;
      const inputs = text ? text.split('*') : [];
      const level = text ? inputs.length : 0;

      // Find user
      let user = null;
      try {
        user = await User.findOne({ phoneNumber });
      } catch (dbError) {
        console.error('DB Query Error:', dbError.message);
        logger.error('DB Query Error:', dbError.message);
      }

      // ============ NEW SESSION - No text ============
      if (!text || text === '') {
        if (!user) {
          response = 'CON Welcome to Flax Mobile Money!\n1. Register';
        } else {
          response = 'CON Welcome back ' + (user.firstName || 'User') + '\n1. Send Money\n2. Check Balance\n3. Buy Airtime\n4. My Account';
        }
      }
      // ============ REGISTRATION FLOW - No user exists ============
      else if (!user && inputs[0] === '1') {
        if (level === 1) {
          response = 'CON Enter your first name:';
        } else if (level === 2) {
          const firstName = inputs[1];
          try {
            await User.create({
              phoneNumber,
              firstName,
              lastName: '',
              balance: 0,
              pin: null
            });
            response = 'CON Enter your last name:';
          } catch (err) {
            console.error('Create user error:', err.message);
            response = 'END Registration failed. Try again.';
          }
        } else if (level === 3) {
          const lastName = inputs[2];
          try {
            await User.findOneAndUpdate({ phoneNumber }, { lastName });
            response = 'CON Create a 4-digit PIN:';
          } catch (err) {
            console.error('Update user error:', err.message);
            response = 'END Registration failed. Try again.';
          }
        } else if (level === 4) {
          const pin = inputs[3];
          if (pin.length !== 4 || isNaN(pin)) {
            response = 'END Invalid PIN. Must be 4 digits.';
          } else {
            try {
              await User.findOneAndUpdate({ phoneNumber }, { pin });
              response = 'END Registration successful!\nWelcome to Flax Mobile Money!';
            } catch (err) {
              console.error('Set PIN error:', err.message);
              response = 'END Registration failed. Try again.';
            }
          }
        } else {
          response = 'END Registration complete. Please dial again.';
        }
      }
      // ============ EXISTING USER FLOWS ============
      else if (user) {
        const mainOption = inputs[0];

        // ---- SEND MONEY (option 1) ----
        if (mainOption === '1') {
          if (level === 1) {
            response = 'CON Enter recipient phone number:';
          } else if (level === 2) {
            if (USSDHelper.validatePhone(inputs[1])) {
              response = 'CON Enter amount to send (KES):';
            } else {
              response = 'END Invalid phone number. Format: +254XXXXXXXXX';
            }
          } else if (level === 3) {
            const amount = parseFloat(inputs[2]);
            if (isNaN(amount) || amount <= 0) {
              response = 'END Invalid amount.';
            } else {
              response = `CON Send KES ${amount} to ${inputs[1]}?\nEnter PIN to confirm:`;
            }
          } else if (level === 4) {
            const amount = parseFloat(inputs[2]);
            const recipientPhone = inputs[1];
            const pin = inputs[3];

            if (!user.pin || pin !== user.pin) {
              response = 'END Wrong PIN. Transaction cancelled.';
            } else if (!user.canAfford(amount)) {
              response = 'END Insufficient balance.';
            } else {
              try {
                // Deduct from sender
                user.balance -= amount;
                await user.save();

                // Credit recipient
                const recipient = await User.findOne({ phoneNumber: recipientPhone });
                if (recipient) {
                  recipient.balance += amount;
                  await recipient.save();
                  
                  await Transaction.create({
                    user: recipient._id,
                    type: 'transfer_received',
                    amount,
                    recipientPhone: phoneNumber,
                    status: 'completed',
                    description: `Received from ${phoneNumber}`,
                    sessionId,
                  });
                }

                // Log transaction
                await Transaction.create({
                  user: user._id,
                  type: 'transfer_sent',
                  amount,
                  recipientPhone,
                  status: 'completed',
                  description: `Sent to ${recipientPhone}`,
                  sessionId,
                });

                const newBalance = USSDHelper.formatCurrency(user.balance);
                response = `END Sent KES ${amount} to ${recipientPhone}\nBalance: ${newBalance}`;
              } catch (err) {
                console.error('Transaction error:', err.message);
                // Refund
                user.balance += amount;
                await user.save();
                response = 'END Transaction failed. Amount refunded.';
              }
            }
          } else {
            response = 'END Invalid input.';
          }
        }
        // ---- CHECK BALANCE (option 2) ----
        else if (mainOption === '2') {
          const balance = USSDHelper.formatCurrency(user.balance);
          response = `END Your balance: ${balance}`;
        }
        // ---- BUY AIRTIME (option 3) ----
        else if (mainOption === '3') {
          if (level === 1) {
            response = 'CON Buy Airtime\n1. My phone\n2. Other number';
          } else if (inputs[1] === '1') {
            // Self airtime
            if (level === 2) {
              response = 'CON Enter airtime amount (KES):';
            } else if (level === 3) {
              const amount = parseFloat(inputs[2]);
              if (isNaN(amount) || amount <= 0) {
                response = 'END Invalid amount.';
              } else if (!user.canAfford(amount)) {
                response = 'END Insufficient balance.';
              } else {
                try {
                  user.balance -= amount;
                  await user.save();
                  
                  await Transaction.create({
                    user: user._id,
                    type: 'airtime',
                    amount,
                    recipientPhone: phoneNumber,
                    status: 'completed',
                    description: 'Airtime purchase - self',
                    sessionId,
                  });
                  
                  response = `END Airtime KES ${amount} purchased!\nBalance: ${USSDHelper.formatCurrency(user.balance)}`;
                } catch (err) {
                  user.balance += amount;
                  await user.save();
                  response = 'END Airtime purchase failed. Refunded.';
                }
              }
            }
          } else if (inputs[1] === '2') {
            // Other number airtime
            if (level === 2) {
              response = 'CON Enter recipient phone number:';
            } else if (level === 3) {
              response = 'CON Enter airtime amount (KES):';
            } else if (level === 4) {
              const recipientPhone = inputs[2];
              const amount = parseFloat(inputs[3]);
              
              if (isNaN(amount) || amount <= 0) {
                response = 'END Invalid amount.';
              } else if (!user.canAfford(amount)) {
                response = 'END Insufficient balance.';
              } else {
                try {
                  user.balance -= amount;
                  await user.save();
                  
                  await Transaction.create({
                    user: user._id,
                    type: 'airtime',
                    amount,
                    recipientPhone,
                    status: 'completed',
                    description: `Airtime for ${recipientPhone}`,
                    sessionId,
                  });
                  
                  response = `END Airtime KES ${amount} sent to ${recipientPhone}\nBalance: ${USSDHelper.formatCurrency(user.balance)}`;
                } catch (err) {
                  user.balance += amount;
                  await user.save();
                  response = 'END Airtime purchase failed. Refunded.';
                }
              }
            }
          } else {
            response = 'END Invalid option.';
          }
        }
        // ---- MY ACCOUNT (option 4) ----
        else if (mainOption === '4') {
          if (level === 1) {
            response = `CON Account Info\nName: ${user.firstName} ${user.lastName}\nPhone: ${user.phoneNumber}\nBalance: ${USSDHelper.formatCurrency(user.balance)}\n\n1. Change PIN\n2. Transaction History\n3. Back`;
          } else if (inputs[1] === '1') {
            // Change PIN
            if (level === 2) {
              response = 'CON Enter current PIN:';
            } else if (level === 3) {
              if (inputs[2] !== user.pin) {
                response = 'END Wrong current PIN.';
              } else {
                response = 'CON Enter new 4-digit PIN:';
              }
            } else if (level === 4) {
              const newPin = inputs[3];
              if (newPin.length !== 4 || isNaN(newPin)) {
                response = 'END Invalid PIN. Must be 4 digits.';
              } else {
                try {
                  user.pin = newPin;
                  await user.save();
                  response = 'END PIN changed successfully!';
                } catch (err) {
                  response = 'END PIN change failed. Try again.';
                }
              }
            }
          } else if (inputs[1] === '2') {
            // Transaction history
            try {
              const transactions = await Transaction.find({ user: user._id })
                .sort({ createdAt: -1 })
                .limit(5)
                .lean();
              
              if (transactions.length === 0) {
                response = 'END No transactions found.';
              } else {
                let history = 'Recent Transactions:\n';
                transactions.forEach((txn, i) => {
                  const date = new Date(txn.createdAt).toLocaleDateString('en-KE');
                  history += `${i+1}. ${txn.type}: KES ${txn.amount}\n   ${txn.status} - ${date}\n`;
                });
                response = 'END ' + history;
              }
            } catch (err) {
              console.error('Transaction history error:', err.message);
              response = 'END Could not fetch transactions.';
            }
          } else if (inputs[1] === '3') {
            // Back to main menu
            response = 'CON Welcome back\n1. Send Money\n2. Check Balance\n3. Buy Airtime\n4. My Account';
          } else {
            response = 'END Invalid option.';
          }
        }
        // ---- INVALID MAIN OPTION ----
        else {
          response = 'END Invalid option. Goodbye!';
        }
      }
      // ============ USER EXISTS BUT WRONG FLOW ============
      else {
        response = 'END Session expired. Please dial again.';
      }

      // Fallback response
      if (!response) {
        response = 'END Service error. Please try again.';
      }

      console.log('Sending response:', response);
      return res.send(response);

    } catch (error) {
      console.error('USSD Fatal Error:', error);
      logger.error('USSD Fatal Error:', error);
      return res.send('END Service temporarily unavailable. Please try again.');
    }
  };

  /**
   * USSD callback endpoint
   */
  static ussdCallback = async (req, res) => {
    logger.info('USSD Callback:', req.body);
    res.status(200).send('OK');
  };
}

module.exports = USSDController;