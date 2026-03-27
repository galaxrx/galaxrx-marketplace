/**
 * Server-side invoice PDF for email attachment.
 * Includes product image (when URL returns JPEG/PNG), qty, unit price, totals, parties.
 */
import PDFDocument from "pdfkit";
import { PLATFORM } from "@/lib/platform";

export type OrderForInvoice = {
  id: string;
  quantity: number;
  unitPrice: number;
  grossAmount: number;
  deliveryFee?: number;
  gstAmount: number;
  platformFee: number;
  netAmount: number;
  createdAt: Date;
  listing: {
    productName: string;
    strength: string | null;
    packSize?: number;
    /** Primary product photo (HTTPS URL) */
    imageUrl?: string | null;
    expiryDate?: Date | string | null;
    condition?: string | null;
    brand?: string | null;
    form?: string | null;
  };
  buyer: {
    name: string;
    address?: string;
    suburb?: string;
    state?: string;
    postcode?: string;
    abn?: string;
  };
  seller: {
    name: string;
    address?: string;
    suburb?: string;
    state?: string;
    postcode?: string;
    abn?: string;
  };
};

function isJpegOrPng(buf: Buffer): boolean {
  if (buf.length < 4) return false;
  if (buf[0] === 0xff && buf[1] === 0xd8) return true;
  return buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
}

async function fetchProductImageBuffer(url: string): Promise<Buffer | undefined> {
  const u = url.trim();
  if (!/^https:\/\//i.test(u)) return undefined;
  try {
    const res = await fetch(u, {
      redirect: "follow",
      signal: AbortSignal.timeout(12000),
      headers: { Accept: "image/*" },
    });
    if (!res.ok) return undefined;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length === 0 || buf.length > 4_000_000) return undefined;
    if (!isJpegOrPng(buf)) return undefined;
    return buf;
  } catch {
    return undefined;
  }
}

export async function generateInvoicePDF(order: OrderForInvoice): Promise<Buffer> {
  const imageBuf = order.listing?.imageUrl
    ? await fetchProductImageBuffer(order.listing.imageUrl)
    : undefined;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 40 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const invoiceNumber = `GX-INV-${order.id.slice(-5).toUpperCase()}`;
    const orderRef = `GX-${order.id.slice(-5).toUpperCase()}`;
    const date = new Date(order.createdAt).toLocaleDateString("en-AU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const deliveryFee = order.deliveryFee ?? 0;
    const totalIncGst = order.grossAmount + deliveryFee + order.gstAmount;
    const sellerAddr = [
      order.seller.address,
      order.seller.suburb,
      [order.seller.state, order.seller.postcode].filter(Boolean).join(" "),
    ]
      .filter(Boolean)
      .join(", ");
    const buyerAddr = [
      order.buyer.address,
      order.buyer.suburb,
      [order.buyer.state, order.buyer.postcode].filter(Boolean).join(" "),
    ]
      .filter(Boolean)
      .join(", ");

    const L = order.listing;
    const productTitle = L.productName;
    const productSubtitle = [
      L.brand ? `Brand: ${L.brand}` : null,
      L.strength ? `Strength: ${L.strength}` : null,
      L.form ? `Form: ${L.form}` : null,
      L.packSize ? `Pack size: ${L.packSize} units/pack` : null,
      L.condition ? `Condition: ${String(L.condition)}` : null,
      L.expiryDate
        ? `Expiry: ${new Date(L.expiryDate).toLocaleDateString("en-AU")}`
        : null,
    ]
      .filter(Boolean)
      .join(" · ");

    doc.fontSize(18).fillColor("black").text("GalaxRX", { continued: false });
    doc
      .fontSize(9)
      .fillColor("#666666")
      .text("Marketplace · Tax invoice (seller → buyer)", { continued: false });
    doc.moveDown(0.5);
    doc.fontSize(12).fillColor("black").text("TAX INVOICE", { continued: false });
    doc.fontSize(10).text(`Invoice #: ${invoiceNumber}`, { continued: false });
    doc.text(`Date: ${date}`, { continued: false });
    doc.text(`Order ref: ${orderRef}`, { continued: false });
    doc.moveDown(1.2);

    doc.fontSize(9).fillColor("#666666").text("FROM (Seller / supplier)", { continued: false });
    doc.fillColor("black").fontSize(10).text(order.seller.name, { continued: false });
    if (sellerAddr) doc.fontSize(9).text(sellerAddr, { continued: false });
    if (order.seller.abn) doc.text(`ABN: ${order.seller.abn}`, { continued: false });
    doc.moveDown(0.8);
    doc.fontSize(9).fillColor("#666666").text("TO (Buyer)", { continued: false });
    doc.fillColor("black").fontSize(10).text(order.buyer.name, { continued: false });
    if (buyerAddr) doc.fontSize(9).text(buyerAddr, { continued: false });
    if (order.buyer.abn) doc.text(`ABN: ${order.buyer.abn}`, { continued: false });
    doc.moveDown(1.2);

    doc.fontSize(11).fillColor("black").text("Product", { continued: false });
    doc.moveDown(0.3);

    const imgY = doc.y;
    const imgW = 110;
    const imgH = 110;
    if (imageBuf) {
      try {
        doc.image(imageBuf, 40, imgY, {
          fit: [imgW, imgH],
          align: "center",
          valign: "center",
        });
      } catch {
        /* unsupported format */
      }
    }
    const textX = imageBuf ? 40 + imgW + 16 : 40;
    const textW = 400;
    doc.fontSize(11).fillColor("black").text(productTitle, textX, imgY, { width: textW });
    let ty = doc.y;
    if (productSubtitle) {
      doc.fontSize(9).fillColor("#444444").text(productSubtitle, textX, ty + 4, { width: textW });
      ty = doc.y;
    }
    const belowImg = Math.max(imgY + imgH + 8, ty + 8);
    doc.y = belowImg;
    doc.moveDown(0.5);

    const tableTop = doc.y;
    doc.fontSize(8).fillColor("#666666");
    doc.text("DESCRIPTION", 40, tableTop, { width: 210 });
    doc.text("QTY", 255, tableTop, { width: 40, align: "right" });
    doc.text("$/unit ex GST", 300, tableTop, { width: 75, align: "right" });
    doc.text("Line ex GST", 385, tableTop, { width: 75, align: "right" });
    doc.moveTo(40, tableTop + 14).lineTo(460, tableTop + 14).stroke("#cccccc");
    doc.y = tableTop + 18;
    doc.fillColor("black").fontSize(9);
    const lineDesc = `${productTitle}${L.strength ? ` — ${L.strength}` : ""}`;
    doc.text(lineDesc, 40, doc.y, { width: 205 });
    const rowY = tableTop + 18;
    doc.text(String(order.quantity), 255, rowY, { width: 40, align: "right" });
    doc.text(`$${order.unitPrice.toFixed(2)}`, 300, rowY, { width: 75, align: "right" });
    doc.text(`$${order.grossAmount.toFixed(2)}`, 385, rowY, { width: 75, align: "right" });
    doc.y = Math.max(doc.y, rowY + 36);
    doc.moveDown(1);

    const totalsX = 360;
    doc.fontSize(10).fillColor("black");
    doc.text("Subtotal (product, ex GST):", totalsX - 130, doc.y, { width: 125, align: "right", continued: true });
    doc.text(`$${order.grossAmount.toFixed(2)}`, { width: 75, align: "right" });
    if (deliveryFee > 0) {
      doc.text("Delivery fee (ex GST):", totalsX - 130, doc.y + 4, { width: 125, align: "right", continued: true });
      doc.text(`$${deliveryFee.toFixed(2)}`, { width: 75, align: "right" });
    }
    doc.text("GST:", totalsX - 130, doc.y + 4, { width: 125, align: "right", continued: true });
    doc.text(`$${order.gstAmount.toFixed(2)}`, { width: 75, align: "right" });
    doc.fontSize(11).text("TOTAL PAID (inc GST):", totalsX - 130, doc.y + 6, { width: 125, align: "right", continued: true });
    doc.text(`$${totalIncGst.toFixed(2)}`, { width: 75, align: "right" });
    doc.moveDown(0.6);
    doc.fontSize(9).fillColor("#666666");
    doc.text("Platform fee (seller):", totalsX - 130, doc.y + 4, { width: 125, align: "right", continued: true });
    doc.fillColor("black").text(`$${order.platformFee.toFixed(2)}`, { width: 75, align: "right" });
    doc.fillColor("#666666").text("Amount to seller (net):", totalsX - 130, doc.y + 4, { width: 125, align: "right", continued: true });
    doc.fillColor("black").text(`$${order.netAmount.toFixed(2)}`, { width: 75, align: "right" });
    doc.moveDown(1.5);

    doc.fontSize(9).fillColor("black").text("Payment: Card via Stripe (GalaxRX checkout)", { continued: false });
    doc.fillColor("#666666").fontSize(8);
    doc.text(
      "GalaxRX facilitates this sale. The seller named above supplied the goods. GST shown per Australian marketplace rules.",
      { continued: false }
    );
    doc.text(`${PLATFORM.supportEmail} · ${PLATFORM.website}`, { continued: false });

    doc.end();
  });
}
