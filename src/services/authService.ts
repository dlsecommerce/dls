import { supabase } from "@/integrations/supabase/client";

// Login
export const signIn = async (email: string, password: string) => {
  window.dispatchEvent(new Event("bprogress:start"));

  try {
    return await supabase.auth.signInWithPassword({
      email,
      password,
    });
  } finally {
    window.dispatchEvent(new Event("bprogress:done"));
  }
};

// Cadastro
export const signUp = async (
  email: string,
  password: string,
  username?: string
) => {
  window.dispatchEvent(new Event("bprogress:start"));

  try {
    return await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username },
        emailRedirectTo: `${window.location.origin}/`,
      },
    });
  } finally {
    window.dispatchEvent(new Event("bprogress:done"));
  }
};

// Recuperação de senha
export const resetPassword = async (email: string) => {
  window.dispatchEvent(new Event("bprogress:start"));

  try {
    return await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });
  } finally {
    window.dispatchEvent(new Event("bprogress:done"));
  }
};

// Atualizar senha
export const updatePassword = async (newPassword: string) => {
  window.dispatchEvent(new Event("bprogress:start"));

  try {
    return await supabase.auth.updateUser({
      password: newPassword,
    });
  } finally {
    window.dispatchEvent(new Event("bprogress:done"));
  }
};

// Obter usuário atual a partir da sessão local
export const getCurrentUser = async () => {
  window.dispatchEvent(new Event("bprogress:start"));

  try {
    const { data, error } = await supabase.auth.getSession();

    return {
      data: {
        user: data.session?.user ?? null,
        session: data.session ?? null,
      },
      error,
    };
  } finally {
    window.dispatchEvent(new Event("bprogress:done"));
  }
};

// Caso você precise do usuário verificado pelo servidor,
// mantenha esta função separada e use apenas quando for realmente necessário.
export const getVerifiedCurrentUser = async () => {
  window.dispatchEvent(new Event("bprogress:start"));

  try {
    return await supabase.auth.getUser();
  } finally {
    window.dispatchEvent(new Event("bprogress:done"));
  }
};