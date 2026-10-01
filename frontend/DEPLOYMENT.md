# Deployment Configuration Guide

## Environment Variables

### Required Environment Variables

The following environment variables must be configured for production deployments:

#### VITE_OPENWEATHER_API_KEY
- **Purpose**: OpenWeather API key for mission environment weather data
- **Source**: Get a free API key from https://openweathermap.org/api
- **Format**: 32-character string (e.g., `0ab90c6f38f076d3d00f1a8f2d8e79da`)
- **Required**: Yes (weather data will show "Service unavailable" if missing)

#### VITE_API_BASE_URL
- **Purpose**: Backend API endpoint for PHM data
- **Format**: Full URL (e.g., `https://sih26054-phm-v2.onrender.com`)
- **Required**: Yes

## Deployment Platforms

### Vercel Deployment

1. Go to your Vercel project settings
2. Navigate to **Environment Variables**
3. Add the following variables:
   - `VITE_OPENWEATHER_API_KEY`: Your OpenWeather API key
   - `VITE_API_BASE_URL`: Your backend API URL
4. Redeploy the application

### Render Deployment

1. Go to your Render service settings
2. Navigate to **Environment**
3. Add the following variables:
   - `VITE_OPENWEATHER_API_KEY`: Your OpenWeather API key
   - `VITE_API_BASE_URL`: Your backend API URL
4. Deploy the application

### Local Development

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Add your API key to `.env`:
   ```
   VITE_OPENWEATHER_API_KEY=your_api_key_here
   VITE_API_BASE_URL=http://localhost:3000
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

## Weather API Troubleshooting

### Checking Environment Variables

The application now includes comprehensive console logging. Open the browser console to see:

- `[Weather Component] Environment variable check` - Shows if API key is present
- `[Weather API] Starting weather data fetch` - Confirms API call initiation
- `[Weather API] API key present` - Confirms key length (without exposing value)
- `[Weather API] Fetching from` - Shows the API endpoint URL (key redacted)
- `[Weather API] Response status` - Shows HTTP response status
- Any error messages with detailed context

### Common Issues

**Issue**: "Missing OpenWeather API key"
- **Cause**: `VITE_OPENWEATHER_API_KEY` not set in environment
- **Fix**: Add the environment variable to your deployment platform or local `.env` file

**Issue**: "OpenWeather API returned 401: Unauthorized"
- **Cause**: Invalid API key
- **Fix**: Verify your API key is correct and active at https://openweathermap.org/api

**Issue**: "OpenWeather API returned 404: Not Found"
- **Cause**: Invalid API endpoint or city name
- **Fix**: The API endpoint is correct; this may indicate a temporary API issue

**Issue**: "Network error"
- **Cause**: CORS or network connectivity issues
- **Fix**: OpenWeather API supports CORS; check network connectivity

### Weather Data Display

The dashboard will show:
- **Loading...**: While fetching data
- **Actual weather data**: When API succeeds (temperature, wind speed, humidity, visibility, mission risk)
- **Weather service temporarily unavailable**: When API fails (with error message details)
- **Service unavailable**: When API key is missing

The dashboard layout is preserved in all states - no blank cards will appear.
