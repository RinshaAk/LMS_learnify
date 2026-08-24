import test from "node:test";
import assert from "node:assert/strict";
import {
  getPortalMismatchMessage,
  getPostLoginPath,
  shouldRestorePreviousSession,
} from "./loginFlow.js";

test("instructor credentials on Student Login have no navigation target", () => {
  const user = {
    role: "instructor",
    approvalStatus: "pending",
  };

  assert.equal(getPostLoginPath(user, "student"), null);
  assert.equal(
    getPortalMismatchMessage(user.role),
    "This account is registered as instructor. Please use the instructor login page."
  );
});

test("admin credentials on Student Login have no navigation target", () => {
  assert.equal(getPostLoginPath({ role: "admin" }, "student"), null);
});

test("student credentials on Instructor Login have no navigation target", () => {
  assert.equal(getPostLoginPath({ role: "student" }, "instructor"), null);
});

test("student credentials on Admin Login have no navigation target", () => {
  assert.equal(getPostLoginPath({ role: "student" }, "admin"), null);
});

test("pending instructor on Instructor Login navigates to pending page", () => {
  assert.equal(
    getPostLoginPath(
      { role: "instructor", approvalStatus: "pending" },
      "instructor"
    ),
    "/instructor/pending"
  );
});

test("correct student login navigates to student dashboard", () => {
  assert.equal(
    getPostLoginPath({ role: "student" }, "student"),
    "/student/dashboard"
  );
});

test("correct admin login navigates to admin dashboard", () => {
  assert.equal(
    getPostLoginPath({ role: "admin" }, "admin"),
    "/admin/dashboard"
  );
});

test("failed or mismatched login preserves existing session instead of replacing it", () => {
  assert.equal(
    shouldRestorePreviousSession({ code: "ROLE_MISMATCH" }),
    true
  );
  assert.equal(
    shouldRestorePreviousSession({ code: "INVALID_CREDENTIALS" }),
    false
  );
});
