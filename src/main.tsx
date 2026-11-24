import { createRoot } from 'react-dom/client';
import CrownDEXV4 from './CrownDEXV4';
import AdminStudio from './AdminStudio';
import './index.css';
import './crowndex-v4.css';

const isAdmin = /^\/admin(?:\/|$)/.test(window.location.pathname);
createRoot(document.getElementById('root')!).render(isAdmin ? <AdminStudio/> : <CrownDEXV4/>);
