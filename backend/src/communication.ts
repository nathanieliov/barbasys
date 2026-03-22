import nodemailer from 'nodemailer';
import twilio from 'twilio';

// Use environment variables for credentials
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const TWILIO_SID = process.env.TWILIO_SID;
const TWILIO_AUTH = process.env.TWILIO_AUTH;
const TWILIO_PHONE = process.env.TWILIO_PHONE;

const transporter = EMAIL_USER && EMAIL_PASS ? nodemailer.createTransport({
  service: 'gmail', // or another provider
  auth: { user: EMAIL_USER, pass: EMAIL_PASS }
}) : null;

const twilioClient = TWILIO_SID && TWILIO_AUTH ? twilio(TWILIO_SID, TWILIO_AUTH) : null;

export const sendReceipt = async (sale: { 
  id: number;
  customer_email?: string;
  customer_phone?: string;
  total_amount: number;
  tip_amount: number;
  discount_amount: number;
  items: any[];
  barber_name: string;
}) => {
  const receiptBody = `
    BarbaSys Receipt #${sale.id}
    ---------------------------
    Barber: ${sale.barber_name}
    Items:
    ${sale.items.map(i => `- ${i.name} ($${i.price})`).join('\n    ')}
    ${sale.discount_amount > 0 ? `Discount: -$${sale.discount_amount.toFixed(2)}\n    ` : ''}Tip: $${sale.tip_amount.toFixed(2)}
    Total: $${sale.total_amount.toFixed(2)}
    ---------------------------
    Thank you for choosing BarbaSys!
  `.trim();

  const receiptHtml = `
    <div style="font-family: sans-serif; max-width: 500px; padding: 20px; border: 1px solid #eee;">
      <h2 style="color: #6366f1;">BarbaSys Receipt #${sale.id}</h2>
      <p><strong>Barber:</strong> ${sale.barber_name}</p>
      <hr/>
      <ul style="list-style: none; padding: 0;">
        ${sale.items.map(i => `
          <li style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f9f9f9;">
            <span>${i.name}</span>
            <span>$${i.price.toFixed(2)}</span>
          </li>
        `).join('')}
        ${sale.discount_amount > 0 ? `
          <li style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f9f9f9; color: #10b981;">
            <span>Discount</span>
            <span>-$${sale.discount_amount.toFixed(2)}</span>
          </li>
        ` : ''}
        ${sale.tip_amount > 0 ? `
          <li style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f9f9f9;">
            <span>Tip</span>
            <span>$${sale.tip_amount.toFixed(2)}</span>
          </li>
        ` : ''}
      </ul>
      <div style="display: flex; justify-content: space-between; font-weight: bold; margin-top: 20px; font-size: 1.2rem;">
        <span>Total</span>
        <span>$${sale.total_amount.toFixed(2)}</span>
      </div>
      <p style="margin-top: 30px; color: #94a3b8; font-size: 0.9rem;">Thank you for choosing BarbaSys!</p>
    </div>
  `;

  // 1. Send Email
  if (sale.customer_email && transporter) {
    try {
      await transporter.sendMail({
        from: '"BarbaSys" <receipts@barbasys.com>',
        to: sale.customer_email,
        subject: `Your BarbaSys Receipt #${sale.id}`,
        text: receiptBody,
        html: receiptHtml
      });
      console.log(`Email sent to ${sale.customer_email}`);
    } catch (err) {
      console.error('Failed to send email:', err);
    }
  } else if (sale.customer_email) {
    console.log('[MOCK] Sending Email to:', sale.customer_email, '\n', receiptBody);
  }

  // 2. Send SMS
  if (sale.customer_phone && twilioClient && TWILIO_PHONE) {
    try {
      await twilioClient.messages.create({
        body: `BarbaSys: Your receipt for $${sale.total_amount.toFixed(2)} is ready! Thank you!`,
        from: TWILIO_PHONE,
        to: sale.customer_phone
      });
      console.log(`SMS sent to ${sale.customer_phone}`);
    } catch (err) {
      console.error('Failed to send SMS:', err);
    }
  } else if (sale.customer_phone) {
    console.log('[MOCK] Sending SMS to:', sale.customer_phone, 'Message: BarbaSys: Your receipt for $', sale.total_amount.toFixed(2));
  }
};

export const sendAppointmentNotification = async (appointment: {
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  start_time: string;
  service_name: string;
  barber_name: string;
  type: 'confirmation' | 'reminder' | 'cancellation';
}) => {
  const dateStr = new Date(appointment.start_time).toLocaleString();
  const title = appointment.type === 'confirmation' ? 'Appointment Confirmed!' : (appointment.type === 'reminder' ? 'Upcoming Appointment Reminder' : 'Appointment Cancelled');
  const body = `
    Hi ${appointment.customer_name || 'Valued Client'},
    
    This is a ${appointment.type} for your appointment:
    - Service: ${appointment.service_name}
    - Barber: ${appointment.barber_name}
    - Time: ${dateStr}
    
    ${appointment.type === 'cancellation' ? 'We apologize for any inconvenience.' : 'We look forward to seeing you!'}
    - BarbaSys Team
  `.trim();

  // 1. Send Email
  if (appointment.customer_email && transporter) {
    try {
      await transporter.sendMail({
        from: '"BarbaSys" <appointments@barbasys.com>',
        to: appointment.customer_email,
        subject: title,
        text: body
      });
      console.log(`Email notification sent to ${appointment.customer_email}`);
    } catch (err) {
      console.error('Failed to send email:', err);
    }
  } else if (appointment.customer_email) {
    console.log(`[MOCK EMAIL] ${title} to:`, appointment.customer_email, '\n', body);
  }

  // 2. Send SMS
  if (appointment.customer_phone && twilioClient && TWILIO_PHONE) {
    try {
      await twilioClient.messages.create({
        body: `${title}: ${appointment.service_name} @ ${dateStr}. See you soon!`,
        from: TWILIO_PHONE,
        to: appointment.customer_phone
      });
      console.log(`SMS notification sent to ${appointment.customer_phone}`);
    } catch (err) {
      console.error('Failed to send SMS:', err);
    }
  } else if (appointment.customer_phone) {
    console.log(`[MOCK SMS] ${title} to:`, appointment.customer_phone, `Message: ${title}: ${appointment.service_name} @ ${dateStr}`);
  }
};

export const alertLowStock = async (product: { name: string; stock: number; threshold: number }) => {
  const message = `LOW STOCK ALERT: ${product.name} is at ${product.stock} (Threshold: ${product.threshold})`;
  console.log('[MOCK ALERT]', message);
  // Implementation for email/SMS would go here
};
