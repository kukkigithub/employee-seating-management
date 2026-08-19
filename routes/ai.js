const express = require('express');
const db = require('../db/database');
const router = express.Router();

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

function logActivity(message, source) {
  db.prepare('INSERT INTO activity_log (message, source) VALUES (?, ?)').run(message, source);
}

function findEmployeeByName(name) {
  if (!name) return null;
  const all = db.prepare('SELECT * FROM employees').all();
  const lower = name.trim().toLowerCase();
  // exact match first, then partial/contains match
  return (
    all.find((e) => e.name.toLowerCase() === lower) ||
    all.find((e) => e.name.toLowerCase().includes(lower) || lower.includes(e.name.toLowerCase()))
  );
}

function findSeatByLabel(label) {
  if (!label) return null;
  const all = db.prepare('SELECT * FROM seats').all();
  const lower = label.trim().toLowerCase();
  return (
    all.find((s) => s.label.toLowerCase() === lower) ||
    all.find((s) => s.label.toLowerCase().includes(lower))
  );
}

// POST /api/ai/command  { prompt: "Move Priya Nair to seat F1-N-2" }
router.post('/command', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt || !prompt.trim()) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({
      error: 'GROQ_API_KEY is not configured on the server. Add it to your environment variables.',
    });
  }

  const employees = db.prepare('SELECT id, name, department FROM employees').all();
  const seats = db.prepare(`
    SELECT s.id, s.label, s.floor, s.section, e.name AS occupied_by
    FROM seats s LEFT JOIN employees e ON e.id = s.employee_id
  `).all();

  const systemPrompt = `You are a backend assistant for an office seating system. Convert the admin's natural-language instruction into a single strict JSON object describing the seating action to take. Do not include any explanation, markdown, or extra text — respond with ONLY the JSON object.

JSON shape:
{
  "action": "assign" | "unassign" | "unknown",
  "employeeName": string | null,
  "seatLabel": string | null,
  "reason": string
}

Rules:
- "assign" means put an employee in a specific seat (use the seat label the admin refers to, matched as closely as possible to the list below).
- "unassign" means remove an employee from whatever seat they currently occupy (seatLabel can be null in this case).
- If the instruction is unclear, or refers to an employee/seat that doesn't plausibly match the lists below, use "unknown" and explain briefly in "reason".
- Always try to match names/labels to the closest existing entry below, even with typos or partial names.

Current employees: ${employees.map((e) => `${e.name} (${e.department || 'N/A'})`).join(', ')}

Current seats: ${seats.map((s) => `${s.label}${s.occupied_by ? ' [occupied by ' + s.occupied_by + ']' : ' [empty]'}`).join(', ')}`;

  try {
    const aiResponse = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
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
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      return res.status(502).json({ error: 'AI returned an unparseable response.', raw });
    }

    const { action, employeeName, seatLabel, reason } = parsed;

    if (action === 'unknown') {
      logActivity(`AI could not interpret: "${prompt}" — ${reason || 'no reason given'}`, 'ai');
      return res.json({
        success: false,
        interpretation: parsed,
        message: reason || "I couldn't understand that instruction.",
      });
    }

    const employee = findEmployeeByName(employeeName);
    if (!employee) {
      return res.json({
        success: false,
        interpretation: parsed,
        message: `Could not find an employee matching "${employeeName}".`,
      });
    }

    if (action === 'assign') {
      const seat = findSeatByLabel(seatLabel);
      if (!seat) {
        return res.json({
          success: false,
          interpretation: parsed,
          message: `Could not find a seat matching "${seatLabel}".`,
        });
      }
      if (seat.employee_id && seat.employee_id !== employee.id) {
        const occupant = db.prepare('SELECT name FROM employees WHERE id = ?').get(seat.employee_id);
        db.prepare('UPDATE seats SET employee_id = NULL WHERE id = ?').run(seat.id);
        logActivity(`${occupant?.name || 'Previous occupant'} removed from ${seat.label} to make room for ${employee.name}`, 'ai');
      }
      db.prepare('UPDATE seats SET employee_id = NULL WHERE employee_id = ?').run(employee.id);
      db.prepare('UPDATE seats SET employee_id = ? WHERE id = ?').run(employee.id, seat.id);

      const message = `${employee.name} has been assigned to seat ${seat.label}.`;
      logActivity(message, 'ai');
      return res.json({ success: true, interpretation: parsed, message });
    }

    if (action === 'unassign') {
      db.prepare('UPDATE seats SET employee_id = NULL WHERE employee_id = ?').run(employee.id);
      const message = `${employee.name} has been unassigned from their seat.`;
      logActivity(message, 'ai');
      return res.json({ success: true, interpretation: parsed, message });
    }

    return res.json({
      success: false,
      interpretation: parsed,
      message: 'Unrecognized action from AI response.',
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error processing AI command.', details: err.message });
  }
});

module.exports = router;
