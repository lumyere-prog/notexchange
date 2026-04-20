const express = require('express');
const router = express.Router();
const db = require('../firebase/firebase.js');

router.post('/', async (req, res) => {
  const { username, msAcc } = req.body;

  try {
    const docRef = db.collection('user').doc();

    await docRef.set({
      username,
      msAcc,
      createdAt: new Date(),
      lastLogin: new Date(),
      points: 0,
      status: 'active',
      profilePic: 'https://example.com/default-profile-pic.png'
    });

    res.json({ id: docRef.id });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;