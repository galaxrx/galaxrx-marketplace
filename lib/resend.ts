import { Resend } from "resend";
import { PLATFORM } from "@/lib/platform";

const resendApiKey = process.env.RESEND_API_KEY;
export const resend = resendApiKey ? new Resend(resendApiKey) : null;

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "GalaxRX <onboarding@resend.dev>";

export type SendEmailOptions = {
  replyTo?: string;
};

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  options?: SendEmailOptions
) {
  if (!resend) {
    console.warn("Resend not configured; email not sent:", { to, subject });
    return { success: false, error: { message: "RESEND_API_KEY not set" } };
  }
  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: [to],
    subject,
    html,
    ...(options?.replyTo ? { replyTo: options.replyTo } : {}),
  });
  if (error) {
    console.error("Resend error:", error);
    return { success: false, error };
  }
  return { success: true };
}

function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Public website enquiry form → team inbox (default PLATFORM.email). Reply-To = submitter. */
export async function sendPublicEnquiryEmail(input: {
  fromName: string;
  fromEmail: string;
  topic: "general" | "advertising";
  message: string;
}) {
  const inbox = process.env.CONTACT_ENQUIRY_TO?.trim() || PLATFORM.email;
  const topicLabel = input.topic === "advertising" ? "Advertising" : "General enquiry";
  const subject = `[GalaxRX] ${topicLabel} — ${input.fromName}`.slice(0, 998);
  const html = `
    <div style="font-family: sans-serif; max-width: 640px; line-height: 1.5;">
      <h2 style="margin: 0 0 12px; color: #0D1B2A;">Website enquiry</h2>
      <p style="margin: 0 0 8px;"><strong>Topic:</strong> ${escHtml(topicLabel)}</p>
      <p style="margin: 0 0 8px;"><strong>Name:</strong> ${escHtml(input.fromName)}</p>
      <p style="margin: 0 0 8px;"><strong>Email:</strong> ${escHtml(input.fromEmail)}</p>
      <p style="margin: 16px 0 8px;"><strong>Message</strong></p>
      <div style="padding: 12px 14px; background: #f4f6f8; border-radius: 8px; white-space: pre-wrap;">${escHtml(
        input.message
      )}</div>
    </div>
  `;
  return sendEmail(inbox, subject, html, { replyTo: input.fromEmail });
}

// Phase 1 transactional emails
export async function sendRegistrationReceived(email: string, pharmacyName: string) {
  return sendEmail(
    email,
    "We've received your application",
    `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1A6FC4;">GalaxRX</h2>
      <p>Hi ${pharmacyName},</p>
      <p>We've received your pharmacy registration. We verify accounts within 24 hours. You'll receive an email when approved.</p>
      <p>If you have questions, contact ${PLATFORM.email}</p>
      <p>— The GalaxRX team</p>
    </div>
    `
  );
}

export async function sendVerificationApproved(email: string, pharmacyName: string) {
  return sendEmail(
    email,
    "Welcome to GalaxRX — you're verified",
    `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1A6FC4;">GalaxRX</h2>
      <p>Hi ${pharmacyName},</p>
      <p><strong>Welcome to GalaxRX.</strong> Your pharmacy has been verified. You can now list stock and buy from other verified pharmacies.</p>
      <p><a href="${process.env.NEXTAUTH_URL ?? "https://galaxrx.com.au"}/dashboard" style="color: #1A6FC4;">Go to Dashboard</a></p>
      <p>— The GalaxRX team</p>
    </div>
    `
  );
}

export async function sendVerificationRejected(email: string, pharmacyName: string, reason: string) {
  return sendEmail(
    email,
    "Application update — action required",
    `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1A6FC4;">GalaxRX</h2>
      <p>Hi ${pharmacyName},</p>
      <p>Unfortunately we couldn't approve your application at this time.</p>
      <p><strong>Reason:</strong> ${reason}</p>
      <p>Please contact ${PLATFORM.email} if you have questions or wish to reapply.</p>
      <p>— The GalaxRX team</p>
    </div>
    `
  );
}

export async function sendListingPublished(email: string, productName: string) {
  return sendEmail(
    email,
    `Your ${productName} is live on GalaxRX`,
    `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1A6FC4;">GalaxRX</h2>
      <p>Your listing &quot;${productName}&quot; is now visible to verified pharmacies.</p>
      <p><a href="${process.env.NEXTAUTH_URL ?? "https://galaxrx.com.au"}/my-listings" style="color: #1A6FC4;">View my listings</a></p>
      <p>— The GalaxRX team</p>
    </div>
    `
  );
}

export type InvoiceEmailSummary = {
  productName: string;
  quantity: number;
  unitPrice: number;
  grossExGst: number;
  imageUrl?: string | null;
};

export function invoiceEmailSummariesHtmlBlock(summaries: InvoiceEmailSummary[]): string {
  if (summaries.length === 0) return "";
  return summaries
    .map(
      (s, i) =>
        (summaries.length > 1
          ? `<p style="margin:16px 0 8px;font-size:13px;font-weight:600;color:#64748b;">Line ${i + 1}</p>`
          : "") + invoiceEmailSummaryHtml(s)
    )
    .join("");
}

function invoiceEmailSummaryHtml(s: InvoiceEmailSummary): string {
  const esc = (t: string) =>
    t
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  const img =
    s.imageUrl && /^https:\/\//i.test(s.imageUrl)
      ? `<p style="margin:12px 0 10px 0;"><img src="${esc(s.imageUrl)}" alt="Product" width="220" style="max-width:100%;border-radius:8px;border:1px solid #e2e8f0;" /></p>`
      : "";
  return `${img}<table cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:10px 0 18px 0;font-size:14px;color:#1e293b;">
<tr><td style="padding:6px 20px 6px 0;color:#64748b;vertical-align:top;">Product</td><td style="padding:6px 0;font-weight:600;">${esc(s.productName)}</td></tr>
<tr><td style="padding:6px 20px 6px 0;color:#64748b;">Quantity</td><td style="padding:6px 0;">${s.quantity} units</td></tr>
<tr><td style="padding:6px 20px 6px 0;color:#64748b;">Unit price (ex GST)</td><td style="padding:6px 0;">$${s.unitPrice.toFixed(2)}</td></tr>
<tr><td style="padding:6px 20px 6px 0;color:#64748b;">Line total (ex GST)</td><td style="padding:6px 0;font-weight:600;">$${s.grossExGst.toFixed(2)}</td></tr>
</table>`;
}

export async function sendNewSale(
  email: string,
  productName: string,
  buyerName: string,
  orderRef: string,
  options?: {
    invoicePdfBuffer?: Buffer;
    invoiceFileName?: string;
    emailSummary?: InvoiceEmailSummary;
    /** Cart / multi-line: one email with all line summaries (replaces emailSummary when set). */
    emailSummaries?: InvoiceEmailSummary[];
    invoiceAttachments?: { filename: string; content: Buffer }[];
  }
) {
  const baseUrl = process.env.NEXTAUTH_URL ?? "https://galaxrx.com.au";
  const multi = options?.emailSummaries && options.emailSummaries.length > 0;
  const summaryBlock = multi
    ? invoiceEmailSummariesHtmlBlock(options.emailSummaries!)
    : options?.emailSummary
      ? invoiceEmailSummaryHtml(options.emailSummary)
      : "";
  const hasPdf =
    (options?.invoiceAttachments && options.invoiceAttachments.length > 0) ||
    Boolean(options?.invoicePdfBuffer && options?.invoiceFileName);
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1A6FC4;">GalaxRX</h2>
      <p>${
        multi
          ? `You sold <strong>${options!.emailSummaries!.length} line(s)</strong> in this payment. ${buyerName} will contact you to arrange fulfillment.`
          : `You sold &quot;${productName}&quot;. ${buyerName} will contact you to arrange fulfillment.`
      }</p>
      <p><strong>Order reference:</strong> #${orderRef}</p>
      ${summaryBlock}
      ${
        hasPdf
          ? "<p>Tax invoice PDF(s) for each line are attached when available.</p>"
          : ""
      }
      <p><a href="${baseUrl}/orders" style="color: #1A6FC4;">View orders</a></p>
      <p>— The GalaxRX team</p>
    </div>
  `;
  if (!resend) {
    console.warn("Resend not configured; email not sent:", { to: email, subject: `You sold ${productName}` });
    return { success: true };
  }
  const attachments =
    options?.invoiceAttachments && options.invoiceAttachments.length > 0
      ? options.invoiceAttachments.map((a) => ({ filename: a.filename, content: a.content }))
      : options?.invoicePdfBuffer && options?.invoiceFileName
        ? [{ filename: options.invoiceFileName, content: options.invoicePdfBuffer }]
        : undefined;
  const subject = multi
    ? `You sold ${options!.emailSummaries!.length} items — #${orderRef}`
    : `You sold ${productName} — Order #${orderRef}`;
  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: [email],
    subject,
    html,
    attachments,
  });
  if (error) {
    console.error("Resend error (sendNewSale):", error);
    return { success: false, error };
  }
  return { success: true };
}

export async function sendPurchaseConfirmed(
  email: string,
  orderId: string,
  options?: {
    invoicePdfBuffer?: Buffer;
    invoiceFileName?: string;
    emailSummary?: InvoiceEmailSummary;
    emailSummaries?: InvoiceEmailSummary[];
    invoiceAttachments?: { filename: string; content: Buffer }[];
  }
) {
  const baseUrl = process.env.NEXTAUTH_URL ?? "https://galaxrx.com.au";
  const multi = options?.emailSummaries && options.emailSummaries.length > 0;
  const hasPdf =
    (options?.invoiceAttachments && options.invoiceAttachments.length > 0) ||
    Boolean(options?.invoicePdfBuffer && options?.invoiceFileName);
  const summaryBlock = multi
    ? invoiceEmailSummariesHtmlBlock(options.emailSummaries!)
    : options?.emailSummary
      ? invoiceEmailSummaryHtml(options.emailSummary)
      : "";
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1A6FC4;">GalaxRX</h2>
      <p>${
        multi
          ? `Your purchase has been confirmed (${options!.emailSummaries!.length} line(s)). Primary order reference: <strong>${orderId}</strong>`
          : `Your purchase has been confirmed. Order reference: ${orderId}`
      }</p>
      ${summaryBlock}
      ${
        hasPdf
          ? "<p>Your tax invoice PDF(s) are attached when available.</p>"
          : "<p>You can view order details in My Orders.</p>"
      }
      <p><a href="${baseUrl}/orders" style="color: #1A6FC4;">View orders</a></p>
      <p>— The GalaxRX team</p>
    </div>
  `;
  if (!resend) {
    console.warn("Resend not configured; email not sent:", { to: email, subject: `Purchase confirmed — order #${orderId}` });
    return { success: true };
  }
  const attachments =
    options?.invoiceAttachments && options.invoiceAttachments.length > 0
      ? options.invoiceAttachments.map((a) => ({ filename: a.filename, content: a.content }))
      : options?.invoicePdfBuffer && options?.invoiceFileName
        ? [{ filename: options.invoiceFileName, content: options.invoicePdfBuffer }]
        : undefined;
  const subject = multi
    ? `Purchase confirmed — ${options!.emailSummaries!.length} items (#${orderId})`
    : `Purchase confirmed — order #${orderId}`;
  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: [email],
    subject,
    html,
    attachments,
  });
  if (error) {
    console.error("Resend error:", error);
    return { success: false, error };
  }
  return { success: true };
}

export async function sendNewMessage(email: string, senderName: string) {
  return sendEmail(
    email,
    `New message from ${senderName} on GalaxRX`,
    `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1A6FC4;">GalaxRX</h2>
      <p>You have a new message from ${senderName}.</p>
      <p><a href="${process.env.NEXTAUTH_URL ?? "https://galaxrx.com.au"}/messages" style="color: #1A6FC4;">View messages</a></p>
      <p>— The GalaxRX team</p>
    </div>
    `
  );
}

export async function sendOrderShipped(email: string, orderId: string, trackingNumber: string) {
  return sendEmail(
    email,
    "Your order has been shipped",
    `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1A6FC4;">GalaxRX</h2>
      <p>Your order #${orderId} has been shipped.</p>
      <p><strong>Tracking:</strong> ${trackingNumber}</p>
      <p><a href="${process.env.NEXTAUTH_URL ?? "https://galaxrx.com.au"}/orders" style="color: #1A6FC4;">View orders</a></p>
      <p>— The GalaxRX team</p>
    </div>
    `
  );
}

export async function sendShippingScheduled(email: string, orderId: string, pickupDateIso: string) {
  const baseUrl = process.env.NEXTAUTH_URL ?? "https://galaxrx.com.au";
  const dateLabel = (() => {
    const d = new Date(pickupDateIso);
    return Number.isFinite(d.getTime()) ? d.toLocaleDateString("en-AU") : pickupDateIso;
  })();
  return sendEmail(
    email,
    "Your delivery has been scheduled",
    `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1A6FC4;">GalaxRX</h2>
      <p>Your order <strong>#${orderId}</strong> has been scheduled for dispatch.</p>
      <p><strong>Estimated pickup/shipping date:</strong> ${escHtml(dateLabel)}</p>
      <p>You will receive another update when the seller marks the order as shipped and tracking is available.</p>
      <p><a href="${baseUrl}/orders" style="color: #1A6FC4;">View orders</a></p>
      <p>— The GalaxRX team</p>
    </div>
    `
  );
}

export async function sendOfferAccepted(
  email: string,
  acceptorName: string,
  productName: string,
  priceSummary: string,
  offersPageUrl: string
) {
  return sendEmail(
    email,
    `${acceptorName} accepted your offer for ${productName}`,
    `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1A6FC4;">GalaxRX</h2>
      <p>Good news — <strong>${acceptorName}</strong> accepted your offer.</p>
      <p><strong>Product:</strong> ${productName}<br><strong>Agreed:</strong> ${priceSummary}</p>
      <p>They can now proceed to pay at this price. You’ll see the order in My Orders once payment is complete.</p>
      <p><a href="${offersPageUrl}" style="color: #1A6FC4;">View Wanted items</a></p>
      <p>— The GalaxRX team</p>
    </div>
    `
  );
}

/** Notify a user that a listing matches an item they wanted. */
export async function sendWantedMatch(
  email: string,
  productName: string,
  listingUrl: string,
  listerName: string
) {
  return sendEmail(
    email,
    `A product you wanted is now listed: ${productName}`,
    `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1A6FC4;">GalaxRX</h2>
      <p>Good news — an item you wanted is now available.</p>
      <p><strong>${productName}</strong> has been listed by ${listerName}.</p>
      <p><a href="${listingUrl}" style="color: #1A6FC4;">View listing</a></p>
      <p>— The GalaxRX team</p>
    </div>
    `
  );
}

/** Send 6-digit verification code for email verification during registration. */
export async function sendEmailVerificationCode(email: string, code: string) {
  return sendEmail(
    email,
    "Your GalaxRX verification code",
    `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1A6FC4;">GalaxRX</h2>
      <p>Your verification code is:</p>
      <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #1A6FC4;">${code}</p>
      <p>This code expires in 15 minutes. If you didn't request this, you can ignore this email.</p>
      <p>— The GalaxRX team</p>
    </div>
    `
  );
}

export async function sendPasswordReset(email: string, pharmacyName: string, resetUrl: string) {
  return sendEmail(
    email,
    "Reset your GalaxRX password",
    `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1A6FC4;">GalaxRX</h2>
      <p>Hi ${pharmacyName},</p>
      <p>You requested a password reset. Click the link below to set a new password (valid for 1 hour):</p>
      <p><a href="${resetUrl}" style="color: #1A6FC4;">Reset password</a></p>
      <p>If you didn't request this, you can ignore this email.</p>
      <p>— The GalaxRX team</p>
    </div>
    `
  );
}

export async function sendDirectShipmentContactEmail(input: {
  to: string;
  role: "buyer" | "seller";
  orderRef: string;
  productLabel: string;
  counterpartyName: string;
  counterpartyEmail: string;
  counterpartyPhone?: string | null;
  counterpartyAddress?: string | null;
}) {
  const baseUrl = process.env.NEXTAUTH_URL ?? "https://galaxrx.com.au";
  const roleLabel = input.role === "buyer" ? "seller" : "buyer";
  return sendEmail(
    input.to,
    `Direct shipment details — ${input.orderRef}`,
    `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1A6FC4;">GalaxRX</h2>
      <p>You chose to arrange shipment directly for <strong>${escHtml(input.productLabel)}</strong>.</p>
      <p><strong>Order reference:</strong> ${escHtml(input.orderRef)}</p>
      <p><strong>${escHtml(input.counterpartyName)}</strong> (${roleLabel}) contact details:</p>
      <p>
        Email: ${escHtml(input.counterpartyEmail)}<br/>
        Phone: ${escHtml(input.counterpartyPhone?.trim() || "Not provided")}<br/>
        Address: ${escHtml(input.counterpartyAddress?.trim() || "Not provided")}
      </p>
      <p>Please contact each other directly to arrange shipment.</p>
      <p><a href="${baseUrl}/orders" style="color: #1A6FC4;">View orders</a></p>
      <p>— The GalaxRX team</p>
    </div>
    `
  );
}
