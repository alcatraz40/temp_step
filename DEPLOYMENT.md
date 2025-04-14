# Deployment Guide

This guide provides detailed instructions for deploying the Dance Beat Analyzer application to production.

## Frontend Deployment to Vercel

### Prerequisites
- A GitHub account
- A Vercel account (sign up at [vercel.com](https://vercel.com))
- Your code pushed to a GitHub repository

### Step 1: Prepare your code

Ensure your code is ready for production:

1. **Set environment variables**
   - In the `.env` file, make sure `VITE_API_URL` points to your local backend for development
   - These will be overridden in Vercel with production values

2. **Test locally**
   - Run the application with the portable scripts to ensure everything works correctly
   - Verify that all features function as expected

3. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Prepare for production deployment"
   git push origin main
   ```

### Step 2: Deploy to Vercel

1. **Sign in to Vercel**
   - Go to [vercel.com](https://vercel.com) and sign in with your GitHub account

2. **Import your GitHub repository**
   - Click "Add New" → "Project"
   - Select your GitHub repository from the list
   - If your repository isn't listed, you may need to configure Vercel to access it

3. **Configure the project**
   - **Framework Preset**: Select "Vite" from the dropdown
   - **Build Command**: `npm run build` (should be prefilled)
   - **Output Directory**: `dist` (should be prefilled)
   - **Install Command**: `npm install` (should be prefilled)

4. **Set environment variables**
   - Expand the "Environment Variables" section
   - Add the following variable:
     - Name: `VITE_API_URL`
     - Value: The URL of your deployed backend API (e.g., `https://your-backend-api.com`)
   - Optionally add:
     - Name: `VITE_APP_VERSION`
     - Value: Your app version (e.g., `1.0.0`)

5. **Deploy**
   - Click "Deploy"
   - Vercel will build and deploy your application
   - Once complete, you'll receive a URL where your application is hosted

### Step 3: Verify the deployment

1. **Check the environment badge**
   - Visit your deployed application
   - Look for the environment badge in the bottom-right corner
   - Verify it shows "PROD" and the correct API URL

2. **Test all features**
   - Ensure that video analysis works
   - Verify beat detection and visualization
   - Test step generation functionality

## Backend Deployment Options

The backend requires a server that can run Python applications. Here are some options:

### Option 1: Deploy to Heroku

1. **Create a Procfile**
   ```
   web: cd backend && uvicorn main:app --host=0.0.0.0 --port=$PORT
   ```

2. **Create a runtime.txt file**
   ```
   python-3.13.2
   ```

3. **Deploy to Heroku**
   ```bash
   heroku create your-app-name
   git push heroku main
   ```

4. **Set environment variables**
   ```bash
   heroku config:set ALLOWED_ORIGINS=https://your-vercel-domain.vercel.app
   ```

### Option 2: Deploy to a Virtual Machine (DigitalOcean, AWS EC2, etc.)

1. **Set up the VM**
   - Create a VM with Ubuntu
   - Install Python 3.13+, Node.js, and other dependencies

2. **Clone and set up your code**
   ```bash
   git clone <your-repository>
   cd dance_app
   ./portable_setup.sh
   ```

3. **Configure as a service (systemd)**
   ```bash
   # Create a systemd service file
   sudo nano /etc/systemd/system/dance-app.service
   ```

   ```
   [Unit]
   Description=Dance Beat Analyzer Backend
   After=network.target

   [Service]
   User=<your-user>
   WorkingDirectory=/path/to/dance_app/backend
   ExecStart=/path/to/dance_app/venv/bin/python -m uvicorn main:app --host 0.0.0.0 --port=7081
   Restart=always
   Environment="ALLOWED_ORIGINS=https://your-vercel-domain.vercel.app"

   [Install]
   WantedBy=multi-user.target
   ```

4. **Start the service**
   ```bash
   sudo systemctl enable dance-app
   sudo systemctl start dance-app
   ```

5. **Set up NGINX as a reverse proxy**
   - Install NGINX: `sudo apt install nginx`
   - Configure it to forward requests to your backend

### Option 3: Deploy to Google Cloud Run

1. **Build a Docker image**
   ```dockerfile
   FROM python:3.13-slim

   WORKDIR /app
   COPY . .
   RUN pip install -r requirements.txt

   CMD ["python", "-m", "uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8080"]
   ```

2. **Deploy to Cloud Run**
   - Push the Docker image to Google Container Registry
   - Deploy to Cloud Run with the appropriate environment variables

## Connecting Frontend and Backend

After deploying both the frontend and backend:

1. **Update the Vercel environment variable**
   - Go to your Vercel project settings
   - Update the `VITE_API_URL` to point to your deployed backend URL

2. **Configure CORS on the backend**
   - Ensure the backend's `ALLOWED_ORIGINS` includes your Vercel URL

3. **Redeploy if necessary**
   - If you made changes to environment variables, you may need to redeploy

## Troubleshooting

- **CORS errors**: Verify the `ALLOWED_ORIGINS` setting on your backend
- **404 Not Found**: Check API URL configuration
- **Backend connection issues**: Ensure your backend is publicly accessible
- **Model download failures**: Check network connectivity and storage space 