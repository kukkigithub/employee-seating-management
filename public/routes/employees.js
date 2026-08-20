const express = require('express');
const { all, run } = require('../db/database');
const router = express.Router();

router.get('/', (req, res) => {
  const employees = all(`
    SELECT e.*, s.label AS seat_label
    FROM employees e
    LEFT JOIN seats s ON s.employee_id = e.id
    ORDER BY e.name
  `);
  res.json(employees);
});

router.post('/', (req, res) => {
  const { name, department, email } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  const info = run('INSERT INTO employees (name, department, email) VALUES (?, ?, ?)', [name, department || null, email || null]);
  res.status(201).json({ id: info.lastInsertRowid, name, department, email });
});

module.exports = router;
