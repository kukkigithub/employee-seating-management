const express = require('express');
const db = require('../db/database');
const router = express.Router();

// GET all employees
router.get('/', (req, res) => {
  const employees = db.prepare(`
    SELECT e.*, s.label AS seat_label
    FROM employees e
    LEFT JOIN seats s ON s.employee_id = e.id
    ORDER BY e.name
  `).all();
  res.json(employees);
});

// POST create employee
router.post('/', (req, res) => {
  const { name, department, email } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  const info = db.prepare('INSERT INTO employees (name, department, email) VALUES (?, ?, ?)')
    .run(name, department || null, email || null);
  res.status(201).json({ id: info.lastInsertRowid, name, department, email });
});

module.exports = router;
