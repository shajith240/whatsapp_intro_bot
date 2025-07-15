class CapitalizationValidator {
    constructor() {
        // Words that should not be capitalized (articles, prepositions, conjunctions)
        this.lowercaseWords = [
            'a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'if', 'in', 
            'nor', 'of', 'on', 'or', 'so', 'the', 'to', 'up', 'yet'
        ];
        
        // Common abbreviations that should be uppercase
        this.uppercaseAbbreviations = [
            'IT', 'CS', 'ECE', 'EEE', 'ME', 'CE', 'AI', 'ML', 'IOT', 'VR', 'AR'
        ];
    }

    validateName(name) {
        const errors = [];
        const words = name.split(' ').filter(word => word.length > 0);
        
        if (words.length < 2) {
            errors.push('Name must contain at least first and last name');
        }

        for (const word of words) {
            if (!this.isProperlyCapitalized(word, false)) {
                errors.push(`Name "${word}" must start with capital letter`);
            }
        }

        return { isValid: errors.length === 0, errors };
    }

    validateLocation(location) {
        const errors = [];
        const words = location.split(' ').filter(word => word.length > 0);
        
        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            const isFirstWord = i === 0;
            
            if (!this.isProperlyCapitalized(word, !isFirstWord)) {
                if (this.lowercaseWords.includes(word.toLowerCase()) && !isFirstWord) {
                    // This is acceptable for articles/prepositions in the middle
                    continue;
                }
                errors.push(`Location word "${word}" must be properly capitalized`);
            }
        }

        return { isValid: errors.length === 0, errors };
    }

    validateBranchName(branch) {
        const errors = [];
        const words = branch.split(' ').filter(word => word.length > 0);
        
        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            const isFirstWord = i === 0;
            
            // Check if it's a known abbreviation
            if (this.uppercaseAbbreviations.includes(word.toUpperCase())) {
                if (word !== word.toUpperCase()) {
                    errors.push(`Abbreviation "${word}" should be in uppercase`);
                }
                continue;
            }
            
            // Check if it's a lowercase word that should remain lowercase
            if (this.lowercaseWords.includes(word.toLowerCase()) && !isFirstWord) {
                if (word !== word.toLowerCase()) {
                    errors.push(`Word "${word}" should be lowercase`);
                }
                continue;
            }
            
            // Regular word capitalization check
            if (!this.isProperlyCapitalized(word, false)) {
                errors.push(`Branch name word "${word}" must start with capital letter`);
            }
        }

        return { isValid: errors.length === 0, errors };
    }

    isProperlyCapitalized(word, allowLowercase = false) {
        if (word.length === 0) return false;
        
        // If lowercase is allowed and it's a lowercase word, check if it should be lowercase
        if (allowLowercase && this.lowercaseWords.includes(word.toLowerCase())) {
            return word === word.toLowerCase();
        }
        
        // Check if it's an abbreviation that should be uppercase
        if (this.uppercaseAbbreviations.includes(word.toUpperCase())) {
            return word === word.toUpperCase();
        }
        
        // Regular capitalization: first letter uppercase, rest lowercase
        return word[0] === word[0].toUpperCase() && 
               word.slice(1) === word.slice(1).toLowerCase();
    }

    // Helper method to get properly capitalized version of a word
    getProperCapitalization(word, isFirstWord = false) {
        if (this.uppercaseAbbreviations.includes(word.toUpperCase())) {
            return word.toUpperCase();
        }
        
        if (!isFirstWord && this.lowercaseWords.includes(word.toLowerCase())) {
            return word.toLowerCase();
        }
        
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }

    // Method to suggest correct capitalization for a phrase
    suggestCorrectCapitalization(phrase) {
        const words = phrase.split(' ').filter(word => word.length > 0);
        
        return words.map((word, index) => {
            return this.getProperCapitalization(word, index === 0);
        }).join(' ');
    }
}

module.exports = CapitalizationValidator;
