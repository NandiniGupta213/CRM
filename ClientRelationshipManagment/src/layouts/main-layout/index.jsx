import { useState } from 'react';
import Stack from '@mui/material/Stack';
import Sidebar from './sidebar';
import Topbar from './topbar';


const MainLayout = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  return (
    <Stack width={1} minHeight="100vh">
      <Sidebar
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        setIsClosing={setIsClosing}
      />

      <Stack
        component="main"
        direction="column"
        p={{ xs: 2, sm: 3, lg: 5 }}
        spacing={{ xs: 2.5, sm: 3, lg: 3.75 }}
        width={{ xs: 1, lg: 'calc(100% - 300px)' }}
        flexGrow={1}
      >
        <Topbar
          isClosing={isClosing}
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
        />

        {children}


      </Stack>
    </Stack>
  );
};

export default MainLayout;
