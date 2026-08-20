require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDb } = require('./db/database');
const { seed } = require('./db/seed');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

initDb().then(() => {
  seed();

  const employeesRouter = require('./routes/employees');
  const seatsRouter = require('./routes/seats');
  const aiRouter = require('./routes/ai');

  app.use('/api/employees', employeesRouter);
  app.use('/api/seats', seatsRouter);
  app.use('/api/ai', aiRouter);

  app.listen(PORT, () => {
    console.log(`Employee Seating Management System running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
