const PaginationItem = {
  styleOverrides: {
    root: ({ theme }) => ({
      color: theme.palette.neutral.light,
      fontSize: theme.typography.body2.fontSize,
      '&.Mui-selected': {
        background: theme.palette.primary.main,
        '&:hover': {
          background: theme.palette.primary.main,
        },
      },
    }),
  },
};

export default PaginationItem;
