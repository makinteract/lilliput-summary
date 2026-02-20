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

const SUMMARY_PROMPT_TEMPLATE = (length, language = 'en', sections = null) => {
    const lengthGuides = {
        1: 'very brief (a few lines)',
        2: 'brief (a few lines to one paragraph)',
        3: 'medium (a few paragraphs)',
        4: 'detailed (several paragraphs)',
        5: 'very detailed (comprehensive paragraphs)'
    };

    const languageMap = {
        'en': 'English',
        'es': 'Spanish',
        'fr': 'French',
        'de': 'German',
        'it': 'Italian',
        'pt': 'Portuguese',
        'ko': 'Korean',
        'ja': 'Japanese',
        'zh': 'Simplified Chinese',
        'zh-TW': 'Traditional Chinese',
        'ru': 'Russian',
        'ar': 'Arabic'
    };

    const targetLanguage = languageMap[language] || 'English';

    // Build the section prompt based on which sections are visible
    let sectionPrompt = '';
    const visibleSections = [];
    
    if (sections) {
        if (sections.problem.visible) {
            const problemLen = lengthGuides[sections.problem.length];
            visibleSections.push(`1) Problem and Motivation\nWhat is the paper contribution? What is the gist of the paper or the main takeaway?\nLength: ${problemLen}`);
        }
        if (sections.system.visible) {
            const systemLen = lengthGuides[sections.system.length];
            visibleSections.push(`2) System\nDescribe the system, if any, or the method used to validate the work. If this is an opinion paper, state it here and describe that.\nLength: ${systemLen}`);
        }
        if (sections.evaluation.visible) {
            const evalLen = lengthGuides[sections.evaluation.length];
            visibleSections.push(`3) Evaluation\nSummarize the evaluation or any other important aspect related with the feasibility of the idea or how it is related with creativity support tools or prior research.\nLength: ${evalLen}`);
        }
        sectionPrompt = visibleSections.join('\n\n');
    } else {
        // Fallback to default sections with overall length
        sectionPrompt = `1) Problem and Motivation
What is the paper contribution? What is the gist of the paper or the main takeaway?
Length: ${lengthGuides[length]}

2) System
Describe the system, if any, or the method used to validate the work. If this is an opinion paper, state it here and describe that.
Length: ${lengthGuides[length]}

3) Evaluation
Summarize the evaluation or any other important aspect related with the feasibility of the idea or how it is related with creativity support tools or prior research.
Length: ${lengthGuides[length]}`;
    }

    return `Summarize the paper in the following sections. Write the response in ${targetLanguage}.

Structure your response EXACTLY as follows, with each section starting on a new line with its header:

${sectionPrompt}

IMPORTANT: 
- Use **text** (markdown bold syntax with double asterisks) to highlight the most important concepts, key findings, novel contributions, and critical terms.
- Keep each section clearly separated with a blank line between them.
- Start each section with its number and title as shown above.
- Respond ONLY in ${targetLanguage}.

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
        const { text, length = 3, apiKey, language = 'en', sections = null } = req.body;

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
                    content: SUMMARY_PROMPT_TEMPLATE(length, language, sections) + truncatedText,
                }
            ],
        });

        const summary = message.choices[0].message.content;

        // Parse the summary into three sections
        const parsedSections = parseSummaryIntoSections(summary);

        res.json({ summary, sections: parsedSections });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ 
            error: error.message || 'Failed to generate summary' 
        });
    }
});

app.post('/ask', async (req, res) => {
    try {
        const { text, question, apiKey, language = 'en' } = req.body;

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

        const languageMap = {
            'en': 'English',
            'es': 'Spanish',
            'fr': 'French',
            'de': 'German',
            'it': 'Italian',
            'pt': 'Portuguese',
            'ko': 'Korean',
            'ja': 'Japanese',
            'zh': 'Simplified Chinese',
            'zh-TW': 'Traditional Chinese',
            'ru': 'Russian',
            'ar': 'Arabic'
        };

        const targetLanguage = languageMap[language] || 'English';

        const message = await client.chat.completions.create({
            model: 'gpt-4o-mini',
            max_tokens: 512,
            messages: [
                {
                    role: 'user',
                    content: `Based on the following paper text, answer this question in ${targetLanguage}: "${question}"\n\nIMPORTANT: Use **text** (markdown bold syntax with double asterisks) to highlight the most important concepts, key findings, and critical terms in your answer.\n\nRespond ONLY in ${targetLanguage}.\n\nPaper text:\n${truncatedText}`,
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
