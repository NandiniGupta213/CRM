import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import List from '@mui/material/List';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import { useLocation } from 'react-router-dom';
import Image from '../../../components/base/Image';
import IconifyIcon from '../../../components/base/IconifyIcon';
import CollapseListItem from './list-items/CollapseListItem';
import ProfileListItem from './list-items/ProfileListItem';
import ListItem from './list-items/ListItem';
import LogoImg from '../../../assets/images/Logo.png';
import { useSitemap } from '../../../routes/sitemap';
import { useState, useMemo } from 'react';

const DrawerItems = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const sitemapItems = useSitemap();
  const location = useLocation();
  
  // Filter items based on search query
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return sitemapItems;
    
    const query = searchQuery.toLowerCase();
    return sitemapItems.filter(item => 
      item.subheader?.toLowerCase().includes(query) ||
      (item.path && item.path.toLowerCase().includes(query))
    );
  }, [sitemapItems, searchQuery]);

  // Function to check if menu item is active
  const isActive = (path) => {
    if (!path) return false;
    
    // Check if current path starts with the item path
    if (location.pathname === path) {
      return true;
    }
    
    // For parent routes, check if current path starts with the item path
    if (location.pathname.startsWith(path) && path !== '/') {
      return true;
    }
    
    return false;
  };

  // Clear search function
  const handleClearSearch = () => {
    setSearchQuery('');
  };

  // Check if we're showing search results
  const isSearching = searchQuery.trim() !== '';

  // Get dashboard item separately
  const dashboardItem = filteredItems.find(item => item.id === 'dashboard');
  
  // Get all other items (excluding dashboard, settings, account-settings, logout)
  const otherItems = filteredItems.filter(item => 
    !['dashboard', 'settings', 'account-settings', 'logout'].includes(item.id)
  );

  // Check if we have any collapse items (items with children)
  const collapseItems = otherItems.filter(item => item.items && item.items.length > 0);
  const regularItems = otherItems.filter(item => !item.items || item.items.length === 0);

  // Special items
  const settingsItem = filteredItems.find(item => item.id === 'settings');
  const accountItem = filteredItems.find(item => item.id === 'account-settings');
  const logoutItem = filteredItems.find(item => item.id === 'logout');

  return (
    <>
      <Stack
        pt={5}
        pb={4}
        px={3.5}
        position={'sticky'}
        top={0}
        bgcolor="info.darker"
        alignItems="center"
        justifyContent="flex-start"
        zIndex={1000}
      >
        <ButtonBase component={Link} href="/" disableRipple>
          <Image src={LogoImg} alt="logo" height={24} width={24} sx={{ mr: 1 }} />
          <Typography variant="h5" color="text.primary" fontWeight={600} letterSpacing={1}>
            CRM
          </Typography>
        </ButtonBase>
      </Stack>

      <Box px={3.5} pb={3} pt={1}>
        <TextField
          variant="filled"
          placeholder="Search menu items..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ width: 1 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <IconifyIcon icon={'mingcute:search-line'} />
              </InputAdornment>
            ),
            endAdornment: searchQuery && (
              <InputAdornment position="end">
                <IconButton 
                  size="small" 
                  onClick={handleClearSearch}
                  edge="end"
                >
                  <IconifyIcon icon="mingcute:close-line" fontSize={16} />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
        
        {/* Search results info */}
        {isSearching && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, ml: 1, display: 'block' }}>
            Found {filteredItems.length} result{filteredItems.length !== 1 ? 's' : ''} for "{searchQuery}"
          </Typography>
        )}
      </Box>

      {/* Show message if no results found */}
      {isSearching && filteredItems.length === 0 && (
        <Box px={3.5} pb={2}>
          <Typography variant="body2" color="text.secondary" align="center">
            No menu items found for "{searchQuery}"
          </Typography>
        </Box>
      )}

      {/* DASHBOARD ITEM - Always first */}
      {(!isSearching || dashboardItem) && (
        <List component="nav" sx={{ px: 2.5 }}>
          {dashboardItem && (
            <ListItem 
              key={dashboardItem.id} 
              title={dashboardItem.subheader}
              path={dashboardItem.path} 
              icon={dashboardItem.icon}
              isActive={isActive(dashboardItem.path)}
            />
          )}
        </List>
      )}

      {/* DIVIDER after Dashboard */}
      <Divider sx={{ my: 1 }} />

      {/* Collapse Items (items with children) - only show if not searching or if found */}
      {(!isSearching || collapseItems.length > 0) && (
        <List component="nav" sx={{ px: 2.5 }}>
          {collapseItems.map((item) => (
            <CollapseListItem 
              key={item.id}
              title={item.subheader}
              icon={item.icon}
              items={item.items?.map(child => ({
                ...child,
                active: isActive(child.path)
              })) || []}
              isActive={isActive(item.path)}
            />
          ))}
        </List>
      )}

      {/* Regular Menu Items */}
      {(!isSearching || regularItems.length > 0) && (
        <List component="nav" sx={{ px: 2.5 }}>
          {regularItems.map((item) => (
            <ListItem 
              key={item.id} 
              title={item.subheader}
              path={item.path} 
              icon={item.icon}
              isActive={isActive(item.path)}
            />
          ))}
        </List>
      )}

      {/* Settings, Account, and Logout - always show unless searching */}
      {(!isSearching || settingsItem || accountItem || logoutItem) && (
        <>
          <Divider sx={{ my: 1 }} />
          <List component="nav" sx={{ px: 2.5 }}>
            {settingsItem && (
              <ListItem 
                key={settingsItem.id} 
                title={settingsItem.subheader}
                path={settingsItem.path} 
                icon={settingsItem.icon}
                isActive={isActive(settingsItem.path)}
              />
            )}
            {accountItem && (
              <ProfileListItem 
                key={accountItem.id}
                subheader={accountItem.subheader}
                path={accountItem.path}
                isActive={isActive(accountItem.path)}
              />
            )}
            {logoutItem && (
              <ListItem 
                key={logoutItem.id} 
                title={logoutItem.subheader}
                path={logoutItem.path} 
                icon={logoutItem.icon}
                isLogout={true}
                isActive={isActive(logoutItem.path)}
              />
            )}
          </List>
        </>
      )}
    </>
  );
};

export default DrawerItems;