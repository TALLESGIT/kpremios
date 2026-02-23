import React, { useState, useEffect } from 'react';
import { X, Download, FileText, Users, Hash, Calendar, FileImage } from 'lucide-react';
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
        'Número da Sorte',
        'Nome do Participante'
      ];

      const csvData = participants.map(p => [
        p.lucky_number,
        p.user_name
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
      toast.error('Erro ao exportar dados');
    } finally {
      setExportLoading(false);
    }
  };

  const exportToPDF = () => {
    if (participants.length === 0) {
      toast.error('Nenhum participante para exportar');
      return;
    }

    setExportLoading(true);
    try {
      // Criar conteúdo HTML para PDF
      const htmlContent = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Lista de Participantes - ${raffle?.title}</title>
          <style>
            body {
              font-family: 'Arial', sans-serif;
              margin: 0;
              padding: 20px;
              background: white;
              color: #333;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 3px solid #3b82f6;
              padding-bottom: 20px;
            }
            .header h1 {
              color: #1e40af;
              margin: 0;
              font-size: 28px;
            }
            .header p {
              color: #6b7280;
              margin: 5px 0 0 0;
              font-size: 16px;
            }
            .stats {
              display: flex;
              justify-content: center;
              gap: 30px;
              margin-bottom: 30px;
              flex-wrap: wrap;
            }
            .stat-box {
              background: #f8fafc;
              border: 2px solid #e2e8f0;
              border-radius: 10px;
              padding: 15px 25px;
              text-align: center;
              min-width: 120px;
            }
            .stat-number {
              font-size: 24px;
              font-weight: bold;
              color: #1e40af;
              margin: 0;
            }
            .stat-label {
              font-size: 14px;
              color: #6b7280;
              margin: 5px 0 0 0;
            }
            .participants-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
              gap: 15px;
              margin-bottom: 30px;
            }
            .participant-card {
              background: #f8fafc;
              border: 2px solid #e2e8f0;
              border-radius: 12px;
              padding: 20px;
              text-align: center;
              transition: all 0.3s ease;
            }
            .participant-card:hover {
              border-color: #3b82f6;
              box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
            }
            .number-badge {
              background: linear-gradient(135deg, #3b82f6, #1d4ed8);
              color: white;
              width: 60px;
              height: 60px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 24px;
              font-weight: bold;
              margin: 0 auto 15px auto;
              box-shadow: 0 4px 8px rgba(59, 130, 246, 0.3);
            }
            .participant-name {
              font-size: 18px;
              font-weight: 600;
              color: #1f2937;
              margin: 0;
            }
            .footer {
              text-align: center;
              margin-top: 40px;
              padding-top: 20px;
              border-top: 2px solid #e2e8f0;
              color: #6b7280;
              font-size: 14px;
            }
            .print-date {
              color: #9ca3af;
              font-size: 12px;
            }
            @media print {
              body { margin: 0; padding: 15px; }
              .participants-grid { grid-template-columns: repeat(3, 1fr); }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🎮 ${raffle?.title}</h1>
            <p>Lista de Participantes para Sorteio Manual</p>
          </div>
          
          <div class="stats">
            <div class="stat-box">
              <p class="stat-number">${participants.length}</p>
              <p class="stat-label">Total de Participantes</p>
            </div>
            <div class="stat-box">
              <p class="stat-number">${participants.filter(p => p.status === 'active').length}</p>
              <p class="stat-label">Participantes Ativos</p>
            </div>
            <div class="stat-box">
              <p class="stat-number">${participants.filter(p => p.status === 'eliminated').length}</p>
              <p class="stat-label">Eliminados</p>
            </div>
          </div>
          
          <div class="participants-grid">
            ${participants.map(p => `
              <div class="participant-card">
                <div class="number-badge">${p.lucky_number}</div>
                <p class="participant-name">${p.user_name}</p>
              </div>
            `).join('')}
          </div>
          
          <div class="footer">
            <p>📅 Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
            <p class="print-date">Este documento contém ${participants.length} participantes para o sorteio "Resta Um"</p>
          </div>
        </body>
        </html>
      `;

      // Criar blob e fazer download
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `participantes_${raffle?.title.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.html`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Arquivo HTML gerado! Abra no navegador e use Ctrl+P para imprimir em PDF');
    } catch (error) {
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
      // Criar dados simplificados - apenas Número e Nome
      const excelData = participants.map(p => ({
        'Número da Sorte': p.lucky_number,
        'Nome do Participante': p.user_name
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
              <p className="text-slate-400 text-sm">{raffle.title} - Apenas Número e Nome</p>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button
                onClick={exportToPDF}
                disabled={loading || exportLoading || participants.length === 0}
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white py-3 px-6 rounded-lg font-medium transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FileImage className="w-4 h-4" />
                {exportLoading ? 'Gerando...' : 'Gerar PDF'}
              </button>
              <button
                onClick={exportToCSV}
                disabled={loading || exportLoading || participants.length === 0}
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-3 px-6 rounded-lg font-medium transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FileText className="w-4 h-4" />
                {exportLoading ? 'Exportando...' : 'Exportar CSV'}
              </button>
              <button
                onClick={exportToExcel}
                disabled={loading || exportLoading || participants.length === 0}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-3 px-6 rounded-lg font-medium transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4" />
                {exportLoading ? 'Exportando...' : 'Exportar JSON'}
              </button>
            </div>
            <div className="mt-3 text-center">
              <p className="text-slate-400 text-sm">
                💡 <strong>Recomendado:</strong> Use "Gerar PDF" para uma lista visual organizada e fácil de usar no sorteio manual
              </p>
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
