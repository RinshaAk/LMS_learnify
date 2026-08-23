import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../features/auth/authSlice';
import { getProtectedRouteDecision } from './protectedRouteFlow';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user } = useSelector((state) => state.auth);
  const token = localStorage.getItem('token');
  const location = useLocation();
  const dispatch = useDispatch();

  const decision = getProtectedRouteDecision({
    user,
    token,
    pathname: location.pathname,
    allowedRoles,
  });

  useEffect(() => {
    if (decision.clearAuth) {
      dispatch(logout());
    }
  }, [decision.clearAuth, dispatch]);

  if (decision.type === 'redirect') {
    return <Navigate to={decision.to} state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;
