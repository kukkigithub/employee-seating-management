const express = require('express');
const { all, get, run } = require('../db/database');
const router = express.Router();

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

function logActivity(message, source) {
  run('INSERT INTO activity_log (message, source) VALUES (?, ?)', [message, source]);
}

function findEmployeeByName(name) {
  if (!name) return null;
  const employees = all('SELECT * FROM employees');
  const lower = name.trim().toLowerCase();
  return (
    employees.find((e) => e.name.toLowerCase() === lower) ||
    employees.find((e) => e.name.toLowerCase().includes(lower) || lower.includes(e.name.toLowerCase()))
  );
}

function findSeatByLabel(label) {
  if (!label) return null;
  const seats = all('SELECT * FROM seats');
  const lower = label.trim().toLowerCase();
  return (
    seats.find((s) => s.label.toLowerCase() === lower) ||
    seats.find((s) => s.label.toLowerCase().includes(lower))
  );
}

router.post('/command', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt || !prompt.trim()) return res.status(400).json({ error: 'Prompt is required' });

  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({ error: 'GROQ_API_KEY is not configured on the server.' });
  }

  const employees = all('SELECT id, name, department FROM employees');
  const seats = all(`
    SELECT s.id, s.label, s.floor, s.section, e.name AS occupied_by
    FROM seats s LEFT JOIN employees e ON e.id = s.employee_id
  `);

  const systemPrompt = `You are a backend assistant for an office seating system. Convert the admin's natural-language instruction into a single strict JSON object. Respond with ONLY the JSON object, no extra text.

JSON shape:
{
  "action": "assign" | "unassign" | "unknown",
  "employeeName": string | null,
  "seatLabel": string | null,
  "reason": string
}

Current employees: ${employees.map((e) => `${e.name} (${e.department || 'N/A'})`).join(', ')}
Current seats: ${seats.map((s) => `${s.label}${s.occupied_by ? ' [occupied by ' + s.occupied_by + ']' : ' [empty]'}`).join(', ')}`;

  try {
    const aiResponse = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      return res.status(502).json({ error: `AI provider error: ${errText}` });
    }

    const data = await aiResponse.json();
    const raw = data.choices?.[0]?.message?.content || '{}';
    let parsed;
    try { parsed = JSON.parse(raw); } catch (e) {
      return res.status(502).json({ error: 'AI returned unparseable response.', raw });
    }

    const { action, employeeName, seatLabel, reason } = parsed;

    if (action === 'unknown') {
      logActivity(`AI could not interpret: "${prompt}" — ${reason || 'no reason given'}`, 'ai');
      return res.json({ success: false, interpretation: parsed, message: reason || "I couldn't understand that instruction." });
    }

    const employee = findEmployeeByName(employeeName);
    if (!employee) {
      return res.json({ success: false, interpretation: parsed, message: `Could not find employee matching "${employeeName}".` });
    }

    if (action === 'assign') {
      const seat = findSeatByLabel(seatLabel);
      if (!seat) return res.json({ success: false, interpretation: parsed, message: `Could not find seat matching "${seatLabel}".` });

      if (seat.employee_id && seat.employee_id !== employee.id) {
        const occupant = get('SELECT name FROM employees WHERE id = ?', [seat.employee_id]);
        run('UPDATE seats SET employee_id = NULL WHERE id = ?', [seat.id]);
        logActivity(`${occupant?.name || 'Previous occupant'} removed from ${seat.label}`, 'ai');
      }
      run('UPDATE seats SET employee_id = NULL WHERE employee_id = ?', [employee.id]);
      run('UPDATE seats SET employee_id = ? WHERE id = ?', [employee.id, seat.id]);
      const message = `${employee.name} has been assigned to seat ${seat.label}.`;
      logActivity(message, 'ai');
      return res.json({ success: true, interpretation: parsed, message });
    }

    if (action === 'unassign') {
      run('UPDATE seats SET employee_id = NULL WHERE employee_id = ?', [employee.id]);
      const message = `${employee.name} has been unassigned from their seat.`;
      logActivity(message, 'ai');
      return res.json({ success: true, interpretation: parsed, message });
    }

    return res.json({ success: false, interpretation: parsed, message: 'Unrecognized action.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error processing AI command.', details: err.message });
  }
});

module.exports = router;
