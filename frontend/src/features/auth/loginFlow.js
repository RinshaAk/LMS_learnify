export const getPortalMismatchMessage = (registeredRole) =>
  `This account is registered as ${registeredRole}. Please use the ${registeredRole} login page.`;

export const getPostLoginPath = (user, portalRole) => {
  if (!user || user.role !== portalRole) {
    return null;
  }

  if (portalRole === "student") {
    return "/student/dashboard";
  }

  if (portalRole === "admin") {
    return "/admin/dashboard";
  }

  if (portalRole === "instructor") {
    return user.approvalStatus === "approved"
      ? "/instructor/dashboard"
      : "/instructor/pending";
  }

  return null;
};

export const shouldRestorePreviousSession = (error) =>
  error?.code === "ROLE_MISMATCH";
