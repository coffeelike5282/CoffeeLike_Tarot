import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export const useAuth = () => {
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);

  const login = async (phoneNumber) => {
    setLoading(true);
    try {
      // 1. Check if customer exists
      const { data: customer, error: fetchError } = await supabase
        .from('tb_customer')
        .select('*')
        .eq('phone_number', phoneNumber)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

      if (customer) {
        // 2. Update visit count
        const { data: updatedCustomer, error: updateError } = await supabase
          .from('tb_customer')
          .update({
            visit_count: customer.visit_count + 1,
            last_visit_date: new Date().toISOString()
          })
          .eq('cust_id', customer.cust_id)
          .select()
          .single();

        if (updateError) throw updateError;
        setUser(updatedCustomer);
      } else {
        // 3. Create new customer with initial points (Welcome Bonus!)
        const { data: newCustomer, error: insertError } = await supabase
          .from('tb_customer')
          .insert([{ phone_number: phoneNumber, point_balance: 10000 }])
          .select()
          .single();

        if (insertError) throw insertError;
        setUser(newCustomer);
      }
    } catch (err) {
      console.error('Auth Error:', err.message);
      alert('인증 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  return { login, user, loading };
};
