const axios = require('axios');
const logger = require('../utils/logger');

class WhatsAppBusinessAPI {
    constructor() {
        this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
        this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
        this.apiVersion = process.env.WHATSAPP_API_VERSION || 'v18.0';
        this.baseURL = `https://graph.facebook.com/${this.apiVersion}`;
        
        if (!this.accessToken || !this.phoneNumberId) {
            throw new Error('WhatsApp Business API credentials not configured');
        }

        // Configure axios instance
        this.api = axios.create({
            baseURL: this.baseURL,
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });

        // Add request/response interceptors for logging
        this.api.interceptors.request.use(
            (config) => {
                logger.info(`WhatsApp API Request: ${config.method?.toUpperCase()} ${config.url}`, {
                    data: config.data
                });
                return config;
            },
            (error) => {
                logger.error('WhatsApp API Request Error:', error);
                return Promise.reject(error);
            }
        );

        this.api.interceptors.response.use(
            (response) => {
                logger.info(`WhatsApp API Response: ${response.status}`, {
                    data: response.data
                });
                return response;
            },
            (error) => {
                logger.error('WhatsApp API Response Error:', {
                    status: error.response?.status,
                    data: error.response?.data,
                    message: error.message
                });
                return Promise.reject(error);
            }
        );
    }

    async sendMessage(to, text, replyToMessageId = null) {
        try {
            const payload = {
                messaging_product: 'whatsapp',
                to: to,
                type: 'text',
                text: {
                    body: text
                }
            };

            // Add reply context if provided
            if (replyToMessageId) {
                payload.context = {
                    message_id: replyToMessageId
                };
            }

            const response = await this.api.post(`/${this.phoneNumberId}/messages`, payload);
            
            logger.info(`Message sent successfully to ${to}`);
            return response.data;
        } catch (error) {
            logger.error(`Failed to send message to ${to}:`, error.response?.data || error.message);
            throw error;
        }
    }

    async reactToMessage(messageId, emoji) {
        try {
            const payload = {
                messaging_product: 'whatsapp',
                type: 'reaction',
                reaction: {
                    message_id: messageId,
                    emoji: emoji
                }
            };

            const response = await this.api.post(`/${this.phoneNumberId}/messages`, payload);

            logger.info(`Reaction ${emoji} sent successfully to message ${messageId}`);
            return response.data;
        } catch (error) {
            logger.error(`Failed to react to message ${messageId}:`, error.response?.data || error.message);
            throw error;
        }
    }

    async sendTemplateMessage(to, templateName, languageCode = 'en', components = []) {
        try {
            const payload = {
                messaging_product: 'whatsapp',
                to: to,
                type: 'template',
                template: {
                    name: templateName,
                    language: {
                        code: languageCode
                    },
                    components: components
                }
            };

            const response = await this.api.post(`/${this.phoneNumberId}/messages`, payload);
            
            logger.info(`Template message sent successfully to ${to}`);
            return response.data;
        } catch (error) {
            logger.error(`Failed to send template message to ${to}:`, error.response?.data || error.message);
            throw error;
        }
    }

    async markMessageAsRead(messageId) {
        try {
            const payload = {
                messaging_product: 'whatsapp',
                status: 'read',
                message_id: messageId
            };

            const response = await this.api.post(`/${this.phoneNumberId}/messages`, payload);
            
            logger.info(`Message ${messageId} marked as read`);
            return response.data;
        } catch (error) {
            logger.error(`Failed to mark message ${messageId} as read:`, error.response?.data || error.message);
            throw error;
        }
    }

    async getBusinessProfile() {
        try {
            const response = await this.api.get(`/${this.phoneNumberId}`, {
                params: {
                    fields: 'display_phone_number,verified_name,quality_rating'
                }
            });

            logger.info('Business profile retrieved successfully');
            return response.data;
        } catch (error) {
            logger.error('Failed to get business profile:', error.response?.data || error.message);
            throw error;
        }
    }

    async updateBusinessProfile(data) {
        try {
            const response = await this.api.post(`/${this.phoneNumberId}`, data);
            
            logger.info('Business profile updated successfully');
            return response.data;
        } catch (error) {
            logger.error('Failed to update business profile:', error.response?.data || error.message);
            throw error;
        }
    }

    async getMediaUrl(mediaId) {
        try {
            const response = await this.api.get(`/${mediaId}`);
            
            logger.info(`Media URL retrieved for ${mediaId}`);
            return response.data.url;
        } catch (error) {
            logger.error(`Failed to get media URL for ${mediaId}:`, error.response?.data || error.message);
            throw error;
        }
    }

    async downloadMedia(mediaUrl) {
        try {
            const response = await axios.get(mediaUrl, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                },
                responseType: 'stream'
            });

            logger.info('Media downloaded successfully');
            return response.data;
        } catch (error) {
            logger.error('Failed to download media:', error.response?.data || error.message);
            throw error;
        }
    }

    // Utility method to validate phone number format
    validatePhoneNumber(phoneNumber) {
        // Remove any non-digit characters except +
        const cleaned = phoneNumber.replace(/[^\d+]/g, '');
        
        // Check if it's a valid international format
        const phoneRegex = /^\+?[1-9]\d{1,14}$/;
        return phoneRegex.test(cleaned);
    }

    // Utility method to format phone number for WhatsApp API
    formatPhoneNumber(phoneNumber) {
        // Remove any non-digit characters except +
        let cleaned = phoneNumber.replace(/[^\d+]/g, '');
        
        // Remove + if present
        if (cleaned.startsWith('+')) {
            cleaned = cleaned.substring(1);
        }
        
        return cleaned;
    }

    // Health check method
    async healthCheck() {
        try {
            await this.getBusinessProfile();
            return { status: 'healthy', timestamp: new Date().toISOString() };
        } catch (error) {
            return { 
                status: 'unhealthy', 
                error: error.message,
                timestamp: new Date().toISOString() 
            };
        }
    }
}

module.exports = WhatsAppBusinessAPI;
