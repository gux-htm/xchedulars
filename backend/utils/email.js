
const sendEmail = async (options) => {
  // Development mode: Just log the email instead of sending
  if (process.env.EMAIL_DEV_MODE === 'true') {
    console.log('📧 [DEV MODE] Email would be sent:');
    console.log('To:', options.email);
    console.log('Subject:', options.subject);
    console.log('Message:', options.message);
    if (options.attachments) {
      console.log('Attachments:', options.attachments.length);
    }
    console.log('✅ Email logged (not sent - dev mode)');
    return;
  }

  // Use Resend API (supports attachments)
  if (process.env.RESEND_API_KEY) {
    try {
      const { Resend } = require('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);

      console.log('📧 Sending email via Resend...');
      console.log('To:', options.email);

      const emailData = {
        from: process.env.RESEND_FROM_EMAIL || 'Xchedular <onboarding@resend.dev>',
        to: options.email,
        subject: options.subject,
        text: options.message,
        html: options.html || options.message,
      };

      // Add attachments if provided (Resend requires base64 encoding)
      if (options.attachments && options.attachments.length > 0) {
        emailData.attachments = options.attachments.map(att => ({
          filename: att.filename,
          content: att.content.toString('base64'), // Convert buffer to base64
        }));
        console.log(`📎 Adding ${options.attachments.length} attachment(s) to email`);
      }

      const { data, error } = await resend.emails.send(emailData);

      if (error) {
        console.error('❌ Resend error:', error);
        throw error;
      }

      console.log(`✅ Email sent successfully to ${options.email} via Resend`);
      console.log('Email ID:', data.id);
      if (options.attachments && options.attachments.length > 0) {
        console.log(`📎 Attachments sent: ${options.attachments.length}`);
      }
      return;
    } catch (error) {
      console.error('❌ Resend sending error:', error.message);
      // Fall through to Gmail if Resend fails
    }
  }

  // Fallback to Gmail SMTP if Resend not configured or failed
  if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    try {
      const nodemailer = require('nodemailer');
      
      console.log('📧 Sending email via Gmail SMTP (fallback)...');
      
      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: false, // Use TLS
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      const mailOptions = {
        from: `Xchedular <${process.env.EMAIL_USER}>`,
        to: options.email,
        subject: options.subject,
        text: options.message,
        html: options.html || options.message,
      };

      // Add attachments if provided
      if (options.attachments && options.attachments.length > 0) {
        mailOptions.attachments = options.attachments;
      }

      const info = await transporter.sendMail(mailOptions);
      console.log(`✅ Email sent successfully to ${options.email} via Gmail`);
      console.log('Message ID:', info.messageId);
      return;
    } catch (error) {
      console.error('❌ Gmail sending error:', error.message);
    }
  }
  
  if (!process.env.EMAIL_HOST && !process.env.RESEND_API_KEY) {
    console.log('⚠️  No email service configured. Skipping email send.');
  }
};

module.exports = sendEmail;