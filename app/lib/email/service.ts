/**
 * Email service for handling booking notifications
 * Initially uses console logging as per Phase 2.6 requirements
 */

interface EmailContent {
  bookingReference: string
  bookingDate: string
  finalAmount: number
  items: Array<{
    itemType: string
    name: string
    quantity: number
    unitPrice: number
    totalPrice: number
  }>
  customerName?: string
  eventDetails?: string
}

interface EmailData {
  recipient: string
  subject: string
  emailType: 'BOOKING_CONFIRMATION' | 'BOOKING_REMINDER' | 'REFUND_NOTIFICATION' | 'ADMIN_NOTIFICATION'
  content: EmailContent
  scheduledFor: Date
}

/**
 * Format currency amount for display
 */
function formatCurrency(amount: number, currency = 'GBP'): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100) // Convert from pence to pounds
}

/**
 * Format date for display
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-GB', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Generate booking confirmation email content
 */
function generateConfirmationEmailText(content: EmailContent): string {
  const { bookingReference, bookingDate, finalAmount, items } = content
  
  let emailText = `
=== BOOKING CONFIRMATION - COUNTRY DAYS ===

Dear Customer,

Your booking has been confirmed! Here are your booking details:

BOOKING REFERENCE: ${bookingReference}
EVENT DATE: ${formatDate(bookingDate)}
VENUE: Country Days Nightclub

--- BOOKING DETAILS ---
`

  // Add packages
  const packages = items.filter(item => item.itemType === 'PACKAGE')
  if (packages.length > 0) {
    emailText += `\nPACKAGES:\n`
    packages.forEach(pkg => {
      emailText += `• ${pkg.name} (Quantity: ${pkg.quantity}) - ${formatCurrency(pkg.totalPrice)}\n`
    })
  }

  // Add extras
  const extras = items.filter(item => item.itemType === 'EXTRA')
  if (extras.length > 0) {
    emailText += `\nEXTRAS:\n`
    extras.forEach(extra => {
      emailText += `• ${extra.name} (Quantity: ${extra.quantity}) - ${formatCurrency(extra.totalPrice)}\n`
    })
  }

  emailText += `\n--- PAYMENT SUMMARY ---
TOTAL AMOUNT PAID: ${formatCurrency(finalAmount)}

--- IMPORTANT INFORMATION ---
• Please arrive 30 minutes before your event time
• Bring a valid photo ID for entry
• Your booking reference is required for entry: ${bookingReference}
• For any changes or queries, contact us with your booking reference

We look forward to welcoming you to Country Days!

Best regards,
Country Days Team
`

  return emailText
}

/**
 * Generate booking reminder email content
 */
function generateReminderEmailText(content: EmailContent): string {
  const { bookingReference, bookingDate } = content
  
  return `
=== BOOKING REMINDER - COUNTRY DAYS ===

Dear Customer,

This is a reminder that your booking at Country Days is tomorrow!

BOOKING REFERENCE: ${bookingReference}
EVENT DATE: ${formatDate(bookingDate)}
VENUE: Country Days Nightclub

--- REMINDERS ---
• Arrive 30 minutes early for entry
• Bring valid photo ID
• Have your booking reference ready: ${bookingReference}
• Contact us immediately if you need to make changes

We're excited to see you tomorrow night!

Best regards,
Country Days Team
`
}

/**
 * Log email to console (initial implementation as per requirements)
 */
export async function sendEmail(emailData: EmailData): Promise<{ success: boolean; messageId?: string }> {
  try {
    console.log('\n' + '='.repeat(80))
    console.log('📧 EMAIL SERVICE - SENDING EMAIL')
    console.log('='.repeat(80))
    console.log(`TO: ${emailData.recipient}`)
    console.log(`SUBJECT: ${emailData.subject}`)
    console.log(`TYPE: ${emailData.emailType}`)
    console.log(`SCHEDULED FOR: ${emailData.scheduledFor.toISOString()}`)
    console.log(`CURRENT TIME: ${new Date().toISOString()}`)
    
    // Determine if email should be sent now or is scheduled for later
    const isImmediate = emailData.scheduledFor <= new Date()
    console.log(`DELIVERY: ${isImmediate ? 'IMMEDIATE' : 'SCHEDULED'}`)
    
    console.log('\n--- EMAIL CONTENT ---')
    
    let emailContent = ''
    if (emailData.emailType === 'BOOKING_CONFIRMATION') {
      emailContent = generateConfirmationEmailText(emailData.content)
    } else if (emailData.emailType === 'BOOKING_REMINDER') {
      emailContent = generateReminderEmailText(emailData.content)
    } else {
      emailContent = `Email content for ${emailData.emailType} (content not implemented yet)`
    }
    
    console.log(emailContent)
    console.log('='.repeat(80))
    console.log('✅ EMAIL LOGGED SUCCESSFULLY')
    console.log('='.repeat(80) + '\n')
    
    // Simulate successful email sending
    const messageId = `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    return {
      success: true,
      messageId
    }
  } catch (error) {
    console.error('❌ EMAIL SERVICE ERROR:', error)
    throw new Error('Email service failed')
  }
}

/**
 * Process emails from the queue (for scheduled emails like reminders)
 * This would typically be called by a cron job or background service
 */
export async function processEmailQueue(): Promise<void> {
  console.log('\n' + '='.repeat(80))
  console.log('📬 EMAIL QUEUE PROCESSOR')
  console.log('='.repeat(80))
  console.log('Checking for scheduled emails to send...')
  
  // In a real implementation, this would:
  // 1. Query the database for pending emails where scheduledFor <= now
  // 2. Send each email
  // 3. Update the email status to 'SENT'
  // 4. Handle failed emails appropriately
  
  console.log('Email queue processing complete')
  console.log('='.repeat(80) + '\n')
}

/**
 * Log booking confirmation email specifically
 */
export async function logBookingConfirmation(
  recipient: string,
  bookingReference: string,
  bookingDate: Date,
  finalAmount: number,
  items: Array<any>
): Promise<{ success: boolean; messageId?: string }> {
  const emailData: EmailData = {
    recipient,
    subject: 'Booking Confirmation - Country Days',
    emailType: 'BOOKING_CONFIRMATION',
    content: {
      bookingReference,
      bookingDate: bookingDate.toISOString(),
      finalAmount,
      items: items.map(item => ({
        itemType: item.itemType,
        name: item.package?.name || item.extra?.name || 'Unknown Item',
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice
      }))
    },
    scheduledFor: new Date() // Immediate
  }
  
  return sendEmail(emailData)
}

/**
 * Log booking reminder email specifically
 */
export async function logBookingReminder(
  recipient: string,
  bookingReference: string,
  bookingDate: Date,
  finalAmount: number,
  items: Array<any>,
  reminderDate: Date
): Promise<{ success: boolean; messageId?: string }> {
  const emailData: EmailData = {
    recipient,
    subject: 'Booking Reminder - Country Days',
    emailType: 'BOOKING_REMINDER',
    content: {
      bookingReference,
      bookingDate: bookingDate.toISOString(),
      finalAmount,
      items: items.map(item => ({
        itemType: item.itemType,
        name: item.package?.name || item.extra?.name || 'Unknown Item',
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice
      }))
    },
    scheduledFor: reminderDate
  }
  
  return sendEmail(emailData)
}