import db from '../db.js';

async function reset() {
  console.log('🧹 Resetting database to clear customers and appointments...');

  db.transaction(() => {
    // Clear dynamic data
    db.prepare('DELETE FROM appointment_items').run();
    db.prepare('DELETE FROM appointments').run();
    db.prepare('DELETE FROM sale_items').run();
    db.prepare('DELETE FROM sales').run();
    db.prepare('DELETE FROM stock_logs').run();
    db.prepare('DELETE FROM barber_time_off').run();
    db.prepare('DELETE FROM customers').run();
    
    // Ensure all barbers are active
    db.prepare('UPDATE barbers SET is_active = 1').run();
    
    // Reset barber shifts to standard availability if they were somehow missing
    // (Most barbers already have them from seed, but let's ensure they are there)
    const barbers = db.prepare('SELECT id FROM barbers').all() as { id: number }[];
    const shiftInsert = db.prepare('INSERT OR IGNORE INTO barber_shifts (barber_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?)');
    
    for (const b of barbers) {
      for (let day = 0; day <= 6; day++) {
        const endTime = (day === 0) ? '19:00' : '21:00';
        shiftInsert.run(b.id, day, '09:00', endTime);
      }
    }
  })();

  console.log('✨ Database reset complete. No customers, no appointments, full availability.');
}

reset().catch(err => {
  console.error('❌ Reset failed:', err);
  process.exit(1);
});
