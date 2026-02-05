
const MonthCalendar = {
  styleOverrides: {
    root: ({ theme }) => ({
      '& .MuiPickersMonth-root': {
        '& .MuiPickersMonth-monthButton': {
          '&.Mui-selected': {
            background: theme.palette.primary.main,
          },
        },
      },
    }),
  },
};

export default MonthCalendar;

