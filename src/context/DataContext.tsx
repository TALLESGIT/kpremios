import { createContext, useContext, ReactNode, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { User, RaffleNumber, ExtraNumberRequest, DrawResult } from '../types';
import { vonageWhatsAppService } from '../services/vonageService';

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
  
  // Extra numbers
  requestExtraNumbers: (paymentAmount: number, quantity: number, paymentProofUrl?: string) => Promise<boolean>;
  getCurrentUserRequest: () => ExtraNumberRequest | null;
  getUserRequestsHistory: () => Promise<ExtraNumberRequest[]>;
  
  // Numbers info
  getAvailableNumbersCount: () => number;
  getTakenNumbersCount: () => number;
  
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
  sendBulkNotification: (users: Array<{whatsapp: string; name: string}>, type: string, data: any) => Promise<any>;
  
  // Winners
  getDrawResults: () => DrawResult[];
  
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
      
      // If we have data, set the current user
      if (data && data.length > 0) {
        setCurrentUser(data[0]);
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

      let result;
      
      switch (type) {
        case 'registration':
          result = await vonageWhatsAppService.sendRegistrationConfirmation({
            name: userData.name,
            whatsapp: userData.whatsapp,
            confirmationCode: userData.confirmationCode || generateConfirmationCode()
          });
          break;
          
        case 'numbers_assigned':
          result = await vonageWhatsAppService.sendNumbersAssigned({
            name: userData.name,
            whatsapp: userData.whatsapp,
            numbers: userData.numbers || []
          });
          break;
          
        case 'extra_numbers_approved':
          result = await vonageWhatsAppService.sendExtraNumbersApproved({
            name: userData.name,
            whatsapp: userData.whatsapp,
            extraNumbers: userData.extraNumbers || []
          });
          break;
          
        case 'new_raffle':
          result = await vonageWhatsAppService.sendNewRaffleNotification({
            name: userData.name,
            whatsapp: userData.whatsapp,
            raffleName: userData.raffleName || 'Novo Sorteio',
            appUrl: userData.appUrl || import.meta.env.VITE_APP_URL || 'http://localhost:5173'
          });
          break;
          
        case 'winner_announcement':
          result = await vonageWhatsAppService.sendWinnerAnnouncement({
            name: userData.name,
            whatsapp: userData.whatsapp,
            raffleName: userData.raffleName || 'Sorteio',
            prize: userData.prize || 'Prêmio'
          });
          break;
          
        default:
          // Fallback para mensagem simples
          result = await vonageWhatsAppService.sendMessage({
            to: userData.whatsapp,
            message: userData.message || `Notificação do ZK Premios: ${type}`
          });
      }

      // Log da notificação no banco
      await supabase.from('notification_logs').insert({
        user_id: userData.id,
        type: type,
        phone_number: userData.whatsapp,
        message_sid: result.message_uuid,
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
  }, [authUser?.id, loadCurrentUser]); // Include loadCurrentUser in dependencies

  // Load user requests when currentUser changes
  useEffect(() => {
    if (currentUser && !currentUser.is_admin) {
      loadCurrentUserRequest();
    } else {
      setCurrentUserRequest(null);
    }
  }, [currentUser?.is_admin]);

  // Load numbers and draw results
  useEffect(() => {
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
    setNumbersLoading(true);
    try {

      // First, clean up orphaned numbers before loading
      await cleanupOrphanedNumbers();
      
      const { data, error } = await supabase
        .from('numbers')
        .select('*')
        .order('number');
        
      if (error) {

        throw error;
      }

      setNumbers(data || []);
    } catch (error) {

      // Set empty array as fallback
      setNumbers([]);
      
      // Show user-friendly error message
      if (error instanceof Error && error.message.includes('fetch')) {

      }
    } finally {
      setNumbersLoading(false);
    }
  };

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
          }
        } catch (error) {

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

      const { data, error } = await supabase
        .from('extra_number_requests')
        .insert({
          user_id: authUser.id,
          payment_amount: paymentAmount,
          requested_quantity: quantity,
          payment_proof_url: paymentProofUrl,
          status: 'pending'
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

  const getAvailableNumbersCount = (): number => {
    return numbers.filter(n => n.is_available).length;
  };

  const getTakenNumbersCount = (): number => {
    return numbers.filter(n => !n.is_available).length;
  };

  const getDrawResults = (): DrawResult[] => {
    return drawResults;
  };

  const resetAllNumbers = async (): Promise<void> => {
    try {
      // 1. Reset all numbers in the numbers table
      const { error: numbersError } = await supabase
        .from('numbers')
        .update({
          is_available: true,
          selected_by: null,
          is_free: false,
          assigned_at: null
        })
        .neq('number', 0); // Update all numbers
      
      if (numbersError) {
        throw new Error('Erro ao resetar números');
      }

      // 2. Clear all user numbers (free_number and extra_numbers)
      const { error: usersError } = await supabase
        .from('users')
        .update({
          free_number: null,
          extra_numbers: null
        }); // Update all users
      
      if (usersError) {
        throw new Error('Erro ao limpar números dos usuários');
      }

      // 3. Clear all extra number requests
      const { error: requestsError } = await supabase
        .from('extra_number_requests')
        .update({
          status: 'cancelled'
        })
        .eq('status', 'pending');
      
      if (requestsError) {
        // Don't throw error here, as this is not critical
      }

      // Reload numbers to update the UI
      await loadNumbers();
    } catch (error) {
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

      // Reload numbers to update the UI
      await loadNumbers();
    } catch (error) {

      throw error;
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

      // Usar o serviço Vonage para envio em massa
      const notifications = [];
      for (const user of users) {
        try {
          const result = await vonageWhatsAppService.sendNewRaffleNotification({
            name: user.name,
            whatsapp: user.whatsapp, // Using 'whatsapp' field from users table
            raffleName: raffleData.title,
            appUrl: import.meta.env.VITE_APP_URL || 'http://localhost:5173'
          });
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
        whatsapp: user.phone // Using 'phone' field from database
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
    [x: string]: string;whatsapp: string; name: string
}>, type: string, data: any) => {
    try {

      const notifications = [];
      for (const user of users) {
        try {
          let result;
          switch (type) {
            case 'new_raffle':
              result = await vonageWhatsAppService.sendNewRaffleNotification({
                name: user.name,
                whatsapp: user.phone, // Using 'phone' field from database
                raffleName: data.raffleTitle || data.title || 'Novo Sorteio',
                appUrl: import.meta.env.VITE_APP_URL || 'http://localhost:5173'
              });
              break;
            case 'numbers_assigned':
              result = await vonageWhatsAppService.sendNumbersAssigned({
                name: user.name,
                whatsapp: user.phone, // Using 'phone' field from database
                numbers: data.numbers || []
              });
              break;
            case 'extra_numbers_approved':
              result = await vonageWhatsAppService.sendExtraNumbersApproved({
                name: user.name,
                whatsapp: user.phone, // Using 'phone' field from database
                extraNumbers: data.numbers || []
              });
              break;
            default:
              result = await vonageWhatsAppService.sendMessage({
                to: user.phone, // Using 'phone' field from database
                message: `Notificação do ZK Premios: ${type}`
              });
          }
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
        .select('*')
        .eq('user_id', authUser.id)
        .order('created_at', { ascending: false });
        
      if (error) {

        return [];
      }
      
      return data || [];
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
      requestExtraNumbers,
      getCurrentUserRequest,
      getUserRequestsHistory,
      getAvailableNumbersCount,
      getTakenNumbersCount,
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
      numbersLoading
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