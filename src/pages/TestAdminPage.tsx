import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import WhatsAppImageTestPanel from '../components/admin/WhatsAppImageTestPanel';

function TestAdminPage() {
  const { user, loading } = useAuth();
  const { currentUser: currentAppUser } = useData();
  const isAdmin = currentAppUser?.is_admin || false;

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <h1 className="text-4xl font-bold mb-8">Teste Admin</h1>
      
      <div className="space-y-4">
        <div>
          <strong>Loading:</strong> {loading ? 'true' : 'false'}
        </div>
        <div>
          <strong>User:</strong> {user ? 'Existe' : 'Não existe'}
        </div>
        <div>
          <strong>Current App User:</strong> {currentAppUser ? 'Existe' : 'Não existe'}
        </div>
        <div>
          <strong>Is Admin:</strong> {isAdmin ? 'true' : 'false'}
        </div>
        <div>
          <strong>User ID:</strong> {user?.id}
        </div>
        <div>
          <strong>App User ID:</strong> {currentAppUser?.id}
        </div>
        <div>
          <strong>App User is_admin:</strong> {currentAppUser?.is_admin ? 'true' : 'false'}
        </div>
      </div>

      {isAdmin && (
        <div className="mt-8">
          <WhatsAppImageTestPanel />
        </div>
      )}
    </div>
  );
}

export default TestAdminPage;
