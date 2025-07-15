const moment = require('moment');

class TimeValidator {
    constructor() {
        // Define time ranges for greetings
        this.timeRanges = {
            morning: { start: 5, end: 12 }, // 5 AM to 12 PM
            afternoon: { start: 12, end: 17 }, // 12 PM to 5 PM
            evening: { start: 17, end: 24 } // 5 PM to 12 AM (midnight)
        };
    }

    getCurrentTimeOfDay() {
        const currentHour = moment().hour();
        
        if (currentHour >= this.timeRanges.morning.start && currentHour < this.timeRanges.morning.end) {
            return 'morning';
        } else if (currentHour >= this.timeRanges.afternoon.start && currentHour < this.timeRanges.afternoon.end) {
            return 'afternoon';
        } else {
            return 'evening';
        }
    }

    extractGreetingFromMessage(messageText) {
        // Extract the first sentence which should contain the greeting
        const firstSentence = messageText.split('.')[0].trim();
        
        // Check for greeting patterns
        const greetingPatterns = [
            /Good Morning Respected Seniors/i,
            /Good Afternoon Respected Seniors/i,
            /Good Evening Respected Seniors/i
        ];

        for (const pattern of greetingPatterns) {
            if (pattern.test(firstSentence)) {
                const match = firstSentence.match(pattern);
                return match[0].toLowerCase();
            }
        }

        return null;
    }

    validateGreeting(messageText) {
        const errors = [];
        const currentTimeOfDay = this.getCurrentTimeOfDay();
        const extractedGreeting = this.extractGreetingFromMessage(messageText);

        // Check if greeting exists
        if (!extractedGreeting) {
            errors.push('Message must start with "Good Morning/Afternoon/Evening Respected Seniors."');
            return { isValid: false, errors };
        }

        // Determine the greeting time from the message
        let greetingTime = null;
        if (extractedGreeting.includes('morning')) {
            greetingTime = 'morning';
        } else if (extractedGreeting.includes('afternoon')) {
            greetingTime = 'afternoon';
        } else if (extractedGreeting.includes('evening')) {
            greetingTime = 'evening';
        }

        // Validate that greeting matches current time
        if (greetingTime !== currentTimeOfDay) {
            errors.push(`Greeting should be "Good ${this.capitalizeFirst(currentTimeOfDay)}" based on current time`);
        }

        // Validate exact format
        const expectedGreeting = `good ${greetingTime} respected seniors`;
        if (extractedGreeting !== expectedGreeting) {
            errors.push('Greeting must be exactly "Good Morning/Afternoon/Evening Respected Seniors." with proper capitalization');
        }

        return {
            isValid: errors.length === 0,
            errors,
            currentTimeOfDay,
            greetingTime
        };
    }

    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
}

module.exports = TimeValidator;
