const express = require('express');
const db = require('../db/database');
const router = express.Router();

function logActivity(message, source) {
  db.prepare('INSERT INTO activity_log (message, source) VALUES (?, ?)').run(message, source);
}

// GET all seats with employee info
router.get('/', (req, res) => {
  const seats = db.prepare(`
    SELECT s.*, e.name AS employee_name, e.department AS employee_department
    FROM seats s
    LEFT JOIN employees e ON e.id = s.employee_id
    ORDER BY s.floor, s.section, s.label
  `).all();
  res.json(seats);
});

// GET activity log
router.get('/activity', (req, res) => {
  const logs = db.prepare('SELECT * FROM activity_log ORDER BY id DESC LIMIT 25').all();
  res.json(logs);
});

// PUT assign a seat to an employee (manual, from main UI)
router.put('/:id/assign', (req, res) => {
  const seatId = Number(req.params.id);
  const { employeeId } = req.body;

  const seat = db.prepare('SELECT * FROM seats WHERE id = ?').get(seatId);
  if (!seat) return res.status(404).json({ error: 'Seat not found' });

  if (employeeId) {
    const emp = db.prepare('SELECT * FROM employees WHERE id = ?').get(employeeId);
    if (!emp) return res.status(404).json({ error: 'Employee not found' });

    // Free up any seat this employee currently occupies
    db.prepare('UPDATE seats SET employee_id = NULL WHERE employee_id = ?').run(employeeId);
    db.prepare('UPDATE seats SET employee_id = ? WHERE id = ?').run(employeeId, seatId);
    logActivity(`${emp.name} assigned to seat ${seat.label}`, 'manual');
  } else {
    db.prepare('UPDATE seats SET employee_id = NULL WHERE id = ?').run(seatId);
    logActivity(`Seat ${seat.label} vacated`, 'manual');
  }

  const updated = db.prepare(`
    SELECT s.*, e.name AS employee_name FROM seats s
    LEFT JOIN employees e ON e.id = s.employee_id WHERE s.id = ?
  `).get(seatId);
  res.json(updated);
});

module.exports = router;
