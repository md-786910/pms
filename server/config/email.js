const nodemailer = require("nodemailer");

// Create transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "mdashifreza7869101@gmail.com",
    pass: "",
  },
});

// Verify transporter configuration
transporter.verify((error, success) => {
  if (error) {
    console.error("Email configuration error:", error);
  } else {
    console.log("Email server is ready to send messages");
  }
});

// Email templates
const emailTemplates = {
  passwordReset: (name, resetUrl) => ({
    subject: "Password Reset Request - Project Management System",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Password Reset</h1>
        </div>
        <div style="padding: 30px; background: #f8f9fa;">
          <h2 style="color: #333; margin-bottom: 20px;">Hello ${name},</h2>
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            You requested a password reset for your Project Management System account. 
            Click the button below to reset your password:
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              Reset Password
            </a>
          </div>
          <p style="color: #666; line-height: 1.6; font-size: 14px;">
            This link will expire in 15 minutes. If you didn't request this password reset, 
            please ignore this email.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">
            Project Management System
          </p>
        </div>
      </div>
    `,
  }),

  projectInvitation: (
    name,
    projectName,
    invitationUrl,
    inviterName,
    token = null
  ) => ({
    subject: `You've been invited to join "${projectName}" - Project Management System`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Project Invitation</h1>
        </div>
        <div style="padding: 30px; background: #f8f9fa;">
          <h2 style="color: #333; margin-bottom: 20px;">Hello ${name},</h2>
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            <strong>${inviterName}</strong> has invited you to join the project 
            <strong>"${projectName}"</strong> on Project Management System.
          </p>
          ${
            token
              ? `
          <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="color: #856404; margin: 0; font-size: 14px;">
              <strong>New User:</strong> You'll need to create an account first, then you can join the project.
            </p>
          </div>
          `
              : ""
          }
          <div style="text-align: center; margin: 30px 0;">
            <a href="${invitationUrl}" style="background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              ${token ? "Create Account & Join Project" : "View Project"}
            </a>
          </div>
          <p style="color: #666; line-height: 1.6; font-size: 14px;">
            ${
              token
                ? "Click the button above to create your account and join the project. This invitation will expire in 7 days."
                : "You have been added to this project! Click the button above to view and start collaborating."
            }
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">
            Project Management System
          </p>
        </div>
      </div>
    `,
  }),

  welcomeEmail: (name) => ({
    subject: "Welcome to Project Management System",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Welcome!</h1>
        </div>
        <div style="padding: 30px; background: #f8f9fa;">
          <h2 style="color: #333; margin-bottom: 20px;">Hello ${name},</h2>
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            Welcome to Project Management System! Your account has been created successfully.
          </p>
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            You can now start creating projects, managing tasks, and collaborating with your team.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${
              process.env.CLIENT_URL || "http://localhost:3000"
            }" style="background: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              Get Started
            </a>
          </div>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">
            Project Management System
          </p>
        </div>
      </div>
    `,
  }),

  cardAssigned: (
    assigneeName,
    cardTitle,
    projectName,
    assignedByName,
    cardUrl
  ) => ({
    subject: `You've been assigned to a card: "${cardTitle}" - ${projectName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">📋 Card Assignment</h1>
        </div>
        <div style="padding: 30px; background: #f8f9fa;">
          <h2 style="color: #333; margin-bottom: 20px;">Hello ${assigneeName},</h2>
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            <strong>${assignedByName}</strong> has assigned you to a card in the project 
            <strong>"${projectName}"</strong>.
          </p>
          
          <div style="background: white; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h3 style="color: #495057; margin: 0 0 10px 0; font-size: 18px;">📌 Card Details</h3>
            <p style="color: #6c757d; margin: 0; font-size: 16px; font-weight: 500;">${cardTitle}</p>
            <p style="color: #6c757d; margin: 5px 0 0 0; font-size: 14px;">Project: ${projectName}</p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${cardUrl}" style="background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              View Card
            </a>
          </div>
          
          <p style="color: #666; line-height: 1.6; font-size: 14px;">
            Click the button above to view the card details and start working on your assigned task.
          </p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">
            Project Management System
          </p>
        </div>
      </div>
    `,
  }),

  cardUnassigned: (
    assigneeName,
    cardTitle,
    projectName,
    unassignedByName,
    cardUrl
  ) => ({
    subject: `You've been removed from a card: "${cardTitle}" - ${projectName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #dc3545 0%, #fd7e14 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">❌ Card Unassignment</h1>
        </div>
        <div style="padding: 30px; background: #f8f9fa;">
          <h2 style="color: #333; margin-bottom: 20px;">Hello ${assigneeName},</h2>
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            <strong>${unassignedByName}</strong> has removed you from a card in the project 
            <strong>"${projectName}"</strong>.
          </p>
          
          <div style="background: white; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h3 style="color: #495057; margin: 0 0 10px 0; font-size: 18px;">📌 Card Details</h3>
            <p style="color: #6c757d; margin: 0; font-size: 16px; font-weight: 500;">${cardTitle}</p>
            <p style="color: #6c757d; margin: 5px 0 0 0; font-size: 14px;">Project: ${projectName}</p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${cardUrl}" style="background: #6c757d; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              View Card
            </a>
          </div>
          
          <p style="color: #666; line-height: 1.6; font-size: 14px;">
            You can still view the card if you have access to the project, but you're no longer assigned to it.
          </p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">
            Project Management System
          </p>
        </div>
      </div>
    `,
  }),
};

// Email sending functions
const sendEmail = async (to, subject, html) => {
  try {
    const mailOptions = {
      from: "mdashifreza7869101@gmail.com",
      to,
      subject,
      html,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully:", result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error("Email sending error:", error);
    return { success: false, error: error.message };
  }
};

const sendPasswordResetEmail = async (user, resetToken) => {
  const resetUrl = `${
    process.env.CLIENT_URL || "http://localhost:3000"
  }/reset-password?token=${resetToken}`;
  const template = emailTemplates.passwordReset(user.name, resetUrl);

  return await sendEmail(user.email, template.subject, template.html);
};

const sendProjectInvitationEmail = async (
  user,
  project,
  inviter,
  token = null
) => {
  let invitationUrl;

  if (token) {
    // For new users - invitation with token
    invitationUrl = `${
      process.env.CLIENT_URL || "http://localhost:3000"
    }/invite/${token}`;
  } else {
    // For existing users - direct project link
    invitationUrl = `${
      process.env.CLIENT_URL || "http://localhost:3000"
    }/project/${project._id}`;
  }

  const template = emailTemplates.projectInvitation(
    user.name,
    project.name,
    invitationUrl,
    inviter.name,
    token
  );

  return await sendEmail(user.email, template.subject, template.html);
};

const sendWelcomeEmail = async (user) => {
  const template = emailTemplates.welcomeEmail(user.name);
  return await sendEmail(user.email, template.subject, template.html);
};

const sendCardAssignedEmail = async (assignee, card, project, assignedBy) => {
  const cardUrl = `${
    process.env.CLIENT_URL || "http://localhost:3000"
  }/project/${project._id}`;

  const template = emailTemplates.cardAssigned(
    assignee.name,
    card.title,
    project.name,
    assignedBy.name,
    cardUrl
  );

  return await sendEmail(assignee.email, template.subject, template.html);
};

const sendCardUnassignedEmail = async (
  assignee,
  card,
  project,
  unassignedBy
) => {
  const cardUrl = `${
    process.env.CLIENT_URL || "http://localhost:3000"
  }/project/${project._id}`;

  const template = emailTemplates.cardUnassigned(
    assignee.name,
    card.title,
    project.name,
    unassignedBy.name,
    cardUrl
  );

  return await sendEmail(assignee.email, template.subject, template.html);
};

module.exports = {
  transporter,
  sendEmail,
  sendPasswordResetEmail,
  sendProjectInvitationEmail,
  sendWelcomeEmail,
  sendCardAssignedEmail,
  sendCardUnassignedEmail,
};
