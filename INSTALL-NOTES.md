Here's a step-by-step guide to install the govcy-express-services package in your project and configure it for local development:

## 1. Initialization

Initialize your npm project:

```sh
npm init -y
```

## 2. Install the Package

Install the express services package:

```sh
npm install @gov-cy/govcy-express-services
```

## 3. Prepare for local development
Add `secrets/.env` file and create certs for local development.

### Create certs for local development
1. open `Git Bash`and run:

```sh
openssl req -x509 -newkey rsa:2048 -keyout server.key -out server.cert -days 365 -nodes
```

2. Answer the Certificate Questions
You'll be prompted to enter some details. You can fill them out or leave them blank:
```pqsql
Country Name (2 letter code) [XX]: CY
State or Province Name (full name) []: Nicosia
Locality Name (eg, city) []: Nicosia
Organization Name (eg, company) []: govCy
Organizational Unit Name (eg, section) []: DigitalServicesFactory
Common Name (eg, server FQDN or YOUR name) []: localhost
Email Address []: your-email@example.com
```
Common Name (CN): **Make sure** this is localhost for local development.

3. Where to Save the Files?
Save server.cert and server.key in the root of your project folder.

### Create secret environment variables

Create a `secrets/.env` file in the root of your project folder.

```dotenv
SESSION_SECRET=session_secret
PORT=44319
CYLOGIN_ISSUER_URL=https://aztest.cyprus.gov.cy/cylogin/core/.well-known/openid-configuration
CYLOGIN_CLIENT_ID=your-CYLOGIN-client-id
CYLOGIN_CLIENT_SECRET=your-CYLOGIN-client-secret
CYLOGIN_SCOPE=openid cegg_profile your.scope
CYLOGIN_REDIRECT_URI=https://localhost:44319/signin-oidc
CYLOGIN_CODE_CHALLENGE_METHOD=S256
CYLOGIN_POST_LOGOUR_REIDRECT_URI=https://localhost:44319/
ALLOW_SELF_SIGNED_CERTIFICATES=false
NODE_ENV=development
# Debug or not  -------------------------------
# In production set this to false
DEBUG=true
# DSF Gateway ---------------------------
DSF_API_GTW_CLIENT_ID=your-DSF-API-gateway-client-id
DSF_API_GTW_SECRET=your-DSF-API-gateway-secret
DSF_API_GTW_SERVICE_ID=your-DSF-API-gateway-service-id
# Notification API URL
DSF_API_GTW_NOTIFICATION_API_URL=https://127.0.0.1/api/v1/NotificationEngine/simple-message
# SERVICES stuf-------------------------------
# SERVICE: test
TEST_SUBMISSION_API_URL=http://localhost:3002/success
TEST_SUBMISSION_API_CLIENT_KEY=12345678901234567890123456789000
TEST_SUBMISSION_API_SERVIVE_ID=123
TEST_ELIGIBILITY_1_API_URL=http://localhost:3002/success
TEST_ELIGIBILITY_2_API_URL=http://localhost:3002/success
```

Set the environment in the `NODE_ENV` variable: 
- **development**: For local development and testing.
- **staging**: For staging environments.
- **production**: For production deployments.

Details about cyLogin can be found at the [CY Login documentation](https://dev.azure.com/cyprus-gov-cds/Documentation/_wiki/wikis/Documentation/14/CY-Login)

To generate the SESSION_SECRET, run: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'));"`

See more on the environment variables in the [README Enviromental variables](README.md#-enviromental-variables)

### Create non secret environment variables

Create `.env.development`, `.env.staging`, and `.env.production` files in the root of your project folder. Here's an example for `.env.development`:

```dotenv
MATOMO_SITE_ID=51
MATOMO_URL=//wp.matomo.dits.dmrid.gov.cy
```

## 4. Create data config files for services

Create data files in the `/data` folder (see more in [Dynamic Services Rendering](README.md#-dynamic-services-rendering))

## 5. Use the package in your project

Create an `index.mjs` file in your project to import and use the package as follows:

```js
import initializeGovCyExpressService from '@gov-cy/govcy-express-services';

// Initialize the service
const service = initializeGovCyExpressService();

// Start the server
service.startServer();
```

## 6. Enable debugging with VS Code

To enable debugging with VS Code, add a file `.vscode/launch.json` to your project root as follows:

```json
{
    // Use IntelliSense to learn about possible attributes.
    // Hover to view descriptions of existing attributes.
    // For more information, visit: https://go.microsoft.com/fwlink/?linkid=830387
    "version": "0.2.0",
    "configurations": [
    
        {
            "type": "node",
            "request": "launch",
            "name": "Launch Program",
            "skipFiles": [
                "<node_internals>/**"
            ],
            "program": "${workspaceFolder}/index.mjs",
            "env": {
                "NODE_ENV": "development"
            }
        }
    ]
}
```

## 7. Create `Dockerfile` and `.dockerignore` for local development

Create a `Dockerfile` in the root of your project folder.

```dockerfile
# ---------- Base image ----------
FROM node:20-slim AS base

# Set working directory inside container
WORKDIR /app

# Set port (serve on 8080)
ENV PORT=8080
EXPOSE 8080

# Create a group and user so we are not running our container and application as root and thus user 0 which is a security issue.
RUN addgroup --system --gid 1010 appgroup && adduser --system --uid 1010 --ingroup appgroup --shell /bin/sh appuser

# Optional: Add CA certificate if needed (like .NET version)
# COPY certs/ariadni-test.crt /usr/local/share/ca-certificates/ariadni-test.crt
# RUN chmod 644 /usr/local/share/ca-certificates/ariadni-test.crt && update-ca-certificates

# ---------- Build stage ----------
FROM node:20-slim AS build

WORKDIR /app

# Copy dependency definitions first
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application
COPY . .

# ---------- Production stage ----------
FROM base AS final

# Copy app files and dependencies from build stage
COPY --from=build /app /app

# Use non-root user
USER 1010

# Start the app
CMD ["npm", "start"]

```

Also create a `.dockerignore` file in the root of your project folder:

```
node_modules
server.cert
server.key
npm-debug.log
```


---

## 📋 Additional Guidelines

Before deploying your service, make sure to review the [Best Practices guide](./BEST-PRACTICES.md). It includes important information about:

- Repository organization
- Required footer pages for compliance
- Proper CY Login client registration per environment
