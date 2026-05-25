const { createClient } = require('@supabase/supabase-js');

const url = 'https://tbiepfclghsrwinqluls.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRiaWVwZmNsZ2hzcndpbnFsdWxzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwODU3MjksImV4cCI6MjA5MzY2MTcyOX0.kSnqzmU40dB2n1V3Qu67r0RVFa3NHU4ROzlRQNZca0A';

const supabase = createClient(url, anonKey);

async function test() {
  const email = `test_audit_${Date.now()}@rotaja.com`;
  const password = 'Password123!';
  
  console.log('Tentando cadastrar:', email);
  const { data, error } = await supabase.auth.signUp({
    email,
    password
  });
  
  if (error) {
    console.error('Erro no cadastro:', error);
  } else {
    console.log('Cadastro realizado com sucesso!');
    console.log('Session existe?', !!data.session);
    console.log('User ID:', data.user?.id);
  }
}

test();
