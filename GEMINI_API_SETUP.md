# Gemini API Integration Setup Guide for Bhoomi Export Management

## Overview
This guide explains how to integrate Google's Gemini API with Bhoomi's export management system for AI-powered compliance checking, duty calculations, and documentation requirements.

## Prerequisites
- Google Cloud Platform account
- Gemini API access enabled
- Valid API key

## Step 1: Get Gemini API Key

### 1.1 Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Generative AI API

### 1.2 Generate API Key
1. Navigate to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "API Key"
3. Copy the generated API key
4. (Optional) Restrict the API key to your domain for security

## Step 2: Configure API Key

### Option A: Using External Configuration File (Recommended)
1. Open `gemini-config.js`
2. Replace `YOUR_GEMINI_API_KEY_HERE` with your actual API key:
```javascript
const GEMINI_CONFIG = {
    API_KEY: 'your-actual-api-key-here',
    // ... rest of configuration
};
```

3. Include the configuration file in your HTML:
```html
<head>
    <!-- Other head elements -->
    <script src="gemini-config.js"></script>
    <!-- Include your specific dashboard page, e.g., manufacturer (industry) dashboard -->
    <script src="industry-dashboard.html"></script>
</head>
```

### Option B: Direct Configuration in Dashboard
1. Open your dashboard page (e.g., `industry-dashboard.html` for manufacturers)
2. Find the fallback function `fallbackGeminiCall`
3. Replace `YOUR_GEMINI_API_KEY_HERE` with your actual API key:
```javascript
async function fallbackGeminiCall(type, params) {
    const apiKey = 'your-actual-api-key-here'; // Replace with actual API key
    // ... rest of function
}
```

## Step 3: Test API Integration

### 3.1 Test Compliance Check
1. Open the dashboard as a manufacturer
2. Navigate to "Export Management" > "Compliance & Legal"
3. Select a commodity and destination country
4. Click "Run AI Compliance Check"
5. Verify that AI-powered results are displayed

### 3.2 Test Duty Calculator
1. In the same Compliance & Legal tab
2. Fill in the duty calculator form
3. Click "Calculate Import Duties"
4. Verify duty calculations are displayed

### 3.3 Test Documentation Requirements
1. Fill in the documentation requirements form
2. Click "Check Documentation Requirements"
3. Verify comprehensive documentation list is shown

## Step 4: API Features

### 4.1 Compliance Checking
- **Function**: `callGeminiComplianceAPI(commodity, country)`
- **Purpose**: Analyzes export compliance for agricultural byproducts
- **Returns**: Export permission, duties, required certificates, restrictions, compliance score

### 4.2 Duty Calculation
- **Function**: `callGeminiDutyCalculator(commodity, country, value)`
- **Purpose**: Calculates import duties and taxes
- **Returns**: Basic duty rate, additional duties, total duties, preferential rates

### 4.3 Documentation Requirements
- **Function**: `callGeminiDocumentationRequirements(commodity, country)`
- **Purpose**: Lists required export documentation
- **Returns**: Mandatory certificates, optional documents, requirements, validity periods

## Step 5: Error Handling

### 5.1 API Failures
The system includes automatic fallback to simulation data if the API fails:
- Compliance checks fall back to predefined rules
- Duty calculations use standard rates
- Documentation requirements show standard lists

### 5.2 Common Issues
- **Invalid API Key**: Check key format and permissions
- **Rate Limiting**: Implement retry logic with exponential backoff
- **Network Issues**: Check internet connection and firewall settings
- **Response Parsing**: Ensure API returns valid JSON format

## Step 6: Security Considerations

### 6.1 API Key Security
- Never expose API keys in client-side code for production
- Use environment variables or server-side configuration
- Implement API key rotation
- Monitor API usage and set up alerts

### 6.2 Rate Limiting
- Implement request throttling
- Cache responses when appropriate
- Monitor API quota usage

## Step 7: Advanced Configuration

### 7.1 Custom Prompts
Modify prompts in `gemini-config.js` to customize AI responses:
```javascript
PROMPTS: {
    COMPLIANCE_CHECK: (commodity, country) => `Your custom prompt here...`,
    // ... other prompts
}
```

### 7.2 Model Selection
Switch between different Gemini models:
```javascript
// Use Gemini Pro Vision for image analysis
const response = await geminiAPI.makeRequest(prompt, 'gemini-pro-vision');
```

### 7.3 Response Formatting
Customize JSON response parsing:
```javascript
parseResponse(data) {
    // Custom parsing logic
    const aiResponse = data.candidates[0].content.parts[0].text;
    // Extract and format response
    return formattedResponse;
}
```

## Step 8: Monitoring and Analytics

### 8.1 API Usage Tracking
- Monitor API calls and responses
- Track success/failure rates
- Analyze response times

### 8.2 Error Logging
- Log API errors for debugging
- Implement error reporting
- Track fallback usage

## Step 9: Production Deployment

### 9.1 Environment Setup
- Use production API keys
- Implement proper error handling
- Set up monitoring and alerts

### 9.2 Performance Optimization
- Implement response caching
- Use connection pooling
- Optimize request payloads

## Troubleshooting

### Common Issues and Solutions

1. **"API key not found" error**
   - Verify API key is correctly set
   - Check for typos in configuration
   - Ensure API key has proper permissions

2. **"Invalid response format" error**
   - Check if API is returning valid JSON
   - Verify prompt format
   - Implement better error handling

3. **"Network error" or timeout**
   - Check internet connection
   - Verify API endpoint URL
   - Implement retry logic

4. **Rate limiting errors**
   - Implement request throttling
   - Use exponential backoff
   - Consider upgrading API quota

## Support

For additional support:
- Check [Gemini API Documentation](https://ai.google.dev/docs)
- Review [Google Cloud Console](https://console.cloud.google.com/)
- Contact Bhoomi support team

## API Usage Examples

### Basic Compliance Check
```javascript
// Using the global instance
const results = await window.geminiAPI.checkCompliance('rice-husk', 'US');
console.log(results);
```

### Custom API Call
```javascript
// Direct API call
const customPrompt = "Your custom prompt here...";
const results = await window.geminiAPI.makeRequest(customPrompt);
```

### Error Handling
```javascript
try {
    const results = await window.geminiAPI.checkCompliance(commodity, country);
    // Process results
} catch (error) {
    console.error('API Error:', error);
    // Handle error or use fallback
}
```

This setup provides a robust, AI-powered export management system with comprehensive compliance checking, duty calculations, and documentation requirements using Google's Gemini API.
