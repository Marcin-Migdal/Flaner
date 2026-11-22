import React from "react";
import { Outlet } from "react-router";
import type { AppRouteObject } from "@flaner/shared/types";
import { BudgetTilesView } from "./views/BudgetTilesView";

const SchedulerView = React.lazy(() => import("./views/SchedulerView"));
const SplitsView = React.lazy(() => import("./views/SplitsView"));
// Budget views stay lazy so their heavy dependencies (charts, CSV parser) load only on Budget pages
const BudgetSummaryView = React.lazy(() => import("./views/BudgetSummaryView"));
const BudgetTransactionsView = React.lazy(() => import("./views/BudgetTransactionsView"));
const BudgetPlannerView = React.lazy(() => import("./views/BudgetPlannerView"));
const BudgetSettingsView = React.lazy(() => import("./views/BudgetSettingsView"));
// Onboarding / unlock in front of every Budget page; lazy, so the budget crypto loads only there
const BudgetGate = React.lazy(() => import("./components/BudgetGate"));

const budgetViews: AppRouteObject[] = [
  {
    path: "summary",
    element: <BudgetSummaryView />,
    handle: { label: "planning:nav.budgetSummary", icon: "chart-pie" },
  },
  {
    path: "transactions",
    element: <BudgetTransactionsView />,
    handle: { label: "planning:nav.budgetTransactions", icon: "arrow-left-right" },
  },
  {
    path: "planner",
    element: <BudgetPlannerView />,
    handle: { label: "planning:nav.budgetPlanner", icon: "list-checks" },
  },
  {
    path: "settings",
    element: <BudgetSettingsView />,
    handle: { label: "planning:nav.budgetSettings", icon: "settings" },
  },
];

export const routes: AppRouteObject[] = [
  {
    path: "",
    element: <Outlet />,
    handle: { label: "nav.planning", icon: "calendar" },
    children: [
      {
        path: "scheduling",
        element: <SchedulerView />,
        handle: {
          label: "nav.scheduling",
          icon: "calendar",
        },
      },
      {
        path: "splits",
        element: <SplitsView />,
        handle: {
          label: "nav.splits",
          icon: "wallet",
        },
      },
      {
        path: "budget",
        element: (
          <BudgetGate>
            <Outlet />
          </BudgetGate>
        ),
        handle: { label: "planning:nav.budget", icon: "piggy-bank" },
        // A route with children shows a tiles page of them as its index
        children: [{ index: true, element: <BudgetTilesView routes={budgetViews} /> }, ...budgetViews],
      },
    ],
  },
];
