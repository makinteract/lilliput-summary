# PDF Paper Summarizer

A web application that allows you to upload PDF research papers and get AI-powered summaries using the OpenAI API.

## Features

- **Drag & Drop Upload**: Easy PDF file upload with drag-and-drop support
- **PDF Text Extraction**: Automatically extracts text from PDF files
- **AI Summarization**: Uses OpenAI to generate structured summaries with three paragraphs:
  - Problem and motivation
  - Methods and validation
  - Evaluation and feasibility
- **Beautiful UI**: Modern, responsive design with gradient backgrounds

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- OpenAI API key (get one at https://platform.openai.com/api-keys)

## Setup Instructions

1. **Clone or navigate to the project directory**

   ```bash
   cd reseracher-aid
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**
   - Copy the `.env` file and add your OpenAI API key:

   ```bash
   OPENAI_API_KEY=sk-your-actual-api-key-here
   PORT=3000
   ```

4. **Start the server**

   ```bash
   npm start
   ```

5. **Open your browser**
   - Navigate to `http://localhost:3000`
   - Upload a PDF file and click "Summarize with AI"

## How It Works

1. **Frontend (client.js & index.html)**
   - User selects or drags a PDF file
   - PDF.js library extracts all text from the PDF
   - Text is sent to the backend server

2. **Backend (server.js)**
   - Receives the extracted text
   - Sends it to OpenAI's Claude API with a specific prompt
   - Returns the structured summary to the frontend

3. **Display**
   - Summary is displayed in three paragraphs on the web page

## File Structure

```
reseracher-aid/
├── index.html          # Main HTML page
├── client.js           # Frontend JavaScript
├── server.js           # Express backend
├── package.json        # Dependencies
├── .env               # Environment variables (create this)
├── .gitignore         # Git ignore file
└── README.md          # This file
```

## Technologies Used

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **PDF Processing**: PDF.js
- **Backend**: Express.js
- **AI**: OpenAI API (Claude 3.5 Sonnet)
- **Environment**: Node.js

## Notes

- PDF files are limited to 10MB
- Text extraction might have limitations with complex PDF layouts
- The summary is limited to papers with reasonable token counts
- Make sure your OpenAI API key has sufficient credits

## Troubleshooting

**"OpenAI API key not configured"**

- Make sure you've added your API key to the `.env` file
- Restart the server after updating `.env`

**"Failed to generate summary"**

- Check your OpenAI API key is valid
- Check your account has sufficient credits
- The paper might be too long (try a shorter paper first)

**PDF extraction issues**

- Some PDFs with complex layouts may not extract text properly
- Text-based PDFs work best
