const https = require('https');
const http = require('http');

class LLMAnalyzer {
  constructor(config = {}) {
    this.provider = config.provider || 'openai'; // 'openai', 'anthropic', or 'ollama'
    this.apiKey = config.apiKey || process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY;
    this.model = config.model || this.getDefaultModel();
    this.ollamaHost = config.ollamaHost || 'http://localhost:11434';
    this.enabled = config.enabled !== false;
    this.analysisInterval = config.analysisInterval || 30000; // Analyze every 30 seconds by default
  }

  getDefaultModel() {
    switch (this.provider) {
      case 'anthropic': return 'claude-3-5-sonnet-20241022';
      case 'ollama': return 'llava'; // Local vision model
      default: return 'gpt-4o';
    }
  }

  async analyzeScreenshot(base64Image, context = {}) {
    if (!this.enabled) return null;

    const prompt = this.buildPrompt(context);

    try {
      switch (this.provider) {
        case 'anthropic':
          return await this.analyzeWithAnthropic(base64Image, prompt);
        case 'ollama':
          return await this.analyzeWithOllama(base64Image, prompt);
        default:
          return await this.analyzeWithOpenAI(base64Image, prompt);
      }
    } catch (err) {
      console.error('LLM analysis failed:', err.message);
      return { error: err.message };
    }
  }

  buildPrompt(context) {
    return `You are Ghost QA, an AI-powered QA tester analyzing a web application screenshot.

Current page: ${context.url || 'Unknown'}
Actions performed: ${context.actionsPerformed || 0}
Previous errors found: ${context.errorsFound || 0}

Analyze this screenshot and identify any issues. Look for:

1. **UI/UX Bugs**
   - Overlapping elements
   - Cut-off text or images
   - Misaligned components
   - Broken layouts
   - Missing images or icons

2. **Accessibility Issues**
   - Low contrast text
   - Missing labels on form fields
   - Small touch targets
   - Missing alt text indicators

3. **Content Problems**
   - Placeholder text still visible (Lorem ipsum, TODO, etc.)
   - Spelling or grammar errors
   - Confusing or unclear messaging
   - Inconsistent terminology

4. **Functional Concerns**
   - Disabled buttons that should be enabled
   - Forms that appear incomplete
   - Error states without clear messages
   - Loading states stuck

5. **Visual Polish**
   - Inconsistent spacing
   - Mixed font styles
   - Color inconsistencies
   - Unprofessional appearance

Respond in this JSON format:
{
  "issues": [
    {
      "severity": "high|medium|low",
      "category": "ui|accessibility|content|functional|visual",
      "description": "Brief description of the issue",
      "location": "Where on the screen (e.g., 'top navigation', 'main form', 'footer')",
      "suggestion": "How to fix it"
    }
  ],
  "overallScore": 1-10,
  "summary": "One sentence summary of the page quality"
}

If the page looks good with no issues, return an empty issues array with a high score.
Be concise but specific. Only report real issues, not nitpicks.`;
  }

  async analyzeWithOpenAI(base64Image, prompt) {
    const imageData = base64Image.replace(/^data:image\/\w+;base64,/, '');
    
    const body = JSON.stringify({
      model: this.model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${imageData}`,
                detail: 'high'
              }
            }
          ]
        }
      ],
      max_tokens: 1000
    });

    return new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'api.openai.com',
        path: '/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Length': Buffer.byteLength(body)
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.error) {
              reject(new Error(json.error.message));
              return;
            }
            const content = json.choices?.[0]?.message?.content || '';
            resolve(this.parseResponse(content));
          } catch (e) {
            reject(e);
          }
        });
      });

      req.on('error', reject);
      req.write(body);
      req.end();
    });
  }

  async analyzeWithAnthropic(base64Image, prompt) {
    const imageData = base64Image.replace(/^data:image\/\w+;base64,/, '');
    
    const body = JSON.stringify({
      model: this.model,
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: imageData
              }
            },
            { type: 'text', text: prompt }
          ]
        }
      ]
    });

    return new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'api.anthropic.com',
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Length': Buffer.byteLength(body)
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.error) {
              reject(new Error(json.error.message));
              return;
            }
            const content = json.content?.[0]?.text || '';
            resolve(this.parseResponse(content));
          } catch (e) {
            reject(e);
          }
        });
      });

      req.on('error', reject);
      req.write(body);
      req.end();
    });
  }

  async analyzeWithOllama(base64Image, prompt) {
    const imageData = base64Image.replace(/^data:image\/\w+;base64,/, '');
    const url = new URL('/api/generate', this.ollamaHost);
    
    const body = JSON.stringify({
      model: this.model,
      prompt: prompt,
      images: [imageData],
      stream: false
    });

    return new Promise((resolve, reject) => {
      const protocol = url.protocol === 'https:' ? https : http;
      const req = protocol.request({
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body)
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.error) {
              reject(new Error(json.error));
              return;
            }
            resolve(this.parseResponse(json.response || ''));
          } catch (e) {
            reject(e);
          }
        });
      });

      req.on('error', reject);
      req.write(body);
      req.end();
    });
  }

  parseResponse(content) {
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      // If JSON parsing fails, return structured response
    }

    // Return as unstructured analysis
    return {
      issues: [],
      overallScore: null,
      summary: content.slice(0, 500),
      raw: content
    };
  }
}

module.exports = { LLMAnalyzer };
