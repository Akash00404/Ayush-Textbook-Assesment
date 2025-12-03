import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';

interface WhatsAppOptions {
  to: string;
  message: string;
}

// Global WhatsApp client instance
let whatsappClient: Client | null = null;

// Initialize WhatsApp client
const initializeWhatsApp = (): Promise<Client> => {
  return new Promise((resolve, reject) => {
    if (whatsappClient) {
      resolve(whatsappClient);
      return;
    }

    const client = new Client({
      authStrategy: new LocalAuth(),
      puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      },
    });

    client.on('qr', (qr) => {
      console.log('WhatsApp QR Code:');
      qrcode.generate(qr, { small: true });
    });

    client.on('ready', () => {
      console.log('WhatsApp client is ready!');
      whatsappClient = client;
      resolve(client);
    });

    client.on('authenticated', () => {
      console.log('WhatsApp client authenticated');
    });

    client.on('auth_failure', (msg) => {
      console.error('WhatsApp authentication failed:', msg);
      reject(new Error('WhatsApp authentication failed'));
    });

    client.on('disconnected', (reason) => {
      console.log('WhatsApp client disconnected:', reason);
      whatsappClient = null;
    });

    client.initialize().catch(reject);
  });
};

export const sendWhatsApp = async (options: WhatsAppOptions): Promise<boolean> => {
  try {
    if (!process.env.WHATSAPP_ENABLED || process.env.WHATSAPP_ENABLED !== 'true') {
      console.warn('WhatsApp not enabled, message not sent');
      return false;
    }

    const client = await initializeWhatsApp();
    
    // Format phone number (remove any non-digit characters and add country code if needed)
    let phoneNumber = options.to.replace(/\D/g, '');
    
    // Add country code if not present (assuming India +91)
    if (!phoneNumber.startsWith('91') && phoneNumber.length === 10) {
      phoneNumber = '91' + phoneNumber;
    }
    
    // Add @c.us suffix for WhatsApp
    const chatId = phoneNumber + '@c.us';

    await client.sendMessage(chatId, options.message);
    return true;
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    return false;
  }
};

export const sendAssignmentWhatsApp = async (
  phoneNumber: string,
  reviewerName: string,
  bookTitle: string,
  dueDate: Date
): Promise<boolean> => {
  const message = `📚 *NCISM Textbook Review Assignment*

Hello ${reviewerName},

You have been assigned a new book review:

📖 *Book:* ${bookTitle}
📅 *Due Date:* ${dueDate.toLocaleDateString()}

Please log in to the system to begin your review.

Best regards,
NCISM Review System`;

  return await sendWhatsApp({
    to: phoneNumber,
    message,
  });
};

export const sendReminderWhatsApp = async (
  phoneNumber: string,
  userName: string,
  message: string,
  assignmentTitle?: string
): Promise<boolean> => {
  const whatsappMessage = `🔔 *NCISM Review Reminder*

Hello ${userName},

${message}

${assignmentTitle ? `📋 *Assignment:* ${assignmentTitle}` : ''}

Please log in to the system to take action.

Best regards,
NCISM Review System`;

  return await sendWhatsApp({
    to: phoneNumber,
    message: whatsappMessage,
  });
};
