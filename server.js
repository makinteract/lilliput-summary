const express = require('express');
const OpenAI = require('openai');
const https = require('https');
const http = require('http');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.static('.'));

// Initialize OpenAI client
let client;
if (process.env.OPENAI_API_KEY) {
    client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });
}

const SUMMARY_PROMPT_TEMPLATE = (length) => {
    const lengthGuides = {
        1: 'very brief (a few lines)',
        2: 'brief (a few lines to one paragraph)',
        3: 'medium (a few paragraphs)',
        4: 'detailed (several paragraphs)',
        5: 'very detailed (comprehensive paragraphs)'
    };

    return `Summarize the paper in three sections. Each section should span from ${lengthGuides[length]}.

Structure your response EXACTLY as follows, with each section starting on a new line with its header:

1) Problem and Motivation
What is the paper contribution? What is the gist of the paper or the main takeaway?

2) System
Describe the system, if any, or the method used to validate the work. If this is an opinion paper, state it here and describe that.

3) Evaluation
Summarize the evaluation or any other important aspect related with the feasibility of the idea or how it is related with creativity support tools or prior research.

IMPORTANT: 
- Use **text** (markdown bold syntax with double asterisks) to highlight the most important concepts, key findings, novel contributions, and critical terms.
- Keep each section clearly separated with a blank line between them.
- Start each section with its number and title as shown above.

Here is the paper text:

`;
};

// Parse summary into three sections
function parseSummaryIntoSections(summary) {
    const sectionTitles = [
        'Problem and Motivation',
        'System',
        'Evaluation'
    ];
    
    const sections = {};
    
    // Try to extract sections based on numbered headers
    const sectionRegex = /\d\)\s*([^\n]+)\n([\s\S]*?)(?=\d\)|$)/g;
    let match;
    let sectionIndex = 0;
    
    while ((match = sectionRegex.exec(summary)) !== null && sectionIndex < 3) {
        const title = match[1].trim();
        const content = match[2].trim();
        sections[sectionIndex] = {
            title: sectionTitles[sectionIndex],
            content: content
        };
        sectionIndex++;
    }
    
    // If parsing failed, try to split by section pattern
    if (sectionIndex === 0) {
        const parts = summary.split(/\n\n+/);
        for (let i = 0; i < Math.min(3, parts.length); i++) {
            sections[i] = {
                title: sectionTitles[i],
                content: parts[i].trim()
            };
        }
    }
    
    // Ensure all three sections exist
    for (let i = 0; i < 3; i++) {
        if (!sections[i]) {
            sections[i] = {
                title: sectionTitles[i],
                content: ''
            };
        }
    }
    
    return [sections[0], sections[1], sections[2]];
}

app.post('/summarize', async (req, res) => {
    try {
        const { text, length = 3 } = req.body;

        if (!text) {
            return res.status(400).json({ error: 'No text provided' });
        }

        if (!client) {
            return res.status(500).json({ 
                error: 'OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.' 
            });
        }

        // Truncate text if too long (to stay within token limits)
        const maxTokens = 8000; // Rough estimate: 1 token ≈ 4 characters
        const truncatedText = text.substring(0, maxTokens * 4);

        const message = await client.chat.completions.create({
            model: 'gpt-4o-mini',
            max_tokens: 1024,
            messages: [
                {
                    role: 'user',
                    content: SUMMARY_PROMPT_TEMPLATE(length) + truncatedText,
                }
            ],
        });

        const summary = message.choices[0].message.content;

        // Parse the summary into three sections
        const sections = parseSummaryIntoSections(summary);

        res.json({ summary, sections });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ 
            error: error.message || 'Failed to generate summary' 
        });
    }
});

app.post('/ask', async (req, res) => {
    try {
        const { text, question } = req.body;

        if (!text || !question) {
            return res.status(400).json({ error: 'Missing text or question' });
        }

        if (!client) {
            return res.status(500).json({ 
                error: 'OpenAI API key not configured.' 
            });
        }

        // Truncate text if too long
        const maxTokens = 8000;
        const truncatedText = text.substring(0, maxTokens * 4);

        const message = await client.chat.completions.create({
            model: 'gpt-4o-mini',
            max_tokens: 512,
            messages: [
                {
                    role: 'user',
                    content: `Based on the following paper text, answer this question: "${question}"\n\nPaper text:\n${truncatedText}`,
                }
            ],
        });

        const answer = message.choices[0].message.content;

        res.json({ answer });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ 
            error: error.message || 'Failed to answer question' 
        });
    }
});

app.post('/download-pdf', async (req, res) => {
    try {
        const { url } = req.body;

        if (!url) {
            return res.status(400).json({ error: 'No URL provided' });
        }

        // Validate URL
        try {
            new URL(url);
        } catch {
            return res.status(400).json({ error: 'Invalid URL' });
        }

        // Download PDF
        const pdfBuffer = await downloadFile(url);

        // Extract text from PDF
        const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.js');
        const pdf = await getDocument({ data: pdfBuffer }).promise;
        
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            fullText += pageText + '\n';
        }

        res.json({ text: fullText });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ 
            error: error.message || 'Failed to download and extract PDF' 
        });
    }
});

function downloadFile(url) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;
        
        protocol.get(url, { timeout: 10000 }, (response) => {
            // Follow redirects
            if (response.statusCode === 301 || response.statusCode === 302) {
                return downloadFile(response.headers.location).then(resolve).catch(reject);
            }

            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download: HTTP ${response.statusCode}`));
                return;
            }

            const chunks = [];
            response.on('data', chunk => chunks.push(chunk));
            response.on('end', () => resolve(Buffer.concat(chunks)));
            response.on('error', reject);
        }).on('error', reject);
    });
}

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    if (!process.env.OPENAI_API_KEY) {
        console.log('Make sure to set OPENAI_API_KEY environment variable');
    }
});
