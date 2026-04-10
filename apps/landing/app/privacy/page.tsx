import Nav from "../../components/Nav";
import Footer from "../../components/Footer";

export const metadata = {
  title: "Privacy Policy | ILAL Protocol",
  description: "ILAL Protocol privacy policy — how we handle your data with zero-knowledge compliance infrastructure.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col font-sans">
      <Nav />
      <main className="flex-grow pt-32 pb-24 px-6">
        <div className="container mx-auto max-w-3xl">
          <h1 className="font-heading text-4xl font-bold mb-2">Privacy Policy</h1>
          <p className="text-gray-500 text-sm mb-12">Last updated: April 10, 2026</p>

          <div className="prose prose-invert prose-gray max-w-none space-y-8 text-gray-300 text-[15px] leading-relaxed">
            <section>
              <h2 className="text-xl font-semibold text-white mb-3">1. Overview</h2>
              <p>
                ILAL Protocol (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) provides zero-knowledge compliance infrastructure for institutional DeFi.
                This Privacy Policy describes how we collect, use, and protect information when you use our services, API, and website.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">2. Information We Collect</h2>
              <p><strong className="text-white">Wallet Addresses:</strong> We collect your blockchain wallet address when you register for our services. This is a public identifier on the blockchain.</p>
              <p><strong className="text-white">KYC Data:</strong> Identity verification is processed by third-party providers (Coinbase EAS, Sumsub). We store only the verification status and provider reference ID &mdash; never raw identity documents or personal details.</p>
              <p><strong className="text-white">Zero-Knowledge Proofs:</strong> By design, ZK proofs verify compliance without revealing underlying personal data. We store proof artifacts and Merkle tree positions, not the private inputs.</p>
              <p><strong className="text-white">API Usage:</strong> We log API request metadata (timestamps, endpoints, response codes) for rate limiting and security monitoring.</p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">3. How We Use Your Information</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>To verify your compliance status for on-chain trading sessions</li>
                <li>To generate and verify zero-knowledge proofs</li>
                <li>To manage API access and enforce rate limits</li>
                <li>To detect and prevent fraud or unauthorized use</li>
                <li>To improve our services and infrastructure</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">4. Data Sharing</h2>
              <p>
                We do not sell your data. We share information only with:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong className="text-white">KYC Providers:</strong> Your wallet address is shared with your chosen verification provider during onboarding.</li>
                <li><strong className="text-white">On-Chain:</strong> Compliance proofs and session states are published to the Base blockchain as part of the protocol&rsquo;s operation.</li>
                <li><strong className="text-white">Legal Requirements:</strong> We may disclose information if required by law or valid legal process.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">5. Data Retention</h2>
              <p>
                On-chain session data expires after 24 hours by protocol design. Off-chain records (API logs, KYC status) are retained
                for the duration of your account or as required by applicable regulations.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">6. Security</h2>
              <p>
                We implement industry-standard security measures including encrypted communications (TLS), access controls,
                and secure key management. Zero-knowledge proofs ensure that compliance verification never exposes personal data.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">7. Contact</h2>
              <p>
                For privacy inquiries, contact us at{" "}
                <a href="mailto:contact@ilal.tech" className="text-primary hover:underline">contact@ilal.tech</a>.
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
