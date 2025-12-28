const sendEmail = async (options) => {
  // Check if email is configured
  if (!process.env.SENDGRID_API_KEY || !process.env.EMAIL_USER) {
    console.log('⚠️  SendGrid not configured. Skipping email send.');
    return;
  }

  // Development mode: Just log the email instead of sending
  if (process.env.EMAIL_DEV_MODE === 'true') {
    console.log('📧 [DEV MODE] Email would be sent:');
    console.log('To:', options.email);
    console.log('Subject:', options.subject);
    console.log('Message:', options.message);
    console.log('✅ Email logged (not sent - dev mode)');
    return;
  }

  try {
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    console.log('📧 Sending email via SendGrid...');
    console.log('To:', options.email);

    const msg = {
      to: options.email,
      from: process.env.EMAIL_USER, // Must be verified in SendGrid
      subject: options.subject,
      text: options.message,
      html: options.html || options.message,
    };

    await sgMail.send(msg);
    console.log(`✅ Email sent successfully to ${options.email}`);
  } catch (error) {
    console.error('Email sending error:', error.message);
    if (error.response) {
      console.error('SendGrid error:', error.response.body);
    }
  }
};

module.exports = sendEmail;
