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
        {
          id: "health-tips",
          title: "Health Tips",
          body: (
            <>
              <p>
                Health Tips uses artificial intelligence to suggest general wellness tips on a topic you search for.
              </p>
              <p>
                The tips are general information only. They are not medical advice, a diagnosis or a treatment plan, and
                they are not a substitute for speaking to a qualified health professional. They may be incomplete, out
                of date or wrong, so check anything that matters with a doctor, nurse or pharmacist before acting on it.
              </p>
              <p>
                Health Tips is not for emergencies, and CareConnect cannot respond to them. If you think someone may be
                in danger or needs help now, call your local emergency number or go to the nearest health facility. If a
                search looks like an emergency, we show this guidance instead of tips.
              </p>
              <p>
                Health Tips is designed not to give diagnoses or medicine doses, and may decline questions that ask for
                them.
              </p>
              <ToBeProvided>how use of Health Tips is covered by the liability limits and the acceptable use rules.</ToBeProvided>
            </>
          ),
        },
        { id: "termination", title: "Suspension and closing accounts", body: <ToBeProvided>when accounts may be suspended or closed, and how you can close yours.</ToBeProvided> },
        { id: "liability", title: "Liability", body: <ToBeProvided>limits of liability and disclaimers.</ToBeProvided> },
        { id: "law", title: "Governing law and disputes", body: <ToBeProvided>governing law, jurisdiction and dispute resolution.</ToBeProvided> },
        { id: "changes", title: "Changes to these terms", body: <p>When these terms change materially, you will be asked to accept them again.</p> },
      ]}
    />
  )
}
