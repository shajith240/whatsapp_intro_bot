#!/usr/bin/env node

// Manual WhatsApp Introduction Validator - Command Line Interface
// Use this when you don't want to open a web browser

const readline = require('readline');
const fs = require('fs');
const path = require('path');

class ManualValidator {
    constructor() {
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        this.stats = this.loadStats();
        this.setupColors();
    }

    setupColors() {
        this.colors = {
            reset: '\x1b[0m',
            bright: '\x1b[1m',
            red: '\x1b[31m',
            green: '\x1b[32m',
            yellow: '\x1b[33m',
            blue: '\x1b[34m',
            magenta: '\x1b[35m',
            cyan: '\x1b[36m',
            white: '\x1b[37m'
        };
    }

    colorize(text, color) {
        return `${this.colors[color]}${text}${this.colors.reset}`;
    }

    loadStats() {
        const statsFile = path.join(__dirname, 'validator-stats.json');
        try {
            if (fs.existsSync(statsFile)) {
                return JSON.parse(fs.readFileSync(statsFile, 'utf8'));
            }
        } catch (error) {
            console.log('Could not load stats, starting fresh');
        }
        return { total: 0, valid: 0, invalid: 0 };
    }

    saveStats() {
        const statsFile = path.join(__dirname, 'validator-stats.json');
        try {
            fs.writeFileSync(statsFile, JSON.stringify(this.stats, null, 2));
        } catch (error) {
            console.log('Could not save stats');
        }
    }

    getCurrentTimeInfo() {
        const now = new Date();
        const hour = now.getHours();
        let expectedGreeting;
        
        if (hour >= 5 && hour < 12) {
            expectedGreeting = "Good Morning Respected Seniors";
        } else if (hour >= 12 && hour < 17) {
            expectedGreeting = "Good Afternoon Respected Seniors";
        } else {
            expectedGreeting = "Good Evening Respected Seniors";
        }
        
        return {
            time: now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
            expectedGreeting
        };
    }

    validateIntroduction(message) {
        const errors = [];
        const sentences = message.split('.').map(s => s.trim()).filter(s => s.length > 0);
        
        // Check sentence count
        if (sentences.length !== 5) {
            errors.push(`Expected exactly 5 sentences, found ${sentences.length}`);
            return { isValid: false, errors };
        }
        
        // Time-based greeting validation
        const timeInfo = this.getCurrentTimeInfo();
        if (!sentences[0].startsWith(timeInfo.expectedGreeting)) {
            errors.push(`Wrong greeting for current time. Expected: "${timeInfo.expectedGreeting}"`);
        }
        
        // Name validation
        if (!sentences[1].match(/^My name is [A-Z][a-zA-Z\s]+$/)) {
            errors.push('Name format incorrect. Should be "My name is [Properly Capitalized Name]"');
        }
        
        // Location validation
        if (!sentences[2].match(/^I am from .+, .+$/)) {
            errors.push('Location format incorrect. Should be "I am from [City], [State]"');
        }
        
        // Education validation
        if (!sentences[3].includes('I am pursuing') || !sentences[3].includes('Technology')) {
            errors.push('Education format incorrect. Should mention "pursuing" and "Technology"');
        }
        
        // Hobby validation
        const hobbyText = sentences[4].toLowerCase();
        const forbiddenHobbies = ['coding', 'programming', 'cricket', 'football', 'basketball', 'swimming', 'gym', 'sports'];
        const foundForbidden = forbiddenHobbies.find(hobby => hobbyText.includes(hobby));
        
        if (foundForbidden) {
            errors.push(`Forbidden hobby detected: "${foundForbidden}". Hobbies should be career-pursuable solo activities.`);
        }
        
        if (!sentences[4].startsWith('My hobby is')) {
            errors.push('Hobby format incorrect. Should be "My hobby is [hobby]"');
        }
        
        // Check for multiple hobbies
        if (hobbyText.includes(' and ') || hobbyText.includes(',')) {
            errors.push('Only one hobby is allowed');
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    displayHeader() {
        console.clear();
        console.log(this.colorize('=' .repeat(60), 'cyan'));
        console.log(this.colorize('🤖 WhatsApp Introduction Validator - Manual Mode', 'bright'));
        console.log(this.colorize('=' .repeat(60), 'cyan'));
        
        const timeInfo = this.getCurrentTimeInfo();
        console.log(this.colorize(`🕐 Current Time: ${timeInfo.time}`, 'yellow'));
        console.log(this.colorize(`📝 Expected Greeting: "${timeInfo.expectedGreeting}"`, 'yellow'));
        
        console.log(this.colorize('\n📊 Statistics:', 'blue'));
        console.log(`   Total Validated: ${this.colorize(this.stats.total, 'white')}`);
        console.log(`   Valid: ${this.colorize(this.stats.valid, 'green')}`);
        console.log(`   Invalid: ${this.colorize(this.stats.invalid, 'red')}`);
        console.log(this.colorize('=' .repeat(60), 'cyan'));
    }

    displayResult(result) {
        console.log('\n' + this.colorize('=' .repeat(50), 'white'));
        
        if (result.isValid) {
            console.log(this.colorize('✅ VALID INTRODUCTION', 'green'));
            console.log(this.colorize('✨ Perfect! This introduction meets all requirements.', 'green'));
            console.log(this.colorize('\n📱 Action: React with 👍 in WhatsApp group or send welcome message', 'blue'));
            console.log(this.colorize('💬 Suggestion: "Welcome to the group! 👋"', 'blue'));
        } else {
            console.log(this.colorize('❌ INVALID INTRODUCTION', 'red'));
            console.log(this.colorize('\n🚨 Issues found:', 'red'));
            result.errors.forEach((error, index) => {
                console.log(this.colorize(`   ${index + 1}. ${error}`, 'red'));
            });
            console.log(this.colorize('\n📱 Action: Send "repeat" in WhatsApp group', 'blue'));
            console.log(this.colorize('💬 Or provide specific feedback about the issues above', 'blue'));
        }
        
        console.log(this.colorize('=' .repeat(50), 'white'));
    }

    showExamples() {
        console.log(this.colorize('\n📋 Quick Test Examples:', 'magenta'));
        console.log(this.colorize('1. Valid Morning Introduction', 'green'));
        console.log(this.colorize('2. Valid Evening Introduction', 'green'));
        console.log(this.colorize('3. Invalid - Wrong Capitalization', 'red'));
        console.log(this.colorize('4. Invalid - Forbidden Hobby', 'red'));
        console.log(this.colorize('5. Invalid - Wrong Format', 'red'));
        console.log(this.colorize('6. Back to main menu', 'yellow'));
    }

    getExample(choice) {
        const examples = {
            '1': 'Good Morning Respected Seniors. My name is John Doe. I am from Mumbai, Maharashtra. I am pursuing Bachelor of Technology in Computer Science Engineering. My hobby is painting.',
            '2': 'Good Evening Respected Seniors. My name is Jane Smith. I am from Delhi, Delhi. I am pursuing Integrated Master of Technology in Electronics and Communication Engineering. My hobby is photography.',
            '3': 'Good Morning Respected Seniors. My name is john doe. I am from mumbai, maharashtra. I am pursuing Bachelor of Technology in computer science engineering. My hobby is painting.',
            '4': 'Good Morning Respected Seniors. My name is John Doe. I am from Mumbai, Maharashtra. I am pursuing Bachelor of Technology in Computer Science Engineering. My hobby is coding.',
            '5': 'Hello seniors, I am John from Mumbai studying computer science and my hobby is painting.'
        };
        return examples[choice];
    }

    async askQuestion(question) {
        return new Promise((resolve) => {
            this.rl.question(question, resolve);
        });
    }

    async handleExamples() {
        while (true) {
            this.showExamples();
            const choice = await this.askQuestion(this.colorize('\nSelect example (1-6): ', 'cyan'));
            
            if (choice === '6') break;
            
            const example = this.getExample(choice);
            if (example) {
                console.log(this.colorize('\n📝 Testing example:', 'yellow'));
                console.log(`"${example}"`);
                
                const result = this.validateIntroduction(example);
                this.stats.total++;
                if (result.isValid) {
                    this.stats.valid++;
                } else {
                    this.stats.invalid++;
                }
                this.saveStats();
                
                this.displayResult(result);
                await this.askQuestion(this.colorize('\nPress Enter to continue...', 'yellow'));
            }
        }
    }

    async run() {
        console.log(this.colorize('🚀 Starting WhatsApp Introduction Validator...', 'green'));
        
        while (true) {
            this.displayHeader();
            
            console.log(this.colorize('\n📋 Options:', 'magenta'));
            console.log('1. Validate introduction message');
            console.log('2. View quick test examples');
            console.log('3. View instructions');
            console.log('4. Exit');
            
            const choice = await this.askQuestion(this.colorize('\nSelect option (1-4): ', 'cyan'));
            
            switch (choice) {
                case '1':
                    console.log(this.colorize('\n📝 Paste the introduction message (press Enter twice when done):', 'yellow'));
                    let message = '';
                    let emptyLines = 0;
                    
                    while (emptyLines < 2) {
                        const line = await this.askQuestion('');
                        if (line.trim() === '') {
                            emptyLines++;
                        } else {
                            emptyLines = 0;
                            message += line + ' ';
                        }
                    }
                    
                    message = message.trim();
                    if (message) {
                        const result = this.validateIntroduction(message);
                        this.stats.total++;
                        if (result.isValid) {
                            this.stats.valid++;
                        } else {
                            this.stats.invalid++;
                        }
                        this.saveStats();
                        
                        this.displayResult(result);
                        await this.askQuestion(this.colorize('\nPress Enter to continue...', 'yellow'));
                    }
                    break;
                    
                case '2':
                    await this.handleExamples();
                    break;
                    
                case '3':
                    console.log(this.colorize('\n📋 How to Use:', 'magenta'));
                    console.log('1. Monitor your WhatsApp group for introduction messages');
                    console.log('2. Copy the introduction text from WhatsApp');
                    console.log('3. Paste it here and validate');
                    console.log('4. Check if it\'s valid or invalid');
                    console.log('5. Respond in the group accordingly:');
                    console.log('   - Valid: React with 👍 or send welcome message');
                    console.log('   - Invalid: Send "repeat" or explain the errors');
                    await this.askQuestion(this.colorize('\nPress Enter to continue...', 'yellow'));
                    break;
                    
                case '4':
                    console.log(this.colorize('\n👋 Thank you for using the validator!', 'green'));
                    this.rl.close();
                    return;
                    
                default:
                    console.log(this.colorize('\n❌ Invalid option. Please try again.', 'red'));
                    await this.askQuestion(this.colorize('Press Enter to continue...', 'yellow'));
            }
        }
    }
}

// Run the validator
if (require.main === module) {
    const validator = new ManualValidator();
    validator.run().catch(error => {
        console.error('Error:', error);
        process.exit(1);
    });
}

module.exports = ManualValidator;
