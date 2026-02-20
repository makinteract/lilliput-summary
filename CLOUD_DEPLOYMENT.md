# Cloud Deployment Guide

Your PDF Paper Summarizer is now ready for cloud deployment. Here's what you need to know:

## What Changed

The application has been updated to work seamlessly on cloud platforms:

### Server
- **Listens on all network interfaces** (`0.0.0.0:PORT`) instead of just localhost
- **Port configuration**: Uses `PORT` environment variable (defaults to 3000)
- Works with any cloud platform that sets the PORT variable

### Client
- **Dynamic API endpoint discovery**: Uses `window.location.origin` to determine the server URL
- **No hardcoded URLs**: Automatically adapts to your cloud domain
- Works identically on localhost and cloud

## Environment Variables Required

Create a `.env` file in your project root with:

```
# Optional - only if you want to override the default port
PORT=3000

# Optional - add any other environment variables you need
```

## Deployment Steps

### 1. Platform-Specific Setup

#### Heroku
```bash
# Login and create app
heroku login
heroku create your-app-name

# Set environment variables (if needed)
heroku config:set PORT=3000

# Deploy
git push heroku main
```

#### AWS EC2
```bash
# Install Node.js and npm
sudo apt-get update
sudo apt-get install nodejs npm

# Clone repository
git clone <your-repo-url>
cd pdf-papers-summarizer

# Install dependencies
npm install

# Run with nohup to keep running after disconnect
nohup npm start > app.log 2>&1 &

# Or use PM2 for production
npm install -g pm2
pm2 start server.js --name "pdf-summarizer"
pm2 startup
pm2 save
```

#### Docker (works on any cloud platform)
```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 3000
ENV PORT=3000

CMD ["npm", "start"]
```

Then build and push:
```bash
docker build -t pdf-summarizer .
docker push your-registry/pdf-summarizer
```

### 2. Security Considerations

⚠️ **Important**: Your OpenAI API key is entered in the browser. To make this production-safe:

**Option A: Backend API Key (Recommended)**
- Store the OpenAI API key on the server
- Modify `/summarize` and `/ask` endpoints to use server-side key
- User doesn't enter their own key

**Option B: Keep Current Setup**
- Users provide their own API key
- Add HTTPS/TLS requirement
- Consider adding rate limiting to prevent key abuse
- Consider adding authentication (login system)

**Example backend key implementation:**
```javascript
// In server.js
require('dotenv').config();
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// In summarize endpoint
const client = new OpenAI({
    apiKey: OPENAI_API_KEY, // Use server key instead of req.body.apiKey
});
```

### 3. HTTPS/SSL Requirement

Most cloud platforms provide free HTTPS. Ensure:
- Your domain uses HTTPS
- Update any hardcoded URLs to use HTTPS

The client automatically handles this since it uses `window.location.origin`.

### 4. Database (Optional)

If you want to store summaries:
- MongoDB Atlas
- PostgreSQL
- AWS RDS
- Firebase Firestore

Add storage endpoints like:
```javascript
app.post('/api/summaries', async (req, res) => {
  // Save summary to database
});
```

### 5. File Size Limits

Currently set to 50MB in the server:
```javascript
app.use(express.json({ limit: '50mb' }));
```

Adjust based on your cloud platform's requirements.

### 6. Testing Your Deployment

1. Navigate to your cloud URL (e.g., https://your-app.com)
2. Enter your OpenAI API key
3. Upload a PDF
4. Verify summary generation works
5. Test re-summarization and Q&A features

## Troubleshooting

### "Connection Refused"
- Verify server is running on correct port
- Check security groups/firewall allow inbound connections
- Confirm PORT environment variable is set correctly

### "API requests failing"
- Check OPENAI_API_KEY is valid
- Verify OpenAI API credits available
- Check rate limits haven't been hit

### "Static files not loading"
- Verify `express.static('.')` in server.js
- Check index.html is in project root
- Verify correct file paths

### "CORS errors"
- The application doesn't use complex CORS, but if you split frontend/backend:
  - Add CORS middleware: `const cors = require('cors'); app.use(cors());`
  - Install: `npm install cors`

## Performance Optimization

For production with many users:

1. **Caching**: Add Redis for API response caching
2. **Load Balancing**: Use cloud platform's load balancer
3. **Content Delivery**: Serve static files from CDN
4. **Database**: Cache PDFs and summaries

## Monitoring

Recommended tools:
- **Heroku**: Built-in monitoring
- **AWS**: CloudWatch
- **Google Cloud**: Cloud Logging
- **Third-party**: Sentry, DataDog, New Relic

Add logging:
```javascript
console.log(`[${new Date().toISOString()}] Request to /summarize`);
```

## Support

For issues, check:
1. Server logs for errors
2. Browser console (F12) for client errors
3. OpenAI API status page
4. Cloud platform status page

