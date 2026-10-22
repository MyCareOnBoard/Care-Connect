import { LegalPage, ToBeProvided } from "./LegalPage"

/** Terms of Service — outline pending legal wording. */
export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      pendingReview
      intro={<p>The agreement between you and CareConnect for using the platform.</p>}
      sections={[
        { id: "acceptance", title: "Accepting these terms", body: <ToBeProvided>who may use CareConnect, minimum age, and how the terms are accepted.</ToBeProvided> },
        { id: "accounts", title: "Your account", body: <ToBeProvided>keeping details accurate and secure, verification, and agency and team accounts.</ToBeProvided> },
        { id: "conduct", title: "Acceptable use", body: <ToBeProvided>what may and may not be posted or done on the platform, including professional conduct.</ToBeProvided> },
        { id: "content", title: "Your content", body: <ToBeProvided>ownership of posts and media, and the licence you grant to display them.</ToBeProvided> },
        { id: "jobs-marketplace", title: "Jobs and the marketplace", body: <ToBeProvided>the platform's role between members, employers and sellers, and responsibility for listings.</ToBeProvided> },
        { id: "cowries", title: "Cowries and treasures", body: <ToBeProvided>what Cowries are, earning, buying, sending treasures, redemption, cash-outs, fees and reversals.</ToBeProvided> },
        { id: "health", title: "Health information", body: <ToBeProvided>that CareConnect does not give medical advice, and how health information is handled.</ToBeProvided> },
        { id: "termination", title: "Suspension and closing accounts", body: <ToBeProvided>when accounts may be suspended or closed, and how you can close yours.</ToBeProvided> },
        { id: "liability", title: "Liability", body: <ToBeProvided>limits of liability and disclaimers.</ToBeProvided> },
        { id: "law", title: "Governing law and disputes", body: <ToBeProvided>governing law, jurisdiction and dispute resolution.</ToBeProvided> },
        { id: "changes", title: "Changes to these terms", body: <p>When these terms change materially, you will be asked to accept them again.</p> },
      ]}
    />
  )
}
