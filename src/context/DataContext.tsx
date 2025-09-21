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
    console.log('🚀 loadCurrentUser called with authUser:', authUser);
    if (!authUser || !authUser.id) {
      console.log('❌ No authUser or authUser.id, setting currentUser to null');
      setCurrentUser(null);
      setLoading(false);
      return;
    }
    
    try {
      console.log('🔍 Loading current user data for:', authUser.id);
      setLoading(true);
      
      // First try to load from users table (main system)
      let { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .limit(1);
      
      // If not found in users, try profiles table (Resta Um)
      if (!data || data.length === 0) {
        console.log('User not found in users table, checking profiles table...');
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .limit(1);
        
        if (profileData && profileData.length > 0) {
          console.log('User found in profiles table (Resta Um)');
          data = profileData;
          error = profileError;
        }
      }
      
      // If we have data, set the current user
      if (data && data.length > 0) {
        console.log('✅ User found, setting current user:', data[0]);
        setCurrentUser(data[0]);
        setLoading(false);
        return;
      }
        
      // Only check for pending data if we don't have user data and there's an error
      if (error) {
        console.error('Error loading user:', error);
        
        // If user doesn't exist, check if we have pending data in localStorage
        const pendingUserData = localStorage.getItem('pendingUserData');
        if (pendingUserData) {
          console.log('Found pending user data, creating user...');
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
            console.error('Error creating user from pending data:', insertError);
            setCurrentUser(null);
          } else {
            console.log('User created from pending data:', insertData);
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
      console.error('Unexpected error in loadCurrentUser:', error);
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  }, [authUser?.id]); // Only depend on authUser.id

  // Função para enviar notificação WhatsApp via Vonage
  const sendWhatsAppNotification = async (type: string, userData: any, _additionalData?: any) => {
    try {
      console.log(`🚀 Enviando notificação ${type} via Vonage para ${userData.whatsapp}`);
      
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
      
      console.log(`✅ Notificação ${type} enviada com sucesso via Vonage:`, result);
      
      // Log da notificação no banco
      await supabase.from('notification_logs').insert({
        user_id: userData.id,
        type: type,
        phone_number: userData.whatsapp,
        message_sid: result.message_uuid,
        status: 'sent'
      });
      
    } catch (error) {
      console.error(`❌ Erro ao enviar notificação ${type} via Vonage:`, error);
      
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
        console.error('Error logging notification error:', logError);
      }
    }
  };

  // Load user data when auth user changes
  useEffect(() => {
    console.log('🔄 DataContext - authUser changed:', authUser);
    if (authUser && authUser.id) {
      console.log('🔄 DataContext - loading current user for ID:', authUser.id);
      loadCurrentUser();
      // Load user request after a delay to ensure user is fully loaded
      const timeoutId = setTimeout(() => {
        loadCurrentUserRequest();
      }, 1000);
      
      return () => clearTimeout(timeoutId);
    } else {
      console.log('🔄 DataContext - no auth user, clearing current user');
      setCurrentUser(null);
      setCurrentUserRequest(null);
    }
  }, [authUser?.id]); // Only depend on authUser.id to avoid infinite loops

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
        console.log('Numbers updated, reloading...');
        loadNumbers();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
        console.log('Users updated, reloading current user...');
        if (authUser) {
          loadCurrentUser();
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        console.log('Profiles updated (Resta Um), reloading current user...');
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
      console.log('Loading numbers from Supabase...');
      
      // First, clean up orphaned numbers before loading
      await cleanupOrphanedNumbers();
      
      const { data, error } = await supabase
        .from('numbers')
        .select('*')
        .order('number');
        
      if (error) {
        console.error('Supabase error loading numbers:', error);
        throw error;
      }
      
      console.log('Numbers loaded successfully:', data?.length || 0);
      console.log('Sample numbers:', data?.slice(0, 5));
      setNumbers(data || []);
    } catch (error) {
      console.error('Error loading numbers:', error);
      
      // Set empty array as fallback
      setNumbers([]);
      
      // Show user-friendly error message
      if (error instanceof Error && error.message.includes('fetch')) {
        console.error('Network error - check Supabase configuration');
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
      console.error('Error loading draw results:', error);
    }
  };

  const loadCurrentUserRequest = async () => {
    if (!authUser || !authUser.id) {
      setCurrentUserRequest(null);
      return;
    }
    
    // Skip authentication check if user is not authenticated
    if (!authUser) {
      console.log('No authenticated user, skipping request load');
      setCurrentUserRequest(null);
      return;
    }
    
    try {
      console.log('Loading user request for user:', authUser.id);
      const { data, error } = await supabase
        .from('extra_number_requests')
        .select('*')
        .eq('user_id', authUser.id)
        .eq('status', 'pending')
        .limit(1);
        
      if (error) {
        console.error('Error loading user request:', error);
        // Handle different types of errors gracefully
        if (error.code === 'PGRST116' || error.code === '42501') {
          console.log('Permission denied for extra_number_requests, this is expected for new users');
          setCurrentUserRequest(null);
          return;
        }
        setCurrentUserRequest(null);
        return;
      }
      
      setCurrentUserRequest(data?.[0] || null);
    } catch (error) {
      console.error('Error loading user request:', error);
      setCurrentUserRequest(null);
    }
  };

  // Force reload user data
  const reloadUserData = useCallback(async () => {
    console.log('🔄 Force reloading user data...');
    if (authUser?.id) {
      await loadCurrentUser();
      await loadCurrentUserRequest();
    }
  }, [authUser?.id, loadCurrentUser]);

  const registerUser = async (name: string, email: string, whatsapp: string, password: string, selectedNumber: number): Promise<void> => {
    try {
      console.log('Starting registration process...');
      
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
          emailRedirectTo: undefined, // Disable email confirmation
          data: {
            name: name,
            whatsapp: whatsapp
          }
        }
      });

      if (signUpError) {
        console.error('SignUp error:', signUpError);
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
      console.log('Auth user created:', userId);
      
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
      console.log('User data stored in localStorage for later processing');
      
      // Try to sign in the user immediately after signup
      console.log('Attempting to sign in user after signup...');
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (signInError) {
        console.log('Sign in failed:', signInError.message);
        console.log('Sign in error details:', signInError);
        console.log('User data will be processed on next login');
      } else {
        console.log('User signed in successfully:', signInData.user?.id);
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
            console.error('User creation after sign in failed:', insertError);
            console.log('User data will be processed later');
          } else {
            console.log('User created successfully after sign in:', insertData);
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
          console.error('Error creating user after sign in:', error);
          console.log('User data will be processed later');
        }
      }
      
      // Now reserve the number
      console.log('Reserving number:', selectedNumber, 'for user:', userId);
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
        console.error('Number reservation error:', numberError);
        throw new Error('Erro ao reservar o número. Tente novamente.');
      }
      
      console.log('Number reservation result:', numberUpdateData);
      
      // Update user's free_number in the database
      const { error: userUpdateError } = await supabase
        .from('users')
        .update({ free_number: selectedNumber })
        .eq('id', userId);
        
      if (userUpdateError) {
        console.error('Error updating user free_number:', userUpdateError);
        // Don't throw error here, as the number is already reserved
      } else {
        console.log('User free_number updated successfully');
      }
      
      // Enviar notificação WhatsApp com o número atribuído
      await sendWhatsAppNotification('numbers_assigned', {
        id: userId,
        name: name,
        whatsapp: whatsapp
      }, {
        numbers: [selectedNumber]
      });
      
      console.log('Registration completed successfully');
      
      // Force immediate reload of all data
      await Promise.all([
        loadCurrentUser(),
        loadNumbers(),
        loadDrawResults()
      ]);
      
      // Try to create user from localStorage if it exists (fallback)
      setTimeout(async () => {
        try {
          console.log('=== CHECKING FOR PENDING USER DATA ===');
          const pendingUserData = localStorage.getItem('pendingUserData');
          
          if (pendingUserData) {
            console.log('Found pending user data, attempting creation...');
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
              console.error('=== FALLBACK USER CREATION ERROR ===');
              console.error('Error details:', insertError);
            } else {
              console.log('=== FALLBACK USER CREATION SUCCESS ===');
              console.log('User created successfully:', insertData);
              localStorage.removeItem('pendingUserData');
              await loadCurrentUser();
            }
          } else {
            console.log('No pending user data found');
          }
        } catch (error) {
          console.error('=== FALLBACK ERROR ===');
          console.error('Error:', error);
        }
      }, 5000);
      
      // Note: Page refresh removed to allow error inspection
      // The user will need to manually refresh if needed
      
    } catch (error) {
      console.error('Error registering user:', error);
      throw error;
    }
  };

  const registerAdmin = async (name: string, email: string, whatsapp: string, password: string): Promise<void> => {
    try {
      console.log('Starting admin registration process...');
      
      // First, create the auth user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: undefined, // Disable email confirmation
          data: {
            name: name,
            whatsapp: whatsapp
          }
        }
      });

      if (signUpError) {
        console.error('SignUp error:', signUpError);
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
      console.log('Auth user created for admin:', userId);
      
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
      console.log('Admin data stored in localStorage for later processing');
      
      // Try to sign in the admin immediately after signup
      console.log('Attempting to sign in admin after signup...');
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (signInError) {
        console.log('Admin sign in failed:', signInError.message);
        console.log('Admin data will be processed on next login');
      } else {
        console.log('Admin signed in successfully:', signInData.user?.id);
        // Try to create admin immediately after successful sign in
        try {
          console.log('Attempting to create admin profile with data:', adminData);
          
          const { data: insertData, error: insertError } = await supabase
            .from('users')
            .upsert(adminData, { 
              onConflict: 'id',
              ignoreDuplicates: false 
            })
            .select();
            
          if (insertError) {
            console.error('Admin creation after sign in failed:', insertError);
            console.error('Error details:', {
              message: insertError.message,
              code: insertError.code,
              details: insertError.details,
              hint: insertError.hint
            });
            console.log('Admin data will be processed later');
          } else {
            console.log('Admin created successfully after sign in:', insertData);
            localStorage.removeItem('pendingAdminData');
          }
        } catch (error) {
          console.error('Error creating admin after sign in:', error);
          console.log('Admin data will be processed later');
        }
      }
      
      console.log('Admin registration completed successfully');
      
      // Force immediate reload of all data
      await Promise.all([
        loadCurrentUser(),
        loadNumbers(),
        loadDrawResults()
      ]);
      
      // Try to create admin from localStorage if it exists (fallback)
      setTimeout(async () => {
        try {
          console.log('=== CHECKING FOR PENDING ADMIN DATA ===');
          const pendingAdminData = localStorage.getItem('pendingAdminData');
          
          if (pendingAdminData) {
            console.log('Found pending admin data, attempting to create admin...');
            const adminData = JSON.parse(pendingAdminData);
            
            console.log('Fallback: Attempting to create admin profile with data:', adminData);
            
            const { data: insertData, error: insertError } = await supabase
              .from('users')
              .upsert(adminData, { 
                onConflict: 'id',
                ignoreDuplicates: false 
              })
              .select();
              
            if (insertError) {
              console.error('Fallback admin creation failed:', insertError);
              console.error('Fallback error details:', {
                message: insertError.message,
                code: insertError.code,
                details: insertError.details,
                hint: insertError.hint
              });
            } else {
              console.log('Fallback admin creation successful:', insertData);
              localStorage.removeItem('pendingAdminData');
              // Reload user data
              await loadCurrentUser();
            }
          }
        } catch (error) {
          console.error('Error in fallback admin creation:', error);
        }
      }, 2000);
      
    } catch (error) {
      console.error('Error in registerAdmin:', error);
      throw error;
    }
  };

  const convertToAdmin = async (name: string, email: string, whatsapp: string, password: string): Promise<void> => {
    try {
      console.log('Converting existing user to admin...');
      
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
      console.log('User signed in successfully, converting to admin:', userId);
      
      // Check if user already exists in database
      const { data: existingUser, error: userCheckError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .limit(1);
      
      if (userCheckError) {
        console.error('Error checking existing user:', userCheckError);
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
          console.error('Error updating user to admin:', updateError);
          throw new Error('Erro ao converter usuário para admin');
        }
        
        console.log('User successfully converted to admin');
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
          console.error('Error creating admin user:', insertError);
          throw new Error('Erro ao criar usuário admin');
        }
        
        console.log('Admin user created successfully');
      }
      
      // Reload data
      await Promise.all([
        loadCurrentUser(),
        loadNumbers(),
        loadDrawResults()
      ]);
      
    } catch (error) {
      console.error('Error in convertToAdmin:', error);
      throw error;
    }
  };

  const registerRestaUmUser = async (name: string, email: string, phone: string, password: string): Promise<void> => {
    try {
      console.log('Starting Resta Um user registration process...');
      
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
        console.error('SignUp error:', signUpError);
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
      console.log('Auth user created for Resta Um:', userId);
      
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
      console.log('Resta Um user data stored in localStorage for later processing');
      
      // Try to sign in the user immediately after signup
      console.log('Attempting to sign in Resta Um user after signup...');
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (signInError) {
        console.log('Resta Um sign in failed:', signInError.message);
        console.log('Resta Um user data will be processed on next login');
      } else {
        console.log('Resta Um user signed in successfully:', signInData.user?.id);
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
            console.error('Resta Um user creation after sign in failed:', insertError);
            console.log('Resta Um user data will be processed later');
          } else {
            console.log('Resta Um user created successfully after sign in:', insertData);
            localStorage.removeItem('pendingRestaUmData');
          }
        } catch (error) {
          console.error('Error creating Resta Um user after sign in:', error);
          console.log('Resta Um user data will be processed later');
        }
      }
      
      console.log('Resta Um user registration completed successfully');
      
      // Force immediate reload of all data
      await Promise.all([
        loadCurrentUser(),
        loadNumbers(),
        loadDrawResults()
      ]);
      
      // Try to create user from localStorage if it exists (fallback)
      setTimeout(async () => {
        try {
          console.log('=== CHECKING FOR PENDING RESTA UM DATA ===');
          const pendingRestaUmData = localStorage.getItem('pendingRestaUmData');
          
          if (pendingRestaUmData) {
            console.log('Found pending Resta Um data, attempting creation...');
            const userData = JSON.parse(pendingRestaUmData);
            
            const { data: insertData, error: insertError } = await supabase
              .from('profiles')
              .upsert(userData, { 
                onConflict: 'id',
                ignoreDuplicates: false 
              })
              .select();
              
            if (insertError) {
              console.error('Fallback Resta Um user creation failed:', insertError);
            } else {
              console.log('Fallback Resta Um user creation successful:', insertData);
              localStorage.removeItem('pendingRestaUmData');
              await loadCurrentUser();
            }
          }
        } catch (error) {
          console.error('Error in fallback Resta Um user creation:', error);
        }
      }, 2000);
      
    } catch (error) {
      console.error('Error in registerRestaUmUser:', error);
      throw error;
    }
  };

  const requestExtraNumbers = async (paymentAmount: number, quantity: number, paymentProofUrl?: string): Promise<boolean> => {
    console.log('requestExtraNumbers called with:', { authUser, currentUser, paymentAmount, quantity, paymentProofUrl });
    if (!authUser) {
      console.log('Missing authUser:', { authUser: !!authUser });
      return false;
    }
    
    try {
      console.log('Inserting extra number request...');
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
        console.error('Supabase error:', error);
        throw error;
      }
      
      console.log('Extra number request inserted successfully:', data);
      setCurrentUserRequest(data?.[0] || null);
      return true;
    } catch (error) {
      console.error('Error requesting extra numbers:', error);
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
      console.log('Resetting all numbers...');
      const { error } = await supabase
        .from('numbers')
        .update({
          is_available: true,
          selected_by: null,
          is_free: false,
          assigned_at: null
        })
        .neq('number', 0); // Update all numbers
      
      if (error) {
        console.error('Error resetting numbers:', error);
        throw new Error('Erro ao resetar números');
      }
      
      console.log('All numbers reset successfully');
      // Reload numbers to update the UI
      await loadNumbers();
    } catch (error) {
      console.error('Error in resetAllNumbers:', error);
      throw error;
    }
  };

  const cleanupOrphanedNumbers = async (): Promise<void> => {
    try {
      console.log('Cleaning up orphaned numbers...');
      
      // Find numbers that are assigned to users who no longer exist
      const { data: orphanedNumbers, error: orphanError } = await supabase
        .from('numbers')
        .select('number, selected_by')
        .eq('is_available', false)
        .not('selected_by', 'is', null);
      
      if (orphanError) {
        console.error('Error finding orphaned numbers:', orphanError);
        return;
      }
      
      if (!orphanedNumbers || orphanedNumbers.length === 0) {
        console.log('No orphaned numbers found');
        return;
      }
      
      // Get all existing user IDs
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id');
      
      if (usersError) {
        console.error('Error fetching users:', usersError);
        return;
      }
      
      const existingUserIds = new Set(users?.map(u => u.id) || []);
      
      // Find numbers assigned to non-existent users
      const numbersToClean = orphanedNumbers.filter(num => 
        num.selected_by && !existingUserIds.has(num.selected_by)
      );
      
      if (numbersToClean.length === 0) {
        console.log('No numbers need cleaning');
        return;
      }
      
      console.log(`Found ${numbersToClean.length} orphaned numbers to clean:`, numbersToClean.map(n => n.number));
      
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
        console.error('Error cleaning up orphaned numbers:', cleanupError);
        throw new Error('Erro ao limpar números órfãos');
      }
      
      console.log(`Successfully cleaned up ${numbersToClean.length} orphaned numbers`);
      
      // Reload numbers to update the UI
      await loadNumbers();
    } catch (error) {
      console.error('Error in cleanupOrphanedNumbers:', error);
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
        console.error('Error loading pending requests count:', error);
        return 0;
      }
      
      return data?.length || 0;
    } catch (error) {
      console.error('Error in getPendingRequestsCount:', error);
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
      console.log('Notifying all users about new raffle:', raffleData);
      
      // Buscar todos os usuários
      const { data: users, error } = await supabase
        .from('users')
        .select('id, name, whatsapp, email')
        .not('whatsapp', 'is', null);
      
      if (error) {
        console.error('Error fetching users for notification:', error);
        return { success: false, error: error.message };
      }
      
      if (!users || users.length === 0) {
        console.log('No users found to notify');
        return { success: true, notified: 0 };
      }
      
      console.log(`Found ${users.length} users to notify`);
      
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

      console.log(`Notified ${result.success}/${users.length} users successfully`);
      
      return { 
        success: true, 
        notified: result.success, 
        total: users.length, 
        results: result.notifications.filter(n => !n.success).map(n => n.error)
      };
    } catch (error) {
      console.error('Error in notifyAllUsersAboutNewRaffle:', error);
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
        console.error('Error fetching request data:', error);
        return { success: false, error: 'Request not found' };
      }
      
      const user = requestData.users;
      if (!user) {
        console.error('User not found for request');
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
      console.error('Error in notifyExtraNumbersApproved:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  };

  // Função para envio em massa de notificações via Vonage
  const sendBulkNotification = async (users: Array<{
    [x: string]: string;whatsapp: string; name: string
}>, type: string, data: any) => {
    try {
      console.log('Sending bulk notification via Vonage:', { users: users.length, type, data });
      
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
      
      console.log('Bulk notification result via Vonage:', result);
      return result;
    } catch (error) {
      console.error('Error in sendBulkNotification via Vonage:', error);
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
        console.error('Error loading user requests history:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Error in getUserRequestsHistory:', error);
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