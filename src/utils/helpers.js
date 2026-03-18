const formatReport = (title, s25, s35) => {
  return `
${title}

25rs → ${s25} → ₹${s25 * 25}
35rs → ${s35} → ₹${s35 * 35}

Total → ₹${s25 * 25 + s35 * 35}
`;
};

module.exports = { formatReport };