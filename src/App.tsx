import AdminPage from './pages/AdminPage';
import StudentPage from './pages/StudentPage';
export default function App(){ return location.pathname.startsWith('/student') ? <StudentPage/> : <AdminPage/>; }
