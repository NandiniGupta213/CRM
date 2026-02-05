const Collapse = {
  styleOverrides: {
    root: ({ theme }) => ({
      padding: theme.spacing(0, 1),

      '& .MuiList-root': {
        padding: 0,
        margin: theme.spacing(1, 0),
      },
    }),
  },
};

export default Collapse;
