import { createContext, useContext, ReactNode, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { User, RaffleNumber, ExtraNumberRequest, DrawResult, Raffle } from '../types';

interface DataContextType {
  // User data
  currentUser: User | null;

  // Numbers data
  numbers: RaffleNumber[];

  // User actions
  registerUser: (name: string, email: string, whatsapp: string, password: string, selectedNumber: number) => Promise<void>;
  registerAdmin: (name: string, email: string, whatsapp: string, password: string) => Promise<void>;
  convertToAdmin: (name: string, email: string, whatsapp: string, password: string) => Promise<void>;
  registerRestaUmUser: (name: string, email: string, phone: string, password: string) => Promise<void>;
  selectFreeNumber: (selectedNumber: number) => Promise<boolean>;
  joinFreeRaffle: (raffleId: string) => Promise<{ success: boolean; message: string }>;

  // Extra numbers
  requestExtraNumbers: (paymentAmount: number, quantity: number, paymentProofUrl?: string) => Promise<boolean>;
  getCurrentUserRequest: () => ExtraNumberRequest | null;
  getUserRequestsHistory: () => Promise<ExtraNumberRequest[]>;

  // Numbers info
  getAvailableNumbersCount: () => Promise<number>;
  getTakenNumbersCount: () => Promise<number>;
  loadNumbers: () => Promise<void>;

  // Admin functions
  resetAllNumbers: () => Promise<void>;
  cleanupOrphanedNumbers: () => Promise<void>;
  getPendingRequestsCount: () => Promise<number>;

  // WhatsApp notifications
  notifyAllUsersAboutNewRaffle: (raffleData: {
    title: string;
    prize: string;
    startDate: string;
    endDate: string;
  }) => Promise<{ success: boolean; error?: string; notified?: number; total?: number; results?: any[] }>;
  notifyExtraNumbersApproved: (requestId: string) => Promise<{ success: boolean; error?: string }>;
  sendBulkNotification: (users: Array<{ whatsapp: string; name: string }>, type: string, data: any) => Promise<any>;

  // Winners
  getDrawResults: () => DrawResult[];

  // Raffles
  raffles: Raffle[];
  loadRaffles: () => Promise<void>;

  // Loading states
  loading: boolean;
  numbersLoading: boolean;

  // Force reload user data
  reloadUserData: () => Promise<void>;

  // Clear all user data
  clearUserData: () => void;

  // Auth management - removed setAuthUser as it's now passed as prop
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children, authUser }: { children: ReactNode; authUser: any }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [numbers, setNumbers] = useState<RaffleNumber[]>([]);
  const [drawResults, setDrawResults] = useState<DrawResult[]>([]);
  const [currentUserRequest, setCurrentUserRequest] = useState<ExtraNumberRequest | null>(null);
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [loading, setLoading] = useState(true);
  const [numbersLoading, setNumbersLoading] = useState(true);

  // Use authUser directly from AuthContext

  // Função para gerar código de confirmação
  const generateConfirmationCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const loadCurrentUser = useCallback(async () => {
    if (!authUser || !authUser.id) {
      setCurrentUser(null);
      setLoading(false);
      return;
    }

    try {

      setLoading(true);

      // Verify authentication before making queries
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {

        setCurrentUser(null);
        setLoading(false);
        return;
      }

      if (!session || !session.user) {

        setCurrentUser(null);
        setLoading(false);
        return;
      }

      // First try to load from users table (main system)
      let { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .limit(1);

      // If not found in users, try profiles table (Resta Um)
      if (!data || data.length === 0) {

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .limit(1);

        if (profileData && profileData.length > 0) {

          data = profileData;
          error = profileError;
        }
      }

      // If we have data, set the current user with stats
      if (data && data.length > 0) {
        const user = data[0];

        // Fetch stats from pool_bets
        try {
          const { count: totalBets } = await supabase
            .from('pool_bets')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', authUser.id);

          const { count: totalWins } = await supabase
            .from('pool_bets')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', authUser.id)
            .eq('is_winner', true);

          user.total_bets = totalBets || 0;
          user.total_wins = totalWins || 0;
        } catch (statsError) {
          console.error('Error fetching user stats:', statsError);
        }

        setCurrentUser(user);
        setLoading(false);
        return;
      }

      // Only check for pending data if we don't have user data and there's an error
      if (error) {

        // If user doesn't exist, check if we have pending data in localStorage
        const pendingUserData = localStorage.getItem('pendingUserData');
        if (pendingUserData) {

          const userData = JSON.parse(pendingUserData);

          // Try to create the user now that they are authenticated
          const { data: insertData, error: insertError } = await supabase
            .from('users')
            .upsert(userData, {
              onConflict: 'id',
              ignoreDuplicates: false
            })
            .select();

          if (insertError) {

            setCurrentUser(null);
          } else {

            setCurrentUser(insertData[0]);
            localStorage.removeItem('pendingUserData');
          }
        } else {
          setCurrentUser(null);
        }
        return;
      }

      setCurrentUser(null);
    } catch (error) {

      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  }, [authUser?.id]); // Only depend on authUser.id

  // Função para enviar notificação WhatsApp via Vonage
  const sendWhatsAppNotification = async (type: string, userData: any, _additionalData?: any) => {
    try {

      // Notificação desabilitada - Vonage service removido
      console.log('Notificação WhatsApp desabilitada:', type, userData);
      const result = { success: true, message: 'Notificação desabilitada' };

      // Log da notificação no banco
      await supabase.from('notification_logs').insert({
        user_id: userData.id,
        type: type,
        phone_number: userData.whatsapp,
        message_sid: (result as any).message_uuid || 'mock-uuid',
        status: 'sent'
      });

    } catch (error) {

      // Log do erro no banco
      try {
        await supabase.from('notification_logs').insert({
          user_id: userData.id,
          type: type,
          phone_number: userData.whatsapp,
          message_sid: null,
          status: 'error',
          error_message: error instanceof Error ? error.message : 'Unknown error'
        });
      } catch (logError) {

      }
    }
  };

  // Load user data when auth user changes
  useEffect(() => {
    if (authUser && authUser.id) {
      loadCurrentUser();
    } else {
      // Limpar todos os dados do usuário imediatamente
      setCurrentUser(null);
      setCurrentUserRequest(null);
      setLoading(false);
    }
  }, [authUser?.id]); // Remove loadCurrentUser from dependencies to avoid infinite loop

  // Listen for user data updates from real-time subscriptions
  useEffect(() => {
    const handleUserDataUpdate = (event: CustomEvent) => {
      console.log('DataContext: Evento userDataUpdated recebido:', event.detail);
      if (event.detail?.user) {
        console.log('DataContext: Atualizando currentUser com:', event.detail.user);
        setCurrentUser(event.detail.user);
        console.log('DataContext: currentUser atualizado com sucesso');
      } else {
        console.log('DataContext: Evento sem dados de usuário válidos');
      }
    };

    console.log('DataContext: Registrando listener para userDataUpdated');
    window.addEventListener('userDataUpdated', handleUserDataUpdate as EventListener);

    return () => {
      console.log('DataContext: Removendo listener userDataUpdated');
      window.removeEventListener('userDataUpdated', handleUserDataUpdate as EventListener);
    };
  }, []);

  // Load user requests when currentUser changes
  useEffect(() => {
    if (currentUser && !currentUser.is_admin) {
      loadCurrentUserRequest();
    } else {
      setCurrentUserRequest(null);
    }
  }, [currentUser?.is_admin]);

  // Load numbers and draw results on component mount
  useEffect(() => {
    // console.log('DataContext - Carregando números e resultados...');
    loadNumbers();
    loadDrawResults();
  }, []);

  // Real-time subscription for numbers
  useEffect(() => {
    const subscription = supabase
      .channel('numbers-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'numbers' }, () => {

        loadNumbers();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {

        if (authUser) {
          loadCurrentUser();
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {

        if (authUser) {
          loadCurrentUser();
        }
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadNumbers = async () => {
    console.log('DataContext - Iniciando loadNumbers...');
    setNumbersLoading(true);

    // Timeout de segurança para evitar carregamento infinito
    const timeoutId = setTimeout(() => {
      console.warn('DataContext - Timeout de segurança ativado, forçando numbersLoading = false');
      setNumbersLoading(false);
    }, 10000); // 10 segundos timeout

    try {

      // Skip orphaned numbers cleanup for now to speed up loading
      console.log('DataContext - Pulando limpeza de números órfãos para acelerar carregamento...');

      console.log('DataContext - Fazendo query no banco...');

      // Check if there's an active raffle to determine how many numbers to load
      const { data: activeRaffle } = await supabase
        .from('raffles')
        .select('total_numbers')
        .eq('is_active', true)
        .maybeSingle();

      const maxNumbers = activeRaffle?.total_numbers || 0;

      // Log resumido no final se não encontrar nada
      if (maxNumbers === 0) {
        console.log('DataContext - Nenhum sorteio ativo encontrado.');
      }

      // Se não há sorteio ativo, não carregar números
      if (maxNumbers === 0) {
        console.log('DataContext - Nenhum sorteio ativo, definindo array vazio');
        setNumbers([]);
        setNumbersLoading(false);
        return;
      }

      // Load all numbers needed for the active raffle using pagination
      console.log(`DataContext - Carregando números de 1 a ${maxNumbers} usando paginação`);

      let allNumbers: any[] = [];
      let from = 0;
      const pageSize = 1000; // Supabase default limit
      let hasMore = true;

      while (hasMore && allNumbers.length < maxNumbers) {
        console.log(`DataContext - Iniciando lote: from=${from}, allNumbers.length=${allNumbers.length}, maxNumbers=${maxNumbers}`);
        console.log(`DataContext - Carregando lote: ${from} a ${from + pageSize - 1}`);

        const { data, error } = await supabase
          .from('numbers')
          .select('number, is_available, selected_by, assigned_at')
          .lte('number', maxNumbers)
          .order('number', { ascending: true })
          .range(from, from + pageSize - 1);

        if (error) {
          console.error('DataContext - Erro na query:', error);
          throw error;
        }

        if (data && data.length > 0) {
          allNumbers = [...allNumbers, ...data];
          from += pageSize;
          hasMore = data.length === pageSize && allNumbers.length < maxNumbers;
          console.log(`DataContext - Calculando hasMore: data.length=${data.length}, pageSize=${pageSize}, allNumbers.length=${allNumbers.length}, maxNumbers=${maxNumbers}`);
          console.log(`DataContext - Lote carregado: ${data.length} números (total: ${allNumbers.length})`);
          console.log(`DataContext - hasMore: ${hasMore}, data.length: ${data.length}, pageSize: ${pageSize}, allNumbers.length: ${allNumbers.length}, maxNumbers: ${maxNumbers}`);

          // Debug: verificar se estamos carregando os números corretos
          if (allNumbers.length > 0) {
            console.log(`DataContext - Primeiro número: ${allNumbers[0].number}, Último número: ${allNumbers[allNumbers.length - 1].number}`);
          }
        } else {
          hasMore = false;
          console.log('DataContext - Sem mais dados, parando carregamento');
        }
      }

      console.log('DataContext - Números carregados:', allNumbers.length, 'Max:', allNumbers.length > 0 ? Math.max(...allNumbers.map(n => n.number)) : 0);
      console.log('DataContext - Primeiros 5 números:', allNumbers.slice(0, 5));
      console.log('DataContext - Últimos 5 números:', allNumbers.slice(-5));
      setNumbers(allNumbers);
      console.log('DataContext - Números definidos no estado, total:', allNumbers.length);
    } catch (error) {
      console.error('DataContext - Erro ao carregar números:', error);
      // Set empty array as fallback
      setNumbers([]);

      // Show user-friendly error message
      if (error instanceof Error && error.message.includes('fetch')) {
        console.error('DataContext - Erro de conexão detectado');
      }
    } finally {
      console.log('DataContext - Finalizando loadNumbers, definindo numbersLoading como false');
      clearTimeout(timeoutId);
      setNumbersLoading(false);
    }
  };

  const loadRaffles = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('raffles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRaffles(data || []);
    } catch (error) {
      console.error('DataContext - Erro ao carregar sorteios:', error);
    }
  }, []);

  const loadDrawResults = async () => {
    try {
      const { data, error } = await supabase
        .from('draw_results')
        .select(`
          *,
          users:winner_id (name, email)
        `)
        .order('draw_date', { ascending: false });

      if (error) throw error;
      setDrawResults(data || []);
    } catch (error) {

    }
  };

  const loadCurrentUserRequest = async () => {
    if (!authUser || !authUser.id) {
      setCurrentUserRequest(null);
      return;
    }

    // Skip authentication check if user is not authenticated
    if (!authUser) {

      setCurrentUserRequest(null);
      return;
    }

    // Skip loading user requests for admin users
    if (currentUser?.is_admin) {

      setCurrentUserRequest(null);
      return;
    }

    try {

      const { data, error } = await supabase
        .from('extra_number_requests')
        .select('*')
        .eq('user_id', authUser.id)
        .eq('status', 'pending')
        .limit(1);

      if (error) {

        // Handle different types of errors gracefully
        if (error.code === 'PGRST116' || error.code === '42501') {

          setCurrentUserRequest(null);
          return;
        }
        setCurrentUserRequest(null);
        return;
      }

      setCurrentUserRequest(data?.[0] || null);
    } catch (error) {

      setCurrentUserRequest(null);
    }
  };

  // Force reload user data
  const reloadUserData = useCallback(async () => {

    if (authUser?.id) {
      await loadCurrentUser();
      // Only load user requests for non-admin users
      if (!currentUser?.is_admin) {
        await loadCurrentUserRequest();
      } else {

      }
    }
  }, [authUser?.id, loadCurrentUser, currentUser?.is_admin]);

  const clearUserData = useCallback(() => {

    setCurrentUser(null);
    setCurrentUserRequest(null);
    setLoading(false);
  }, []);

  const registerUser = async (name: string, email: string, whatsapp: string, password: string, selectedNumber: number): Promise<void> => {
    try {

      // Validações adicionais no backend
      const { data: existingEmail } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (existingEmail) {
        throw new Error('Este email já está cadastrado. Faça login ou use outro email.');
      }

      const { data: existingWhatsapp } = await supabase
        .from('users')
        .select('id')
        .eq('whatsapp', whatsapp)
        .maybeSingle();

      if (existingWhatsapp) {
        throw new Error('Este WhatsApp já está cadastrado. Use outro número.');
      }

      const { data: existingName } = await supabase
        .from('users')
        .select('id')
        .eq('name', name)
        .maybeSingle();

      if (existingName) {
        throw new Error('Este nome já está cadastrado. Use outro nome.');
      }

      // Check if number is still available
      const { data: numberData, error: numberCheckError } = await supabase
        .from('numbers')
        .select('*')
        .eq('number', selectedNumber)
        .single();

      if (numberCheckError) {
        throw new Error('Erro ao verificar disponibilidade do número');
      }

      if (!numberData.is_available) {
        throw new Error('Este número não está mais disponível. Escolha outro.');
      }

      // First, create the auth user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name,
            whatsapp: whatsapp
          }
        }
      });

      if (signUpError) {

        if (signUpError.message.includes('already registered') ||
          signUpError.message.includes('email-already-in-use') ||
          signUpError.message.includes('User already registered')) {
          throw new Error('Este email já está cadastrado! Faça login em vez de se cadastrar novamente.');
        } else if (signUpError.message.includes('For security purposes, you can only request this after')) {
          const waitTime = signUpError.message.match(/(\d+) seconds?/)?.[1] || '60';
          throw new Error(`Por medidas de segurança, aguarde ${waitTime} segundos antes de tentar novamente.`);
        } else if (signUpError.message.includes('weak-password') ||
          signUpError.message.includes('Password should be at least')) {
          throw new Error('Senha muito fraca. Use pelo menos 6 caracteres.');
        } else if (signUpError.message.includes('invalid-email') ||
          signUpError.message.includes('Invalid email')) {
          throw new Error('Email inválido');
        } else {
          throw new Error(`Erro na criação da conta: ${signUpError.message}`);
        }
      }

      if (!authData.user) {
        throw new Error('Erro na criação da conta. Tente novamente.');
      }

      const userId = authData.user.id;

      // Store user data in localStorage for later processing
      // This bypasses RLS issues by deferring user creation
      const userData = {
        id: userId,
        name,
        email,
        whatsapp: whatsapp, // Using 'whatsapp' column for users table
        free_number: selectedNumber,
        is_admin: false, // Regular user
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      localStorage.setItem('pendingUserData', JSON.stringify(userData));

      // Try to sign in the user immediately after signup

      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (signInError) {
        // Erro no login, mas usuário foi criado
        console.warn('Erro ao fazer login após cadastro:', signInError);
      } else {
        // Try to create user immediately after successful sign in
        try {
          const { data: insertData, error: insertError } = await supabase
            .from('users')
            .upsert(userData, {
              onConflict: 'id',
              ignoreDuplicates: false
            })
            .select();

          if (insertError) {
            console.error('Erro ao criar perfil:', insertError);
          } else {
            localStorage.removeItem('pendingUserData');

            // Enviar notificação WhatsApp de confirmação de cadastro
            const confirmationCode = generateConfirmationCode();
            await sendWhatsAppNotification('registration', {
              id: userId,
              name: name,
              email: email,
              whatsapp: whatsapp
            }, {
              confirmationCode: confirmationCode
            });

            // Tentar conceder VIP grátis se elegível (103 primeiros até 01/02/2026)
            try {
              const { data: vipGranted, error: vipError } = await supabase.rpc('grant_free_vip_if_eligible', {
                p_user_id: userId
              });
              if (vipGranted && !vipError) {
                console.log('✅ VIP grátis concedido no cadastro!');

                // Buscar data de expiração do VIP
                const { data: userData } = await supabase
                  .from('users')
                  .select('vip_expires_at')
                  .eq('id', userId)
                  .single();

                // Emitir evento para mostrar modal de VIP
                window.dispatchEvent(new CustomEvent('vipGranted', {
                  detail: {
                    userId,
                    expiresAt: userData?.vip_expires_at
                  }
                }));
              }
            } catch (vipError) {
              console.error('Erro ao verificar VIP grátis:', vipError);
            }
          }
        } catch (error) {
          console.error('Erro ao criar perfil do usuário:', error);
        }
      }

      // Now reserve the number

      const { data: numberUpdateData, error: numberError } = await supabase
        .from('numbers')
        .update({
          is_available: false,
          selected_by: userId,
          is_free: true,
          assigned_at: new Date().toISOString()
        })
        .eq('number', selectedNumber)
        .select();

      if (numberError) {

        throw new Error('Erro ao reservar o número. Tente novamente.');
      }

      // Update user's free_number in the database
      const { error: userUpdateError } = await supabase
        .from('users')
        .update({ free_number: selectedNumber })
        .eq('id', userId);

      if (userUpdateError) {

        // Don't throw error here, as the number is already reserved
      } else {

      }

      // Enviar notificação WhatsApp com o número atribuído
      await sendWhatsAppNotification('numbers_assigned', {
        id: userId,
        name: name,
        whatsapp: whatsapp
      }, {
        numbers: [selectedNumber]
      });

      // Force immediate reload of all data
      await Promise.all([
        loadCurrentUser(),
        loadNumbers(),
        loadDrawResults()
      ]);

      // Try to create user from localStorage if it exists (fallback)
      setTimeout(async () => {
        try {

          const pendingUserData = localStorage.getItem('pendingUserData');

          if (pendingUserData) {

            const userData = JSON.parse(pendingUserData);

            // Try upsert instead of insert to work around RLS issues
            const { data: insertData, error: insertError } = await supabase
              .from('users')
              .upsert(userData, {
                onConflict: 'id',
                ignoreDuplicates: false
              })
              .select();

            if (insertError) {

            } else {

              localStorage.removeItem('pendingUserData');
              await loadCurrentUser();
            }
          } else {

          }
        } catch (error) {

        }
      }, 5000);

      // Note: Page refresh removed to allow error inspection
      // The user will need to manually refresh if needed

    } catch (error) {

      throw error;
    }
  };

  const registerAdmin = async (name: string, email: string, whatsapp: string, password: string): Promise<void> => {
    try {

      // First, create the auth user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name,
            whatsapp: whatsapp
          }
        }
      });

      if (signUpError) {

        if (signUpError.message.includes('already registered') ||
          signUpError.message.includes('email-already-in-use') ||
          signUpError.message.includes('User already registered')) {
          throw new Error('Este email já está cadastrado! Faça login em vez de se cadastrar novamente.');
        } else if (signUpError.message.includes('For security purposes, you can only request this after')) {
          const waitTime = signUpError.message.match(/(\d+) seconds?/)?.[1] || '60';
          throw new Error(`Por medidas de segurança, aguarde ${waitTime} segundos antes de tentar novamente.`);
        } else if (signUpError.message.includes('weak-password') ||
          signUpError.message.includes('Password should be at least')) {
          throw new Error('Senha muito fraca. Use pelo menos 6 caracteres.');
        } else if (signUpError.message.includes('invalid-email') ||
          signUpError.message.includes('Invalid email')) {
          throw new Error('Email inválido');
        } else {
          throw new Error(`Erro na criação da conta: ${signUpError.message}`);
        }
      }

      if (!authData.user) {
        throw new Error('Erro na criação da conta. Tente novamente.');
      }

      const userId = authData.user.id;

      // Store admin data in localStorage for later processing
      const adminData = {
        id: userId,
        name,
        email,
        whatsapp: whatsapp, // Using 'whatsapp' column for users table
        is_admin: true, // Mark as admin
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      localStorage.setItem('pendingAdminData', JSON.stringify(adminData));

      // Try to sign in the admin immediately after signup

      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (signInError) {

      } else {

        // Try to create admin immediately after successful sign in
        try {

          const { data: insertData, error: insertError } = await supabase
            .from('users')
            .upsert(adminData, {
              onConflict: 'id',
              ignoreDuplicates: false
            })
            .select();

          if (insertError) {

          } else {

            localStorage.removeItem('pendingAdminData');
          }
        } catch (error) {

        }
      }

      // Force immediate reload of all data
      await Promise.all([
        loadCurrentUser(),
        loadNumbers(),
        loadDrawResults()
      ]);

      // Try to create admin from localStorage if it exists (fallback)
      setTimeout(async () => {
        try {

          const pendingAdminData = localStorage.getItem('pendingAdminData');

          if (pendingAdminData) {

            const adminData = JSON.parse(pendingAdminData);

            const { data: insertData, error: insertError } = await supabase
              .from('users')
              .upsert(adminData, {
                onConflict: 'id',
                ignoreDuplicates: false
              })
              .select();

            if (insertError) {

            } else {

              localStorage.removeItem('pendingAdminData');
              // Reload user data
              await loadCurrentUser();
            }
          }
        } catch (error) {

        }
      }, 2000);

    } catch (error) {

      throw error;
    }
  };

  const convertToAdmin = async (name: string, email: string, whatsapp: string, password: string): Promise<void> => {
    try {

      // Try to sign in the existing user
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (signInError) {
        throw new Error('Email já cadastrado, mas senha incorreta. Use a senha correta ou escolha outro email.');
      }

      if (!signInData.user) {
        throw new Error('Erro ao fazer login. Tente novamente.');
      }

      const userId = signInData.user.id;

      // Check if user already exists in database
      const { data: existingUser, error: userCheckError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .limit(1);

      if (userCheckError) {

      }

      if (existingUser && existingUser.length > 0) {
        // User exists, update to admin
        const { error: updateError } = await supabase
          .from('users')
          .update({
            is_admin: true,
            name: name,
            whatsapp: whatsapp, // Using 'whatsapp' column for users table
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);

        if (updateError) {

          throw new Error('Erro ao converter usuário para admin');
        }

      } else {
        // User doesn't exist in database, create as admin
        const adminData = {
          id: userId,
          name,
          email,
          whatsapp: whatsapp, // Using 'whatsapp' column for users table
          is_admin: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { error: insertError } = await supabase
          .from('users')
          .upsert(adminData, {
            onConflict: 'id',
            ignoreDuplicates: false
          });

        if (insertError) {

          throw new Error('Erro ao criar usuário admin');
        }

      }

      // Reload data
      await Promise.all([
        loadCurrentUser(),
        loadNumbers(),
        loadDrawResults()
      ]);

    } catch (error) {

      throw error;
    }
  };

  const registerRestaUmUser = async (name: string, email: string, phone: string, password: string): Promise<void> => {
    try {

      // First, create the auth user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: undefined, // Disable email confirmation
          data: {
            name: name,
            phone: phone
          }
        }
      });

      if (signUpError) {

        if (signUpError.message.includes('already registered') ||
          signUpError.message.includes('email-already-in-use') ||
          signUpError.message.includes('User already registered')) {
          throw new Error('Este email já está cadastrado! Faça login em vez de se cadastrar novamente.');
        } else if (signUpError.message.includes('For security purposes, you can only request this after')) {
          const waitTime = signUpError.message.match(/(\d+) seconds?/)?.[1] || '60';
          throw new Error(`Por medidas de segurança, aguarde ${waitTime} segundos antes de tentar novamente.`);
        } else if (signUpError.message.includes('weak-password') ||
          signUpError.message.includes('Password should be at least')) {
          throw new Error('Senha muito fraca. Use pelo menos 6 caracteres.');
        } else if (signUpError.message.includes('invalid-email') ||
          signUpError.message.includes('Invalid email')) {
          throw new Error('Email inválido');
        } else {
          throw new Error(`Erro na criação da conta: ${signUpError.message}`);
        }
      }

      if (!authData.user) {
        throw new Error('Erro na criação da conta. Tente novamente.');
      }

      const userId = authData.user.id;

      // Store user data in localStorage for later processing
      const userData = {
        id: userId,
        name,
        email,
        phone: phone, // Using 'phone' column for profiles table
        is_admin: false, // Regular user for Resta Um
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      localStorage.setItem('pendingRestaUmData', JSON.stringify(userData));

      // Try to sign in the user immediately after signup

      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (signInError) {

      } else {

        // Try to create user immediately after successful sign in
        try {
          const { data: insertData, error: insertError } = await supabase
            .from('profiles')
            .upsert(userData, {
              onConflict: 'id',
              ignoreDuplicates: false
            })
            .select();

          if (insertError) {

          } else {

            localStorage.removeItem('pendingRestaUmData');
          }
        } catch (error) {

        }
      }

      // Force immediate reload of all data
      await Promise.all([
        loadCurrentUser(),
        loadNumbers(),
        loadDrawResults()
      ]);

      // Try to create user from localStorage if it exists (fallback)
      setTimeout(async () => {
        try {

          const pendingRestaUmData = localStorage.getItem('pendingRestaUmData');

          if (pendingRestaUmData) {

            const userData = JSON.parse(pendingRestaUmData);

            const { data: insertData, error: insertError } = await supabase
              .from('profiles')
              .upsert(userData, {
                onConflict: 'id',
                ignoreDuplicates: false
              })
              .select();

            if (insertError) {

            } else {

              localStorage.removeItem('pendingRestaUmData');
              await loadCurrentUser();
            }
          }
        } catch (error) {

        }
      }, 2000);

    } catch (error) {

      throw error;
    }
  };

  const requestExtraNumbers = async (paymentAmount: number, quantity: number, paymentProofUrl?: string): Promise<boolean> => {

    if (!authUser) {

      return false;
    }

    try {
      // Verificar se o usuário já tem um número grátis
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('free_number')
        .eq('id', authUser.id)
        .single();

      if (userError) {
        console.error('Error fetching user data:', userError);
        return false;
      }

      if (!userData?.free_number) {
        throw new Error('Você precisa escolher um número grátis antes de solicitar números extras!');
      }

      // Buscar o sorteio ativo atual
      const { data: activeRaffle, error: raffleError } = await supabase
        .from('raffles')
        .select('id')
        .eq('is_active', true)
        .limit(1);

      if (raffleError) {
        console.error('Error fetching active raffle:', raffleError);
        return false;
      }

      const raffleId = activeRaffle && activeRaffle.length > 0 ? activeRaffle[0].id : null;

      const { data, error } = await supabase
        .from('extra_number_requests')
        .insert({
          user_id: authUser.id,
          payment_amount: paymentAmount,
          requested_quantity: quantity,
          payment_proof_url: paymentProofUrl,
          status: 'pending',
          raffle_id: raffleId
        })
        .select();

      if (error) {

        throw error;
      }

      setCurrentUserRequest(data?.[0] || null);
      return true;
    } catch (error) {

      return false;
    }
  };

  const getCurrentUserRequest = (): ExtraNumberRequest | null => {
    return currentUserRequest;
  };

  const getAvailableNumbersCount = async (): Promise<number> => {
    try {
      console.log('DataContext - Calculando números disponíveis...');

      // Verificar se há sorteios ativos
      const { data: activeRaffles, error: raffleError } = await supabase
        .from('raffles')
        .select('total_numbers, status')
        .eq('is_active', true)
        .eq('status', 'active')
        .limit(1);

      if (raffleError) {
        console.error('DataContext - Erro ao verificar sorteios ativos:', raffleError);
        return 0;
      }

      // Se não há sorteios ativos, retornar 0
      if (!activeRaffles || activeRaffles.length === 0) {
        console.log('DataContext - Nenhum sorteio ativo encontrado, retornando 0');
        return 0;
      }

      const activeRaffle = activeRaffles[0];
      console.log('DataContext - Sorteio ativo encontrado:', activeRaffle);

      // Consultar diretamente no banco quantos números estão selecionados usando COUNT
      const { count: takenCount, error: numbersError } = await supabase
        .from('numbers')
        .select('*', { count: 'exact', head: true })
        .eq('is_available', false)
        .not('selected_by', 'is', null)
        .lte('number', activeRaffle.total_numbers);

      if (numbersError) {
        console.error('DataContext - Erro ao consultar números selecionados:', numbersError);
        return 0;
      }
      const availableCount = Math.max(0, activeRaffle.total_numbers - (takenCount ?? 0));

      console.log(`DataContext - Números disponíveis: ${availableCount} (Total: ${activeRaffle.total_numbers}, Selecionados: ${takenCount})`);
      return availableCount;
    } catch (error) {
      console.error('DataContext - Erro ao calcular números disponíveis:', error);
      return 0;
    }
  };

  const getTakenNumbersCount = async (): Promise<number> => {
    try {
      console.log('DataContext - Calculando números selecionados...');

      // Verificar se há sorteios ativos
      const { data: activeRaffles, error: raffleError } = await supabase
        .from('raffles')
        .select('id, total_numbers, status')
        .eq('is_active', true)
        .eq('status', 'active')
        .limit(1);

      if (raffleError) {
        console.error('DataContext - Erro ao verificar sorteios ativos:', raffleError);
        return 0;
      }

      // Se não há sorteios ativos, retornar 0
      if (!activeRaffles || activeRaffles.length === 0) {
        console.log('DataContext - Nenhum sorteio ativo encontrado, retornando 0');
        return 0;
      }

      const activeRaffle = activeRaffles[0];
      console.log('DataContext - Sorteio ativo encontrado:', activeRaffle);

      // Consultar diretamente no banco quantos números estão selecionados usando COUNT
      const { count, error: numbersError } = await supabase
        .from('numbers')
        .select('*', { count: 'exact', head: true })
        .eq('is_available', false)
        .not('selected_by', 'is', null)
        .lte('number', activeRaffle.total_numbers);

      if (numbersError) {
        console.error('DataContext - Erro ao consultar números selecionados:', numbersError);
        return 0;
      }
      console.log(`DataContext - Números selecionados encontrados: ${count}`);
      return count ?? 0;
    } catch (error) {
      console.error('DataContext - Erro ao calcular números selecionados:', error);
      return 0;
    }
  };

  const getDrawResults = (): DrawResult[] => {
    return drawResults;
  };

  const resetAllNumbers = async (): Promise<void> => {
    try {
      console.log('Iniciando reset completo do sistema...');

      // Use the optimized RPC function to reset only used numbers
      const { error: resetError } = await supabase
        .rpc('reset_system_safe');

      if (resetError) {
        console.error('Erro no reset:', resetError);
        throw new Error('Erro ao resetar sistema');
      }

      console.log('Reset completo realizado com sucesso!');

      // Reload data
      await loadNumbers();
      await loadCurrentUser();

    } catch (error) {
      console.error('Erro ao resetar números:', error);
      throw error;
    }
  };

  const cleanupOrphanedNumbers = async (): Promise<void> => {
    try {

      // Find numbers that are assigned to users who no longer exist
      const { data: orphanedNumbers, error: orphanError } = await supabase
        .from('numbers')
        .select('number, selected_by')
        .eq('is_available', false)
        .not('selected_by', 'is', null);

      if (orphanError) {

        return;
      }

      if (!orphanedNumbers || orphanedNumbers.length === 0) {

        return;
      }

      // Get all existing user IDs
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id');

      if (usersError) {

        return;
      }

      const existingUserIds = new Set(users?.map(u => u.id) || []);

      // Find numbers assigned to non-existent users
      const numbersToClean = orphanedNumbers.filter(num =>
        num.selected_by && !existingUserIds.has(num.selected_by)
      );

      if (numbersToClean.length === 0) {

        return;
      }

      // Clean up orphaned numbers
      const { error: cleanupError } = await supabase
        .from('numbers')
        .update({
          is_available: true,
          selected_by: null,
          is_free: false,
          assigned_at: null
        })
        .in('number', numbersToClean.map(n => n.number));

      if (cleanupError) {

        throw new Error('Erro ao limpar números órfãos');
      }

      // Numbers will be reloaded by the calling function
      console.log(`DataContext - Limpeza concluída: ${numbersToClean.length} números órfãos liberados`);
    } catch (error) {
      console.error('DataContext - Erro ao limpar números órfãos:', error);
      // Não relançar o erro para não impedir o carregamento dos números
    }
  };

  const getPendingRequestsCount = async (): Promise<number> => {
    try {
      const { data, error } = await supabase
        .from('extra_number_requests')
        .select('id', { count: 'exact' })
        .eq('status', 'pending');

      if (error) {

        return 0;
      }

      return data?.length || 0;
    } catch (error) {

      return 0;
    }
  };

  const selectFreeNumber = async (selectedNumber: number): Promise<boolean> => {
    // Get current authenticated user directly from Supabase
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user || !user.id) {
      console.error('No authenticated user for number selection');
      return false;
    }

    try {
      // Check if number is still available
      const { data: numberData, error: numberCheckError } = await supabase
        .from('numbers')
        .select('*')
        .eq('number', selectedNumber)
        .single();

      if (numberCheckError) {
        console.error('Error checking number availability:', numberCheckError);
        return false;
      }

      if (!numberData.is_available) {
        console.error('Number is not available');
        return false;
      }

      // Reserve the number
      const { data: numberUpdateData, error: numberError } = await supabase
        .from('numbers')
        .update({
          is_available: false,
          selected_by: user.id,
          is_free: true,
          assigned_at: new Date().toISOString()
        })
        .eq('number', selectedNumber)
        .select();

      if (numberError) {
        console.error('Error reserving number:', numberError);
        return false;
      }

      // Update user's free_number in the database
      const { error: userUpdateError } = await supabase
        .from('users')
        .update({ free_number: selectedNumber })
        .eq('id', user.id);

      if (userUpdateError) {
        console.error('Error updating user free_number:', userUpdateError);
        // Don't return false here, as the number is already reserved
      }

      // Reload user data to update the UI
      await loadCurrentUser();
      await loadNumbers();

      return true;
    } catch (error) {
      console.error('Error in selectFreeNumber:', error);
      return false;
    }
  };

  const joinFreeRaffle = async (raffleId: string): Promise<{ success: boolean; message: string }> => {
    // Obter o usuário autenticado diretamente do Supabase
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, message: 'Usuário não autenticado' };
    }

    // Buscar dados do usuário no banco
    const { data: userData, error: userDataError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (userDataError || !userData) {
      return { success: false, message: 'Dados do usuário não encontrados' };
    }

    try {
      // Verificar se o sorteio existe e está ativo
      const { data: raffle, error: raffleError } = await supabase
        .from('raffles')
        .select('*')
        .eq('id', raffleId)
        .eq('is_active', true)
        .single();

      if (raffleError || !raffle) {
        return { success: false, message: 'Sorteio não encontrado ou inativo' };
      }

      // Verificar se o sorteio está dentro do período válido
      const now = new Date();
      const startDate = new Date(raffle.start_date);
      const endDate = new Date(raffle.end_date);

      if (now < startDate) {
        return { success: false, message: 'Este sorteio ainda não começou' };
      }

      if (now > endDate) {
        return { success: false, message: 'Este sorteio já terminou' };
      }

      // Verificar se o usuário já está participando deste sorteio
      const { data: existingParticipation, error: participationError } = await supabase
        .from('free_raffle_participants')
        .select('id')
        .eq('raffle_id', raffleId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (participationError) {
        console.error('Error checking participation:', participationError);
        return { success: false, message: 'Erro ao verificar participação' };
      }

      if (existingParticipation) {
        return { success: false, message: 'Você já está participando deste sorteio!' };
      }

      // Verificar se ainda há vagas disponíveis
      const { data: participantsCount, error: countError } = await supabase
        .from('free_raffle_participants')
        .select('id', { count: 'exact' })
        .eq('raffle_id', raffleId);

      if (countError) {
        console.error('Error counting participants:', countError);
        return { success: false, message: 'Erro ao verificar vagas disponíveis' };
      }

      const currentParticipants = participantsCount?.length || 0;
      if (currentParticipants >= raffle.max_participants) {
        return { success: false, message: 'Este sorteio já atingiu o número máximo de participantes' };
      }

      // Adicionar o usuário como participante
      const { error: insertError } = await supabase
        .from('free_raffle_participants')
        .insert({
          raffle_id: raffleId,
          user_id: user.id,
          user_name: userData.name,
          user_email: userData.email,
          user_whatsapp: userData.whatsapp,
          joined_at: new Date().toISOString()
        });

      if (insertError) {
        console.error('Error joining raffle:', insertError);
        return { success: false, message: 'Erro ao participar do sorteio. Tente novamente.' };
      }

      return { success: true, message: 'Participação confirmada com sucesso!' };

    } catch (error) {
      console.error('Error in joinFreeRaffle:', error);
      return { success: false, message: 'Erro inesperado. Tente novamente.' };
    }
  };

  // Função para notificar todos os usuários sobre novo sorteio
  const notifyAllUsersAboutNewRaffle = async (raffleData: {
    title: string;
    prize: string;
    startDate: string;
    endDate: string;
  }) => {
    try {

      // Buscar todos os usuários
      const { data: users, error } = await supabase
        .from('users')
        .select('id, name, whatsapp, email')
        .not('whatsapp', 'is', null);

      if (error) {

        return { success: false, error: error.message };
      }

      if (!users || users.length === 0) {

        return { success: true, notified: 0 };
      }

      // Notificações desabilitadas - Vonage service removido
      const notifications = [];
      for (const user of users) {
        try {
          console.log('Notificação em massa desabilitada para:', user.name, user.whatsapp);
          const result = { success: true, message: 'Notificação desabilitada' };
          notifications.push({ user: user.name, success: true, result });
        } catch (error) {
          notifications.push({ user: user.name, success: false, error });
        }
      }

      const result = {
        success: notifications.filter(n => n.success).length > 0,
        total: users.length,
        successful: notifications.filter(n => n.success).length,
        failed: notifications.filter(n => !n.success).length,
        notifications
      };

      return {
        success: true,
        notified: result.success,
        total: users.length,
        results: result.notifications.filter(n => !n.success).map(n => n.error)
      };
    } catch (error) {

      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  };

  // Função para notificar sobre números extras aprovados
  const notifyExtraNumbersApproved = async (requestId: string) => {
    try {
      // Buscar dados da solicitação e usuário
      const { data: requestData, error } = await supabase
        .from('extra_number_requests')
        .select(`
          *,
          users:user_id (
            id, name, whatsapp, email
          )
        `)
        .eq('id', requestId)
        .single();

      if (error || !requestData) {

        return { success: false, error: 'Request not found' };
      }

      const user = requestData.users;
      if (!user) {

        return { success: false, error: 'User not found' };
      }

      // Enviar notificação
      await sendWhatsAppNotification('extra_numbers_approved', {
        id: user.id,
        name: user.name,
        whatsapp: user.whatsapp // Using correct 'whatsapp' field from database
      }, {
        numbers: requestData.assigned_numbers || [],
        amount: requestData.payment_amount
      });

      return { success: true };
    } catch (error) {

      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  };

  // Função para envio em massa de notificações via Vonage
  const sendBulkNotification = async (users: Array<{
    [x: string]: string; whatsapp: string; name: string
  }>, type: string, data: any) => {
    try {

      const notifications = [];
      for (const user of users) {
        try {
          // Notificações desabilitadas - Vonage service removido
          console.log('Notificação desabilitada para:', user.name, user.phone, type);
          const result = { success: true, message: 'Notificação desabilitada' };
          notifications.push({ user: user.name, success: true, result });
        } catch (error) {
          notifications.push({ user: user.name, success: false, error });
        }
      }

      const result = {
        success: notifications.filter(n => n.success).length,
        failed: notifications.filter(n => !n.success).length,
        notifications
      };

      return result;
    } catch (error) {

      return { success: 0, failed: users.length, errors: [error instanceof Error ? error.message : 'Unknown error'] };
    }
  };

  const getUserRequestsHistory = async (): Promise<ExtraNumberRequest[]> => {
    if (!authUser || !authUser.id) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('extra_number_requests')
        .select(`
          *,
          raffle:raffle_id (
            id,
            title,
            description,
            prize,
            status
          )
        `)
        .eq('user_id', authUser.id)
        .order('created_at', { ascending: false });

      if (error) {

        return [];
      }

      // Filtrar solicitações cujos sorteios foram finalizados ou excluídos
      const filteredData = data?.filter(request => {
        // Se não há sorteio associado, manter a solicitação
        if (!request.raffle_id || !request.raffle) {
          return true;
        }

        // Se o sorteio existe e está ativo, manter a solicitação
        return request.raffle.status === 'active';
      }) || [];

      return filteredData;
    } catch (error) {

      return [];
    }
  };

  return (
    <DataContext.Provider value={{
      currentUser,
      numbers,
      registerUser,
      registerAdmin,
      convertToAdmin,
      registerRestaUmUser,
      selectFreeNumber,
      joinFreeRaffle,
      requestExtraNumbers,
      getCurrentUserRequest,
      getUserRequestsHistory,
      getAvailableNumbersCount,
      getTakenNumbersCount,
      loadNumbers,
      getDrawResults,
      resetAllNumbers,
      cleanupOrphanedNumbers,
      getPendingRequestsCount,
      notifyAllUsersAboutNewRaffle: notifyAllUsersAboutNewRaffle as (raffleData: {
        title: string;
        prize: string;
        startDate: string;
        endDate: string;
      }) => Promise<{
        success: boolean;
        error?: string;
        notified?: number;
        total?: number;
        results?: any[];
      }>,
      notifyExtraNumbersApproved,
      sendBulkNotification,
      reloadUserData,
      clearUserData,
      loading,
      numbersLoading,
      raffles,
      loadRaffles
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}