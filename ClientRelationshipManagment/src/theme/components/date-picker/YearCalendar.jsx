const YearCalendar = {
  styleOverrides: {
    root: ({ theme }) => ({
      '& .MuiPickersYear-root': {
        '& .MuiPickersYear-yearButton': {
          '&.Mui-selected': {
            background: theme.palette.primary.main,
          },
        },
      },
    }),
  },
};

export default YearCalendar;
