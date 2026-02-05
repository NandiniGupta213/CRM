export const formatNumber = (
  price,
  format = 'en-IN',
  options = { style: 'currency', currency: 'USD' }
) => {
  return new Intl.NumberFormat(format, {
    style: options.style,
    currency: options.currency,
  }).format(price);
};
