// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

let selectedFile = null;
let extractedText = null;
let currentSummaryLength = 3;
let apiKeyCollapsed = false;
let sectionLengths = {
  problem: 3,
  system: 3,
  evaluation: 3
};
let sectionVisible = {
  problem: true,
  system: true,
  evaluation: true
};
let selectedLanguage = 'en';

const inputSection = document.getElementById('inputSection');
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const fileName = document.getElementById('fileName');
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
const apiKeyInput = document.getElementById('apiKeyInput');
const apiKeyStatus = document.getElementById('apiKeyStatus');
const apiKeyHeader = document.getElementById('apiKeyHeader');
const apiKeyToggle = document.getElementById('apiKeyToggle');
const apiKeyContent = document.getElementById('apiKeyContent');
const languageSelect = document.getElementById('languageSelect');
const checkboxes = {
  problem: document.getElementById('checkProblem'),
  system: document.getElementById('checkSystem'),
  evaluation: document.getElementById('checkEvaluation')
};
const sliders = {
  problem: document.getElementById('sliderProblem'),
  system: document.getElementById('sliderSystem'),
  evaluation: document.getElementById('sliderEvaluation')
};
const checkboxesResults = {
  problem: document.getElementById('checkProblemResults'),
  system: document.getElementById('checkSystemResults'),
  evaluation: document.getElementById('checkEvaluationResults')
};
const slidersResults = {
  problem: document.getElementById('sliderProblemResults'),
  system: document.getElementById('sliderSystemResults'),
  evaluation: document.getElementById('sliderEvaluationResults')
};

const lengthLabels = [
  'Very Brief',
  'Brief',
  'Medium',
  'Detailed',
  'Very Detailed',
];
const API_KEY_STORAGE = 'openai_api_key';

// Load API key from localStorage on page load
function loadApiKey() {
  const savedKey = localStorage.getItem(API_KEY_STORAGE);
  if (savedKey) {
    apiKeyInput.value = savedKey;
    updateApiKeyStatus(true);
  } else {
    updateApiKeyStatus(false);
  }
}

function updateApiKeyStatus(isSet) {
  if (isSet) {
    apiKeyStatus.textContent = '✓ Set';
    apiKeyStatus.className = 'api-key-status set';
  } else {
    apiKeyStatus.textContent = 'Not set';
    apiKeyStatus.className = 'api-key-status not-set';
  }
}

// API key input handlers
apiKeyInput.addEventListener('input', () => {
  const key = apiKeyInput.value.trim();
  if (key) {
    localStorage.setItem(API_KEY_STORAGE, key);
    updateApiKeyStatus(true);
  } else {
    localStorage.removeItem(API_KEY_STORAGE);
    updateApiKeyStatus(false);
  }
});

// Get current API key
function getApiKey() {
  return (
    apiKeyInput.value.trim() || localStorage.getItem(API_KEY_STORAGE) || ''
  );
}

// Collapsible API key section
apiKeyHeader.addEventListener('click', () => {
  apiKeyCollapsed = !apiKeyCollapsed;
  apiKeyContent.classList.toggle('open');
  apiKeyToggle.classList.toggle('open');
});

// Load API key on page load
document.addEventListener('DOMContentLoaded', () => {
  loadApiKey();
});

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

// Removed length slider handlers - now using per-section sliders instead

// Section checkbox listeners
checkboxes.problem.addEventListener('change', (e) => {
  sectionVisible.problem = e.target.checked;
});

checkboxes.system.addEventListener('change', (e) => {
  sectionVisible.system = e.target.checked;
});

checkboxes.evaluation.addEventListener('change', (e) => {
  sectionVisible.evaluation = e.target.checked;
});

// Section slider listeners
sliders.problem.addEventListener('input', (e) => {
  sectionLengths.problem = parseInt(e.target.value);
  updateSliderLabel(e.target);
});

sliders.system.addEventListener('input', (e) => {
  sectionLengths.system = parseInt(e.target.value);
  updateSliderLabel(e.target);
});

sliders.evaluation.addEventListener('input', (e) => {
  sectionLengths.evaluation = parseInt(e.target.value);
  updateSliderLabel(e.target);
});

// Language selection listener
languageSelect.addEventListener('change', (e) => {
  selectedLanguage = e.target.value;
});

// Results section checkbox listeners
checkboxesResults.problem.addEventListener('change', (e) => {
  sectionVisible.problem = e.target.checked;
});

checkboxesResults.system.addEventListener('change', (e) => {
  sectionVisible.system = e.target.checked;
});

checkboxesResults.evaluation.addEventListener('change', (e) => {
  sectionVisible.evaluation = e.target.checked;
});

// Results section slider listeners
slidersResults.problem.addEventListener('input', (e) => {
  sectionLengths.problem = parseInt(e.target.value);
  updateSliderLabel(e.target);
});

slidersResults.system.addEventListener('input', (e) => {
  sectionLengths.system = parseInt(e.target.value);
  updateSliderLabel(e.target);
});

slidersResults.evaluation.addEventListener('input', (e) => {
  sectionLengths.evaluation = parseInt(e.target.value);
  updateSliderLabel(e.target);
});

function updateSliderLabel(slider) {
  const value = parseInt(slider.value);
  const label = slider.parentElement.querySelector('.slider-value-label');
  if (label) {
    label.textContent = lengthLabels[value - 1];
  }
}

function handleFileSelect(file) {
  if (file.type !== 'application/pdf') {
    alert('Please select a PDF file');
    return;
  }

  if (file.size > 100 * 1024 * 1024) {
    alert('File is too large (max 100MB)');
    return;
  }

  selectedFile = file;
  fileName.textContent = `Selected: ${file.name}`;
  summarizeBtn.disabled = false;
  results.style.display = 'none';
}

summarizeBtn.addEventListener('click', async () => {
  if (!selectedFile) return;

  const apiKey = getApiKey();
  if (!apiKey) {
    alert('Please enter your OpenAI API key');
    apiKeyInput.focus();
    return;
  }

  summarizeBtn.disabled = true;
  loading.style.display = 'flex';
  results.style.display = 'none';
  loadingText.textContent = 'Generating summary...';

  try {
    // Extract text from PDF
    extractedText = await extractTextFromPDF(selectedFile);

    loadingText.textContent = 'Generating summary...';

    // Send to backend for summarization
    const response = await fetch('/summarize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: extractedText,
        length: currentSummaryLength,
        apiKey: apiKey,
        language: selectedLanguage,
        sections: {
          problem: { visible: sectionVisible.problem, length: sectionLengths.problem },
          system: { visible: sectionVisible.system, length: sectionLengths.system },
          evaluation: { visible: sectionVisible.evaluation, length: sectionLengths.evaluation }
        }
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
  summarizeBtn.disabled = true;
  results.style.display = 'none';
  loading.style.display = 'none';
  inputSection.style.display = 'block';
  qaHistory.innerHTML = '';
  
  // Reset input section controls
  checkboxes.problem.checked = true;
  checkboxes.system.checked = true;
  checkboxes.evaluation.checked = true;
  sliders.problem.value = 3;
  sliders.system.value = 3;
  sliders.evaluation.value = 3;
  updateInputSliderLabels();
  
  // Reset results section controls
  checkboxesResults.problem.checked = true;
  checkboxesResults.system.checked = true;
  checkboxesResults.evaluation.checked = true;
  slidersResults.problem.value = 3;
  slidersResults.system.value = 3;
  slidersResults.evaluation.value = 3;
  updateResultsSliderLabels();
  
  // Reset state
  sectionVisible = { problem: true, system: true, evaluation: true };
  sectionLengths = { problem: 3, system: 3, evaluation: 3 };
});

function updateInputSliderLabels() {
  const sliderElements = [sliders.problem, sliders.system, sliders.evaluation];
  sliderElements.forEach(slider => {
    const value = parseInt(slider.value);
    const label = slider.parentElement.querySelector('.slider-value-label');
    if (label) {
      label.textContent = lengthLabels[value - 1];
    }
  });
}

resummarizeBtn.addEventListener('click', async () => {
  const apiKey = getApiKey();
  if (!apiKey) {
    alert('Please enter your OpenAI API key');
    apiKeyInput.focus();
    return;
  }

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
        length: 3, // Not used when sections object is provided, but included for compatibility
        apiKey: apiKey,
        language: selectedLanguage,
        sections: {
          problem: { visible: sectionVisible.problem, length: sectionLengths.problem },
          system: { visible: sectionVisible.system, length: sectionLengths.system },
          evaluation: { visible: sectionVisible.evaluation, length: sectionLengths.evaluation }
        }
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to regenerate summary');
    }

    const data = await response.json();
    displaySummary(data.summary, data.sections);
    
    // Update results checkboxes and sliders to match current state
    checkboxesResults.problem.checked = sectionVisible.problem;
    checkboxesResults.system.checked = sectionVisible.system;
    checkboxesResults.evaluation.checked = sectionVisible.evaluation;
    slidersResults.problem.value = sectionLengths.problem;
    slidersResults.system.value = sectionLengths.system;
    slidersResults.evaluation.value = sectionLengths.evaluation;
    updateResultsSliderLabels();
  } catch (error) {
    summaryContent.innerHTML = `<div class="error"><strong>Error:</strong> ${error.message}</div>`;
  } finally {
    loading.style.display = 'none';
    resummarizeBtn.disabled = false;
  }
});

function updateResultsSliderLabels() {
  const sliderElements = [slidersResults.problem, slidersResults.system, slidersResults.evaluation];
  sliderElements.forEach(slider => {
    const value = parseInt(slider.value);
    const label = slider.parentElement.querySelector('.slider-value-label');
    if (label) {
      label.textContent = lengthLabels[value - 1];
    }
  });
}

askBtn.addEventListener('click', async () => {
  const question = questionInput.value.trim();
  if (!question || !extractedText) return;

  const apiKey = getApiKey();
  if (!apiKey) {
    alert('Please enter your OpenAI API key');
    apiKeyInput.focus();
    return;
  }

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
        question: question,
        apiKey: apiKey,
        language: selectedLanguage,
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
    const pageText = textContent.items.map((item) => item.str).join(' ');
    fullText += pageText + '\n';
  }

  return fullText;
}

function displaySummary(summary, sections) {
  // If sections are provided, display them in structured format
  if (sections && sections.length >= 3) {
    const sectionIcons = ['📋', '⚙️', '📊'];
    const sectionKeys = ['problem', 'system', 'evaluation'];
    
    const html = sections
      .map((section, index) => {
        const sectionKey = sectionKeys[index];
        
        // Skip if section is not visible
        if (!sectionVisible[sectionKey]) {
          return '';
        }
        
        const paragraphs = section.content
          .split('\n\n')
          .filter((p) => p.trim());
        const contentHtml = paragraphs
          .map((p) => {
            // Convert markdown bold (**text**) to HTML bold (<strong>text</strong>)
            const htmlP = p
              .trim()
              .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
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
    const paragraphs = summary.split('\n\n').filter((p) => p.trim());
    const html = paragraphs
      .map((p) => {
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

  // Convert markdown bold (**text**) to HTML bold (<strong>text</strong>)
  const highlightedAnswer = answer.replace(
    /\*\*(.*?)\*\*/g,
    '<strong>$1</strong>',
  );

  qaItem.innerHTML = `
        <div class="qa-question">❓ ${question}</div>
        <div class="qa-answer">${highlightedAnswer}</div>
    `;
  qaHistory.appendChild(qaItem);
  qaHistory.scrollTop = qaHistory.scrollHeight;
}
