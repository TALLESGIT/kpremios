import React, { useState, useEffect } from 'react';
import { X, Download, FileText, Users, Hash, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

interface Participant {
  id: string;
  user_id: string;
  user_name: string;
  lucky_number: number;
  status: 'active' | 'eliminated';
  joined_at: string;
  eliminated_at?: string;
  user_phone?: string;
}

interface LiveGame {
  id: string;
  title: string;
  description: string;
  max_participants: number;
  status: 'waiting' | 'active' | 'finished';
  created_at: string;
}

interface ExportParticipantsModalProps {
  isOpen: boolean;
  onClose: () => void;
  raffle: LiveGame | null;
}

const ExportParticipantsModal: React.FC<ExportParticipantsModalProps> = ({
  isOpen,
  onClose,
  raffle
}) => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  useEffect(() => {
    if (isOpen && raffle) {
      loadParticipants();
    }
  }, [isOpen, raffle]);

  const loadParticipants = async () => {
    if (!raffle) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('live_participants')
        .select(`
          *,
          users:user_id (
            name,
            whatsapp
          )
        `)
        .eq('game_id', raffle.id)
        .order('lucky_number', { ascending: true });

      if (error) throw error;

      const formattedParticipants = (data || []).map(p => ({
        ...p,
        user_name: p.users?.name || 'Usuário',
        user_phone: p.users?.whatsapp || ''
      }));

      setParticipants(formattedParticipants);
    } catch (error) {
      console.error('Erro ao carregar participantes:', error);
      toast.error('Erro ao carregar participantes');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (participants.length === 0) {
      toast.error('Nenhum participante para exportar');
      return;
    }

    setExportLoading(true);
    try {
      const headers = [
        'ID',
        'Nome',
        'Número da Sorte',
        'Status',
        'Telefone',
        'Data de Inscrição',
        'Data de Eliminação'
      ];

      const csvData = participants.map(p => [
        p.id,
        p.user_name,
        p.lucky_number,
        p.status === 'active' ? 'Ativo' : 'Eliminado',
        p.user_phone || 'Não informado',
        new Date(p.joined_at).toLocaleString('pt-BR'),
        p.eliminated_at ? new Date(p.eliminated_at).toLocaleString('pt-BR') : 'N/A'
      ]);

      const csvContent = [headers, ...csvData]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `participantes_${raffle?.title.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Dados exportados com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar dados:', error);
      toast.error('Erro ao exportar dados');
    } finally {
      setExportLoading(false);
    }
  };

  const exportToExcel = () => {
    if (participants.length === 0) {
      toast.error('Nenhum participante para exportar');
      return;
    }

    setExportLoading(true);
    try {
      // Criar dados para Excel (formato simplificado)
      const excelData = participants.map(p => ({
        'ID': p.id,
        'Nome': p.user_name,
        'Número da Sorte': p.lucky_number,
        'Status': p.status === 'active' ? 'Ativo' : 'Eliminado',
        'Telefone': p.user_phone || 'Não informado',
        'Data de Inscrição': new Date(p.joined_at).toLocaleString('pt-BR'),
        'Data de Eliminação': p.eliminated_at ? new Date(p.eliminated_at).toLocaleString('pt-BR') : 'N/A'
      }));

      // Converter para JSON e fazer download
      const jsonData = JSON.stringify(excelData, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `participantes_${raffle?.title.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.json`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Dados exportados em formato JSON!');
    } catch (error) {
      console.error('Erro ao exportar dados:', error);
      toast.error('Erro ao exportar dados');
    } finally {
      setExportLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    return status === 'active' 
      ? 'bg-green-500/20 text-green-400 border-green-500/30'
      : 'bg-red-500/20 text-red-400 border-red-500/30';
  };

  const getStatusText = (status: string) => {
    return status === 'active' ? 'Ativo' : 'Eliminado';
  };

  if (!isOpen || !raffle) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] border border-slate-700 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <Download className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Exportar Participantes</h2>
              <p className="text-slate-400 text-sm">{raffle.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Stats */}
          <div className="p-6 border-b border-slate-700">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-700/50 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-blue-400" />
                  <div>
                    <p className="text-slate-400 text-sm">Total</p>
                    <p className="text-white text-xl font-bold">{participants.length}</p>
                  </div>
                </div>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <Hash className="w-5 h-5 text-green-400" />
                  <div>
                    <p className="text-slate-400 text-sm">Ativos</p>
                    <p className="text-white text-xl font-bold">
                      {participants.filter(p => p.status === 'active').length}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-purple-400" />
                  <div>
                    <p className="text-slate-400 text-sm">Eliminados</p>
                    <p className="text-white text-xl font-bold">
                      {participants.filter(p => p.status === 'eliminated').length}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Export Buttons */}
          <div className="p-6 border-b border-slate-700">
            <div className="flex gap-3">
              <button
                onClick={exportToCSV}
                disabled={loading || exportLoading || participants.length === 0}
                className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-3 px-6 rounded-lg font-medium transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FileText className="w-4 h-4" />
                {exportLoading ? 'Exportando...' : 'Exportar CSV'}
              </button>
              <button
                onClick={exportToExcel}
                disabled={loading || exportLoading || participants.length === 0}
                className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-3 px-6 rounded-lg font-medium transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4" />
                {exportLoading ? 'Exportando...' : 'Exportar JSON'}
              </button>
            </div>
          </div>

          {/* Participants List */}
          <div className="flex-1 overflow-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
              </div>
            ) : participants.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-300 mb-2">Nenhum participante</h3>
                <p className="text-slate-400">Ainda não há participantes neste sorteio.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {participants.map((participant) => (
                  <div
                    key={participant.id}
                    className="bg-slate-700/50 rounded-lg p-4 border border-slate-600"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gradient-to-r from-amber-500 to-amber-600 rounded-lg flex items-center justify-center text-white font-bold">
                          {participant.lucky_number}
                        </div>
                        <div>
                          <h4 className="font-medium text-white">{participant.user_name}</h4>
                          <p className="text-slate-400 text-sm">
                            {participant.user_phone || 'Telefone não informado'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(participant.status)}`}>
                          {getStatusText(participant.status)}
                        </span>
                        <div className="text-right text-sm text-slate-400">
                          <p>Inscrito: {new Date(participant.joined_at).toLocaleDateString('pt-BR')}</p>
                          {participant.eliminated_at && (
                            <p>Eliminado: {new Date(participant.eliminated_at).toLocaleDateString('pt-BR')}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportParticipantsModal;
