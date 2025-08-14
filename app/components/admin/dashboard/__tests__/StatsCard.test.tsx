import React from 'react';
import { render, screen } from '@testing-library/react';
import { Calendar, DollarSign } from 'lucide-react';
import StatsCard from '../StatsCard';
import '@testing-library/jest-dom';

describe('StatsCard', () => {
  it('should render title and value correctly', () => {
    render(
      <StatsCard
        title="Total Bookings"
        value="125"
      />
    );

    expect(screen.getByText('Total Bookings')).toBeInTheDocument();
    expect(screen.getByText('125')).toBeInTheDocument();
  });

  it('should render numeric value correctly', () => {
    render(
      <StatsCard
        title="Revenue"
        value={1250.50}
      />
    );

    expect(screen.getByText('Revenue')).toBeInTheDocument();
    expect(screen.getByText('1250.5')).toBeInTheDocument();
  });

  it('should render icon when provided', () => {
    render(
      <StatsCard
        title="Total Bookings"
        value="125"
        icon={Calendar}
      />
    );

    // Check if the Calendar icon is rendered
    const iconElement = screen.getByTestId('stats-card-icon');
    expect(iconElement).toBeInTheDocument();
  });

  it('should display change information with increase', () => {
    render(
      <StatsCard
        title="Revenue"
        value="£1,250.50"
        change={{
          value: 15.5,
          type: 'increase',
          period: 'vs last week',
        }}
      />
    );

    expect(screen.getByText('Revenue')).toBeInTheDocument();
    expect(screen.getByText('£1,250.50')).toBeInTheDocument();
    expect(screen.getByText('+15.5% vs last week')).toBeInTheDocument();
    
    // Check for increase styling (text should be green)
    const changeElement = screen.getByText('+15.5% vs last week');
    expect(changeElement).toHaveClass('text-green-600');
  });

  it('should display change information with decrease', () => {
    render(
      <StatsCard
        title="Bookings"
        value="95"
        change={{
          value: 8.2,
          type: 'decrease',
          period: 'vs last month',
        }}
      />
    );

    expect(screen.getByText('-8.2% vs last month')).toBeInTheDocument();
    
    // Check for decrease styling (text should be red)
    const changeElement = screen.getByText('-8.2% vs last month');
    expect(changeElement).toHaveClass('text-red-600');
  });

  it('should show loading state', () => {
    render(
      <StatsCard
        title="Revenue"
        value="0"
        loading={true}
      />
    );

    // Should show skeleton loading state
    expect(screen.getByTestId('stats-card-skeleton')).toBeInTheDocument();
    
    // Title should still be visible but value should be hidden
    expect(screen.getByText('Revenue')).toBeInTheDocument();
  });

  it('should show error state', () => {
    render(
      <StatsCard
        title="Bookings"
        value="0"
        error="Failed to load data"
      />
    );

    expect(screen.getByText('Bookings')).toBeInTheDocument();
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('Failed to load data')).toBeInTheDocument();
  });

  it('should render with all props together', () => {
    render(
      <StatsCard
        title="Today's Revenue"
        value="£850.25"
        icon={DollarSign}
        change={{
          value: 12.3,
          type: 'increase',
          period: 'vs yesterday',
        }}
      />
    );

    expect(screen.getByText("Today's Revenue")).toBeInTheDocument();
    expect(screen.getByText('£850.25')).toBeInTheDocument();
    expect(screen.getByTestId('stats-card-icon')).toBeInTheDocument();
    expect(screen.getByText('+12.3% vs yesterday')).toBeInTheDocument();
  });

  it('should handle zero values correctly', () => {
    render(
      <StatsCard
        title="New Signups"
        value={0}
        change={{
          value: 0,
          type: 'increase',
          period: 'vs last week',
        }}
      />
    );

    expect(screen.getByText('New Signups')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('0% vs last week')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <StatsCard
        title="Test"
        value="123"
        className="custom-class"
      />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });
});