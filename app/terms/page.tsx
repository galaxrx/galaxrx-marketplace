import Link from "next/link";

export const metadata = {
  title: "Terms and Conditions | GalaxRX",
  description: "GalaxRX Marketplace User Agreement and Terms and Conditions of Use",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#0D1B2A] text-white">
      <header className="border-b border-white/10 bg-mid-navy/50 sticky top-0 z-10">
        <div className="w-full max-w-none mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-heading font-bold text-gold">
            GalaxRX
          </Link>
          <Link href="/register" className="text-sm text-white/70 hover:text-gold transition-colors">
            Back to registration
          </Link>
        </div>
      </header>
      <main className="w-full max-w-none mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-8 pb-16 prose prose-invert max-w-none prose-headings:text-gold prose-a:text-gold prose-strong:text-white">
        <h1 className="text-2xl font-heading font-bold mb-2">Terms and Conditions of Use</h1>
        <p className="text-white/70 text-sm mb-8">
          GalaxRX Marketplace User Agreement and Terms and Conditions of Website Use
        </p>

        <section className="space-y-4 text-white/90 text-sm">
          <h2 className="text-lg font-semibold text-gold mt-8">1. Welcome and acceptance</h2>
          <p>
            These terms (&quot;Agreement&quot;) apply when you use the GalaxRX website and related services (&quot;Website&quot;). &quot;GalaxRX&quot;, &quot;we&quot; and &quot;us&quot; refer to the operator of the Website. You must not use the Website unless you accept this Agreement and our Privacy Policy. By registering or using the Website you confirm that you accept this Agreement and any policies referred to in it.
          </p>
          <p>
            We may update this Agreement from time to time. Updates apply to your use after they are published on the Website. Please check this page regularly. If you keep using the Website after an update, you are taken to have accepted the new terms.
          </p>

          <h2 className="text-lg font-semibold text-gold mt-8">2. Service &quot;as is&quot; and disclaimers</h2>
          <p>
            The Website and related services are supplied on an &quot;as is&quot; and &quot;as available&quot; basis. We give no warranties (express or implied, including as to quality or fitness for purpose) to the extent permitted by law. Availability, security, and freedom from errors are not guaranteed. We may change, suspend, or restrict access to the Website at any time. We are not responsible if your listings do not sell or for content you post.
          </p>
          <p>
            <strong>Release:</strong> Transactions are between buyers and sellers only. GalaxRX is not a party. If a dispute arises between participants, each participant releases GalaxRX and its officers, agents, and affiliates from any claims or demands in connection with that dispute.
          </p>

          <h2 className="text-lg font-semibold text-gold mt-8">3. What GalaxRX provides</h2>
          <p>
            GalaxRX runs an online marketplace where pharmacies (together &quot;Participants&quot;) can offer and buy pharmacy-related products and services. We provide the platform and support; we do not sell the products or services listed. We do not guarantee the quality, safety, or lawfulness of listed items, the accuracy of listings, or that any transaction will be completed. You must ensure the information you provide is correct. We may use anonymised transaction data to operate and improve the service. We may add, change, or discontinue features at any time.
          </p>

          <h2 className="text-lg font-semibold text-gold mt-8">4. Disputes about products or transactions</h2>
          <p>
            Products and services on the marketplace are supplied by Participants. Any claim or dispute about a listing, order, or delivery must be raised with the other participant(s) involved, not with GalaxRX. You release GalaxRX from any such claims. We may cancel a transaction where information was incorrect; in that case your only remedy is a refund of any amount you paid for that transaction.
          </p>

          <h2 className="text-lg font-semibold text-gold mt-8">5. Who can register</h2>
          <p>
            Only registered Participants may use the marketplace. Eligibility is limited to entities that are legally able to carry on business in Australia and have a genuine Australian business address (not a P.O. Box only). You confirm that you are authorised to give us accurate information and that everything you provide is true and complete. We may refuse or revoke registration if you do not meet these requirements.
          </p>
          <p>
            Pharmacy registration requires: business name, trading name (if any), ABN, pharmacy approval number, a copy of your pharmacy registration or approval, details of the owner or authorised representative, address, phone, email, and completion of any payment or onboarding we require. Registration grants you a limited, non-transferable right to use the Website for your business in line with this Agreement.
          </p>

          <h2 className="text-lg font-semibold text-gold mt-8">6. Your information</h2>
          <p>
            You must give us any information we reasonably ask for and keep it up to date. If information you provide is wrong or out of date and that causes us loss or cost, you will reimburse us. Accuracy of your details is your responsibility. Under our Privacy Policy we are allowed to use and store your information to run the Website and provide our services.
          </p>

          <h2 className="text-lg font-semibold text-gold mt-8">7. Account security</h2>
          <p>
            You must keep your password and login details private. You are responsible for everything done using your account. Do not share your password with anyone. Tell us straight away if you suspect unauthorised access. You must not pretend to be someone else, falsely claim an affiliation, or try to access or change another participant&apos;s account or data.
          </p>

          <h2 className="text-lg font-semibold text-gold mt-8">8. Notices and messages</h2>
          <p>
            We may contact you by email, phone, or SMS about your transactions and activity on the platform. You can adjust your preferences for these communications in your account or platform settings.
          </p>

          <h2 className="text-lg font-semibold text-gold mt-8">9. Fees and GST</h2>
          <p>
            We may charge fees for using the marketplace or for subscriptions, as shown on the Website. Fees are in Australian dollars and are due when you purchase or subscribe. You are responsible for any taxes (including GST) that apply to your use of our services. We may update our fees and tax information on the Website; the version published at the time of your use applies.
          </p>

          <h2 className="text-lg font-semibold text-gold mt-8">10. Misuse of platform data</h2>
          <p>
            You must not collect or use data from the Website except to place or complete orders. Scraping the site, using it to monitor prices for non-participants, or otherwise misusing platform data can lead to penalties and your access being ended. You must not scrape, copy, or harvest product-identifying data except where needed to complete or document a transaction you are part of.
          </p>

          <h2 className="text-lg font-semibold text-gold mt-8">11. Listings and legal compliance</h2>
          <p>
            Everything you list must comply with Australian law, including therapeutic goods and pharmacy rules (e.g. TGA and state/territory legislation). If a buyer, GalaxRX, or a regulator asks, sellers must supply traceability or provenance as the law requires. Listings must accurately describe items and include any required identifiers. Buyers confirm they are allowed to buy and handle the products under applicable law. Sellers confirm the products are lawful and that they have not knowingly supplied suspect or illegitimate product. We may suspend or ban participants who breach these requirements or who are involved in relevant criminal or civil proceedings.
          </p>

          <h2 className="text-lg font-semibold text-gold mt-8">12. Legal notice</h2>
          <p>
            Products traded on GalaxRX include <strong>scheduled and otherwise regulated medicines</strong>. You must maintain safe and legally compliant practices for transporting, storing, and handling these products at all times. You are responsible for adhering to your applicable professional and quality standards, such as <strong>QCPP (Quality Care Pharmacy Program)</strong> and any state or federal therapeutic goods and pharmacy requirements.
          </p>
          <p>
            Under Australian law, trading in medicines for which a <strong>Pharmaceutical Benefits Scheme (PBS)</strong> subsidy has already been claimed can constitute an offence. You must not list, offer, or sell any such items on the platform.
          </p>
          <p>
            Where we identify <strong>fraud or misuse</strong> of the platform by a pharmacy owner, manager, pharmacist, or other user, we will report the matter to the relevant bodies. These may include law enforcement, <strong>AHPRA</strong> (Australian Health Practitioner Regulation Agency), and the <strong>Health Care Complaints Commission (HCCC)</strong> or the equivalent complaints body in your jurisdiction. We will assist authorities as required and support enforcement to the extent allowed by law.
          </p>

          <h2 className="text-lg font-semibold text-gold mt-8">13. Orders and when a sale is complete</h2>
          <p>
            Payment may be taken when the seller confirms the item is available. Once an order is placed it is binding and normally cannot be cancelled by the buyer. Sellers must confirm and dispatch within the period shown on the platform. The sale is final when the buyer accepts delivery or does not raise a dispute within the time allowed. GalaxRX is not responsible for goods lost or damaged in transit; sellers may take out their own insurance.
          </p>

          <h2 className="text-lg font-semibold text-gold mt-8">14. Dispatch and delivery policy</h2>
          <p>
            Sellers must ship the product to the Buyer within <strong>three (3) business days</strong> of the transaction being confirmed on the platform. Responsibility for the product remains with the Seller until it is delivered. Sellers must use a reliable carrier and, where appropriate (e.g. cold-chain or high-value goods), obtain adequate insurance so that the product arrives in saleable condition.
          </p>
          <p>
            <strong>Lost in transit:</strong> Where goods are lost in transit, the Seller must pursue tracing and insurance claims with the carrier. The Seller bears responsibility to the Buyer for the loss and must refund any amount the Buyer has already paid. The Buyer is not required to pursue the carrier directly for a refund.
          </p>
          <p>
            <strong>Damaged in transit:</strong> Where goods arrive damaged, the Seller must pursue insurance or other claims with the carrier. The Seller bears responsibility to the Buyer for the damage and must refund any amount the Buyer has already paid. The Buyer is not required to pursue the carrier directly for a refund.
          </p>
          <p>
            <strong>GalaxRX:</strong> GalaxRX does not accept liability for loss or damage to goods while in the care of a carrier or postal service. If we offer an optional delivery or courier service and you use it, any liability we might have in respect of that service will not exceed the liability of the underlying carrier under its terms and any insurance you select. Where you arrange your own delivery, we have no liability for loss or damage in transit.
          </p>
          <p>
            <strong>Packaging:</strong> Sellers must pack goods securely so they withstand normal handling. Inadequate packaging that leads to damaged or unsaleable product may result in disputes and refund obligations. Ensuring goods arrive in a condition suitable for sale is the Seller&apos;s responsibility.
          </p>
          <p>
            Unless clearly stated otherwise on the listing or at checkout, listed prices are <strong>exclusive of GST</strong>.
          </p>

          <h2 className="text-lg font-semibold text-gold mt-8">15. Intellectual property and acceptable use</h2>
          <p>
            All content and intellectual property on the Website belong to GalaxRX or its licensors. Your rights are limited to those set out in this Agreement. You may view and print pages for your own use only. You must not copy, modify, or distribute our content or trademarks without our prior written consent. You must not use bots or automated tools to access or scrape the Website, harvest other users&apos; data, upload harmful or illegal material, or disrupt the service. We may pass your details to law enforcement or regulators if you breach these rules.
          </p>

          <h2 className="text-lg font-semibold text-gold mt-8">16. Misconduct and suspension</h2>
          <p>
            You must not rig prices or engage in fraud or dishonest conduct. If we reasonably believe you have breached this Agreement or acted fraudulently we may suspend or end your access. Fees already paid are not refundable when we suspend or terminate for breach or fraud. We may remove listings we consider fraudulent or illegal without refund.
          </p>

          <h2 className="text-lg font-semibold text-gold mt-8">17. Cap on our liability</h2>
          <p>
            To the fullest extent the law allows, GalaxRX and its affiliates are not liable for indirect, incidental, special, punitive, or consequential loss. Our total liability to you for any one claim or series of related claims is limited to the greater of: (a) the fees you paid to GalaxRX for the service in question, or (b) AUD $100. This cap reflects an agreed allocation of risk. You must bring any claim within one year of when you first became aware of the facts giving rise to it, or you give up that claim.
          </p>

          <h2 className="text-lg font-semibold text-gold mt-8">18. You indemnify us</h2>
          <p>
            You will reimburse and hold harmless GalaxRX and its affiliates for any claim, loss, or expense (including reasonable legal costs) that arises from: (a) your breach of this Agreement, (b) you infringing someone else&apos;s rights, (c) you breaking any law, (d) your negligence or misconduct, or (e) someone else using your account without your permission (except where we are at fault).
          </p>

          <h2 className="text-lg font-semibold text-gold mt-8">19. Which law applies</h2>
          <p>
            The laws of Australia and New South Wales govern this Agreement (ignoring conflict-of-law rules). If you use the Website from another country you do so at your own risk and must comply with your local laws.
          </p>

          <h2 className="text-lg font-semibold text-gold mt-8">20. Resolving disputes</h2>
          <p>
            If a dispute arises from this Agreement or your use of the Website, you and we will try to resolve it in good faith. If it is not resolved within 30 days of one of us notifying the other, it may be referred to binding arbitration in Australia (under rules agreed then) or to the courts of New South Wales. Any claim must be started within one year of you or we becoming aware of the facts on which it is based.
          </p>

          <h2 className="text-lg font-semibold text-gold mt-8">21. Fees and refunds</h2>
          <p>
            Our fees are charged for the services we provide. Unless the law requires otherwise, we do not refund fees once paid and we do not accept chargebacks for charges that were properly due.
          </p>

          <h2 className="text-lg font-semibold text-gold mt-8">22. Payment and bank details</h2>
          <p>
            As a buyer you authorise us to charge your nominated account for purchases, shipping, and related costs. As a seller you agree to pay our fees and any penalties we apply for non-compliance (for example if you cannot supply what you listed or you include unauthorised materials in a shipment). You must tell us in writing before you change your bank or payment details (at least 5 business days in advance where possible). If you do not pay for goods you have received we may charge late fees and take legal action.
          </p>

          <h2 className="text-lg font-semibold text-gold mt-8">23. Agreement to terms</h2>
          <p>
            When you complete registration you confirm that you have read and understood this Agreement and agree to be bound by it. Your registration has the same effect as a written signature. We recommend you save or print a copy for your records.
          </p>

          <h2 className="text-lg font-semibold text-gold mt-8">24. General</h2>
          <p>
            This Agreement and the Privacy Policy (and any other documents we refer to) form the whole agreement between you and GalaxRX. Section headings are for reference only. If a court finds any part invalid, the rest remains in force. We do not waive a right by failing to enforce it. We may send you notices by email or through the Website; you agree to receive them in electronic form. We can change this Agreement by posting an updated version on the Website; your continued use means you accept the changes. We may suspend or end your access at any time without notice and have no liability to you or anyone else for doing so.
          </p>

          <h2 className="text-lg font-semibold text-gold mt-8">Contact</h2>
          <p>
            For questions about these terms, contact GalaxRX using the details on the Website or the address we give for legal notices in Australia.
          </p>
        </section>

        <p className="mt-12 pt-6 border-t border-white/10 text-white/60 text-sm">
          Last updated: March 2025. GalaxRX is an Australian pharmacy marketplace platform.
        </p>
        <div className="mt-6 flex gap-4">
          <Link href="/register" className="text-gold hover:underline text-sm">Back to registration</Link>
          <Link href="/privacy" className="text-gold hover:underline text-sm">Privacy Policy</Link>
          <Link href="/" className="text-gold hover:underline text-sm">Home</Link>
        </div>
      </main>
    </div>
  );
}
