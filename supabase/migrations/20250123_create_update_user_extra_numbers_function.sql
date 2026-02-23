-- Função para atualizar números extras do usuário
CREATE OR REPLACE FUNCTION update_user_extra_numbers(
  user_id uuid,
  extra_numbers integer[]
) RETURNS void AS $$
BEGIN
  -- Atualizar o campo extra_numbers do usuário
  UPDATE users 
  SET extra_numbers = array_cat(COALESCE(extra_numbers, '{}'), $2)
  WHERE id = $1;
  
  -- Se o usuário não foi encontrado na tabela users, tentar na tabela profiles
  IF NOT FOUND THEN
    UPDATE profiles 
    SET extra_numbers = array_cat(COALESCE(extra_numbers, '{}'), $2)
    WHERE id = $1;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Conceder permissões para usuários autenticados
GRANT EXECUTE ON FUNCTION update_user_extra_numbers(uuid, integer[]) TO authenticated;