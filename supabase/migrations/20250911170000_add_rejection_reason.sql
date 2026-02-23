-- Adicionar campo rejection_reason à tabela extra_number_requests
ALTER TABLE extra_number_requests 
ADD COLUMN rejection_reason TEXT;

-- Comentário explicativo
COMMENT ON COLUMN extra_number_requests.rejection_reason IS 'Motivo da rejeição fornecido pelo administrador';