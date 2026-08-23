import test from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";

const { loginUserForRole } = await import("../services/authServices.js");
const userModule = await import("../models/User.js");
const User = userModule.default;

const originalFindOne = User.findOne.bind(User);
const savedUsers = new Map();

const password = "password123";
const passwordHash = await bcrypt.hash(password, 10);

const buildUser = (overrides) =>
  new User({
    name: overrides.name || "Test User",
    email: overrides.email,
    password: passwordHash,
    role: overrides.role,
    isVerified: true,
    isBlocked: false,
    approvalStatus: overrides.approvalStatus || "approved",
    ...overrides,
  });

const addUser = (overrides) => {
  const user = buildUser(overrides);
  savedUsers.set(user.email, user);
  return user;
};

const expectRoleMismatch = async ({ email, portalRole, registeredRole }) => {
  try {
    await loginUserForRole({ email, password, portalRole });
    assert.fail("expected login to reject");
  } catch (error) {
    assert.equal(error.statusCode, 403);
    assert.equal(error.code, "ROLE_MISMATCH");
    assert.equal(error.registeredRole, registeredRole);
    assert.equal(
      error.message,
      `This account is registered as ${registeredRole}. Please use the ${registeredRole} login page.`
    );
    assert.equal(error.token, undefined);
  }
};

test.before(() => {
  User.findOne = async (query) => savedUsers.get(query.email) || null;
});

test.after(() => {
  User.findOne = originalFindOne;
});

test.afterEach(() => {
  savedUsers.clear();
});

test("instructor credentials on student login reject with role mismatch and no token", async () => {
  addUser({
    email: "instructor@example.com",
    role: "instructor",
    approvalStatus: "pending",
  });

  await expectRoleMismatch({
    email: "instructor@example.com",
    portalRole: "student",
    registeredRole: "instructor",
  });
});

test("admin credentials on student login reject with role mismatch", async () => {
  addUser({
    email: "admin@example.com",
    role: "admin",
  });

  await expectRoleMismatch({
    email: "admin@example.com",
    portalRole: "student",
    registeredRole: "admin",
  });
});

test("student credentials on instructor login reject with role mismatch", async () => {
  addUser({
    email: "student@example.com",
    role: "student",
  });

  await expectRoleMismatch({
    email: "student@example.com",
    portalRole: "instructor",
    registeredRole: "student",
  });
});

test("student credentials on admin login reject with role mismatch", async () => {
  addUser({
    email: "student@example.com",
    role: "student",
  });

  await expectRoleMismatch({
    email: "student@example.com",
    portalRole: "admin",
    registeredRole: "student",
  });
});

test("pending instructor on instructor login succeeds", async () => {
  const instructor = addUser({
    email: "pending-instructor@example.com",
    role: "instructor",
    approvalStatus: "pending",
  });

  const result = await loginUserForRole({
    email: "pending-instructor@example.com",
    password,
    portalRole: "instructor",
  });

  assert.equal(result._id.toString(), instructor._id.toString());
  assert.equal(result.role, "instructor");
  assert.equal(result.approvalStatus, "pending");
});

test("correct student login succeeds", async () => {
  const student = addUser({
    email: "student@example.com",
    role: "student",
  });

  const result = await loginUserForRole({
    email: "student@example.com",
    password,
    portalRole: "student",
  });

  assert.equal(result._id.toString(), student._id.toString());
  assert.equal(result.role, "student");
});

test("correct admin login succeeds", async () => {
  const admin = addUser({
    email: "admin@example.com",
    role: "admin",
  });

  const result = await loginUserForRole({
    email: "admin@example.com",
    password,
    portalRole: "admin",
  });

  assert.equal(result._id.toString(), admin._id.toString());
  assert.equal(result.role, "admin");
});

test("blocked users remain blocked after credentials and role are valid", async () => {
  addUser({
    email: "blocked-student@example.com",
    role: "student",
    isBlocked: true,
    blockedReason: "Account blocked for review.",
  });

  try {
    await loginUserForRole({
      email: "blocked-student@example.com",
      password,
      portalRole: "student",
    });
    assert.fail("expected login to reject");
  } catch (error) {
    assert.equal(error.statusCode, 403);
    assert.equal(error.code, "ACCOUNT_BLOCKED");
    assert.equal(error.message, "Account blocked for review.");
    assert.equal(error.token, undefined);
  }
});
