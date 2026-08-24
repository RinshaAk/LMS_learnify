export const getLoginPathForPathname = (pathname) => {
  if (pathname.startsWith("/admin")) {
    return "/admin/login";
  }

  if (pathname.startsWith("/instructor")) {
    return "/instructor/login";
  }

  return "/login";
};

const redirect = (to, pathname, options = {}) => {
  if (to === pathname) {
    return { type: "allow" };
  }

  return {
    type: "redirect",
    to,
    clearAuth: false,
    ...options,
  };
};

export const getProtectedRouteDecision = ({
  user,
  token,
  pathname,
  allowedRoles,
}) => {
  if (!user || !token) {
    return redirect(getLoginPathForPathname(pathname), pathname);
  }

  const normalizedRole = user.role?.toLowerCase();

  if (
    allowedRoles &&
    (!normalizedRole || !allowedRoles.includes(normalizedRole))
  ) {
    return redirect(getLoginPathForPathname(pathname), pathname, {
      clearAuth: true,
    });
  }

  if (user.isBlocked) {
    return redirect("/blocked", pathname);
  }

  if (user.role === "instructor") {
    const isVerificationPage = pathname.includes("/instructor/verify");
    const isPendingPage = pathname.includes("/instructor/pending");

    if (user.approvalStatus === "approved") {
      if (isVerificationPage || isPendingPage) {
        return redirect("/instructor/dashboard", pathname);
      }
    } else if (user.approvalStatus === "rejected") {
      if (!isVerificationPage && !isPendingPage) {
        return redirect("/instructor/pending", pathname);
      }
    } else if (user.approvalStatus === "pending") {
      if (!isPendingPage) {
        return redirect("/instructor/pending", pathname);
      }
    } else if (!isVerificationPage) {
      return redirect("/instructor/verify", pathname);
    }
  }

  return { type: "allow" };
};
