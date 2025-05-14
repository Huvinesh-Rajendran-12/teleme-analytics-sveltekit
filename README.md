# Teleme Analytics SvelteKit

This is a SvelteKit implementation of the Teleme Analytics Chatbot, focused on providing healthcare analytics through a conversational interface.

## Features

- Interactive chat interface for healthcare data analytics
- Support for various analytics queries including data summarization, diagnosis reports, and medication analysis
- Customizable timeframe selection for analysis (1-60 months)
- Secure authentication through JWT tokens
- Responsive and mobile-friendly design with Tailwind CSS

## Prerequisites

- Node.js 18.x or higher
- pnpm (recommended) or npm

## Getting Started

1. Clone this repository:

   ```bash
   git clone [repository-url]
   cd teleme-analytics-sveltekit
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Create a `.env` file by copying the example:

   ```bash
   cp env.example .env
   ```

4. Update the environment variables in the `.env` file with your specific configuration.

5. Start the development server:

   ```bash
   pnpm dev
   ```

6. Open your browser and navigate to `http://localhost:9999`

## Environment Configuration

Key environment variables:

- `VITE_N8N_BASE_URL`: Base URL for the N8N workflow automation service
- `VITE_N8N_API_KEY`: API key for N8N service authentication
- `VITE_N8N_ANALYTICS_WEBHOOK_URL`: Webhook URL for analytics operations
- `VITE_ANALYTICS_JWT_SECRET`: Secret key for JWT token verification
- `VITE_ANALYTICS_CHATBOT_TIMEOUT`: Inactivity timeout in minutes

## Authentication

The application uses JWT tokens for authentication. You can provide the token in two ways:

1. In the URL parameters: `?auth_token=your_jwt_token`
2. Via an Authorization header meta tag in the HTML head

The token should contain the following claims:

- `centre_id`: ID of the healthcare center
- `centre_name`: Name of the healthcare center
- `is_ngo`: Boolean flag indicating if it's an NGO

## Building for Production

```bash
pnpm build
```

This generates a production build in the `.svelte-kit/output` directory.

## Deployment

The application can be deployed using the SvelteKit adapter of your choice. By default, it uses `@sveltejs/adapter-auto` which selects the appropriate adapter based on your deployment target.

## License

[MIT](LICENSE)
