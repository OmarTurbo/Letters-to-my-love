import 'dotenv/config';
import http from 'node:http';
import { google } from 'googleapis';

const port = 3000;
const redirectUri = `http://localhost:${port}/oauth2callback`;
const clientId = process.env.GMAIL_CLIENT_ID;
const clientSecret = process.env.GMAIL_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error('Set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET in .env first.');
  process.exit(1);
}

const oauth = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
const authorizationUrl = oauth.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: ['https://www.googleapis.com/auth/gmail.send']
});

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, redirectUri);

  if (url.pathname !== '/oauth2callback') {
    response.writeHead(404);
    response.end('Not found');
    return;
  }

  const error = url.searchParams.get('error');
  const code = url.searchParams.get('code');

  if (error || !code) {
    response.writeHead(400);
    response.end('Authorization was cancelled. You can close this window.');
    server.close();
    return;
  }

  try {
    const { tokens } = await oauth.getToken(code);
    response.end('Authorization complete. You can close this window.');
    console.log('\nGMAIL_REFRESH_TOKEN=');
    console.log(tokens.refresh_token || 'No refresh token returned; revoke the old grant and run again.');
    console.log('');
  } catch (tokenError) {
    response.writeHead(500);
    response.end('Could not exchange the authorization code.');
    console.error(tokenError.message);
  } finally {
    server.close();
  }
});

server.listen(port, () => {
  console.log('Open this URL in your browser:');
  console.log(`\n${authorizationUrl}\n`);
  console.log(`Waiting for Google redirect on ${redirectUri}...`);
});
