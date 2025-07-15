const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const logger = require('./utils/logger');
const IntroductionValidator = require('./validators/IntroductionValidator');
const TimeValidator = require('./validators/TimeValidator');
const QRWebServer = require('../scripts/qr-web-server');

class WhatsAppBot {
    constructor() {
        this.client = new Client({
            authStrategy: new LocalAuth(),
            puppeteer: {
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            }
        });

        this.introValidator = new IntroductionValidator();
        this.timeValidator = new TimeValidator();

        // Initialize QR web server for remote authentication
        this.qrServer = new QRWebServer(process.env.QR_SERVER_PORT || 3000);

        this.setupEventHandlers();
    }

    setupEventHandlers() {
        this.client.on('qr', (qr) => {
            logger.info('QR Code received, scan with your phone');
            qrcode.generate(qr, { small: true });

            // Update QR web server
            this.qrServer.updateQR(qr);
        });

        this.client.on('ready', () => {
            logger.info('WhatsApp bot is ready!');
            this.qrServer.setAuthenticated(true);
        });

        this.client.on('message', async (message) => {
            await this.handleMessage(message);
        });

        this.client.on('disconnected', (reason) => {
            logger.warn('WhatsApp client disconnected:', reason);
        });
    }

    async handleMessage(message) {
        try {
            // Only process direct messages (not group messages)
            const chat = await message.getChat();
            if (chat.isGroup) {
                return;
            }

            // Skip messages from self
            if (message.fromMe) {
                return;
            }

            const messageText = message.body.trim();
            logger.info(`Received message: ${messageText}`);

            // Validate the introduction
            const validationResult = this.validateIntroduction(messageText);
            
            if (validationResult.isValid) {
                // React with thumbs up emoji
                await message.react('👍');
                logger.info('Introduction validated successfully - reacted with thumbs up');
            } else {
                // Send "repeat" message
                await message.reply('repeat');
                logger.info(`Introduction validation failed: ${validationResult.errors.join(', ')}`);
            }

        } catch (error) {
            logger.error('Error handling message:', error);
        }
    }

    validateIntroduction(messageText) {
        const errors = [];

        // Validate greeting time
        const greetingValidation = this.timeValidator.validateGreeting(messageText);
        if (!greetingValidation.isValid) {
            errors.push(...greetingValidation.errors);
        }

        // Validate introduction format
        const formatValidation = this.introValidator.validateFormat(messageText);
        if (!formatValidation.isValid) {
            errors.push(...formatValidation.errors);
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    async start() {
        try {
            await this.client.initialize();
            logger.info('WhatsApp bot started successfully');
        } catch (error) {
            logger.error('Failed to start WhatsApp bot:', error);
            throw error;
        }
    }

    async stop() {
        try {
            await this.client.destroy();
            logger.info('WhatsApp bot stopped');
        } catch (error) {
            logger.error('Error stopping WhatsApp bot:', error);
        }
    }
}

// Start the bot
const bot = new WhatsAppBot();
bot.start().catch(error => {
    logger.error('Failed to start bot:', error);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    logger.info('Received SIGINT, shutting down gracefully...');
    await bot.stop();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM, shutting down gracefully...');
    await bot.stop();
    process.exit(0);
});

module.exports = WhatsAppBot;
