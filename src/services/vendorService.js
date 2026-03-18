const supabase = require('../../config/db');

const createVendor = async (name, phone) => {
  const vendor_id = phone.slice(-4);

  await supabase.from('vendors').insert({
    name,
    phone,
    vendor_id,
    approved: false
  });

  return vendor_id;
};

module.exports = { createVendor };