#!/usr/bin/env node

require('dotenv').config();
const axios = require('axios');

class WebhookSetup {
    constructor() {
        this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
        this.appId = process.env.META_APP_ID;
        this.webhookUrl = process.env.WEBHOOK_URL;
        this.verifyToken = process.env.WEBHOOK_VERIFY_TOKEN;
        this.apiVersion = process.env.WHATSAPP_API_VERSION || 'v18.0';
        
        if (!this.accessToken || !this.appId || !this.webhookUrl || !this.verifyToken) {
            console.error('❌ Missing required environment variables:');
            console.error('   - WHATSAPP_ACCESS_TOKEN');
            console.error('   - META_APP_ID');
            console.error('   - WEBHOOK_URL');
            console.error('   - WEBHOOK_VERIFY_TOKEN');
            process.exit(1);
        }
    }

    async setupWebhook() {
        try {
            console.log('🔧 Setting up WhatsApp Business API webhook...');
            console.log(`📡 Webhook URL: ${this.webhookUrl}`);
            
            const response = await axios.post(
                `https://graph.facebook.com/${this.apiVersion}/${this.appId}/subscriptions`,
                {
                    object: 'whatsapp_business_account',
                    callback_url: this.webhookUrl,
                    verify_token: this.verifyToken,
                    fields: 'messages'
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            console.log('✅ Webhook configured successfully!');
            console.log('Response:', response.data);
            
        } catch (error) {
            console.error('❌ Failed to setup webhook:');
            if (error.response) {
                console.error('Status:', error.response.status);
                console.error('Data:', error.response.data);
            } else {
                console.error('Error:', error.message);
            }
            process.exit(1);
        }
    }

    async verifyWebhook() {
        try {
            console.log('🔍 Verifying webhook configuration...');
            
            const response = await axios.get(
                `https://graph.facebook.com/${this.apiVersion}/${this.appId}/subscriptions`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`
                    }
                }
            );

            console.log('📋 Current webhook subscriptions:');
            console.log(JSON.stringify(response.data, null, 2));
            
        } catch (error) {
            console.error('❌ Failed to verify webhook:');
            if (error.response) {
                console.error('Status:', error.response.status);
                console.error('Data:', error.response.data);
            } else {
                console.error('Error:', error.message);
            }
        }
    }

    async testWebhook() {
        try {
            console.log('🧪 Testing webhook endpoint...');
            
            const testUrl = `${this.webhookUrl}?hub.mode=subscribe&hub.verify_token=${this.verifyToken}&hub.challenge=test_challenge`;
            
            const response = await axios.get(testUrl);
            
            if (response.data === 'test_challenge') {
                console.log('✅ Webhook endpoint is responding correctly!');
            } else {
                console.log('⚠️ Webhook endpoint response:', response.data);
            }
            
        } catch (error) {
            console.error('❌ Webhook endpoint test failed:');
            console.error('Error:', error.message);
            console.error('Make sure your webhook server is running and accessible');
        }
    }

    async getBusinessProfile() {
        try {
            console.log('👤 Getting business profile...');
            
            const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
            if (!phoneNumberId) {
                console.error('❌ WHATSAPP_PHONE_NUMBER_ID not configured');
                return;
            }

            const response = await axios.get(
                `https://graph.facebook.com/${this.apiVersion}/${phoneNumberId}`,
                {
                    params: {
                        fields: 'display_phone_number,verified_name,quality_rating'
                    },
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`
                    }
                }
            );

            console.log('📱 Business Profile:');
            console.log(`   Phone: ${response.data.display_phone_number}`);
            console.log(`   Name: ${response.data.verified_name}`);
            console.log(`   Quality: ${response.data.quality_rating}`);
            
        } catch (error) {
            console.error('❌ Failed to get business profile:');
            if (error.response) {
                console.error('Status:', error.response.status);
                console.error('Data:', error.response.data);
            } else {
                console.error('Error:', error.message);
            }
        }
    }

    displayInstructions() {
        console.log('\n📋 Setup Instructions:');
        console.log('1. Make sure your webhook server is running:');
        console.log('   npm start');
        console.log('');
        console.log('2. Your webhook URL must be publicly accessible');
        console.log('   Use ngrok for local development:');
        console.log('   ngrok http 3000');
        console.log('');
        console.log('3. Update your .env file with the correct values:');
        console.log('   - WHATSAPP_ACCESS_TOKEN (from Meta App)');
        console.log('   - WHATSAPP_PHONE_NUMBER_ID (from WhatsApp Business API)');
        console.log('   - META_APP_ID (from Meta App)');
        console.log('   - WEBHOOK_URL (your public webhook URL)');
        console.log('   - WEBHOOK_VERIFY_TOKEN (any secure random string)');
        console.log('   - WEBHOOK_SECRET (from Meta App webhook settings)');
        console.log('');
        console.log('4. Run this setup script:');
        console.log('   npm run setup');
        console.log('');
        console.log('5. Test your webhook:');
        console.log('   Send a test message to your WhatsApp Business number');
    }
}

// Main execution
async function main() {
    const setup = new WebhookSetup();
    
    const command = process.argv[2];
    
    switch (command) {
        case 'configure':
            await setup.setupWebhook();
            break;
        case 'verify':
            await setup.verifyWebhook();
            break;
        case 'test':
            await setup.testWebhook();
            break;
        case 'profile':
            await setup.getBusinessProfile();
            break;
        case 'instructions':
            setup.displayInstructions();
            break;
        default:
            console.log('🤖 WhatsApp Business API Setup Tool');
            console.log('');
            console.log('Usage: node scripts/setup-webhook.js <command>');
            console.log('');
            console.log('Commands:');
            console.log('  configure     - Configure webhook subscription');
            console.log('  verify        - Verify current webhook configuration');
            console.log('  test          - Test webhook endpoint');
            console.log('  profile       - Get business profile information');
            console.log('  instructions  - Show detailed setup instructions');
            console.log('');
            console.log('Example:');
            console.log('  npm run setup configure');
            break;
    }
}

if (require.main === module) {
    main().catch(error => {
        console.error('Setup failed:', error.message);
        process.exit(1);
    });
}

module.exports = WebhookSetup;
