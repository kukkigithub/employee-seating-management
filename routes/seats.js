const express = require('express');
const { all, get, run } = require('../db/database');
const router = express.Router();

function logActivity(message, source) {
  run('INSERT INTO activity_log (message, source) VALUES (?, ?)', [message, source]);
}

router.get('/', (req, res) => {
  const seats = all(`
    SELECT s.*, e.name AS employee_name, e.department AS employee_department
    FROM seats s
    LEFT JOIN employees e ON e.id = s.employee_id
    ORDER BY s.floor, s.section, s.label
  `);
  res.json(seats);
});

router.get('/activity', (req, res) => {
  const logs = all('SELECT * FROM activity_log ORDER BY id DESC LIMIT 25');
  res.json(logs);
});

router.put('/:id/assign', (req, res) => {
  const seatId = Number(req.params.id);
  const { employeeId } = req.body;

  const seat = get('SELECT * FROM seats WHERE id = ?', [seatId]);
  if (!seat) return res.status(404).json({ error: 'Seat not found' });

  if (employeeId) {
    const emp = get('SELECT * FROM employees WHERE id = ?', [employeeId]);
    if (!emp) return res.status(404).json({ error: 'Employee not found' });
    run('UPDATE seats SET employee_id = NULL WHERE employee_id = ?', [employeeId]);
    run('UPDATE seats SET employee_id = ? WHERE id = ?', [employeeId, seatId]);
    logActivity(`${emp.name} assigned to seat ${seat.label}`, 'manual');
  } else {
    run('UPDATE seats SET employee_id = NULL WHERE id = ?', [seatId]);
    logActivity(`Seat ${seat.label} vacated`, 'manual');
  }

  const updated = get(`
    SELECT s.*, e.name AS employee_name FROM seats s
    LEFT JOIN employees e ON e.id = s.employee_id WHERE s.id = ?
  `, [seatId]);
  res.json(updated);
});

module.exports = router;
