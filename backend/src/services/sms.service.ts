import twilio from 'twilio';

interface SMSOptions {
  to: string;
  message: string;
}

// Initialize Twilio client only when credentials are available
let client: any = null;

const initializeTwilioClient = () => {
  if (!client && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    try {
      client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
    } catch (error) {
      console.error('Error initializing Twilio client:', error);
    }
  }
};

export const sendSMS = async (options: SMSOptions): Promise<boolean> => {
  try {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      console.warn('Twilio credentials not configured, SMS not sent');
      return false;
    }

    // Initialize client if not already done
    initializeTwilioClient();

    if (!client) {
      console.warn('Twilio client not initialized, SMS not sent');
      return false;
    }

    await client.messages.create({
      body: options.message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: options.to,
    });

    return true;
  } catch (error) {
    console.error('Error sending SMS:', error);
    return false;
  }
};

export const sendAssignmentSMS = async (
  phoneNumber: string,
  reviewerName: string,
  bookTitle: string,
  dueDate: Date
): Promise<boolean> => {
  const message = `NCISM Review: New assignment for ${reviewerName}. Book: ${bookTitle}. Due: ${dueDate.toLocaleDateString()}. Please check your email for details.`;

  return await sendSMS({
    to: phoneNumber,
    message,
  });
};

export const sendReminderSMS = async (
  phoneNumber: string,
  userName: string,
  message: string
): Promise<boolean> => {
  const smsMessage = `NCISM Review Reminder: ${message}. Please check your email for details.`;

  return await sendSMS({
    to: phoneNumber,
    message: smsMessage,
  });
};
