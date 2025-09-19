import React from 'react';
import { X } from 'lucide-react';

interface TestModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
}

const TestModal: React.FC<TestModalProps> = ({ isOpen, onClose, title }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-2xl w-full max-w-md border border-slate-700 shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6">
          <p className="text-slate-300">Modal de teste funcionando!</p>
        </div>
      </div>
    </div>
  );
};

export default TestModal;
