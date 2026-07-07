import { lazy } from "react";
import { createBrowserRouter, Navigate } from "react-router";
import { Routes } from "@/routes/constants";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import RouteErrorPage from "@/pages/error/RouteErrorPage";

const AuthLayout = lazy(() => import("@/layouts/AuthLayout"));
const AppLayout = lazy(() => import("@/layouts/AppLayout"));

const LoginPage = lazy(() => import("@/pages/auth/login"));
const SignUpPage = lazy(() => import("@/pages/auth/signup"));
const ForgotPasswordPage = lazy(() => import("@/pages/auth/forgot-password"));
const ResetPasswordPage = lazy(() => import("@/pages/auth/reset-password"));

const DashboardPage = lazy(() => import("@/pages/app/dashboard"));

export const router = createBrowserRouter([
  {
    errorElement: <RouteErrorPage />,
    children: [
      {
        path: Routes.root,
        element: <Navigate to={Routes.app.dashboard} replace />,
      },
      {
        Component: AuthLayout,
        children: [
          { path: Routes.auth.login, Component: LoginPage },
          { path: Routes.auth.signup, Component: SignUpPage },
          { path: Routes.auth.forgotPassword, Component: ForgotPasswordPage },
          { path: Routes.auth.resetPassword, Component: ResetPasswordPage },
        ],
      },
      {
        Component: AppLayout,
        children: [
          {
            path: Routes.app.dashboard,
            element: (
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            ),
          },
        ],
      },
    ],
  },
]);
