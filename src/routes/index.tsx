import { lazy } from "react";
import { createBrowserRouter, Navigate } from "react-router";
import { Routes } from "@/routes/constants";
import RouteErrorPage from "@/pages/error/RouteErrorPage";
import { RootShell } from "@/components/consent/RootShell";
import { AppRouteGuard } from "@/components/AppRouteGuard";
import { AdminRouteGuard } from "@/components/AdminRouteGuard";
import { isCowryPathEnabled } from "@/utils/careconnect/cowryPages";

const AuthLayout = lazy(() => import("@/layouts/AuthLayout"));
const AppLayout = lazy(() => import("@/layouts/AppLayout"));
const AdminLayout = lazy(() => import("@/layouts/AdminLayout"));
const AdminCowryPage = lazy(() => import("@/pages/app/admin/cowry"));

const LoginPage = lazy(() => import("@/pages/auth/login"));
const MfaChallengePage = lazy(() => import("@/pages/auth/mfa-challenge"));
const SignUpPage = lazy(() => import("@/pages/auth/signup"));
const VerifyContactPage = lazy(() => import("@/pages/auth/verify-contact"));
const JoinTypePage = lazy(() => import("@/pages/auth/join-type"));
const OrganizationNamePage = lazy(() => import("@/pages/auth/organization-name"));
const OrganizationTypePage = lazy(() => import("@/pages/auth/organization-type"));
const OrganizationInterestsPage = lazy(() => import("@/pages/auth/organization-interests"));
const ProfessionPage = lazy(() => import("@/pages/auth/profession"));
const CertificationsPage = lazy(() => import("@/pages/auth/certifications"));
const DocumentsPage = lazy(() => import("@/pages/auth/documents"));
const ProfessionalInvitePage = lazy(() => import("@/pages/auth/professional/invite"));
const ProfessionalAvailabilityPage = lazy(() => import("@/pages/auth/professional/availability"));
const WelcomePage = lazy(() => import("@/pages/auth/welcome"));
const ForgotPasswordPage = lazy(() => import("@/pages/auth/forgot-password"));
const ResetPasswordPage = lazy(() => import("@/pages/auth/reset-password"));
const PrivacyPolicyPage = lazy(() => import("@/pages/legal/privacy"));
const TermsPage = lazy(() => import("@/pages/legal/terms"));
const CookiePolicyPage = lazy(() => import("@/pages/legal/cookies"));

const DashboardPage = lazy(() => import("@/pages/app/user/dashboard"));
const AgencyDashboardPage = lazy(() => import("@/pages/app/agency/dashboard"));
const NetworkPage = lazy(() => import("@/pages/app/network"));
const UserJobsPage = lazy(() => import("@/pages/app/user/jobs"));
const AgencyJobsPage = lazy(() => import("@/pages/app/agency/jobs"));
const MessagesPage = lazy(() => import("@/pages/app/messages"));
const ApplicationsPage = lazy(() => import("@/pages/app/applications"));
const MarketplacePage = lazy(() => import("@/pages/app/marketplace"));
// TELEHEALTH PAUSED — every Telehealth page shows the Coming Soon page for now. Nothing is
// deleted: to bring Telehealth back, uncomment the lines marked TELEHEALTH PAUSED here (the
// imports and the routes below), remove the Coming Soon routes, and restore the nav in
// AppShell.tsx and the Availability item in AccountControls.tsx.
const TelehealthComingSoonPage = lazy(() => import("@/pages/app/telehealth-coming-soon"));
// TELEHEALTH PAUSED
// const SchedulePage = lazy(() => import("@/pages/app/schedule"));
// const TelehealthPage = lazy(() => import("@/pages/app/telehealth"));
// const ServiceAnalyticsPage = lazy(() => import("@/pages/app/agency/service-analytics"));
// const AgencyTelehealthBookingsPage = lazy(() => import("@/pages/app/agency/telehealth-bookings"));
const ProfilePage = lazy(() => import("@/pages/app/profile"));
const ViewProfilePage = lazy(() => import("@/pages/app/view-profile"));
const SettingsPage = lazy(() => import("@/pages/app/settings"));
const HealthTipsPage = lazy(() => import("@/pages/app/user/health-tips"));
// TELEHEALTH PAUSED
// const HealthProfilePage = lazy(() => import("@/pages/app/user/health-profile"));
// const MyRecordsPage = lazy(() => import("@/pages/app/user/records"));
// const ClientRecordsPage = lazy(() => import("@/pages/app/professional/client-records"));
// const FollowUpsPage = lazy(() => import("@/pages/app/user/follow-ups"));
const CowryWalletPage = lazy(() => import("@/pages/app/user/cowry-wallet"));
const CowryHistoryPage = lazy(() => import("@/pages/app/user/cowry-history"));
const CowryEarnPage = lazy(() => import("@/pages/app/user/cowry-earn"));
const CowryRedeemPage = lazy(() => import("@/pages/app/user/cowry-redeem"));
const CowryBuyPage = lazy(() => import("@/pages/app/user/cowry-buy"));
const CowryCreatorPage = lazy(() => import("@/pages/app/user/cowry-creator"));
const CowryWithdrawPage = lazy(() => import("@/pages/app/user/cowry-withdraw"));

/** Drops the routes for Cowry pages that are switched off. */
function cowryRoutes<T extends { path: string }>(routes: T[]): T[] {
  return routes.filter((route) => isCowryPathEnabled(route.path));
}

export const router = createBrowserRouter([
  {
    // Every page, signed in or out, carries the cookie banner.
    element: <RootShell />,
    errorElement: <RouteErrorPage />,
    children: [
      // Policy pages are public: linked from sign-up and the banner before anyone signs in.
      { path: Routes.legal.privacy, Component: PrivacyPolicyPage },
      { path: Routes.legal.terms, Component: TermsPage },
      { path: Routes.legal.cookies, Component: CookiePolicyPage },
      {
        path: Routes.root,
        element: <Navigate to={Routes.app.user.dashboard} replace />,
      },
      {
        path: "/dashboard",
        element: <Navigate to={Routes.app.user.dashboard} replace />,
      },
      {
        Component: AuthLayout,
        children: [
          { path: Routes.auth.login, Component: LoginPage },
          { path: Routes.auth.mfaChallenge, Component: MfaChallengePage },
          { path: Routes.auth.signup, Component: SignUpPage },
          { path: Routes.auth.verifyContact, Component: VerifyContactPage },
          { path: Routes.auth.joinType, Component: JoinTypePage },
          { path: Routes.auth.organizationName, Component: OrganizationNamePage },
          { path: Routes.auth.organizationType, Component: OrganizationTypePage },
          { path: Routes.auth.organizationInterests, Component: OrganizationInterestsPage },
          { path: Routes.auth.profession, Component: ProfessionPage },
          { path: Routes.auth.certifications, Component: CertificationsPage },
          { path: Routes.auth.documents, Component: DocumentsPage },
          { path: Routes.auth.professionalInvite, Component: ProfessionalInvitePage },
          { path: Routes.auth.professionalAvailability, Component: ProfessionalAvailabilityPage },
          { path: Routes.auth.welcome, Component: WelcomePage },
          { path: Routes.auth.forgotPassword, Component: ForgotPasswordPage },
          { path: Routes.auth.resetPassword, Component: ResetPasswordPage },
        ],
      },
      {
        Component: AppRouteGuard,
        children: [
          {
            Component: AppLayout,
            children: [
          { path: Routes.app.user.dashboard, Component: DashboardPage },
          { path: Routes.app.user.network, Component: NetworkPage },
          { path: Routes.app.user.messages, Component: MessagesPage },
          { path: Routes.app.user.jobs, Component: UserJobsPage },
          { path: Routes.app.user.applications, Component: ApplicationsPage },
          { path: Routes.app.user.marketplace, Component: MarketplacePage },
          // TELEHEALTH PAUSED
          // { path: Routes.app.user.schedule, Component: SchedulePage },
          // { path: Routes.app.user.telehealth, Component: TelehealthPage },
          { path: Routes.app.user.schedule, Component: TelehealthComingSoonPage },
          { path: Routes.app.user.telehealth, Component: TelehealthComingSoonPage },
          { path: Routes.app.user.profile, Component: ProfilePage },
          { path: `${Routes.app.user.profile}/:id`, Component: ViewProfilePage },
          { path: Routes.app.user.settings, Component: SettingsPage },
          { path: Routes.app.user.healthTips, Component: HealthTipsPage },
          // TELEHEALTH PAUSED
          // { path: Routes.app.user.healthProfile, Component: HealthProfilePage },
          // { path: Routes.app.user.records, Component: MyRecordsPage },
          // { path: `${Routes.app.user.records}/:clientId`, Component: ClientRecordsPage },
          // { path: Routes.app.user.followUps, Component: FollowUpsPage },
          { path: Routes.app.user.healthProfile, Component: TelehealthComingSoonPage },
          { path: Routes.app.user.records, Component: TelehealthComingSoonPage },
          { path: `${Routes.app.user.records}/:clientId`, Component: TelehealthComingSoonPage },
          { path: Routes.app.user.followUps, Component: TelehealthComingSoonPage },
          // A Cowry page that is switched off loses its route as well as its nav entry.
          // Hiding only the link would leave it reachable by URL and by an old bookmark,
          // which is not "off" — it is just harder to find.
          ...cowryRoutes([
            { path: Routes.app.user.cowryWallet, Component: CowryWalletPage },
            { path: Routes.app.user.cowryHistory, Component: CowryHistoryPage },
            { path: Routes.app.user.cowryEarn, Component: CowryEarnPage },
            { path: Routes.app.user.cowryRedeem, Component: CowryRedeemPage },
            { path: Routes.app.user.cowryBuy, Component: CowryBuyPage },
            { path: Routes.app.user.cowryCreator, Component: CowryCreatorPage },
            { path: Routes.app.user.cowryWithdraw, Component: CowryWithdrawPage },
          ]),
          { path: Routes.app.agency.dashboard, Component: AgencyDashboardPage },
          { path: Routes.app.agency.network, Component: NetworkPage },
          { path: Routes.app.agency.messages, Component: MessagesPage },
          { path: Routes.app.agency.jobs, Component: AgencyJobsPage },
          { path: Routes.app.agency.marketplace, Component: MarketplacePage },
          // TELEHEALTH PAUSED
          // { path: Routes.app.agency.telehealth, Component: TelehealthPage },
          // { path: Routes.app.agency.telehealthBookings, Component: AgencyTelehealthBookingsPage },
          // { path: `${Routes.app.agency.telehealth}/:id/analytics`, Component: ServiceAnalyticsPage },
          { path: Routes.app.agency.telehealth, Component: TelehealthComingSoonPage },
          { path: Routes.app.agency.telehealthBookings, Component: TelehealthComingSoonPage },
          { path: `${Routes.app.agency.telehealth}/:id/analytics`, Component: TelehealthComingSoonPage },
          { path: Routes.app.agency.profile, Component: ProfilePage },
          { path: `${Routes.app.agency.profile}/:id`, Component: ViewProfilePage },
          { path: Routes.app.agency.settings, Component: SettingsPage },
            ],
          },
        ],
      },
      {
        // The operator area sits beside the member area, not inside it: its own guard and
        // its own shell, so nothing here can render member navigation.
        Component: AdminRouteGuard,
        children: [
          {
            Component: AdminLayout,
            children: [{ path: Routes.app.admin.cowry, Component: AdminCowryPage }],
          },
        ],
      },
    ],
  },
]);
