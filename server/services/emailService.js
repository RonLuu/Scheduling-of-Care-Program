import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create reusable transporter object using SMTP transport
const createTransporter = () => {
  // Check if we're in production or development
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (process.env.EMAIL_SERVICE) {
    // Production email configuration using explicit SMTP settings
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  } else {
    // Development configuration - using Ethereal Email (fake SMTP service)
    // This allows testing without sending real emails
    console.log('Email service running in development mode - emails will be logged but not sent');
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: {
        user: 'ethereal.user@ethereal.email',
        pass: 'ethereal.pass',
      },
    });
  }
};

const transporter = createTransporter();

// Email template for budget warning
const getBudgetWarningEmailTemplate = (data) => {
  const {
    userName,
    clientName,
    categoryName,
    annualBudget,
    amountSpent,
    percentageUsed,
    remainingAmount,
    year,
    appUrl
  } = data;

  return {
    subject: `Budget Alert: ${percentageUsed}% of ${categoryName || 'Annual'} Budget Used`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #333;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f9f9f9;
            }
            .header {
              background-color: #ff9800;
              color: white;
              padding: 20px;
              border-radius: 10px 10px 0 0;
              text-align: center;
            }
            .content {
              background-color: white;
              padding: 30px;
              border-radius: 0 0 10px 10px;
              box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            }
            .alert-box {
              background-color: #fff3e0;
              border-left: 4px solid #ff9800;
              padding: 15px;
              margin: 20px 0;
            }
            .budget-details {
              background-color: #f5f5f5;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
            }
            .budget-item {
              display: flex;
              justify-content: space-between;
              margin: 10px 0;
              padding: 8px 0;
              border-bottom: 1px solid #e0e0e0;
            }
            .budget-item:last-child {
              border-bottom: none;
            }
            .label {
              font-weight: 600;
              color: #666;
            }
            .value {
              font-weight: 700;
              color: #333;
            }
            .warning {
              color: #ff9800;
            }
            .danger {
              color: #f44336;
            }
            .button {
              display: inline-block;
              padding: 12px 24px;
              background-color: #8189d2;
              color: white !important;
              text-decoration: none;
              border-radius: 25px;
              margin: 20px 0;
              font-weight: 600;
            }
            .footer {
              text-align: center;
              color: #666;
              font-size: 12px;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #e0e0e0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Budget Alert</h1>
            </div>
            <div class="content">
              <p>Dear ${userName},</p>
              
              <p>
                <strong>Important Notice:</strong><br>
                Your client <strong>${clientName}</strong>'s budget ${categoryName ? `for <strong>${categoryName}</strong>` : ''} 
                has reached <span class="${percentageUsed >= 100 ? 'danger' : 'warning'}"><strong>${percentageUsed}%</strong></span> 
                of the annual limit for ${year}.
              </p>

              <div class="budget-details">
                <h3>Budget Details</h3>
                <div class="budget-item">
                  <span class="label">Annual Budget:</span>
                  <span class="value">$${annualBudget.toLocaleString()}</span>
                </div>
                <div class="budget-item">
                  <span class="label">Amount Spent:</span>
                  <span class="value ${percentageUsed >= 80 ? 'warning' : ''}">$${amountSpent.toLocaleString()} (${percentageUsed}%)</span>
                </div>
                <div class="budget-item">
                  <span class="label">Remaining Budget:</span>
                  <span class="value ${remainingAmount <= 0 ? 'danger' : ''}">$${remainingAmount.toLocaleString()}</span>
                </div>
              </div>

              <p><strong>Recommended Actions:</strong></p>
              <ul>
                <li>Consider adjusting your budget plan</li>
                <li>You can increase budget, or reallocate unused budget from other items</li>
                ${percentageUsed >= 100 ? '<li style="color: #f44336;"><strong>Immediate action required: Budget has been exceeded</strong></li>' : ''}
              </ul>

              <div style="text-align: center;">
                <a href="${appUrl}/budget-and-reports" class="button">View Budget Report</a>
              </div>

              <div class="footer">
                <p>This is an automated notification from Schedule of Care. Please do not reply. </p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Budget Alert for ${clientName}

Dear ${userName},

Your client ${clientName}'s budget ${categoryName ? `for ${categoryName}` : ''} has reached ${percentageUsed}% of the annual limit for ${year}.

Budget Details:
- Annual Budget: $${annualBudget.toLocaleString()}
- Amount Spent: $${amountSpent.toLocaleString()} (${percentageUsed}%)
- Remaining Budget: $${remainingAmount.toLocaleString()}

Please review your expenses and consider adjusting future spending.

View full report at: ${appUrl}/budget-and-reports

This is an automated notification from Schedule of Care.
    `
  };
};

// Function to send budget warning email
export async function sendBudgetWarningEmail(recipient, budgetData) {
  try {
    const emailContent = getBudgetWarningEmailTemplate(budgetData);
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"Schedule of Care" <notifications@scheduleofcare.com>',
      to: recipient,
      subject: emailContent.subject,
      text: emailContent.text,
      html: emailContent.html,
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);
    
    console.log('Budget warning email sent:', info.messageId);
    
    // In development mode, log the preview URL
    if (!process.env.EMAIL_SERVICE) {
      console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
    }
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending budget warning email:', error);
    return { success: false, error: error.message };
  }
}

// Function to check and send budget alerts for a user
export async function checkAndSendBudgetAlerts(user, person, budgetReport) {
  const alerts = [];
  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  
  // Check overall budget
  if (budgetReport.warnings?.summary?.level === 'light' || 
      budgetReport.warnings?.summary?.level === 'serious') {
    const percentageUsed = Math.round((budgetReport.spent.total / budgetReport.annualBudget) * 100);
    
    if (percentageUsed >= 80) {
      alerts.push({
        type: 'overall',
        data: {
          userName: user.name,
          clientName: person.name,
          categoryName: null,
          annualBudget: budgetReport.annualBudget,
          amountSpent: budgetReport.spent.total,
          percentageUsed,
          remainingAmount: budgetReport.balance.current,
          year: budgetReport.year,
          appUrl
        }
      });
    }
  }
  
  // Check category-level budgets
  for (const category of budgetReport.categories || []) {
    if (category.warning?.level === 'light' || category.warning?.level === 'serious') {
      const percentageUsed = Math.round((category.totalSpent / category.annualBudget) * 100);
      
      if (percentageUsed >= 80) {
        alerts.push({
          type: 'category',
          data: {
            userName: user.name,
            clientName: person.name,
            categoryName: category.category,
            annualBudget: category.annualBudget,
            amountSpent: category.totalSpent,
            percentageUsed,
            remainingAmount: category.currentBalance,
            year: budgetReport.year,
            appUrl
          }
        });
      }
    }

    // Check item-level budgets within each category
    for (const item of category.items || []) {
      if (item.warning?.level === 'light' || item.warning?.level === 'serious') {
        const percentageUsed = Math.round((item.spent / item.budget) * 100);
        
        if (percentageUsed >= 80) {
          console.log(`📧 Sending item-level alert: ${item.name} - ${percentageUsed}%`);
          alerts.push({
            type: 'item',
            data: {
              userName: user.name,
              clientName: person.name,
              categoryName: `${category.category} → ${item.name}`, // Show category and item
              annualBudget: item.budget,
              amountSpent: item.spent,
              percentageUsed,
              remainingAmount: item.currentBalance,
              year: budgetReport.year,
              appUrl
            }
          });
        }
      }
    }
  }
  
  // Send email for each alert (you might want to combine these into a single email)
  const results = [];
  for (const alert of alerts) {
    const result = await sendBudgetWarningEmail(user.email, alert.data);
    results.push({ ...result, type: alert.type, category: alert.data.categoryName });
  }
  
  return results;
}

export default {
  sendBudgetWarningEmail,
  checkAndSendBudgetAlerts,
};