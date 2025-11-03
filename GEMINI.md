# GEMINI.md

## Project Overview

This is a DSGN LABS AI Web Builder, a tool that allows users to create a website by chatting with an AI assistant. The project is built with Cloudflare Pages & Functions for hosting and serverless logic, Google Gemini for the AI chat and site generation, Stripe for processing payments, Cloudflare R2 for storing generated website files, and Cloudflare KV for temporary session storage.

The user interacts with an AI assistant named "Danny" to build a static website. The frontend is a single `index.html` file that includes the chat interface, a live preview of the website, and a payment section. The backend is a set of Cloudflare Functions that handle the chat logic, payment processing, and file storage.

## Building and Running

The project uses `wrangler`, the command-line tool for Cloudflare developer products.

*   **Development:** To run the project in a local development environment, use the following command. This command will start a local server and provide a live preview of the application. It also binds the `SITE_STORAGE` KV namespace and the `WEBSITE_FILES` R2 bucket for local development.

    ```bash
    npm run dev
    ```

*   **Deployment:** To deploy the project to Cloudflare Pages, use the following command. This will build and deploy the application to the production environment.

    ```bash
    npm run deploy
    ```

## Development Conventions

*   **Static Site Generation:** The AI assistant, "Danny," is designed to generate static websites. This means the generated code consists only of HTML, CSS, and vanilla JavaScript. No server-side languages or databases are used in the generated sites.
*   **AI Chat Logic:** The core AI chat logic is located in `functions/api/chat.js`. This file contains the system prompt for the Gemini model, which defines the personality and behavior of the AI assistant.
*   **Frontend:** The entire frontend is contained within the `index.html` file. This includes the HTML structure, CSS styles, and JavaScript logic for the user interface.
*   **Serverless Functions:** The backend logic is implemented as a set of Cloudflare Functions located in the `functions` directory. These functions handle tasks such as processing chat messages, creating Stripe checkout sessions, and managing file storage.
