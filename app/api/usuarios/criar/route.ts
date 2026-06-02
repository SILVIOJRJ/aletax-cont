import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      nome: string;
      email: string;
      password: string;
      role: 'admin' | 'funcionario';
      modulos: string[];
    };

    const { nome, email, password, role, modulos } = body;

    if (!nome || !email || !password) {
      return NextResponse.json({ error: 'nome, email e password são obrigatórios' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Verify the caller is an admin by checking the Authorization header session
    const authHeader = request.headers.get('Authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user: callerUser } } = await supabase.auth.getUser(token);
      if (callerUser) {
        const { data: callerProfile } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', callerUser.id)
          .single();
        if (callerProfile && callerProfile.role !== 'admin') {
          return NextResponse.json({ error: 'Acesso negado: apenas admins podem criar usuários' }, { status: 403 });
        }
      }
    }

    // Create the auth user with service role
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message ?? 'Falha ao criar usuário no Auth' },
        { status: 400 }
      );
    }

    const newUserId = authData.user.id;

    // Insert profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert({
        user_id: newUserId,
        role: role ?? 'funcionario',
        modulos: role === 'admin' ? [] : (modulos ?? []),
        nome,
        ativo: true,
      })
      .select()
      .single();

    if (profileError) {
      // Rollback: delete the auth user we just created
      await supabase.auth.admin.deleteUser(newUserId);
      return NextResponse.json(
        { error: 'Falha ao criar perfil: ' + profileError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, user: { ...authData.user, profile } });
  } catch (err) {
    console.error('POST /api/usuarios/criar error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro interno' },
      { status: 500 }
    );
  }
}
