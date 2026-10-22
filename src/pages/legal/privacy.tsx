import { LegalPage, ToBeProvided } from "./LegalPage"

/** Privacy Policy — outline pending legal wording. */
export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      pendingReview
      intro={<p>How CareConnect collects, uses, shares and protects personal information, and the rights you have over it.</p>}
      sections={[
        { id: "who-we-are", title: "Who we are", body: <ToBeProvided>the data controller's legal name, registered address and contact details, and the Data Protection Officer's contact.</ToBeProvided> },
        { id: "what-we-collect", title: "What we collect", body: <ToBeProvided>account details (name, email, phone), profile and professional information, posts and messages, payment and payout details, Cowry activity, device and usage data.</ToBeProvided> },
        { id: "why", title: "Why we use it, and on what legal basis", body: <ToBeProvided>each purpose (running the service, payments, security, marketing with consent) with its lawful basis under the applicable data protection laws.</ToBeProvided> },
        { id: "sharing", title: "Who we share it with", body: <ToBeProvided>service providers (hosting, Firebase, payment and payout partners, Google reCAPTCHA and Maps), other members as you choose, and authorities where the law requires.</ToBeProvided> },
        { id: "transfers", title: "International transfers", body: <ToBeProvided>where data is processed outside your country and the safeguards used.</ToBeProvided> },
        { id: "retention", title: "How long we keep it", body: <ToBeProvided>retention periods for each kind of data, and what happens when an account is deleted.</ToBeProvided> },
        { id: "rights", title: "Your rights", body: <ToBeProvided>access, correction, deletion, objection, restriction, portability and withdrawing consent, how to exercise them, and the right to complain to the data protection authority.</ToBeProvided> },
        { id: "marketing", title: "Marketing", body: <p>Marketing emails and text messages are only sent if you opt in. You can change this at any time in Settings → Privacy and cookies.</p> },
        { id: "cookies", title: "Cookies and similar storage", body: <p>See the Cookie Policy for what this device stores and how to change your choices.</p> },
        { id: "security", title: "Security", body: <ToBeProvided>the measures used to protect personal information.</ToBeProvided> },
        { id: "changes", title: "Changes to this policy", body: <p>When this policy changes materially, you will be asked to review your choices again.</p> },
      ]}
    />
  )
}
