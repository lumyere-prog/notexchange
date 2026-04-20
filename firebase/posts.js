const express = require('express');
const router = express.Router();
const db = require('../firebase/firebase.js');

router.post('/', async (req, res) => {
  const { title, description, userID } = req.body;

  try {
    const docRef = db.collection('posts').doc();

    await docRef.set({
      title,
      description,
      timestamp: new Date(),
      upvotes: 0,
      downvotes: 0,
      userID
    });

    res.json({ postID: docRef.id });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;