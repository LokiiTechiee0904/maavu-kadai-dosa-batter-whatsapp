const supabase = require('../../config/db');

const getSession = async (phone) => {
  let { data } = await supabase
    .from('sessions')
    .select('*')
    .eq('phone', phone)
    .single();

  return data || { state: "IDLE", temp_value: null };
};

const setState = async (phone, state) => {
  await supabase.from('sessions').upsert({ phone, state });
};

const setTemp = async (phone, value) => {
  await supabase
    .from('sessions')
    .upsert({ phone, temp_value: value });
};

module.exports = { getSession, setState, setTemp };