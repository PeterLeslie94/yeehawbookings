import { BookingStatus, UserRole } from '@prisma/client';

// Dashboard Statistics Types
export interface DashboardStats {
  bookings: BookingStats;
  revenue: RevenueStats;
  packages: PackageStats[];
  todayBookings: TodayBooking[];
}

export interface BookingStats {
  today: number;
  thisWeek: number;
  thisMonth: number;
  byStatus: Record<BookingStatus, number>;
}

export interface RevenueStats {
  today: number;
  thisWeek: number;
  thisMonth: number;
  currency: string;
}

export interface PackageStats {
  id: string;
  name: string;
  bookingCount: number;
  revenue: number;
  percentage: number;
}

export interface TodayBooking {
  id: string;
  bookingReference: string;
  customerName: string;
  customerEmail: string;
  status: BookingStatus;
  finalAmount: number;
  bookingTime: string;
  packages: Array<{
    name: string;
    quantity: number;
  }>;
}

// Booking Management Types
export interface BookingFilter {
  status?: BookingStatus;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  packageId?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface BookingWithDetails {
  id: string;
  bookingReference: string;
  customerName: string;
  customerEmail: string;
  bookingDate: string;
  status: BookingStatus;
  totalAmount: number;
  discountAmount: number;
  finalAmount: number;
  currency: string;
  customerNotes?: string;
  stripePaymentId?: string;
  stripePaymentStatus?: string;
  paidAt?: string;
  refundedAt?: string;
  refundAmount?: number;
  createdAt: string;
  updatedAt: string;
  items: BookingItemWithDetails[];
  user?: {
    id: string;
    name?: string;
    email: string;
    role: UserRole;
  };
  promoCode?: {
    code: string;
    description?: string;
    discountType: string;
    discountValue: number;
  };
}

export interface BookingItemWithDetails {
  id: string;
  itemType: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  package?: {
    id: string;
    name: string;
    description: string;
  };
  extra?: {
    id: string;
    name: string;
    description?: string;
  };
}

export interface BookingListResponse {
  bookings: BookingWithDetails[];
  total: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
}

export interface BookingUpdateData {
  customerNotes?: string;
  status?: BookingStatus;
}

export interface RefundRequest {
  amount: number;
  reason: string;
  notifyCustomer: boolean;
}

export interface RefundResponse {
  success: boolean;
  refundId?: string;
  amount: number;
  status: string;
  error?: string;
}

// Availability Management Types
export interface CutoffSettings {
  dayOfWeek: number;
  cutoffTime: string;
  isActive: boolean;
}

export interface AvailabilitySettings {
  cutoffTimes: CutoffSettings[];
  blackoutDates: BlackoutDateAdmin[];
  emergencyStop: boolean;
}

export interface BlackoutDateAdmin {
  id: string;
  date: string;
  reason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BlackoutDateRequest {
  date: string;
  reason?: string;
}

export interface PackageAvailabilityToggle {
  packageId: string;
  date: string;
  isAvailable: boolean;
  availableQuantity?: number;
}

export interface EmergencyStopRequest {
  enabled: boolean;
  reason?: string;
}

// API Response Types
export interface AdminApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

// Chart Data Types
export interface ChartDataPoint {
  label: string;
  value: number;
  date?: string;
}

export interface RevenueChartData {
  daily: ChartDataPoint[];
  weekly: ChartDataPoint[];
  monthly: ChartDataPoint[];
}

// Component Props Types
export interface StatsCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: 'increase' | 'decrease';
    period: string;
  };
  icon?: React.ComponentType<any>;
  loading?: boolean;
  error?: string;
  className?: string;
}

export interface RevenueChartProps {
  data: RevenueChartData;
  period: 'daily' | 'weekly' | 'monthly';
  loading?: boolean;
  error?: string;
}

export interface TodayBookingsProps {
  bookings: TodayBooking[];
  loading?: boolean;
  error?: string;
  onRefresh?: () => void;
}

export interface PopularPackagesProps {
  packages: PackageStats[];
  loading?: boolean;
  error?: string;
}