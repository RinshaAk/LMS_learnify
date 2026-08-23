import test from "node:test";
import assert from "node:assert/strict";
import { getProtectedRouteDecision } from "./protectedRouteFlow.js";

test("refreshing instructor pending page with pending instructor does not redirect", () => {
  const decision = getProtectedRouteDecision({
    user: {
      _id: "instructor-1",
      role: "instructor",
      approvalStatus: "pending",
    },
    token: "token",
    pathname: "/instructor/pending",
    allowedRoles: ["instructor"],
  });

  assert.deepEqual(decision, { type: "allow" });
});

test("pending instructor on instructor dashboard redirects once to pending page", () => {
  const decision = getProtectedRouteDecision({
    user: {
      _id: "instructor-1",
      role: "instructor",
      approvalStatus: "pending",
    },
    token: "token",
    pathname: "/instructor/dashboard",
    allowedRoles: ["instructor"],
  });

  assert.equal(decision.type, "redirect");
  assert.equal(decision.to, "/instructor/pending");
});

test("protected route never redirects to the current route", () => {
  const decision = getProtectedRouteDecision({
    user: null,
    token: null,
    pathname: "/login",
    allowedRoles: ["student"],
  });

  assert.deepEqual(decision, { type: "allow" });
});

test("role mismatch requests auth clearing without render-time storage mutation", () => {
  const decision = getProtectedRouteDecision({
    user: {
      _id: "student-1",
      role: "student",
    },
    token: "token",
    pathname: "/admin/dashboard",
    allowedRoles: ["admin"],
  });

  assert.equal(decision.type, "redirect");
  assert.equal(decision.to, "/admin/login");
  assert.equal(decision.clearAuth, true);
});
