const CapitalizationValidator = require('./CapitalizationValidator');
const HobbyValidator = require('./HobbyValidator');

class IntroductionValidator {
    constructor() {
        this.capitalizationValidator = new CapitalizationValidator();
        this.hobbyValidator = new HobbyValidator();
        
        // Define the expected format patterns
        this.patterns = {
            greeting: /^Good (Morning|Afternoon|Evening) Respected Seniors\./,
            name: /My name is ([^.]+)\./,
            location: /I am from ([^,]+), ([^.]+)\./,
            education: /I am pursuing (Bachelor|Integrated Master) of Technology in ([^.]+)\./,
            hobby: /My hobby is ([^.]+)\./
        };
    }

    validateFormat(messageText) {
        const errors = [];
        const sentences = this.splitIntoSentences(messageText);
        
        // Expected number of sentences
        if (sentences.length !== 5) {
            errors.push(`Introduction must contain exactly 5 sentences, found ${sentences.length}`);
        }

        // Validate each sentence format
        const validationResults = {
            greeting: this.validateGreetingSentence(sentences[0] || ''),
            name: this.validateNameSentence(sentences[1] || ''),
            location: this.validateLocationSentence(sentences[2] || ''),
            education: this.validateEducationSentence(sentences[3] || ''),
            hobby: this.validateHobbySentence(sentences[4] || '')
        };

        // Collect all errors
        Object.values(validationResults).forEach(result => {
            if (!result.isValid) {
                errors.push(...result.errors);
            }
        });

        return {
            isValid: errors.length === 0,
            errors,
            validationResults
        };
    }

    splitIntoSentences(text) {
        return text.split('.').map(s => s.trim()).filter(s => s.length > 0);
    }

    validateGreetingSentence(sentence) {
        const errors = [];
        
        if (!this.patterns.greeting.test(sentence + '.')) {
            errors.push('First sentence must be "Good Morning/Afternoon/Evening Respected Seniors."');
        }

        return { isValid: errors.length === 0, errors };
    }

    validateNameSentence(sentence) {
        const errors = [];
        const match = (sentence + '.').match(this.patterns.name);
        
        if (!match) {
            errors.push('Second sentence must be "My name is [Full Name]."');
            return { isValid: false, errors };
        }

        const name = match[1].trim();
        
        // Validate name capitalization
        const capitalizationResult = this.capitalizationValidator.validateName(name);
        if (!capitalizationResult.isValid) {
            errors.push(...capitalizationResult.errors);
        }

        return { isValid: errors.length === 0, errors, extractedName: name };
    }

    validateLocationSentence(sentence) {
        const errors = [];
        const match = (sentence + '.').match(this.patterns.location);
        
        if (!match) {
            errors.push('Third sentence must be "I am from [City/Town], [State]."');
            return { isValid: false, errors };
        }

        const city = match[1].trim();
        const state = match[2].trim();
        
        // Validate location capitalization
        const cityValidation = this.capitalizationValidator.validateLocation(city);
        const stateValidation = this.capitalizationValidator.validateLocation(state);
        
        if (!cityValidation.isValid) {
            errors.push(...cityValidation.errors);
        }
        
        if (!stateValidation.isValid) {
            errors.push(...stateValidation.errors);
        }

        // Check if it's a town and validate district mention
        if (this.isTown(city)) {
            if (!this.mentionsDistrict(sentence)) {
                errors.push('If from a town, mention the nearest district');
            }
        }

        return { 
            isValid: errors.length === 0, 
            errors, 
            extractedCity: city, 
            extractedState: state 
        };
    }

    validateEducationSentence(sentence) {
        const errors = [];
        const match = (sentence + '.').match(this.patterns.education);
        
        if (!match) {
            errors.push('Fourth sentence must be "I am pursuing Bachelor/Integrated Master of Technology in [Branch Name in full]."');
            return { isValid: false, errors };
        }

        const degree = match[1].trim();
        const branch = match[2].trim();
        
        // Validate branch name capitalization
        const branchValidation = this.capitalizationValidator.validateBranchName(branch);
        if (!branchValidation.isValid) {
            errors.push(...branchValidation.errors);
        }

        // Validate degree type
        if (!['Bachelor', 'Integrated Master'].includes(degree)) {
            errors.push('Degree must be either "Bachelor" or "Integrated Master"');
        }

        return { 
            isValid: errors.length === 0, 
            errors, 
            extractedDegree: degree, 
            extractedBranch: branch 
        };
    }

    validateHobbySentence(sentence) {
        const errors = [];
        const match = (sentence + '.').match(this.patterns.hobby);
        
        if (!match) {
            errors.push('Fifth sentence must be "My hobby is [Hobby]."');
            return { isValid: false, errors };
        }

        const hobby = match[1].trim();
        
        // Validate hobby rules
        const hobbyValidation = this.hobbyValidator.validateHobby(hobby);
        if (!hobbyValidation.isValid) {
            errors.push(...hobbyValidation.errors);
        }

        return { 
            isValid: errors.length === 0, 
            errors, 
            extractedHobby: hobby 
        };
    }

    isTown(location) {
        // Major cities that should not be considered towns
        const majorCities = [
            'mumbai', 'delhi', 'bangalore', 'hyderabad', 'ahmedabad', 'chennai',
            'kolkata', 'pune', 'jaipur', 'surat', 'lucknow', 'kanpur', 'nagpur',
            'indore', 'thane', 'bhopal', 'visakhapatnam', 'pimpri', 'patna',
            'vadodara', 'ghaziabad', 'ludhiana', 'agra', 'nashik', 'faridabad',
            'meerut', 'rajkot', 'kalyan', 'vasai', 'varanasi', 'srinagar',
            'aurangabad', 'dhanbad', 'amritsar', 'navi mumbai', 'allahabad',
            'ranchi', 'howrah', 'coimbatore', 'jabalpur', 'gwalior', 'vijayawada',
            'jodhpur', 'madurai', 'raipur', 'kota', 'guwahati', 'chandigarh'
        ];

        const locationLower = location.toLowerCase().trim();

        // If it's a major city, it's not a town
        if (majorCities.includes(locationLower)) {
            return false;
        }

        // Check for explicit town keywords
        const townKeywords = ['town', 'village', 'tehsil', 'taluka'];
        return townKeywords.some(keyword => locationLower.includes(keyword));
    }

    mentionsDistrict(sentence) {
        const districtKeywords = ['district', 'dist', 'near'];
        const sentenceLower = sentence.toLowerCase();
        
        return districtKeywords.some(keyword => sentenceLower.includes(keyword));
    }
}

module.exports = IntroductionValidator;
