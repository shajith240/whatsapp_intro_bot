require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const logger = require('./utils/logger');
const WhatsAppBusinessAPI = require('./services/WhatsAppBusinessAPI');
const IntroductionValidator = require('./validators/IntroductionValidator');
const TimeValidator = require('./validators/TimeValidator');

class WhatsAppWebhookServer {
    constructor() {
        this.app = express();
        this.port = process.env.PORT || 3000;
        this.whatsappAPI = new WhatsAppBusinessAPI();
        this.introValidator = new IntroductionValidator();
        this.timeValidator = new TimeValidator();
        
        this.setupMiddleware();
        this.setupRoutes();
    }

    setupMiddleware() {
        // Parse JSON bodies
        this.app.use(bodyParser.json());
        
        // Parse URL-encoded bodies
        this.app.use(bodyParser.urlencoded({ extended: true }));
        
        // Request logging
        this.app.use((req, res, next) => {
            logger.info(`${req.method} ${req.path}`, {
                body: req.body,
                query: req.query,
                headers: req.headers
            });
            next();
        });
    }

    setupRoutes() {
        // Webhook verification (GET)
        this.app.get('/webhook', this.verifyWebhook.bind(this));
        
        // Webhook message handler (POST)
        this.app.post('/webhook', this.handleWebhook.bind(this));
        
        // Health check
        this.app.get('/health', (req, res) => {
            res.json({ 
                status: 'ok', 
                timestamp: new Date().toISOString(),
                service: 'WhatsApp Introduction Validator Bot'
            });
        });

        // Status endpoint
        this.app.get('/status', (req, res) => {
            res.json({
                status: 'running',
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                timestamp: new Date().toISOString()
            });
        });
    }

    verifyWebhook(req, res) {
        const mode = req.query['hub.mode'];
        const token = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];

        // Verify the webhook
        if (mode === 'subscribe' && token === process.env.WEBHOOK_VERIFY_TOKEN) {
            logger.info('Webhook verified successfully');
            res.status(200).send(challenge);
        } else {
            logger.error('Webhook verification failed', { mode, token });
            res.status(403).send('Forbidden');
        }
    }

    async handleWebhook(req, res) {
        try {
            // Verify webhook signature
            if (!this.verifySignature(req)) {
                logger.error('Invalid webhook signature');
                return res.status(401).send('Unauthorized');
            }

            const body = req.body;
            
            // Process webhook data
            if (body.object === 'whatsapp_business_account') {
                await this.processWhatsAppUpdate(body);
            }

            res.status(200).send('OK');
        } catch (error) {
            logger.error('Error handling webhook:', error);
            res.status(500).send('Internal Server Error');
        }
    }

    verifySignature(req) {
        const signature = req.headers['x-hub-signature-256'];
        if (!signature) return false;

        const expectedSignature = crypto
            .createHmac('sha256', process.env.WEBHOOK_SECRET)
            .update(JSON.stringify(req.body))
            .digest('hex');

        return signature === `sha256=${expectedSignature}`;
    }

    async processWhatsAppUpdate(body) {
        for (const entry of body.entry) {
            for (const change of entry.changes) {
                if (change.field === 'messages') {
                    await this.handleMessage(change.value);
                }
            }
        }
    }

    async handleMessage(messageData) {
        const { messages, contacts } = messageData;
        
        if (!messages || messages.length === 0) return;

        for (const message of messages) {
            try {
                await this.processMessage(message, contacts);
            } catch (error) {
                logger.error('Error processing message:', error);
            }
        }
    }

    async processMessage(message, contacts) {
        // Only process text messages
        if (message.type !== 'text') return;

        const messageText = message.text.body;
        const senderId = message.from;
        const messageId = message.id;
        const chatId = message.from; // For groups, this will be the group ID

        // Get sender info
        const sender = contacts?.find(c => c.wa_id === senderId);
        const senderName = sender?.profile?.name || 'Unknown';

        // Determine if this is a group message
        const isGroupMessage = this.isGroupMessage(message);
        const messageContext = isGroupMessage ? 'group' : 'individual';

        logger.info(`Processing ${messageContext} message from ${senderName} (${senderId}): ${messageText}`);

        // For group messages, check if we should monitor this group
        if (isGroupMessage && !this.shouldMonitorGroup(chatId)) {
            logger.info(`Group ${chatId} is not in monitoring list, skipping`);
            return;
        }

        // Check if this looks like an introduction message
        if (!this.isIntroductionMessage(messageText)) {
            logger.info('Message does not appear to be an introduction, skipping validation');
            return;
        }

        // Validate the introduction
        const validationResult = this.validateIntroduction(messageText);

        logger.info(`Validation result for ${senderName}:`, validationResult);

        // Respond based on validation result
        if (validationResult.isValid) {
            // React with thumbs up emoji
            await this.whatsappAPI.reactToMessage(messageId, '👍');
            logger.info(`✅ Valid introduction from ${senderName} - reacted with thumbs up`);

            // For group messages, optionally send a welcome message
            if (isGroupMessage) {
                await this.sendGroupWelcomeMessage(chatId, senderName);
            }
        } else {
            // For group messages, reply in the group
            // For individual messages, send direct message
            const responseTarget = isGroupMessage ? chatId : senderId;

            await this.whatsappAPI.sendMessage(responseTarget, 'repeat', messageId);
            logger.info(`❌ Invalid introduction from ${senderName} - sent repeat message`);
            logger.info(`Validation errors: ${validationResult.errors.join(', ')}`);
        }
    }

    isIntroductionMessage(messageText) {
        // Simple heuristics to identify introduction messages
        const introKeywords = [
            'good morning respected seniors',
            'good afternoon respected seniors', 
            'good evening respected seniors',
            'my name is',
            'i am from',
            'i am pursuing',
            'my hobby is'
        ];

        const lowerText = messageText.toLowerCase();
        
        // Check if message contains multiple introduction keywords
        const keywordCount = introKeywords.filter(keyword => 
            lowerText.includes(keyword)
        ).length;

        // Consider it an introduction if it has at least 3 keywords
        return keywordCount >= 3;
    }

    isGroupMessage(message) {
        // Group messages have different structure
        // Check if the 'from' field contains a group identifier
        // Group IDs typically end with '@g.us'
        return message.from && message.from.includes('@g.us');
    }

    shouldMonitorGroup(groupId) {
        // Check if this group should be monitored
        const targetGroupId = process.env.TARGET_GROUP_ID;

        // If no specific group is configured, monitor all groups
        if (!targetGroupId) {
            return process.env.MONITOR_GROUP_CHATS === 'true';
        }

        // Check if this is the target group
        return groupId === targetGroupId;
    }

    async sendGroupWelcomeMessage(groupId, memberName) {
        try {
            const welcomeMessage = `Welcome to the group, ${memberName}! 👋 Your introduction has been validated successfully.`;
            await this.whatsappAPI.sendMessage(groupId, welcomeMessage);
            logger.info(`Sent welcome message to ${memberName} in group ${groupId}`);
        } catch (error) {
            logger.error('Failed to send group welcome message:', error);
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

    start() {
        return new Promise((resolve, reject) => {
            this.server = this.app.listen(this.port, (error) => {
                if (error) {
                    reject(error);
                } else {
                    logger.info(`🚀 WhatsApp Business API webhook server started on port ${this.port}`);
                    logger.info(`📡 Webhook URL: ${process.env.WEBHOOK_URL || `http://localhost:${this.port}`}/webhook`);
                    resolve();
                }
            });
        });
    }

    stop() {
        if (this.server) {
            this.server.close();
            logger.info('🛑 Webhook server stopped');
        }
    }
}

// Start the server
const webhookServer = new WhatsAppWebhookServer();

webhookServer.start().catch(error => {
    logger.error('Failed to start webhook server:', error);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    logger.info('Received SIGINT, shutting down gracefully...');
    webhookServer.stop();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM, shutting down gracefully...');
    webhookServer.stop();
    process.exit(0);
});

module.exports = WhatsAppWebhookServer;
