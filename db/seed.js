const { all, run } = require('./database');

function seed() {
  const empCount = all('SELECT COUNT(*) AS c FROM employees')[0].c;
  const seatCount = all('SELECT COUNT(*) AS c FROM seats')[0].c;

  if (empCount === 0) {
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
    for (const [name, dept, email] of employees) {
      run('INSERT INTO employees (name, department, email) VALUES (?, ?, ?)', [name, dept, email]);
    }
    console.log(`Seeded ${employees.length} employees.`);
  }

  if (seatCount === 0) {
    const sections = ['North Wing', 'South Wing', 'East Wing'];
    let seatNum = 1;
    for (let floor = 1; floor <= 2; floor++) {
      for (const section of sections) {
        for (let i = 1; i <= 4; i++) {
          const label = `F${floor}-${section[0]}-${seatNum}`;
          run('INSERT INTO seats (label, floor, section, employee_id) VALUES (?, ?, ?, NULL)', [label, floor, section]);
          seatNum++;
        }
      }
    }

    const employees = all('SELECT id FROM employees ORDER BY id LIMIT 6');
    const seats = all('SELECT id FROM seats ORDER BY id LIMIT 6');
    employees.forEach((emp, idx) => {
      if (seats[idx]) run('UPDATE seats SET employee_id = ? WHERE id = ?', [emp.id, seats[idx].id]);
    });

    console.log(`Seeded seats and assigned first 6 employees.`);
  }

  console.log('Seed complete.');
}

module.exports = { seed };
