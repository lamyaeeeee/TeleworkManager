import moment, { Moment } from 'moment';
moment.locale('fr');
export const getDaysInMonth = (currentMonth: moment.Moment): Array<{ date: moment.Moment; isCurrentMonth: boolean }> => {
  const startOfMonth = currentMonth.clone().startOf('month');
  const endOfMonth = currentMonth.clone().endOf('month');
  const days = [];

  const startOfWeek = startOfMonth.clone().startOf('week').isoWeekday(1);
  const endOfWeek = endOfMonth.clone().endOf('week').isoWeekday(7);

  let weekdaysBeforeMonthStart = 0;
  for (let day = startOfWeek; day.isBefore(startOfMonth); day.add(1, 'day')) {
    if (day.isoWeekday() !== 6 && day.isoWeekday() !== 7) {
      weekdaysBeforeMonthStart++;
      days.push({ date: day.clone(), isCurrentMonth: false });
    }
  }

  if (weekdaysBeforeMonthStart >= 5) {
    days.splice(0, weekdaysBeforeMonthStart);
  }

  for (let day = startOfMonth; day.isBefore(endOfWeek); day.add(1, 'day')) {
    if (day.isoWeekday() !== 6 && day.isoWeekday() !== 7) {
      days.push({ date: day.clone(), isCurrentMonth: day.isSame(currentMonth, 'month') });
    }
  }

  for (let day = endOfMonth.clone().add(1, 'day'); days.length % 5 !== 0; day.add(1, 'day')) {
    if (day.isoWeekday() !== 6 && day.isoWeekday() !== 7) {
      days.push({ date: day.clone(), isCurrentMonth: false });
    }
  }

  return days;
};


export const formatDate = (date: string): string => {
  return moment(date).format('YYYY-MM-DD'); 
};


export const getPreviousMonthDays = (currentMonth: moment.Moment) : Moment[]=> {
  const startOfMonth = currentMonth.startOf('month');
  const days = [];
  for (let i = startOfMonth.day() - 1; i >= 0; i--) {
    days.push(startOfMonth.clone().subtract(i + 1, 'days'));
  }
  return days;
};

export const getNextMonthDays = (currentMonth: moment.Moment):Moment[] => {
  const endOfMonth = currentMonth.endOf('month');
  const days = [];
  for (let i = 1; i < 7 - endOfMonth.day(); i++) {
    days.push(endOfMonth.clone().add(i, 'days'));
  }
  return days;
};
