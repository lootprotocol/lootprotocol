import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service — Loot Protocol',
  description: 'Terms of service for the Loot Protocol marketplace',
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold">Terms of Service</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: February 2026</p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">1. Acceptance of Terms</h2>
          <p>
            By accessing or using the Loot Protocol marketplace (&quot;Service&quot;), you agree to be
            bound by these Terms of Service. If you do not agree, do not use the Service.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">2. Description of Service</h2>
          <p>
            Loot Protocol is a marketplace for discovering, publishing, and installing AI agent
            extensions including skills, MCP servers, and plugins for Claude Code and compatible
            agents.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">3. User Accounts</h2>
          <p>
            You must authenticate via a supported identity provider to publish extensions. You are
            responsible for maintaining the security of your account and for all activity under it.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">4. Publisher Responsibilities</h2>
          <p>
            Publishers must ensure their extensions do not contain malicious code, do not infringe on
            intellectual property rights, and comply with all applicable laws. We reserve the right
            to remove extensions that violate these terms.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">5. Limitation of Liability</h2>
          <p>
            The Service is provided &quot;as is&quot; without warranties of any kind. We are not
            liable for any damages arising from the use of extensions published on the marketplace.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">6. Changes to Terms</h2>
          <p>
            We may update these terms from time to time. Continued use of the Service after changes
            constitutes acceptance of the new terms.
          </p>
        </section>
      </div>
    </div>
  );
}
