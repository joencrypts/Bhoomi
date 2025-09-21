// Gemini API Configuration for Bhoomi Export Management System
// =========================================================

// API Configuration
const GEMINI_CONFIG = {
    // Replace with your actual Gemini API key
    API_KEY: 'AIzaSyCRXwz335iHlcdyeKl11cGDzAu1zfWBchs',
    
    // API Endpoints
    ENDPOINTS: {
        GENERATE_CONTENT: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
        GENERATE_CONTENT_VISION: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent'
    },
    
    // Request Configuration
    REQUEST_CONFIG: {
        headers: {
            'Content-Type': 'application/json',
        },
        timeout: 30000, // 30 seconds timeout
        retryAttempts: 3
    },
    
    // Export-specific prompts
    PROMPTS: {
        COMPLIANCE_CHECK: (commodity, country) => `Analyze export compliance for agricultural byproduct "${commodity}" to "${country}". 
            Provide detailed analysis including:
            1. Is export allowed (true/false)
            2. Estimated import duties (percentage range)
            3. Required certificates (array of strings)
            4. Any restrictions (string)
            5. Compliance score (0-100)
            6. Potential issues (array of strings)
            
            Format response as JSON with keys: allowed, duties, requirements, restrictions, complianceScore, issues.
            Focus on agricultural byproducts, food safety regulations, and international trade compliance.`,
            
        DUTY_CALCULATION: (commodity, country, value) => `Calculate import duties and taxes for agricultural byproduct "${commodity}" 
            from India to "${country}" with value $${value}. 
            Provide detailed breakdown including:
            1. Basic duty rate (percentage)
            2. Additional duties (if any)
            3. Total estimated duties (percentage and amount)
            4. Any preferential rates available
            5. Documentation requirements for duty benefits
            
            Format as JSON with keys: basicDuty, additionalDuties, totalDuty, preferentialRates, documentationRequirements.`,
            
        DOCUMENTATION_REQUIREMENTS: (commodity, country) => `List all required export documentation for agricultural byproduct "${commodity}" 
            from India to "${country}". Include:
            1. Mandatory certificates
            2. Optional but recommended documents
            3. Specific requirements for each document
            4. Validity periods
            5. Issuing authorities
            
            Format as JSON with keys: mandatory, optional, requirements, validity, authorities.`,
            
        REGULATORY_ALERTS: (commodity, country) => `Check for recent regulatory changes affecting export of "${commodity}" to "${country}".
            Include:
            1. Recent policy changes
            2. New certification requirements
            3. Updated duty rates
            4. Compliance deadlines
            5. Risk factors
            
            Format as JSON with keys: policyChanges, newRequirements, updatedRates, deadlines, riskFactors.`,
            
        MARKET_ANALYSIS: (commodity, country) => `Provide market analysis for agricultural byproduct "${commodity}" in "${country}".
            Include:
            1. Market demand trends
            2. Price analysis
            3. Competitor landscape
            4. Growth opportunities
            5. Market entry requirements
            
            Format as JSON with keys: demandTrends, priceAnalysis, competitors, opportunities, entryRequirements.`
    }
};

// API Helper Functions
class GeminiAPI {
    constructor(config = GEMINI_CONFIG) {
        this.config = config;
        this.apiKey = config.API_KEY;
        this.endpoints = config.ENDPOINTS;
    }
    
    async makeRequest(prompt, model = 'gemini-pro') {
        const endpoint = model === 'gemini-pro-vision' ? 
            this.endpoints.GENERATE_CONTENT_VISION : 
            this.endpoints.GENERATE_CONTENT;
            
        try {
            const response = await fetch(`${endpoint}?key=${this.apiKey}`, {
                method: 'POST',
                headers: this.config.REQUEST_CONFIG.headers,
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }]
                })
            });
            
            if (!response.ok) {
                throw new Error(`Gemini API error: ${response.status} - ${response.statusText}`);
            }
            
            const data = await response.json();
            return this.parseResponse(data);
            
        } catch (error) {
            console.error('Gemini API Request Failed:', error);
            throw error;
        }
    }
    
    parseResponse(data) {
        try {
            const aiResponse = data.candidates[0].content.parts[0].text;
            
            // Extract JSON from response
            const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('Invalid response format from Gemini API');
            }
        } catch (error) {
            console.error('Response Parsing Error:', error);
            throw error;
        }
    }
    
    // Export-specific API calls
    async checkCompliance(commodity, country) {
        const prompt = this.config.PROMPTS.COMPLIANCE_CHECK(commodity, country);
        return await this.makeRequest(prompt);
    }
    
    async calculateDuties(commodity, country, value) {
        const prompt = this.config.PROMPTS.DUTY_CALCULATION(commodity, country, value);
        return await this.makeRequest(prompt);
    }
    
    async getDocumentationRequirements(commodity, country) {
        const prompt = this.config.PROMPTS.DOCUMENTATION_REQUIREMENTS(commodity, country);
        return await this.makeRequest(prompt);
    }
    
    async getRegulatoryAlerts(commodity, country) {
        const prompt = this.config.PROMPTS.REGULATORY_ALERTS(commodity, country);
        return await this.makeRequest(prompt);
    }
    
    async getMarketAnalysis(commodity, country) {
        const prompt = this.config.PROMPTS.MARKET_ANALYSIS(commodity, country);
        return await this.makeRequest(prompt);
    }
}

// Initialize Gemini API instance
const geminiAPI = new GeminiAPI();

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GeminiAPI, GEMINI_CONFIG, geminiAPI };
}

// Make available globally for dashboard.html
if (typeof window !== 'undefined') {
    window.GeminiAPI = GeminiAPI;
    window.GEMINI_CONFIG = GEMINI_CONFIG;
    window.geminiAPI = geminiAPI;
}
