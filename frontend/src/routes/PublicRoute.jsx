import { Navigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";

const PublicRoute = ({ children }) => {
  const { user } = useSelector((state) => state.auth);
  const token = localStorage.getItem('token');
  const location = useLocation();

  if (location.pathname === '/forgot-password' || location.pathname.startsWith('/reset-password/')) {
    return children;
  }

  if (token && user) {
    // Allow logged-in students to visit instructor login/register pages
    if (user?.role === 'student' && location.pathname.startsWith('/instructor')) {
      return children;
    }

    const from = location.state?.from?.pathname || (
      user?.role === 'admin' ? '/admin/dashboard' :
      user?.role === 'instructor' ? '/instructor/dashboard' :
      '/student/dashboard'
    );

    return <Navigate to={from} replace />;
  }

  return children;
};

export default PublicRoute;
