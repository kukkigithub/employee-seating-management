require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

require('./db/database'); // ensure tables exist
require('./db/seed'); // seed if empty (safe no-op after first run)

const employeesRouter = require('./routes/employees');
const seatsRouter = require('./routes/seats');
const aiRouter = require('./routes/ai');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/employees', employeesRouter);
app.use('/api/seats', seatsRouter);
app.use('/api/ai', aiRouter);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`Employee Seating Management System running on port ${PORT}`);
});
