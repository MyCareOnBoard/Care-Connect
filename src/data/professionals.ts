import type { PortfolioPostData } from "@/components/profile/PortfolioPost"

export type ProfessionalProfile = {
  id: string
  name: string
  headline: string
  location: string
  email: string
  phone: string
  initials: string
  avatarClassName: string
  about: string
  metrics: { label: string; value: string }[]
  experience: { role: string; company: string; duration: string; description: string }[]
  skills: string[]
  certifications: { title: string; provider: string; date: string; status: string }[]
  portfolio: PortfolioPostData[]
}

export function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

const professionals: Record<string, ProfessionalProfile> = {
  "jerome-bell": {
    id: "jerome-bell",
    name: "Jerome Bell",
    headline: "Registered Nurse | Mental Health Advocate",
    location: "Portland, Oregon",
    email: "jerome.bell@careconnect.io",
    phone: "+1 (503) 555-0143",
    initials: "JB",
    avatarClassName: "bg-[#ffc95c]",
    about: "Registered nurse with a focus on psychiatric and behavioral health units. Advocates for destigmatizing mental health care within the nursing profession.",
    metrics: [
      { label: "Connections", value: "212" },
      { label: "Profile views", value: "1.8K" },
      { label: "Match rate", value: "87%" },
      { label: "Career score", value: "79" },
    ],
    experience: [
      { role: "Psychiatric Registered Nurse", company: "Unity Behavioral Health", duration: "Mar 2021 – Present", description: "Provide direct patient care on a 20-bed inpatient psychiatric unit, coordinating with care teams on treatment planning." },
    ],
    skills: ["Behavioral Health", "Crisis De-escalation", "Patient Advocacy", "Medication Management"],
    certifications: [
      { title: "Psychiatric-Mental Health Nursing Certification", provider: "ANCC", date: "Expires Jun 2027", status: "Active" },
    ],
    portfolio: [
      {
        id: "post-1",
        paragraphs: [
          "De-escalation isn't about control. It's about connection.",
          "The moment you meet fear with curiosity instead of force, everything changes.",
          "Every patient in crisis is a person first.",
        ],
        statement: "Meet crisis with calm, not control.",
        likes: 86,
        comments: [
          { id: "c1", author: "Theresa Webb", text: "This is such an important reminder." },
        ],
      },
    ],
  },
  "esther-howard": {
    id: "esther-howard",
    name: "Esther Howard",
    headline: "Doctor | Family Medicine",
    location: "Denver, Colorado",
    email: "esther.howard@careconnect.io",
    phone: "+1 (720) 555-0198",
    initials: "EH",
    avatarClassName: "bg-[#d193ce]",
    about: "Family medicine physician with 12 years of experience providing primary care to patients across all ages, with a special interest in preventive care.",
    metrics: [
      { label: "Connections", value: "340" },
      { label: "Profile views", value: "4.2K" },
      { label: "Match rate", value: "95%" },
      { label: "Career score", value: "91" },
    ],
    experience: [
      { role: "Family Medicine Physician", company: "Rocky Mountain Family Practice", duration: "Aug 2014 – Present", description: "Manage a full patient panel across preventive, acute, and chronic care visits." },
    ],
    skills: ["Primary Care", "Preventive Medicine", "Chronic Disease Management", "Patient Education"],
    certifications: [
      { title: "Board Certified — Family Medicine", provider: "American Board of Family Medicine", date: "Expires Oct 2028", status: "Active" },
    ],
    portfolio: [
      {
        id: "post-1",
        paragraphs: [
          "Preventive care saves more lives than any single procedure ever will.",
          "The best medicine is the visit that happens before the emergency, not after.",
        ],
        statement: "Prevention is the quiet hero of medicine.",
        likes: 154,
        comments: [
          { id: "c1", author: "Eleanor Pena", text: "Couldn't agree more — prevention doesn't get enough credit." },
        ],
      },
    ],
  },
  "theresa-webb": {
    id: "theresa-webb",
    name: "Theresa Webb",
    headline: "Licensed Counsellor",
    location: "Austin, Texas",
    email: "theresa.webb@careconnect.io",
    phone: "+1 (512) 555-0176",
    initials: "TW",
    avatarClassName: "bg-[#ffc33d]",
    about: "Licensed professional counsellor specializing in trauma-informed care and grief counselling for individuals and families.",
    metrics: [
      { label: "Connections", value: "158" },
      { label: "Profile views", value: "980" },
      { label: "Match rate", value: "82%" },
      { label: "Career score", value: "74" },
    ],
    experience: [
      { role: "Licensed Professional Counsellor", company: "Sage Wellness Group", duration: "Jan 2019 – Present", description: "Provide individual and family counselling with a focus on trauma-informed and grief-centered approaches." },
    ],
    skills: ["Trauma-Informed Care", "Grief Counselling", "Cognitive Behavioral Therapy", "Family Therapy"],
    certifications: [
      { title: "Licensed Professional Counsellor (LPC)", provider: "Texas Behavioral Health Board", date: "Expires Feb 2027", status: "Active" },
    ],
    portfolio: [],
  },
  "eleanor-pena": {
    id: "eleanor-pena",
    name: "Eleanor Pena",
    headline: "Psychiatrist",
    location: "Bronx, New York",
    email: "eleanor.pena@careconnect.io",
    phone: "+1 (718) 555-0122",
    initials: "EP",
    avatarClassName: "bg-[#cdbeb5]",
    about: "Board-certified psychiatrist providing outpatient care with a focus on mood disorders and medication management.",
    metrics: [
      { label: "Connections", value: "265" },
      { label: "Profile views", value: "2.6K" },
      { label: "Match rate", value: "89%" },
      { label: "Career score", value: "85" },
    ],
    experience: [
      { role: "Psychiatrist", company: "Bronx Community Behavioral Health", duration: "Sep 2017 – Present", description: "Provide outpatient psychiatric evaluation and medication management for adult patients." },
    ],
    skills: ["Mood Disorders", "Medication Management", "Psychiatric Evaluation", "Telehealth"],
    certifications: [
      { title: "Board Certified — Psychiatry", provider: "American Board of Psychiatry and Neurology", date: "Expires May 2029", status: "Active" },
    ],
    portfolio: [],
  },
  "sarah-mitchell": {
    id: "sarah-mitchell",
    name: "Dr. Sarah Mitchell",
    headline: "Registered Nurse | Mental Health Advocate",
    location: "Seattle, Washington",
    email: "sarah.mitchell@careconnect.io",
    phone: "+1 (206) 555-0155",
    initials: "SM",
    avatarClassName: "bg-[linear-gradient(135deg,#ffd08a,#67a6d9)]",
    about: "Registered nurse and mental health advocate writing openly about burnout and compassion fatigue in healthcare.",
    metrics: [
      { label: "Connections", value: "1.2K" },
      { label: "Profile views", value: "9.4K" },
      { label: "Match rate", value: "93%" },
      { label: "Career score", value: "88" },
    ],
    experience: [
      { role: "Charge Nurse", company: "Swedish Medical Center", duration: "Feb 2016 – Present", description: "Lead a 30-bed med-surg unit and mentor new graduate nurses on burnout prevention and self-care." },
    ],
    skills: ["Mental Health Advocacy", "Team Leadership", "Burnout Prevention", "Public Speaking"],
    certifications: [
      { title: "RN License — Washington", provider: "Washington State Nursing Board", date: "Expires Jan 2028", status: "Active" },
    ],
    portfolio: [
      {
        id: "post-1",
        paragraphs: [
          "Nobody talks about the weight nurses carry home.",
          "Not the medical charts. Not the missed lunch breaks.",
          "The weight of the patient who didn't make it through the night.",
          "Burnout in healthcare isn't a weakness.",
          "It's what happens when compassionate people give everything - without being given anything back.",
          "Check on your nurses. Ask your doctors how they're doing.",
          "Mental health care is healthcare.",
        ],
        hashtags: "#NurseLife #HealthcareWorkers #MentalHealth #BurnoutAwareness",
        statement: "Burnout is not a badge of honor",
        likes: 312,
        comments: [
          { id: "c1", author: "Jerome Bell", text: "This needed to be said. Thank you for putting words to it." },
          { id: "c2", author: "Theresa Webb", text: "Sharing this with my whole team." },
        ],
      },
    ],
  },
}

export function getProfessionalProfile(id: string): ProfessionalProfile {
  return (
    professionals[id] ?? {
      id,
      name: id
        .split("-")
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ") || "Unknown professional",
      headline: "Healthcare professional",
      location: "Location not provided",
      email: "",
      phone: "",
      initials: id.slice(0, 2).toUpperCase() || "?",
      avatarClassName: "bg-[#8a8f98]",
      about: "This professional hasn't added a bio yet.",
      metrics: [
        { label: "Connections", value: "—" },
        { label: "Profile views", value: "—" },
        { label: "Match rate", value: "—" },
        { label: "Career score", value: "—" },
      ],
      experience: [],
      skills: [],
      certifications: [],
      portfolio: [],
    }
  )
}
