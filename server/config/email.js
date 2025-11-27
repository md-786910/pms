const nodemailer = require("nodemailer");

// Create transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD,
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

  mentionEmail: (
    mentionedUserName,
    commenterName,
    cardTitle,
    projectName,
    commentText,
    cardUrl
  ) => ({
    subject: `You were mentioned in a comment: "${cardTitle}" - ${projectName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #007bff 0%, #0056b3 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">💬 Mention Notification</h1>
        </div>
        <div style="padding: 30px; background: #f8f9fa;">
          <h2 style="color: #333; margin-bottom: 20px;">Hello ${mentionedUserName},</h2>
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            <strong>${commenterName}</strong> mentioned you in a comment on the card 
            <strong>"${cardTitle}"</strong> in project <strong>"${projectName}"</strong>.
          </p>
          
          <div style="background: white; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h3 style="color: #495057; margin: 0 0 10px 0; font-size: 18px;">💬 Comment</h3>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; border-left: 4px solid #007bff;">
              <p style="color: #495057; margin: 0; line-height: 1.5;">${commentText}</p>
            </div>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${cardUrl}" style="background: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              View Card & Reply
            </a>
          </div>
          
          <p style="color: #666; line-height: 1.6; font-size: 14px;">
            Click the button above to view the card and respond to the comment.
          </p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">
            Project Management System
          </p>
        </div>
      </div>
    `,
  }),

  projectUpdate: (
    memberName,
    projectName,
    updatedByName,
    changes,
    projectUrl,
    detailedChanges = null
  ) => ({
    subject: `Project "${projectName}" has been updated - Project Management System`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #6f42c1 0%, #e83e8c 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">👥 Bright Group</h1>
        </div>
        <div style="padding: 30px; background: #f8f9fa;">
          <h2 style="color: #333; margin-bottom: 20px;">Hello ${memberName},</h2>
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            <strong>${updatedByName}</strong> has updated the project 
            <strong>"${projectName}"</strong> that you're a member of.
          </p>
          
          <div style="background: white; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h3 style="color: #495057; margin: 0 0 15px 0; font-size: 18px;">📋 Changes Made</h3>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; border-left: 4px solid #6f42c1;">
              ${
                detailedChanges
                  ? detailedChanges
                      .map(
                        (change) =>
                          `<div style="margin-bottom: 8px; line-height: 1.6;">${change}</div>`
                      )
                      .join("")
                  : `<p style="color: #495057; margin: 0; line-height: 1.5; font-weight: 500;">${changes}</p>`
              }
            </div>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${projectUrl}" style="background: #6f42c1; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              View Updated Project
            </a>
          </div>
          
          <p style="color: #666; line-height: 1.6; font-size: 14px;">
            Click the button above to view the updated project details and see all the changes that were made.
          </p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">
            Project Management System
          </p>
        </div>
      </div>
    `,
  }),

  cardStatusChanged: (
    assigneeName,
    cardTitle,
    projectName,
    movedByName,
    oldStatus,
    newStatus,
    cardUrl,
    dateTime
  ) => ({
    subject: `Card status updated: "${cardTitle}" - ${projectName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #17a2b8 0%, #138496 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">🔄 Card Status Update</h1>
        </div>
        <div style="padding: 30px; background: #f8f9fa;">
          <h2 style="color: #333; margin-bottom: 20px;">Hello ${assigneeName},</h2>
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            <strong>${movedByName}</strong> has moved a card that you're assigned to in the project 
            <strong>"${projectName}"</strong>.
          </p>
          
          <div style="background: white; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h3 style="color: #495057; margin: 0 0 15px 0; font-size: 18px;">📌 Card Details</h3>
            <p style="color: #6c757d; margin: 0 0 15px 0; font-size: 16px; font-weight: 600;">${cardTitle}</p>
            
            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin-top: 15px;">
              <div style="display: flex; align-items: center; margin-bottom: 10px;">
                <span style="color: #6c757d; font-size: 14px; font-weight: 500;">Status Change:</span>
              </div>
              <div style="display: flex; align-items: center; gap: 10px; margin-top: 8px;">
                <span style="background-color: #f3f4f6; color: #374151; padding: 6px 12px; border-radius: 6px; font-weight: 600; font-size: 14px;">
                  ${oldStatus}
                </span>
                <span style="color: #17a2b8; font-size: 18px;">→</span>
                <span style="background-color: #d1ecf1; color: #0c5460; padding: 6px 12px; border-radius: 6px; font-weight: 600; font-size: 14px;">
                  ${newStatus}
                </span>
              </div>
            </div>
            
            <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e9ecef;">
              <p style="color: #6c757d; margin: 0; font-size: 13px;">
                <strong>Moved by:</strong> ${movedByName}
              </p>
              <p style="color: #6c757d; margin: 5px 0 0 0; font-size: 13px;">
                <strong>Project:</strong> ${projectName}
              </p>
              <p style="color: #6c757d; margin: 5px 0 0 0; font-size: 13px;">
                <strong>Time:</strong> ${dateTime}
              </p>
            </div>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${cardUrl}" style="background: #17a2b8; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              View Card
            </a>
          </div>
          
          <p style="color: #666; line-height: 1.6; font-size: 14px;">
            Click the button above to view the card and see all its details. Stay updated with the latest changes to your assigned tasks.
          </p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">
            Project Management System
          </p>
        </div>
      </div>
    `,
  }),

  memberRemoved: (memberName, projectName, removedByName, projectUrl) => ({
    subject: `You've been removed from project "${projectName}" - Project Management System`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #dc3545 0%, #fd7e14 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">👋 Member Removal</h1>
        </div>
        <div style="padding: 30px; background: #f8f9fa;">
          <h2 style="color: #333; margin-bottom: 20px;">Hello ${memberName},</h2>
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            We wanted to inform you that <strong>${removedByName}</strong> has removed you from the project 
            <strong>"${projectName}"</strong>.
          </p>
          
          <div style="background: white; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h3 style="color: #495057; margin: 0 0 10px 0; font-size: 18px;">📋 Project Details</h3>
            <p style="color: #6c757d; margin: 0; font-size: 16px; font-weight: 500;">${projectName}</p>
            <p style="color: #6c757d; margin: 5px 0 0 0; font-size: 14px;">Removed by: ${removedByName}</p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${
              process.env.CLIENT_URL || "http://localhost:3000"
            }" style="background: #6c757d; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              View Dashboard
            </a>
          </div>
          
          <p style="color: #666; line-height: 1.6; font-size: 14px;">
            You no longer have access to this project. If you have any questions, please contact the project owner.
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
    console.log(`📧 Attempting to send email to: ${to}`);
    console.log(`📧 Subject: ${subject}`);

    const mailOptions = {
      from: `PMS <${process.env.SMTP_EMAIL}>`,
      to,
      subject,
      html,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log("✅ Email sent successfully:", result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error("❌ Email sending error:", error);
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
  }/project/${project._id}/card/${card._id}`;

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
  }/project/${project._id}/card/${card._id}`;

  const template = emailTemplates.cardUnassigned(
    assignee.name,
    card.title,
    project.name,
    unassignedBy.name,
    cardUrl
  );

  return await sendEmail(assignee.email, template.subject, template.html);
};

const sendMentionEmail = async (
  mentionedUser,
  commenter,
  card,
  commentText,
  project
) => {
  const cardUrl = `${
    process.env.CLIENT_URL || "http://localhost:3000"
  }/project/${project._id}/card/${card._id}`;

  const template = emailTemplates.mentionEmail(
    mentionedUser.name,
    commenter.name,
    card.title,
    project.name,
    commentText,
    cardUrl
  );

  return await sendEmail(mentionedUser.email, template.subject, template.html);
};

const sendProjectUpdateEmail = async (
  member,
  project,
  updatedBy,
  changes,
  detailedChanges = null
) => {
  try {
    console.log(`📧 Preparing to send project update email to ${member.email}`);

    const projectUrl = `${
      process.env.CLIENT_URL || "http://localhost:3000"
    }/project/${project._id}`;

    const template = emailTemplates.projectUpdate(
      member.name,
      project.name,
      updatedBy.name,
      changes,
      projectUrl,
      detailedChanges
    );

    console.log(
      `📧 Sending email to ${member.email} with subject: ${template.subject}`
    );
    const result = await sendEmail(
      member.email,
      template.subject,
      template.html
    );

    if (result.success) {
      console.log(
        `✅ Project update email sent successfully to ${member.email}`
      );
    } else {
      console.error(
        `❌ Failed to send project update email to ${member.email}:`,
        result.error
      );
    }

    return result;
  } catch (error) {
    console.error(
      `❌ Error sending project update email to ${member.email}:`,
      error
    );
    return { success: false, error: error.message };
  }
};

const sendCardStatusChangedEmail = async (
  assignee,
  card,
  project,
  movedBy,
  oldStatus,
  newStatus
) => {
  try {
    console.log(
      `📧 Preparing to send card status change email to ${assignee.email}`
    );

    const cardUrl = `${
      process.env.CLIENT_URL || "http://localhost:3000"
    }/project/${project._id}/card/${card._id}`;

    // Format date and time
    const now = new Date();
    const dateTime = now.toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    });

    const template = emailTemplates.cardStatusChanged(
      assignee.name,
      card.title,
      project.name,
      movedBy.name,
      oldStatus,
      newStatus,
      cardUrl,
      dateTime
    );

    console.log(
      `📧 Sending card status change email to ${assignee.email} with subject: ${template.subject}`
    );
    const result = await sendEmail(
      assignee.email,
      template.subject,
      template.html
    );

    if (result.success) {
      console.log(
        `✅ Card status change email sent successfully to ${assignee.email}`
      );
    } else {
      console.error(
        `❌ Failed to send card status change email to ${assignee.email}:`,
        result.error
      );
    }

    return result;
  } catch (error) {
    console.error(
      `❌ Error sending card status change email to ${assignee.email}:`,
      error
    );
    return { success: false, error: error.message };
  }
};

const sendMemberRemovedEmail = async (member, project, removedBy) => {
  try {
    console.log(`📧 Preparing to send member removal email to ${member.email}`);

    const projectUrl = `${
      process.env.CLIENT_URL || "http://localhost:3000"
    }/project/${project._id}`;

    const template = emailTemplates.memberRemoved(
      member.name,
      project.name,
      removedBy.name,
      projectUrl
    );

    console.log(
      `📧 Sending member removal email to ${member.email} with subject: ${template.subject}`
    );
    const result = await sendEmail(
      member.email,
      template.subject,
      template.html
    );

    if (result.success) {
      console.log(
        `✅ Member removal email sent successfully to ${member.email}`
      );
    } else {
      console.error(
        `❌ Failed to send member removal email to ${member.email}:`,
        result.error
      );
    }

    return result;
  } catch (error) {
    console.error(
      `❌ Error sending member removal email to ${member.email}:`,
      error
    );
    return { success: false, error: error.message };
  }
};

const sendCredentialAccessEmail = async (member, project, grantedBy) => {
  try {
    console.log(
      `📧 Preparing to send credential access email to ${member.email}`
    );

    const projectUrl = `${
      process.env.CLIENT_URL || "http://localhost:3000"
    }/project/${project._id}`;

    const template = {
      subject: `Credential Access Granted: "${project.name}" - Project Management System`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🔐 Credential Access Granted</h1>
          </div>
          <div style="padding: 30px; background: #f8f9fa;">
            <h2 style="color: #333; margin-bottom: 20px;">Hello ${member.name},</h2>
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              <strong>${grantedBy.name}</strong> has granted you access to view credentials for the project
              <strong>"${project.name}"</strong>.
            </p>

            <div style="background: white; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <h3 style="color: #495057; margin: 0 0 15px 0; font-size: 18px;">🔑 What this means</h3>
              <ul style="color: #666; line-height: 1.8; padding-left: 20px; margin: 0;">
                <li>You can now view project credentials in the Credentials tab</li>
                <li>Please handle this information securely</li>
                <li>Do not share credentials with unauthorized users</li>
              </ul>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${projectUrl}" style="background: #f59e0b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                View Project Credentials
              </a>
            </div>

            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px; text-align: center;">
              Project Management System
            </p>
          </div>
        </div>
      `,
    };

    console.log(
      `📧 Sending credential access email to ${member.email} with subject: ${template.subject}`
    );
    const result = await sendEmail(
      member.email,
      template.subject,
      template.html
    );

    if (result.success) {
      console.log(
        `✅ Credential access email sent successfully to ${member.email}`
      );
    } else {
      console.error(
        `❌ Failed to send credential access email to ${member.email}:`,
        result.error
      );
    }

    return result;
  } catch (error) {
    console.error(
      `❌ Error sending credential access email to ${member.email}:`,
      error
    );
    return { success: false, error: error.message };
  }
};

module.exports = {
  transporter,
  sendEmail,
  sendPasswordResetEmail,
  sendProjectInvitationEmail,
  sendWelcomeEmail,
  sendCardAssignedEmail,
  sendCardUnassignedEmail,
  sendMentionEmail,
  sendProjectUpdateEmail,
  sendCardStatusChangedEmail,
  sendMemberRemovedEmail,
  sendCredentialAccessEmail,
};
