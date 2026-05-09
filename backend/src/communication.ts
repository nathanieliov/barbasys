import nodemailer from 'nodemailer';
import twilio from 'twilio';
import i18n from './i18n.js';
import { isInSessionWindow } from './use-cases/chatbot/session-window.js';
import type { IWhatsAppClient } from './adapters/whatsapp/whatsapp-client.interface.js';

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
  wa_opt_in?: boolean;
  last_inbound_at?: string | null;
}, whatsAppClient?: IWhatsAppClient) => {
  const t = i18n.t.bind(i18n);
  const receiptBody = `
    ${t('notifications.receipt_title', { id: sale.id })}
    ---------------------------
    ${t('notifications.barber')}: ${sale.barber_name}
    ${t('notifications.items')}:
    ${sale.items.map(i => `- ${i.name} ($${i.price})`).join('\n    ')}
    ${sale.discount_amount > 0 ? `${t('notifications.discount')}: -$${sale.discount_amount.toFixed(2)}\n    ` : ''}${t('notifications.tip')}: $${sale.tip_amount.toFixed(2)}
    ${t('notifications.total')}: $${sale.total_amount.toFixed(2)}
    ---------------------------
    ${t('notifications.thank_you')}
  `.trim();

  const receiptHtml = `
    <div style="font-family: sans-serif; max-width: 500px; padding: 20px; border: 1px solid #eee;">
      <h2 style="color: #6366f1;">${t('notifications.receipt_title', { id: sale.id })}</h2>
      <p><strong>${t('notifications.barber')}:</strong> ${sale.barber_name}</p>
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
            <span>${t('notifications.discount')}</span>
            <span>-$${sale.discount_amount.toFixed(2)}</span>
          </li>
        ` : ''}
        ${sale.tip_amount > 0 ? `
          <li style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f9f9f9;">
            <span>${t('notifications.tip')}</span>
            <span>$${sale.tip_amount.toFixed(2)}</span>
          </li>
        ` : ''}
      </ul>
      <div style="display: flex; justify-content: space-between; font-weight: bold; margin-top: 20px; font-size: 1.2rem;">
        <span>${t('notifications.total')}</span>
        <span>$${sale.total_amount.toFixed(2)}</span>
      </div>
      <p style="margin-top: 30px; color: #94a3b8; font-size: 0.9rem;">${t('notifications.thank_you')}</p>
    </div>
  `;

  const preferWhatsApp = sale.wa_opt_in && sale.last_inbound_at && isInSessionWindow(sale.last_inbound_at);

  // 1. Send WhatsApp (if opted in and in session window)
  if (preferWhatsApp && sale.customer_phone && whatsAppClient) {
    try {
      await whatsAppClient.sendText(`whatsapp:${sale.customer_phone}`, receiptBody);
      console.log(`WhatsApp receipt sent to ${sale.customer_phone}`);
      return;
    } catch (err) {
      console.error('Failed to send WhatsApp receipt, falling back to Email:', err);
    }
  }

  // 2. Send Email
  if (sale.customer_email && transporter) {
    try {
      await transporter.sendMail({
        from: '"BarbaSys" <receipts@barbasys.com>',
        to: sale.customer_email,
        subject: t('notifications.receipt_title', { id: sale.id }),
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

  // 3. Send SMS
  if (sale.customer_phone && twilioClient && TWILIO_PHONE) {
    try {
      await twilioClient.messages.create({
        body: t('notifications.sms_receipt', { total: sale.total_amount.toFixed(2) }),
        from: TWILIO_PHONE,
        to: sale.customer_phone
      });
      console.log(`SMS sent to ${sale.customer_phone}`);
    } catch (err) {
      console.error('Failed to send SMS:', err);
    }
  } else if (sale.customer_phone) {
    console.log('[MOCK] Sending SMS to:', sale.customer_phone, 'Message:', t('notifications.sms_receipt', { total: sale.total_amount.toFixed(2) }));
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
  wa_opt_in?: boolean;
  last_inbound_at?: string | null;
}, whatsAppClient?: IWhatsAppClient) => {
  const t = i18n.t.bind(i18n);
  const dateStr = new Date(appointment.start_time).toLocaleString();
  const title = t(`notifications.appointment_${appointment.type}`);
  const body = `
    ${t('notifications.hi', { name: appointment.customer_name || t('schedule.guest_client') })},

    ${t('notifications.notification_body', { type: title.toLowerCase() })}
    - ${t('notifications.service')}: ${appointment.service_name}
    - ${t('notifications.barber')}: ${appointment.barber_name}
    - ${t('notifications.time')}: ${dateStr}

    ${appointment.type === 'cancellation' ? t('notifications.cancellation_sorry') : t('notifications.see_you_soon')}
    - ${t('notifications.team')}
  `.trim();

  const preferWhatsApp = appointment.wa_opt_in && appointment.last_inbound_at && isInSessionWindow(appointment.last_inbound_at);

  // 1. Send WhatsApp (if opted in and in session window)
  if (preferWhatsApp && appointment.customer_phone && whatsAppClient) {
    try {
      await whatsAppClient.sendText(`whatsapp:${appointment.customer_phone}`, body);
      console.log(`WhatsApp notification sent to ${appointment.customer_phone}`);
      return;
    } catch (err) {
      console.error('Failed to send WhatsApp notification, falling back to SMS:', err);
    }
  }

  // 2. Send Email
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

  // 3. Send SMS
  if (appointment.customer_phone && twilioClient && TWILIO_PHONE) {
    try {
      await twilioClient.messages.create({
        body: t('notifications.sms_notification', { title, service: appointment.service_name, time: dateStr }),
        from: TWILIO_PHONE,
        to: appointment.customer_phone
      });
      console.log(`SMS notification sent to ${appointment.customer_phone}`);
    } catch (err) {
      console.error('Failed to send SMS:', err);
    }
  } else if (appointment.customer_phone) {
    console.log(`[MOCK SMS] ${title} to:`, appointment.customer_phone, `Message: ${t('notifications.sms_notification', { title, service: appointment.service_name, time: dateStr })}`);
  }
};

export const alertLowStock = async (product: { name: string; stock: number; threshold: number }) => {
  const t = i18n.t.bind(i18n);
  const message = t('notifications.low_stock_alert', { name: product.name, stock: product.stock, threshold: product.threshold });
  console.log('[MOCK ALERT]', message);
  // Implementation for email/SMS would go here
};

export const sendOTP = async (email: string, otp: string): Promise<{ simulated: boolean }> => {
  const t = i18n.t.bind(i18n);
  const subject = t('notifications.otp_subject');
  const body = t('notifications.otp_body', { code: otp });

  if (transporter) {
    try {
      await transporter.sendMail({
        from: '"BarbaSys" <auth@barbasys.com>',
        to: email,
        subject: subject,
        text: body,
        html: `
          <div style="font-family: sans-serif; max-width: 400px; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #6366f1; text-align: center;">${subject}</h2>
            <p style="font-size: 1.1rem; text-align: center;">${t('notifications.otp_instruction')}</p>
            <div style="background: #f3f4f6; padding: 20px; text-align: center; font-size: 2.5rem; font-weight: bold; letter-spacing: 5px; color: #1f2937; border-radius: 8px; margin: 20px 0;">
              ${otp}
            </div>
            <p style="color: #94a3b8; font-size: 0.8rem; text-align: center;">${t('notifications.otp_expiry_notice')}</p>
          </div>
        `
      });
      console.log(`OTP Email sent to ${email}`);
      return { simulated: false };
    } catch (err) {
      console.error('Failed to send OTP email:', err);
      throw new Error('Failed to send OTP email');
    }
  } else {
    console.log('\n════════════════════════════════════════');
    console.log(`  📧  OTP para: ${email}`);
    console.log(`  🔑  CÓDIGO:   ${otp}`);
    console.log('════════════════════════════════════════\n');
    return { simulated: true };
  }
};
