import AdminPage from './pages/AdminPage';
import StudentPage from './pages/StudentPage';
import PendingPage from './pages/PendingPage';

export default function App() {
  const path = typeof window !== 'undefined' ? window.location.pathname : '/';
  if (path.startsWith('/student')) return <StudentPage />;
  if (path.startsWith('/pending')) return <PendingPage />;
  return <AdminPage />;
}
