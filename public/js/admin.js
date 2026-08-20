async function loadActivity() {
  const res = await fetch('/api/seats/activity');
  const logs = await res.json();
  const container = document.getElementById('activityList');

  if (logs.length === 0) {
    container.innerHTML = '<p class="empty-note">No activity yet. Run an instruction above to get started.</p>';
    return;
  }

  container.innerHTML = logs.map((log) => `
    <div class="log-entry">
      <span class="tag ${log.source}">${log.source}</span>
      <span>${escapeHtml(log.message)}</span>
      <time>${new Date(log.created_at).toLocaleString()}</time>
    </div>
  `).join('');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

async function runPrompt() {
  const promptEl = document.getElementById('prompt');
  const prompt = promptEl.value.trim();
  const resultEl = document.getElementById('aiResult');
  const btn = document.getElementById('submitPrompt');

  if (!prompt) return;

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>Thinking…';
  resultEl.style.display = 'none';

  try {
    const res = await fetch('/api/ai/command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
    const data = await res.json();

    resultEl.style.display = 'block';
    resultEl.classList.toggle('error', !data.success);

    const message = data.message || data.error || 'No response from assistant.';
    resultEl.innerHTML = `<strong>${escapeHtml(message)}</strong>` +
      (data.interpretation ? `<div class="interp">${escapeHtml(JSON.stringify(data.interpretation, null, 2))}</div>` : '');

    if (data.success) {
      promptEl.value = '';
    }
    await loadActivity();
  } catch (err) {
    resultEl.style.display = 'block';
    resultEl.classList.add('error');
    resultEl.innerHTML = `<strong>Something went wrong: ${escapeHtml(err.message)}</strong>`;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Run instruction';
  }
}

document.getElementById('submitPrompt').addEventListener('click', runPrompt);
document.getElementById('prompt').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) runPrompt();
});
document.querySelectorAll('.ai-examples span').forEach((span) => {
  span.addEventListener('click', () => {
    document.getElementById('prompt').value = span.dataset.fill;
  });
});

loadActivity();
