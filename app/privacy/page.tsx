import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | GalaxRX",
  description: "GalaxRX Internet Privacy and Security Policy",
};

export default function PrivacyPage() {
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
        <h1 className="text-2xl font-heading font-bold mb-2">Privacy Policy</h1>
        <p className="text-white/70 text-sm mb-8">
          GalaxRX Internet Privacy and Security Policy
        </p>

        <section className="space-y-4 text-white/90 text-sm">
          <p>
            This policy explains how GalaxRX (&quot;we&quot;, &quot;us&quot;) collects, uses, and shares information when you use our website and related services (the &quot;Site&quot;). We take your privacy seriously and aim to comply with the Australian Privacy Act 1988 (Cth) and the Australian Privacy Principles (APPs) where they apply.
          </p>

          <h2 className="text-lg font-semibold text-gold mt-8">Your consent</h2>
          <p>
            Using the Site means you agree to this policy. If you disagree, please do not use the Site. If you are outside Australia, your use also means you consent to your information being transferred and processed as described below (including in Australia or elsewhere) where our systems or service providers are located.
          </p>

          <h2 className="text-lg font-semibold text-gold mt-8">Other websites</h2>
          <p>
            The Site may link to other websites. We do not control those sites and are not responsible for their privacy practices. Check their privacy policies and terms before giving them your information. This policy only covers the Site and information we collect through it.
          </p>

          <h2 className="text-lg font-semibold text-gold mt-8">What we collect and why</h2>
          <p>
            <strong>Information you give us.</strong> When you register or use the Site we collect the information you provide, such as your name, business name, ABN, address, email, phone number, payment or banking details (where needed for transactions), pharmacy approval number, verification documents, and similar details.
          </p>
          <p>
            We use this information to provide and improve our services, run the Site, and contact you about your account or (with your ability to opt out) about offers. You can unsubscribe from marketing at any time using the link in our emails or by contacting us.
          </p>
          <p>
            <strong>Technical and usage data.</strong> We automatically collect information such as IP address, browser type, and device type for security, troubleshooting, and to understand how the Site is used. We may turn data into anonymous or aggregated form for analytics; this policy does not limit our use of data that no longer identifies you.
          </p>

          <h2 className="text-lg font-semibold text-gold mt-8">When we share your information</h2>
          <p>
            We do not sell your personal information. We may share it:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>With other participants when needed to complete a transaction (e.g. fulfilling an order);</li>
            <li>With service providers who help us run the Site (e.g. hosting, payments), under agreements that protect your data;</li>
            <li>With a buyer or successor if our business or assets are sold or transferred;</li>
            <li>When the law requires it, or when we reasonably believe it is needed to protect rights, safety, or to prevent fraud or crime;</li>
            <li>Where you have agreed or we have told you at the time we collect it.</li>
          </ul>
          <p>
            We may share anonymous or aggregated information with partners or for research where the law allows.
          </p>

          <h2 className="text-lg font-semibold text-gold mt-8">How we store and protect data</h2>
          <p>
            We keep your information in a secure environment so we can provide the service when you return. We retain it for as long as needed for the purposes in this policy or as the law requires.
          </p>
          <p>
            Your account is protected by your password. Only you (and anyone you share it with) can access your profile. You must keep your password safe. We take reasonable steps to protect your data but no system is 100% secure; we cannot guarantee that your information will never be accessed or misused.
          </p>

          <h2 className="text-lg font-semibold text-gold mt-8">Cookies and similar technology</h2>
          <p>
            We use cookies and similar tools to make the Site work better and to recognise you so you do not have to log in every time. A cookie is a small file stored on your device; we do not use it to deliver malware. You can adjust your browser to block or limit cookies; doing so may affect how well the Site works for you.
          </p>

          <h2 className="text-lg font-semibold text-gold mt-8">Your rights in Australia</h2>
          <p>
            Under the Privacy Act you may ask us for access to the personal information we hold about you, or ask us to correct it if it is wrong or out of date. In some cases you may complain to the Office of the Australian Information Commissioner (OAIC). To request access or correction, contact us using the details below; we will respond as the law requires.
          </p>

          <h2 className="text-lg font-semibold text-gold mt-8">Updates to this policy</h2>
          <p>
            We may update this policy from time to time (for example to reflect changes in our practices or in the law). The updated version may apply to information we already hold as well as new information. We encourage you to check this page occasionally. Continuing to use the Site after we post changes means you accept the updated policy.
          </p>

          <h2 className="text-lg font-semibold text-gold mt-8">Law and relationship to Terms</h2>
          <p>
            This policy is governed by the laws of Australia and New South Wales. It forms part of your agreement with GalaxRX under our Terms and Conditions. Any dispute about privacy is subject to the dispute resolution provisions in those Terms.
          </p>

          <h2 className="text-lg font-semibold text-gold mt-8">Contact</h2>
          <p>
            For questions or complaints about privacy or how we handle your information, contact GalaxRX using the details on the Website or write to our privacy or legal contact in Australia.
          </p>
        </section>

        <p className="mt-12 pt-6 border-t border-white/10 text-white/60 text-sm">
          Last updated: March 2025. GalaxRX is an Australian pharmacy marketplace platform.
        </p>
        <div className="mt-6 flex gap-4">
          <Link href="/register" className="text-gold hover:underline text-sm">Back to registration</Link>
          <Link href="/terms" className="text-gold hover:underline text-sm">Terms and Conditions</Link>
          <Link href="/" className="text-gold hover:underline text-sm">Home</Link>
        </div>
      </main>
    </div>
  );
}
