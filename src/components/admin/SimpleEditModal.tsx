import React from 'react';

interface SimpleEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  game: any;
}

const SimpleEditModal: React.FC<SimpleEditModalProps> = ({ isOpen, onClose, game }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-bold mb-4">Editar Sorteio</h2>
        <p className="text-gray-600 mb-4">Título: {game?.title}</p>
        <p className="text-gray-600 mb-4">Max Participantes: {game?.max_participants}</p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
          >
            Fechar
          </button>
          <button
            onClick={() => {
              alert('Salvando...');
              onClose();
            }}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
};

export default SimpleEditModal;
