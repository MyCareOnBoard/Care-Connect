import { lazy } from "react";
import { createBrowserRouter, Navigate } from "react-router";
import { Routes } from "@/routes/constants";
import RouteErrorPage from "@/pages/error/RouteErrorPage";

const AuthLayout = lazy(() => import("@/layouts/AuthLayout"));
const AppLayout = lazy(() => import("@/layouts/AppLayout"));

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
const WelcomePage = lazy(() => import("@/pages/auth/welcome"));
const ForgotPasswordPage = lazy(() => import("@/pages/auth/forgot-password"));
const ResetPasswordPage = lazy(() => import("@/pages/auth/reset-password"));

const DashboardPage = lazy(() => import("@/pages/app/user/dashboard"));
const AgencyDashboardPage = lazy(() => import("@/pages/app/agency/dashboard"));
const UserJobsPage = lazy(() => import("@/pages/app/user/jobs"));
const AgencyJobsPage = lazy(() => import("@/pages/app/agency/jobs"));
const MessagesPage = lazy(() => import("@/pages/app/messages"));
const ApplicationsPage = lazy(() => import("@/pages/app/applications"));
const MarketplacePage = lazy(() => import("@/pages/app/marketplace"));
const TelehealthPage = lazy(() => import("@/pages/app/telehealth"));
const ProfilePage = lazy(() => import("@/pages/app/profile"));
const SettingsPage = lazy(() => import("@/pages/app/settings"));

export const router = createBrowserRouter([
  {
    errorElement: <RouteErrorPage />,
    children: [
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
          { path: Routes.auth.welcome, Component: WelcomePage },
          { path: Routes.auth.forgotPassword, Component: ForgotPasswordPage },
          { path: Routes.auth.resetPassword, Component: ResetPasswordPage },
        ],
      },
      {
        Component: AppLayout,
        children: [
          { path: Routes.app.user.dashboard, Component: DashboardPage },
          { path: Routes.app.user.messages, Component: MessagesPage },
          { path: Routes.app.user.jobs, Component: UserJobsPage },
          { path: Routes.app.user.applications, Component: ApplicationsPage },
          { path: Routes.app.user.marketplace, Component: MarketplacePage },
          { path: Routes.app.user.telehealth, Component: TelehealthPage },
          { path: Routes.app.user.profile, Component: ProfilePage },
          { path: Routes.app.user.settings, Component: SettingsPage },
          { path: Routes.app.agency.dashboard, Component: AgencyDashboardPage },
          { path: Routes.app.agency.messages, Component: MessagesPage },
          { path: Routes.app.agency.jobs, Component: AgencyJobsPage },
          { path: Routes.app.agency.applications, Component: ApplicationsPage },
          { path: Routes.app.agency.marketplace, Component: MarketplacePage },
          { path: Routes.app.agency.telehealth, Component: TelehealthPage },
          { path: Routes.app.agency.profile, Component: ProfilePage },
          { path: Routes.app.agency.settings, Component: SettingsPage },
        ],
      },
    ],
  },
]);
