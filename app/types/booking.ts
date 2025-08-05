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

export interface ExtraSelectionProps {
  selectedDate: string; // YYYY-MM-DD format
  onExtrasSelect: (extras: SelectedExtra[]) => void;
  initialExtras?: SelectedExtra[];
  className?: string;
}

export interface SelectedExtra {
  id: string;
  name: string;
  price: number;
  quantity: number;
  totalPrice: number;
}

export interface Extra {
  id: string;
  name: string;
  description: string | null;
  price: number;
  isActive: boolean;
  availability?: ExtraAvailability;
}

export interface ExtraAvailability {
  id: string;
  extraId: string;
  date: Date | string;
  totalQuantity: number;
  availableQuantity: number;
  isAvailable: boolean;
}

export interface ExtrasResponse {
  extras: Extra[];
  selectedDate?: string;
}

export interface ExtraAvailabilityResponse {
  extras: Extra[];
  date: string;
  timezone: string;
}

export interface CustomerDetailsProps {
  onDetailsSubmit: (details: CustomerFormData) => void;
  selectedDate: string;
  subtotal: number;
  initialDetails?: Partial<CustomerFormData>;
  className?: string;
}

export interface CustomerFormData {
  name: string;
  email: string;
  phone: string;
  bookingNotes?: string;
  isGuest: boolean;
  promoCode: string | null;
  discount: number;
  finalAmount: number;
}

export interface PromoCodeValidation {
  valid: boolean;
  code?: string;
  description?: string;
  discountType?: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue?: number;
  discountAmount?: number;
  error?: string;
}

export interface PromoCodeValidateRequest {
  code: string;
  subtotal: number;
  bookingDate?: string;
}

export interface PromoCodeValidateResponse {
  valid: boolean;
  code: string;
  description?: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
  discountAmount: number;
}