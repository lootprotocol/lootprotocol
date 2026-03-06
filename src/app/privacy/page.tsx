import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy — Loot Protocol',
  description: 'Privacy policy for the Loot Protocol marketplace',
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold">Privacy Policy</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: February 2026</p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">1. Information We Collect</h2>
          <p>
            We collect information you provide when creating an account (via your identity provider),
            publishing extensions, and using the Service. This includes your username, email, and
            usage data such as downloads and search queries.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">2. How We Use Information</h2>
          <p>
            We use collected information to operate and improve the Service, display publisher
            profiles, track download counts, and communicate important updates about the marketplace.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">3. Data Sharing</h2>
          <p>
            We do not sell your personal information. We may share data with service providers who
            help operate the platform (e.g., hosting, analytics) under strict confidentiality
            agreements.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">4. Data Retention</h2>
          <p>
            We retain account data as long as your account is active. You may request deletion of
            your account and associated data by contacting us.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">5. Security</h2>
          <p>
            We implement reasonable security measures to protect your data, including encryption in
            transit and at rest. However, no system is perfectly secure.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">6. Changes to This Policy</h2>
          <p>
            We may update this policy from time to time. We will notify users of significant changes
            via the Service.
          </p>
        </section>
      </div>
    </div>
  );
}
