const db = require('./database');

const employeeCount = db.prepare('SELECT COUNT(*) AS c FROM employees').get().c;
const seatCount = db.prepare('SELECT COUNT(*) AS c FROM seats').get().c;

if (employeeCount === 0) {
  const insertEmp = db.prepare('INSERT INTO employees (name, department, email) VALUES (?, ?, ?)');
  const employees = [
    ['Aditi Sharma', 'Engineering', 'aditi.sharma@company.com'],
    ['Rohan Mehta', 'Engineering', 'rohan.mehta@company.com'],
    ['Priya Nair', 'Design', 'priya.nair@company.com'],
    ['Karan Verma', 'Engineering', 'karan.verma@company.com'],
    ['Sneha Iyer', 'Marketing', 'sneha.iyer@company.com'],
    ['Arjun Rao', 'Sales', 'arjun.rao@company.com'],
    ['Neha Kapoor', 'HR', 'neha.kapoor@company.com'],
    ['Vikram Singh', 'Engineering', 'vikram.singh@company.com'],
    ['Isha Malhotra', 'Design', 'isha.malhotra@company.com'],
    ['Aman Gupta', 'Finance', 'aman.gupta@company.com'],
  ];
  const insertMany = db.transaction((rows) => {
    for (const r of rows) insertEmp.run(...r);
  });
  insertMany(employees);
  console.log(`Seeded ${employees.length} employees.`);
}

if (seatCount === 0) {
  const insertSeat = db.prepare('INSERT INTO seats (label, floor, section, employee_id) VALUES (?, ?, ?, ?)');
  const sections = ['North Wing', 'South Wing', 'East Wing'];
  const seats = [];
  let seatNum = 1;
  for (let floor = 1; floor <= 2; floor++) {
    for (const section of sections) {
      for (let i = 1; i <= 4; i++) {
        const label = `F${floor}-${section[0]}-${seatNum}`;
        seats.push([label, floor, section]);
        seatNum++;
      }
    }
  }
  const insertMany = db.transaction((rows) => {
    for (const r of rows) insertSeat.run(r[0], r[1], r[2], null);
  });
  insertMany(seats);

  // Assign first 6 employees to first 6 seats as a starting demo state
  const employees = db.prepare('SELECT id FROM employees ORDER BY id LIMIT 6').all();
  const allSeats = db.prepare('SELECT id FROM seats ORDER BY id LIMIT 6').all();
  const assign = db.prepare('UPDATE seats SET employee_id = ? WHERE id = ?');
  employees.forEach((emp, idx) => {
    if (allSeats[idx]) assign.run(emp.id, allSeats[idx].id);
  });

  console.log(`Seeded ${seats.length} seats, assigned ${employees.length} of them.`);
}

console.log('Seed complete.');
