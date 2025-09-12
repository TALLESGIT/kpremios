import { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { User, RaffleNumber, ExtraNumberRequest, DrawResult } from '../types';

interface DataContextType {
  // User data
  currentUser: User | null;
  
  // Numbers data
  numbers: RaffleNumber[];
  
  // User actions
  registerUser: (name: string, email: string, whatsapp: string, password: string, selectedNumber: number) => Promise<void>;
  registerAdmin: (name: string, email: string, whatsapp: string, password: string) => Promise<void>;
  convertToAdmin: (name: string, email: string, whatsapp: string, password: string) => Promise<void>;
  
  // Extra numbers
  requestExtraNumbers: (paymentAmount: number, quantity: number, paymentProofUrl?: string) => Promise<boolean>;
  getCurrentUserRequest: () => ExtraNumberRequest | null;
  
  // Numbers info
  getAvailableNumbersCount: () => number;
  getTakenNumbersCount: () => number;
  
  // Admin functions
  resetAllNumbers: () => Promise<void>;
  cleanupOrphanedNumbers: () => Promise<void>;
  getPendingRequestsCount: () => Promise<number>;
  
  // Winners
  getDrawResults: () => DrawResult[];
  
  // Loading states
  loading: boolean;
  numbersLoading: boolean;
  
  // Auth management
  setAuthUser: (user: any) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [numbers, setNumbers] = useState<RaffleNumber[]>([]);
  const [drawResults, setDrawResults] = useState<DrawResult[]>([]);
  const [currentUserRequest, setCurrentUserRequest] = useState<ExtraNumberRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [numbersLoading, setNumbersLoading] = useState(true);
  const [authUser, setAuthUser] = useState<any>(null);

  // Load user data when auth user changes
  useEffect(() => {
    console.log('DataContext - authUser changed:', authUser);
    if (authUser && authUser.id) {
      console.log('DataContext - loading current user for ID:', authUser.id);
      loadCurrentUser();
      // Only load user request after a longer delay to ensure user is fully authenticated
      setTimeout(() => {
        loadCurrentUserRequest();
      }, 3000);
    } else {
      console.log('DataContext - no auth user, clearing current user');
      setCurrentUser(null);
      setCurrentUserRequest(null);
    }
  }, [authUser]);

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
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);
  const loadCurrentUser = async () => {
    console.log('loadCurrentUser called with authUser:', authUser);
    if (!authUser || !authUser.id) {
      console.log('No authUser or authUser.id, setting currentUser to null');
      setCurrentUser(null);
      setLoading(false);
      return;
    }
    
    try {
      console.log('Loading current user data for:', authUser.id);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .limit(1);
        
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
      
      console.log('User data loaded:', data);
      const userData = data?.[0] || null;
      console.log('Setting currentUser to:', userData);
      setCurrentUser(userData);
      
      // Force a re-render of NumberSelection by updating the dependency
      if (userData) {
        console.log('Current user set successfully, should trigger NumberSelection update');
      }
    } catch (error) {
      console.error('Error loading user:', error);
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  };

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
    
    // Check if user is still authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== authUser.id) {
      console.log('User no longer authenticated, skipping request load');
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

  const registerUser = async (name: string, email: string, whatsapp: string, password: string, selectedNumber: number): Promise<void> => {
    try {
      console.log('Starting registration process...');
      
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
          throw new Error('Este email já está cadastrado');
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
        whatsapp,
        free_number: selectedNumber,
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
      
      console.log('Registration completed successfully');
      
      // Set the auth user to trigger data loading
      setAuthUser(authData.user);
      
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
          throw new Error('Este email já está cadastrado');
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
        whatsapp,
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
          const { data: insertData, error: insertError } = await supabase
            .from('users')
            .upsert(adminData, { 
              onConflict: 'id',
              ignoreDuplicates: false 
            })
            .select();
            
          if (insertError) {
            console.error('Admin creation after sign in failed:', insertError);
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
      
      // Set the auth user to trigger data loading
      setAuthUser(authData.user);
      
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
            
            const { data: insertData, error: insertError } = await supabase
              .from('users')
              .upsert(adminData, { 
                onConflict: 'id',
                ignoreDuplicates: false 
              })
              .select();
              
            if (insertError) {
              console.error('Fallback admin creation failed:', insertError);
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
            whatsapp: whatsapp,
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
          whatsapp,
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
      
      // Set the auth user and reload data
      setAuthUser(signInData.user);
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

  const requestExtraNumbers = async (paymentAmount: number, quantity: number, paymentProofUrl?: string): Promise<boolean> => {
    if (!authUser || !currentUser) return false;
    
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
        
      if (error) throw error;
      
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

  return (
    <DataContext.Provider value={{
      currentUser,
      numbers,
      registerUser,
      registerAdmin,
      convertToAdmin,
      requestExtraNumbers,
      getCurrentUserRequest,
      getAvailableNumbersCount,
      getTakenNumbersCount,
      getDrawResults,
      resetAllNumbers,
      cleanupOrphanedNumbers,
      getPendingRequestsCount,
      loading,
      numbersLoading,
      setAuthUser
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