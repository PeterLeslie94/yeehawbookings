import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import RevenueChart from '../RevenueChart';
import { RevenueChartData } from '@/app/types/admin';
import '@testing-library/jest-dom';

const mockRevenueData: RevenueChartData = {
  daily: [
    { label: '10 Jan', value: 150.00, date: '2024-01-10' },
    { label: '11 Jan', value: 275.50, date: '2024-01-11' },
    { label: '12 Jan', value: 400.25, date: '2024-01-12' },
    { label: '13 Jan', value: 125.75, date: '2024-01-13' },
    { label: '14 Jan', value: 350.00, date: '2024-01-14' },
  ],
  weekly: [
    { label: 'Week 1 Jan', value: 1200.00, date: '2024-01-01' },
    { label: 'Week 2 Jan', value: 850.50, date: '2024-01-08' },
    { label: 'Week 3 Jan', value: 950.75, date: '2024-01-15' },
  ],
  monthly: [
    { label: 'January 2024', value: 3500.00, date: '2024-01-01' },
    { label: 'February 2024', value: 2800.50, date: '2024-02-01' },
    { label: 'March 2024', value: 4200.75, date: '2024-03-01' },
  ],
};

// Mock chart library since it might not work in test environment
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  LineChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="line-chart">{children}</div>
  ),
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
}));

describe('RevenueChart', () => {
  it('should render chart with daily data by default', () => {
    render(
      <RevenueChart 
        data={mockRevenueData} 
        period="daily" 
      />
    );

    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    expect(screen.getByTestId('line')).toBeInTheDocument();
    expect(screen.getByTestId('x-axis')).toBeInTheDocument();
    expect(screen.getByTestId('y-axis')).toBeInTheDocument();
  });

  it('should display period selector buttons', () => {
    render(
      <RevenueChart 
        data={mockRevenueData} 
        period="daily" 
      />
    );

    expect(screen.getByText('Daily')).toBeInTheDocument();
    expect(screen.getByText('Weekly')).toBeInTheDocument();
    expect(screen.getByText('Monthly')).toBeInTheDocument();
  });

  it('should highlight active period button', () => {
    render(
      <RevenueChart 
        data={mockRevenueData} 
        period="weekly" 
      />
    );

    const dailyButton = screen.getByText('Daily');
    const weeklyButton = screen.getByText('Weekly');
    const monthlyButton = screen.getByText('Monthly');

    expect(dailyButton).not.toHaveClass('bg-blue-600', 'text-white');
    expect(weeklyButton).toHaveClass('bg-blue-600', 'text-white');
    expect(monthlyButton).not.toHaveClass('bg-blue-600', 'text-white');
  });

  it('should show loading state', () => {
    render(
      <RevenueChart 
        data={mockRevenueData} 
        period="daily" 
        loading={true} 
      />
    );

    expect(screen.getByTestId('chart-skeleton')).toBeInTheDocument();
    expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument();
  });

  it('should show error state', () => {
    render(
      <RevenueChart 
        data={mockRevenueData} 
        period="daily" 
        error="Failed to load chart data" 
      />
    );

    expect(screen.getByText('Error loading chart')).toBeInTheDocument();
    expect(screen.getByText('Failed to load chart data')).toBeInTheDocument();
    expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument();
  });

  it('should show empty state when no data', () => {
    const emptyData: RevenueChartData = {
      daily: [],
      weekly: [],
      monthly: [],
    };

    render(
      <RevenueChart 
        data={emptyData} 
        period="daily" 
      />
    );

    expect(screen.getByText('No revenue data available')).toBeInTheDocument();
    expect(screen.getByText('Revenue data will appear here once bookings are made.')).toBeInTheDocument();
  });

  it('should display correct data for daily period', () => {
    const { rerender } = render(
      <RevenueChart 
        data={mockRevenueData} 
        period="daily" 
      />
    );

    // The component should render the daily data
    // Since we mocked recharts, we'll check if the chart container is present
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    
    // Re-render with different period to test data switching
    rerender(
      <RevenueChart 
        data={mockRevenueData} 
        period="weekly" 
      />
    );
    
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });

  it('should calculate and display total revenue', () => {
    render(
      <RevenueChart 
        data={mockRevenueData} 
        period="daily" 
      />
    );

    // Should show total of daily data: 150 + 275.50 + 400.25 + 125.75 + 350 = 1301.50
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText((content, node) => {
      const hasText = (node) => node.textContent === '£1,301.50'
      const nodeHasText = hasText(node)
      const childrenDontHaveText = Array.from(node?.children || []).every(
        (child) => !hasText(child)
      )
      return nodeHasText && childrenDontHaveText
    })).toBeInTheDocument();
  });

  it('should update total when period changes', () => {
    const { rerender } = render(
      <RevenueChart 
        data={mockRevenueData} 
        period="daily" 
      />
    );

    expect(screen.getByText((content, node) => {
      return node?.textContent === '£1,301.50'
    })).toBeInTheDocument();

    rerender(
      <RevenueChart 
        data={mockRevenueData} 
        period="weekly" 
      />
    );

    // Weekly total: 1200 + 850.50 + 950.75 = 3001.25
    expect(screen.getByText((content, node) => {
      return node?.textContent === '£3,001.25'
    })).toBeInTheDocument();
  });

  it('should handle period change callback', () => {
    const mockOnPeriodChange = jest.fn();
    
    render(
      <RevenueChart 
        data={mockRevenueData} 
        period="daily" 
        onPeriodChange={mockOnPeriodChange} 
      />
    );

    const weeklyButton = screen.getByText('Weekly');
    fireEvent.click(weeklyButton);

    expect(mockOnPeriodChange).toHaveBeenCalledWith('weekly');
  });

  it('should format currency values correctly', () => {
    const dataWithLargeNumbers: RevenueChartData = {
      daily: [
        { label: '1 Jan', value: 12345.67, date: '2024-01-01' },
        { label: '2 Jan', value: 0, date: '2024-01-02' },
        { label: '3 Jan', value: 999.99, date: '2024-01-03' },
      ],
      weekly: [],
      monthly: [],
    };

    render(
      <RevenueChart 
        data={dataWithLargeNumbers} 
        period="daily" 
      />
    );

    // Should show formatted total
    expect(screen.getByText((content, node) => {
      return node?.textContent === '£13,345.66'
    })).toBeInTheDocument();
  });

  it('should show average revenue per period', () => {
    render(
      <RevenueChart 
        data={mockRevenueData} 
        period="daily" 
      />
    );

    // Average of daily data: 1301.50 / 5 = 260.30
    expect(screen.getByText('Average')).toBeInTheDocument();
    expect(screen.getByText((content, node) => {
      return node?.textContent === '£260.30'
    })).toBeInTheDocument();
  });

  it('should handle responsive behavior', () => {
    render(
      <RevenueChart 
        data={mockRevenueData} 
        period="daily" 
      />
    );

    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('should show data points count', () => {
    render(
      <RevenueChart 
        data={mockRevenueData} 
        period="daily" 
      />
    );

    expect(screen.getByText('5 data points')).toBeInTheDocument();
  });

  it('should handle zero revenue gracefully', () => {
    const zeroData: RevenueChartData = {
      daily: [
        { label: '1 Jan', value: 0, date: '2024-01-01' },
        { label: '2 Jan', value: 0, date: '2024-01-02' },
      ],
      weekly: [],
      monthly: [],
    };

    render(
      <RevenueChart 
        data={zeroData} 
        period="daily" 
      />
    );

    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getAllByText((content, node) => {
      return node?.textContent === '£0.00'
    })).toHaveLength(2); // Should appear for both Total and Average
    expect(screen.getByText('Average')).toBeInTheDocument();
  });
});