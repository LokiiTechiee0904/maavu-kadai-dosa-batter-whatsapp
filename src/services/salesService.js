const supabase = require('../../config/db');

const todayDate = () => new Date().toISOString().split('T')[0];

const createStock = async (phone, stock25, stock35) => {
  await supabase.from('sales').insert({
    phone,
    date: todayDate(),
    stock_25: stock25,
    stock_35: stock35,
    sales_25: 0,
    sales_35: 0,
    status: "READY"
  });
};

const startSales = async (phone) => {
  await supabase
    .from('sales')
    .update({ status: "STARTED" })
    .eq('phone', phone)
    .eq('date', todayDate());
};

const getToday = async (phone) => {
  let { data } = await supabase
    .from('sales')
    .select('*')
    .eq('phone', phone)
    .eq('date', todayDate())
    .single();

  return data;
};

const handleSale = async (phone, type) => {
  let { data } = await supabase
    .from('sales')
    .select('*')
    .eq('phone', phone)
    .eq('date', todayDate())
    .single();

  if (!data) return null;

  if (type === 1 && data.stock_25 > 0) {
    data.stock_25 -= 1;
    data.sales_25 += 1;
  }

  if (type === 2 && data.stock_35 > 0) {
    data.stock_35 -= 1;
    data.sales_35 += 1;
  }

  await supabase.from('sales').update(data).eq('id', data.id);

  if (data.stock_25 === 0 && data.stock_35 === 0) {
    await supabase
      .from('sales')
      .update({ status: "COMPLETED" })
      .eq('id', data.id);

    return "DONE";
  }

  return data;
};

/* WEEKLY REPORT */
const getWeekly = async (phone) => {
  let { data } = await supabase
    .from('sales')
    .select('*')
    .eq('phone', phone);

  let total25 = 0, total35 = 0;

  data.forEach(d => {
    total25 += d.sales_25;
    total35 += d.sales_35;
  });

  return { total25, total35 };
};

/* MONTHLY REPORT */
const getMonthly = async (phone, month) => {
  let { data } = await supabase
    .from('sales')
    .select('*')
    .eq('phone', phone);

  let total25 = 0, total35 = 0;

  data.forEach(d => {
    let dMonth = new Date(d.date).getMonth() + 1;
    if (dMonth == month) {
      total25 += d.sales_25;
      total35 += d.sales_35;
    }
  });

  return { total25, total35 };
};

module.exports = {
  createStock,
  startSales,
  handleSale,
  getToday,
  getWeekly,
  getMonthly
};