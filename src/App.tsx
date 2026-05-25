import AdminPage from './pages/AdminPage';
import StudentPage from './pages/StudentPage';

export default function App() {
  const path = typeof window !== 'undefined' ? window.location.pathname : '/';
  return path.startsWith('/student') ? <StudentPage /> : <AdminPage />;
}
