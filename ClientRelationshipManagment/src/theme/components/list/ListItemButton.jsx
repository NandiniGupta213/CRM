const ListItemButton = {
  styleOverrides: {
    root: ({ theme }) => ({
      padding: theme.spacing(1),
      borderRadius: theme.shape.borderRadius,
      '&:hover': {
        backgroundColor: theme.palette.info.dark,
      },
    }),
  },
};

export default ListItemButton;
