
const dollarFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const numFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
});

export const formatNumber = (key, num) => {
  if (num === -999 || num === '-999' || num === null) {
    return 'N/A';
  } else if (key.includes('($)')) {
    return dollarFormatter.format(num);
  } else {
    return numFormatter.format(num);
  }
}