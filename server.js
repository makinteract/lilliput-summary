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
        const { text, length = 3, apiKey } = req.body;

        if (!text) {
            return res.status(400).json({ error: 'No text provided' });
        }

        if (!apiKey) {
            return res.status(400).json({ 
                error: 'OpenAI API key not provided. Please enter your API key in the UI.' 
            });
        }

        const client = new OpenAI({
            apiKey: apiKey,
        });

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
        const { text, question, apiKey } = req.body;

        if (!text || !question) {
            return res.status(400).json({ error: 'Missing text or question' });
        }

        if (!apiKey) {
            return res.status(400).json({ 
                error: 'OpenAI API key not provided. Please enter your API key in the UI.' 
            });
        }

        const client = new OpenAI({
            apiKey: apiKey,
        });

        // Truncate text if too long
        const maxTokens = 8000;
        const truncatedText = text.substring(0, maxTokens * 4);

        const message = await client.chat.completions.create({
            model: 'gpt-4o-mini',
            max_tokens: 512,
            messages: [
                {
                    role: 'user',
                    content: `Based on the following paper text, answer this question: "${question}"\n\nIMPORTANT: Use **text** (markdown bold syntax with double asterisks) to highlight the most important concepts, key findings, and critical terms in your answer.\n\nPaper text:\n${truncatedText}`,
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

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('Enter your OpenAI API key in the UI to use the application');
});
