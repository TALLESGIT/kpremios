import React from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';

const NumberStatusDebug: React.FC = () => {
  const { numbers, currentUser } = useData();
  const { user } = useAuth();

  const takenNumbers = numbers.filter(n => !n.is_available);
  const userNumbers = numbers.filter(n => n.selected_by === user?.id);
  const freeNumbers = numbers.filter(n => n.is_free);

  return (
    <div className="bg-yellow-100 border border-yellow-400 rounded-lg p-4 m-4">
      <h3 className="font-bold text-yellow-800 mb-2">🐛 Debug - Status dos Números</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div>
          <p><strong>Total de números:</strong> {numbers.length}</p>
          <p><strong>Números ocupados:</strong> {takenNumbers.length}</p>
          <p><strong>Números do usuário atual:</strong> {userNumbers.length}</p>
          <p><strong>Números gratuitos:</strong> {freeNumbers.length}</p>
        </div>
        
        <div>
          <p><strong>User ID:</strong> {user?.id || 'Não logado'}</p>
          <p><strong>Current User ID:</strong> {currentUser?.id || 'Não carregado'}</p>
          <p><strong>Free Number:</strong> {currentUser?.free_number || 'Nenhum'}</p>
        </div>
      </div>

      {userNumbers.length > 0 && (
        <div className="mt-4">
          <p className="font-semibold text-yellow-800">Números do usuário:</p>
          <div className="flex flex-wrap gap-2 mt-2">
            {userNumbers.map(num => (
              <span 
                key={num.number}
                className="bg-red-500 text-white px-2 py-1 rounded text-xs"
              >
                {num.number} (is_available: {num.is_available.toString()})
              </span>
            ))}
          </div>
        </div>
      )}

      {takenNumbers.slice(0, 10).length > 0 && (
        <div className="mt-4">
          <p className="font-semibold text-yellow-800">Primeiros 10 números ocupados:</p>
          <div className="flex flex-wrap gap-2 mt-2">
            {takenNumbers.slice(0, 10).map(num => (
              <span 
                key={num.number}
                className="bg-purple-500 text-white px-2 py-1 rounded text-xs"
              >
                {num.number} (by: {num.selected_by?.slice(0, 8)}...)
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default NumberStatusDebug;
