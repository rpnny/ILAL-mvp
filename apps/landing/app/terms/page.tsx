import Nav from "../../components/Nav";
import Footer from "../../components/Footer";

export const metadata = {
  title: "Terms of Service | ILAL Protocol",
  description: "ILAL Protocol terms of service for using our zero-knowledge compliance infrastructure.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col font-sans">
      <Nav />
      <main className="flex-grow pt-32 pb-24 px-6">
        <div className="container mx-auto max-w-3xl">
          <h1 className="font-heading text-4xl font-bold mb-2">Terms of Service</h1>
          <p className="text-gray-500 text-sm mb-12">Last updated: April 10, 2026</p>

          <div className="prose prose-invert prose-gray max-w-none space-y-8 text-gray-300 text-[15px] leading-relaxed">
            <section>
              <h2 className="text-xl font-semibold text-white mb-3">1. Acceptance of Terms</h2>
              <p>
                By accessing or using the ILAL Protocol services, API, smart contracts, or website (collectively, the &quot;Services&quot;),
                you agree to be bound by these Terms of Service. If you do not agree, do not use the Services.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">2. Description of Services</h2>
              <p>
                ILAL Protocol provides zero-knowledge compliance infrastructure for Uniswap V4, including KYC verification,
                ZK proof generation, on-chain session management, and DeFi execution APIs. The Services are currently
                deployed on Base Sepolia testnet for demonstration and testing purposes.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">3. Eligibility</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>You must be at least 18 years old to use the Services.</li>
                <li>You must not be located in, or a resident of, any sanctioned jurisdiction.</li>
                <li>You must complete KYC verification through an approved provider before accessing trading functionality.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">4. User Responsibilities</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>You are responsible for securing your wallet private keys and API keys.</li>
                <li>You must provide accurate information during KYC verification.</li>
                <li>You agree not to use the Services for money laundering, terrorist financing, or other illicit activities.</li>
                <li>You agree to comply with all applicable laws and regulations in your jurisdiction.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">5. API Usage</h2>
              <p>
                API access is subject to rate limits based on your tier (Free: 60/min, Pro: 300/min, Enterprise: 1000/min).
                Excessive or abusive use may result in temporary or permanent suspension of access.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">6. Testnet Disclaimer</h2>
              <p>
                The Services are currently deployed on Base Sepolia testnet. Testnet tokens have no monetary value.
                The protocol is provided &quot;as is&quot; for evaluation purposes. We make no guarantees regarding uptime,
                security, or correctness of testnet deployments.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">7. Intellectual Property</h2>
              <p>
                ILAL Protocol is open-source software released under the Apache 2.0 license. The ILAL name, logo,
                and branding are proprietary and may not be used without permission.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">8. Limitation of Liability</h2>
              <p>
                To the maximum extent permitted by law, ILAL Protocol and its contributors shall not be liable for
                any indirect, incidental, special, consequential, or punitive damages arising from your use of the Services,
                including but not limited to loss of funds, data, or profits.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">9. Modifications</h2>
              <p>
                We reserve the right to modify these Terms at any time. Continued use of the Services after changes
                constitutes acceptance of the updated Terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">10. Contact</h2>
              <p>
                For questions about these Terms, contact us at{" "}
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
