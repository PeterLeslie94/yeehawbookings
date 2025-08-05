export interface DateSelectionProps {
  onDateSelect: (selectedDate: SelectedDate) => void;
  initialDate?: string;
  className?: string;
}

export interface SelectedDate {
  date: string; // YYYY-MM-DD format
  dayOfWeek: string;
  formattedDate: string;
}

export interface AvailableDate {
  date: string; // YYYY-MM-DD format
  dayOfWeek: 'Friday' | 'Saturday';
  cutoffTime: string; // HH:mm format
  cutoffTimeUK: string; // Formatted display time
  isBlackedOut: boolean;
  isPastCutoff: boolean;
  blackoutReason?: string;
  timezone: string;
  formattedDate: string;
}

export interface BlackoutDate {
  id: string;
  date: string; // ISO string
  reason: string | null;
  formattedDate: string;
  dayOfWeek: string;
}

export interface DateRangeParams {
  startDate?: string;
  endDate?: string;
  includeBlackouts?: boolean;
  includePast?: boolean;
  limit?: number;
  offset?: number;
}

export interface AvailableDatesResponse {
  availableDates: AvailableDate[];
  timezone: string;
  currentTimeUK: string;
}

export interface BlackoutDatesResponse {
  blackoutDates: BlackoutDate[];
  total?: number;
  hasMore?: boolean;
}

export interface CalendarDate {
  date: Date;
  isAvailable: boolean;
  isBlackedOut: boolean;
  isPastCutoff: boolean;
  isSelected: boolean;
  blackoutReason?: string;
  cutoffTime: string;
}