// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

let selectedFile = null;
let extractedText = null;
let currentSummaryLength = 3;

const inputSection = document.getElementById('inputSection');
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const fileName = document.getElementById('fileName');
const urlInput = document.getElementById('urlInput');
const lengthSlider = document.getElementById('lengthSlider');
const lengthValue = document.getElementById('lengthValue');
const lengthSliderResults = document.getElementById('lengthSliderResults');
const lengthValueResults = document.getElementById('lengthValueResults');
const summarizeBtn = document.getElementById('summarizeBtn');
const loading = document.getElementById('loading');
const loadingText = document.getElementById('loadingText');
const results = document.getElementById('results');
const summaryContent = document.getElementById('summaryContent');
const newSummaryBtn = document.getElementById('newSummaryBtn');
const resummarizeBtn = document.getElementById('resummarizeBtn');
const questionInput = document.getElementById('questionInput');
const askBtn = document.getElementById('askBtn');
const qaHistory = document.getElementById('qaHistory');

const lengthLabels = ['Very Brief', 'Brief', 'Medium', 'Detailed', 'Very Detailed'];

// Drag and drop functionality
uploadArea.addEventListener('click', () => fileInput.click());

uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.style.background = '#f0f2ff';
    uploadArea.style.borderColor = '#764ba2';
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.style.background = '#f8f9fa';
    uploadArea.style.borderColor = '#667eea';
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.style.background = '#f8f9fa';
    uploadArea.style.borderColor = '#667eea';
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFileSelect(files[0]);
    }
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFileSelect(e.target.files[0]);
    }
});

urlInput.addEventListener('input', () => {
    if (urlInput.value.trim()) {
        selectedFile = null;
        fileName.textContent = '';
        fileInput.value = '';
        summarizeBtn.disabled = false;
    } else if (!selectedFile) {
        summarizeBtn.disabled = true;
    }
});

lengthSlider.addEventListener('input', (e) => {
    currentSummaryLength = parseInt(e.target.value);
    lengthValue.textContent = lengthLabels[currentSummaryLength - 1];
});

lengthSliderResults.addEventListener('input', (e) => {
    const selectedLength = parseInt(e.target.value);
    lengthValueResults.textContent = lengthLabels[selectedLength - 1];
});

function handleFileSelect(file) {
    if (file.type !== 'application/pdf') {
        alert('Please select a PDF file');
        return;
    }

    if (file.size > 10 * 1024 * 1024) {
        alert('File is too large (max 10MB)');
        return;
    }

    selectedFile = file;
    fileName.textContent = `Selected: ${file.name}`;
    urlInput.value = '';
    summarizeBtn.disabled = false;
    results.style.display = 'none';
}

summarizeBtn.addEventListener('click', async () => {
    if (!selectedFile && !urlInput.value.trim()) return;

    summarizeBtn.disabled = true;
    loading.style.display = 'flex';
    results.style.display = 'none';
    loadingText.textContent = 'Generating summary...';

    try {
        // Extract text from PDF
        if (selectedFile) {
            extractedText = await extractTextFromPDF(selectedFile);
        } else {
            loadingText.textContent = 'Downloading PDF...';
            extractedText = await extractTextFromURL(urlInput.value.trim());
        }

        loadingText.textContent = 'Generating summary...';

        // Send to backend for summarization
        const response = await fetch('/summarize', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                text: extractedText,
                length: currentSummaryLength 
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to generate summary');
        }

        const data = await response.json();
        displaySummary(data.summary, data.sections);
        qaHistory.innerHTML = ''; // Clear Q&A history
    } catch (error) {
        summaryContent.innerHTML = `<div class="error"><strong>Error:</strong> ${error.message}</div>`;
        results.style.display = 'block';
    } finally {
        loading.style.display = 'none';
        summarizeBtn.disabled = false;
    }
});

newSummaryBtn.addEventListener('click', () => {
    selectedFile = null;
    extractedText = null;
    fileName.textContent = '';
    fileInput.value = '';
    urlInput.value = '';
    summarizeBtn.disabled = true;
    results.style.display = 'none';
    loading.style.display = 'none';
    inputSection.style.display = 'block';
    qaHistory.innerHTML = '';
});

resummarizeBtn.addEventListener('click', async () => {
    const selectedLength = parseInt(lengthSliderResults.value);
    
    resummarizeBtn.disabled = true;
    loading.style.display = 'flex';
    loadingText.textContent = 'Regenerating summary...';

    try {
        const response = await fetch('/summarize', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                text: extractedText,
                length: selectedLength 
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to regenerate summary');
        }

        const data = await response.json();
        displaySummary(data.summary, data.sections);
        lengthSliderResults.value = selectedLength;
        lengthValueResults.textContent = lengthLabels[selectedLength - 1];
    } catch (error) {
        summaryContent.innerHTML = `<div class="error"><strong>Error:</strong> ${error.message}</div>`;
    } finally {
        loading.style.display = 'none';
        resummarizeBtn.disabled = false;
    }
});

askBtn.addEventListener('click', async () => {
    const question = questionInput.value.trim();
    if (!question || !extractedText) return;

    askBtn.disabled = true;
    const originalText = askBtn.textContent;
    askBtn.textContent = 'Asking...';

    try {
        const response = await fetch('/ask', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                text: extractedText,
                question: question
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to answer question');
        }

        const data = await response.json();
        displayQA(question, data.answer);
        questionInput.value = '';
    } catch (error) {
        alert(`Error: ${error.message}`);
    } finally {
        askBtn.disabled = false;
        askBtn.textContent = originalText;
    }
});

questionInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        askBtn.click();
    }
});

async function extractTextFromPDF(file) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + '\n';
    }
    
    return fullText;
}

async function extractTextFromURL(url) {
    const response = await fetch('/download-pdf', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: url }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to download PDF');
    }

    const data = await response.json();
    return data.text;
}

function displaySummary(summary, sections) {
    // If sections are provided, display them in structured format
    if (sections && sections.length >= 3) {
        const sectionIcons = ['📋', '⚙️', '📊'];
        const html = sections
            .map((section, index) => {
                const paragraphs = section.content.split('\n\n').filter(p => p.trim());
                const contentHtml = paragraphs
                    .map(p => {
                        // Convert markdown bold (**text**) to HTML bold (<strong>text</strong>)
                        const htmlP = p.trim().replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                        return `<p>${htmlP}</p>`;
                    })
                    .join('');
                
                return `
                    <div class="section">
                        <div class="section-title">
                            <span class="section-icon">${sectionIcons[index]}</span>
                            ${section.title}
                        </div>
                        <div class="section-content">
                            ${contentHtml}
                        </div>
                    </div>
                `;
            })
            .join('');
        
        summaryContent.innerHTML = `<div class="summary-sections">${html}</div>`;
    } else {
        // Fallback to plain text format if sections are not available
        const paragraphs = summary.split('\n\n').filter(p => p.trim());
        const html = paragraphs
            .map(p => {
                // Convert markdown bold (**text**) to HTML bold (<strong>text</strong>)
                const htmlP = p.trim().replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                return `<p>${htmlP}</p>`;
            })
            .join('');
        
        summaryContent.innerHTML = html;
    }
    
    inputSection.style.display = 'none';
    results.style.display = 'block';
}

function displayQA(question, answer) {
    const qaItem = document.createElement('div');
    qaItem.className = 'qa-item';
    qaItem.innerHTML = `
        <div class="qa-question">❓ ${question}</div>
        <div class="qa-answer">${answer}</div>
    `;
    qaHistory.appendChild(qaItem);
    qaHistory.scrollTop = qaHistory.scrollHeight;
}
