class HobbyValidator {
    constructor() {
        // Hobbies that can be pursued as careers and done alone
        this.validHobbies = [
            // Creative Arts
            'painting', 'drawing', 'sketching', 'photography', 'writing', 'poetry',
            'calligraphy', 'sculpture', 'pottery', 'origami', 'knitting', 'embroidery',
            'jewelry making', 'woodworking', 'carving', 'digital art', 'animation',
            
            // Music (solo instruments/activities)
            'singing', 'guitar playing', 'piano playing', 'violin playing', 'flute playing',
            'keyboard playing', 'harmonica playing', 'music composition', 'music production',
            
            // Literary and Intellectual
            'reading', 'blogging', 'storytelling', 'journaling', 'research',
            'philosophy', 'astronomy', 'archaeology', 'history research',
            
            // Crafts and Making
            'gardening', 'cooking', 'baking', 'candle making', 'soap making',
            'leather working', 'metalworking', 'glass blowing', 'weaving',
            
            // Performance Arts (solo)
            'dancing', 'acting', 'stand-up comedy', 'magic tricks', 'ventriloquism',
            
            // Technical/Digital (non-coding)
            'graphic design', 'video editing', 'sound engineering', '3d modeling',
            'web design', 'ui/ux design',
            
            // Others
            'meditation', 'yoga', 'collecting', 'bird watching', 'nature photography',
            'herbalism', 'perfume making', 'fashion designing'
        ];

        // Explicitly forbidden hobbies
        this.forbiddenHobbies = [
            // Coding related
            'coding', 'programming', 'software development', 'web development',
            'app development', 'game development', 'hacking', 'debugging',
            
            // Sports (typically done in groups or competitive)
            'cricket', 'football', 'basketball', 'volleyball', 'tennis', 'badminton',
            'swimming', 'running', 'cycling', 'gym', 'fitness', 'bodybuilding',
            'wrestling', 'boxing', 'martial arts', 'hockey', 'golf',
            
            // College/Engineering activities
            'robotics', 'electronics projects', 'circuit design', 'lab experiments',
            'technical projects', 'engineering design', 'cad design',
            
            // Group activities
            'debating', 'group discussions', 'team building', 'organizing events',
            'leadership activities', 'student council', 'club activities',
            
            // Generic/vague hobbies
            'studying', 'learning', 'exploring', 'thinking', 'socializing',
            'hanging out', 'chatting', 'browsing internet', 'social media'
        ];

        // Keywords that indicate forbidden activities
        this.forbiddenKeywords = [
            'code', 'program', 'software', 'app', 'game dev', 'hack',
            'sport', 'team', 'group', 'club', 'competition', 'tournament',
            'engineering', 'technical', 'project', 'lab', 'experiment',
            'study', 'learn', 'explore', 'social', 'internet', 'online'
        ];
    }

    validateHobby(hobby) {
        const errors = [];
        const hobbyLower = hobby.toLowerCase().trim();
        
        // Check if only one hobby is mentioned
        if (this.containsMultipleHobbies(hobby)) {
            errors.push('Only one hobby should be mentioned');
        }

        // Check if it's explicitly forbidden
        if (this.forbiddenHobbies.includes(hobbyLower)) {
            errors.push(`"${hobby}" is not allowed as it's either coding, sports, or typical college activity`);
        }

        // Check for forbidden keywords
        const forbiddenKeyword = this.forbiddenKeywords.find(keyword => 
            hobbyLower.includes(keyword)
        );
        if (forbiddenKeyword) {
            errors.push(`Hobby contains forbidden keyword "${forbiddenKeyword}"`);
        }

        // Check if it's a valid hobby
        if (!this.isValidHobby(hobbyLower)) {
            errors.push(`"${hobby}" must be something that can be pursued as a career and done alone`);
        }

        // Additional validation rules
        if (!this.canBePursuedAsCareer(hobbyLower)) {
            errors.push(`"${hobby}" cannot be realistically pursued as a career`);
        }

        if (!this.canBeDoneAlone(hobbyLower)) {
            errors.push(`"${hobby}" typically requires other people or is a group activity`);
        }

        return { isValid: errors.length === 0, errors };
    }

    containsMultipleHobbies(hobby) {
        const multipleIndicators = [' and ', ' & ', ',', ' or ', ' plus '];
        return multipleIndicators.some(indicator => 
            hobby.toLowerCase().includes(indicator)
        );
    }

    isValidHobby(hobbyLower) {
        // Check if it's in the valid hobbies list
        if (this.validHobbies.includes(hobbyLower)) {
            return true;
        }

        // Check for partial matches (e.g., "oil painting" contains "painting")
        return this.validHobbies.some(validHobby => 
            hobbyLower.includes(validHobby) || validHobby.includes(hobbyLower)
        );
    }

    canBePursuedAsCareer(hobbyLower) {
        // If it's in the valid hobbies list, it can be pursued as a career
        if (this.validHobbies.includes(hobbyLower)) {
            return true;
        }

        // List of hobby categories that can become careers
        const careerableCategories = [
            'art', 'music', 'writing', 'design', 'craft', 'cook', 'bak',
            'photograph', 'paint', 'draw', 'sing', 'danc', 'act', 'garden'
        ];

        return careerableCategories.some(category =>
            hobbyLower.includes(category)
        );
    }

    canBeDoneAlone(hobbyLower) {
        // Activities that typically require groups
        const groupActivities = [
            'team', 'group', 'club', 'band', 'orchestra', 'choir',
            'debate', 'discussion', 'meeting', 'party', 'event'
        ];

        return !groupActivities.some(groupActivity => 
            hobbyLower.includes(groupActivity)
        );
    }

    // Helper method to suggest alternative hobbies
    suggestAlternativeHobbies() {
        const suggestions = [
            'painting', 'reading', 'writing', 'photography', 'singing',
            'guitar playing', 'cooking', 'gardening', 'drawing', 'poetry'
        ];
        
        return suggestions[Math.floor(Math.random() * suggestions.length)];
    }

    // Method to get detailed validation info
    getValidationDetails(hobby) {
        const hobbyLower = hobby.toLowerCase().trim();
        
        return {
            isValid: this.isValidHobby(hobbyLower),
            canBePursuedAsCareer: this.canBePursuedAsCareer(hobbyLower),
            canBeDoneAlone: this.canBeDoneAlone(hobbyLower),
            isForbidden: this.forbiddenHobbies.includes(hobbyLower),
            containsForbiddenKeywords: this.forbiddenKeywords.some(keyword => 
                hobbyLower.includes(keyword)
            ),
            hasMultipleHobbies: this.containsMultipleHobbies(hobby)
        };
    }
}

module.exports = HobbyValidator;
