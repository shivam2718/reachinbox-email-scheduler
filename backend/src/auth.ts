import { Router } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { config } from './config';

const router = Router();
const client = new OAuth2Client(config.googleClientId, config.googleClientSecret, config.googleRedirectUri);

router.get('/google', (req, res) => {
  const url = client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['openid', 'email', 'profile'],
    redirect_uri: config.googleRedirectUri,
  });

  res.redirect(url);
});

router.get('/callback', async (req, res) => {
  const { code } = req.query;

  if (!code || typeof code !== 'string') {
    return res.status(400).json({ message: 'Missing Google OAuth code.' });
  }

  try {
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token || '',
      audience: config.googleClientId,
    });

    const payload = ticket.getPayload();

    if (!payload) {
      return res.status(400).json({ message: 'Google profile not available.' });
    }

    const user = {
      id: payload.sub,
      name: payload.name || 'User',
      email: payload.email || '',
      picture: payload.picture || '',
    };

    req.session = req.session || {};
    (req.session as any).user = user;

    return res.redirect(`${config.frontendUrl}/?auth=success`);
  } catch (error) {
    console.error('Google auth failed:', error);
    return res.status(500).json({ message: 'Google authentication failed.' });
  }
});

router.get('/me', (req, res) => {
  const user = (req.session as any)?.user;
  if (!user) {
    return res.status(401).json({ message: 'Not authenticated.' });
  }

  res.json({ user });
});

router.post('/logout', (req, res) => {
  req.session?.destroy?.(() => res.json({ ok: true }));
});

export default router;
