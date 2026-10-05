import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth';
import Layout from './components/Layout';
import Login from './pages/Login';
import CreateTicket from './pages/CreateTicket';
import Tickets from './pages/Tickets';

function Private({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/mis-tickets" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<Private><Layout /></Private>}>
            <Route path="/crear" element={<Private roles={['requester', 'admin']}><CreateTicket /></Private>} />
            <Route path="/mis-tickets" element={<Tickets key="mine" mode="mine" />} />
            <Route path="/todos" element={<Private roles={['admin']}><Tickets key="all" mode="all" /></Private>} />
            <Route path="*" element={<Navigate to="/mis-tickets" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
