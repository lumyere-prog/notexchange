    const express = require('express');
const router = express.Router();
const { OAuth2Client } = require('google-auth-library');

const client = new OAuth2Client('805398121031-5iqflk2ivfl8s5qeejucidcjpa8njkcl.apps.googleusercontent.com');

router.post('/', async (req, res) => {
  const { token } = req.body;

  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: '805398121031-5iqflk2ivfl8s5qeejucidcjpa8njkcl.apps.googleusercontent.com',
    });

    const payload = ticket.getPayload();

    res.json({
      email: payload.email,
      name: payload.name,
      picture: payload.picture
    });

  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;