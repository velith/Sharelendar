import type { CalendarEvent } from '../api/googleCalendar';

export type RootStackParamList = {
  SignIn: undefined;
  EventList: undefined;
  EventDetail: { event: CalendarEvent };
};

