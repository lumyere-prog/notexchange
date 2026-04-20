const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/chatbot', require('./chatbot'));
app.use('/user', require('./user'));
app.use('/posts', require('./posts'));
app.use('/auth/google', require('./googleAuth'));


app.get('/', (req, res) => {
  res.send('Backend running');
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});