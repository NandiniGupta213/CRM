const MenuItem = {
  styleOverrides: {
    root: ({ theme }) => ({
      transition: 'all 0.3s ease-in-out',
      '&:hover': {
        backgroundColor: theme.palette.info.dark,
      },
    }),
  },
};

export default MenuItem;
