import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
  from?: string;
}

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

export const sendEmail = async (options: EmailOptions): Promise<boolean> => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: options.from || process.env.SMTP_FROM || process.env.SMTP_USER,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};

export const sendAssignmentNotification = async (
  reviewerEmail: string,
  reviewerName: string,
  bookTitle: string,
  dueDate: Date
): Promise<boolean> => {
  const subject = 'New Review Assignment - NCISM Textbook Review System';
  const text = `
Dear ${reviewerName},

You have been assigned a new book review:

Book: ${bookTitle}
Due Date: ${dueDate.toLocaleDateString()}

Please log in to the system to begin your review.

Best regards,
NCISM Review System
  `;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>New Review Assignment</h2>
      <p>Dear ${reviewerName},</p>
      <p>You have been assigned a new book review:</p>
      <ul>
        <li><strong>Book:</strong> ${bookTitle}</li>
        <li><strong>Due Date:</strong> ${dueDate.toLocaleDateString()}</li>
      </ul>
      <p>Please log in to the system to begin your review.</p>
      <p>Best regards,<br>NCISM Review System</p>
    </div>
  `;

  return await sendEmail({
    to: reviewerEmail,
    subject,
    text,
    html,
  });
};

export const sendReminderEmail = async (
  userEmail: string,
  userName: string,
  message: string,
  assignmentTitle?: string
): Promise<boolean> => {
  const subject = 'Reminder - NCISM Textbook Review System';
  const text = `
Dear ${userName},

${message}

${assignmentTitle ? `Assignment: ${assignmentTitle}` : ''}

Please log in to the system to take action.

Best regards,
NCISM Review System
  `;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Reminder</h2>
      <p>Dear ${userName},</p>
      <p>${message}</p>
      ${assignmentTitle ? `<p><strong>Assignment:</strong> ${assignmentTitle}</p>` : ''}
      <p>Please log in to the system to take action.</p>
      <p>Best regards,<br>NCISM Review System</p>
    </div>
  `;

  return await sendEmail({
    to: userEmail,
    subject,
    text,
    html,
  });
};
