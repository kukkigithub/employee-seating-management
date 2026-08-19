let seats = [];
let employees = [];
let activeSeat = null;

async function loadData() {
  const [seatsRes, empRes] = await Promise.all([
    fetch('/api/seats'),
    fetch('/api/employees'),
  ]);
  seats = await seatsRes.json();
  employees = await empRes.json();
  populateDeptFilter();
  render();
}

function populateDeptFilter() {
  const select = document.getElementById('deptFilter');
  const depts = [...new Set(employees.map((e) => e.department).filter(Boolean))].sort();
  select.innerHTML = '<option value="">All departments</option>' +
    depts.map((d) => `<option value="${d}">${d}</option>`).join('');
}

function render() {
  const query = document.getElementById('search').value.trim().toLowerCase();
  const dept = document.getElementById('deptFilter').value;

  const filtered = seats.filter((s) => {
    const matchesQuery =
      !query ||
      s.label.toLowerCase().includes(query) ||
      (s.employee_name && s.employee_name.toLowerCase().includes(query));
    const matchesDept = !dept || s.employee_department === dept;
    return matchesQuery && matchesDept;
  });

  const floors = [...new Set(filtered.map((s) => s.floor))].sort();
  const container = document.getElementById('floors');

  if (filtered.length === 0) {
    container.innerHTML = '<p class="empty-note">No seats match your search.</p>';
    return;
  }

  container.innerHTML = floors.map((floor) => {
    const floorSeats = filtered.filter((s) => s.floor === floor);
    const sections = [...new Set(floorSeats.map((s) => s.section))];
    return `
      <div class="floor-block">
        <h3>Floor ${floor}</h3>
        ${sections.map((section) => {
          const secSeats = floorSeats.filter((s) => s.section === section);
          return `
            <div class="section-group">
              <h4>${section}</h4>
              <div class="seat-grid">
                ${secSeats.map(seatCard).join('')}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }).join('');

  container.querySelectorAll('.seat-card').forEach((card) => {
    card.addEventListener('click', () => openModal(Number(card.dataset.id)));
  });
}

function seatCard(seat) {
  const occupied = !!seat.employee_id;
  return `
    <div class="seat-card ${occupied ? 'occupied' : ''}" data-id="${seat.id}">
      <div class="seat-label">${seat.label}</div>
      <div class="seat-occupant">${occupied ? seat.employee_name : 'Vacant'}</div>
      ${occupied && seat.employee_department ? `<div class="seat-dept">${seat.employee_department}</div>` : ''}
    </div>
  `;
}

function openModal(seatId) {
  activeSeat = seats.find((s) => s.id === seatId);
  document.getElementById('modalSeatLabel').textContent = `Seat ${activeSeat.label}`;
  document.getElementById('modalSeatMeta').textContent = `Floor ${activeSeat.floor} · ${activeSeat.section}`;

  const select = document.getElementById('employeeSelect');
  select.innerHTML = '<option value="">— Vacant (no one assigned) —</option>' +
    employees.map((e) => `<option value="${e.id}" ${e.id === activeSeat.employee_id ? 'selected' : ''}>${e.name}${e.department ? ' — ' + e.department : ''}</option>`).join('');

  document.getElementById('modalOverlay').classList.add('open');
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  activeSeat = null;
}

async function saveAssignment() {
  const employeeId = document.getElementById('employeeSelect').value || null;
  await fetch(`/api/seats/${activeSeat.id}/assign`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ employeeId }),
  });
  closeModal();
  await loadData();
}

document.getElementById('search').addEventListener('input', render);
document.getElementById('deptFilter').addEventListener('change', render);
document.getElementById('cancelBtn').addEventListener('click', closeModal);
document.getElementById('saveBtn').addEventListener('click', saveAssignment);
document.getElementById('modalOverlay').addEventListener('click', (e) => {
  if (e.target.id === 'modalOverlay') closeModal();
});

loadData();
