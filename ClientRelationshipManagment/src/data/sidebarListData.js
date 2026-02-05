import sitemap from '../routes/sitemap';

// Top list excludes specific pages
export const topListData = sitemap.filter((item) => {
  const excludedIds = ['template-pages', 'settings', 'account-settings', 'authentication'];
  return !excludedIds.includes(item.id);
});

// Bottom list includes specific pages
export const bottomListData = sitemap.filter((item) => {
  const includedIds = ['template-pages', 'settings', 'authentication'];
  return includedIds.includes(item.id);
});

// Profile list item (single)
export const profileListData = sitemap.find((item) => item.id === 'account-settings');
