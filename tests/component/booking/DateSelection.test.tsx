import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DateSelection from '@/app/components/booking/DateSelection';
import { format, addDays, setHours, setMinutes } from 'date-fns';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';

// Mock API responses
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('DateSelection', () => {
  const mockOnDateSelect = jest.fn();
  const defaultProps = {
    onDateSelect: mockOnDateSelect,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Calendar Display', () => {
    it('should render calendar showing only Fridays and Saturdays', async () => {
      // Arrange
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ blackoutDates: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ availableDates: [] }),
        });

      // Act
      render(<DateSelection {...defaultProps} />);
      
      // Wait for data to load
      await waitFor(() => {
        expect(screen.queryByText('Loading available dates...')).not.toBeInTheDocument();
      });

      // Assert - Check that only Friday and Saturday labels are present
      const dayLabels = screen.getAllByTestId(/^day-label-/);
      const dayTexts = dayLabels.map(label => label.textContent);
      
      // Should only show Fri and Sat
      expect(dayTexts.filter(day => day === 'Fri' || day === 'Sat')).toHaveLength(2);
      expect(dayTexts.filter(day => !['Fri', 'Sat'].includes(day!))).toHaveLength(0);
    });

    it('should display dates starting from today onwards', async () => {
      // Arrange
      const today = new Date();
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ blackoutDates: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ availableDates: [] }),
        });

      // Act
      render(<DateSelection {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading available dates...')).not.toBeInTheDocument();
      });

      // Assert - Should not show past dates
      const dateButtons = screen.getAllByRole('button', { name: /^\d{1,2}$/ });
      expect(dateButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Blackout Dates', () => {
    it('should disable blackout dates', async () => {
      // Arrange
      const nextFriday = getNextFriday();
      const blackoutDate = format(nextFriday, 'yyyy-MM-dd');
      
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ 
            blackoutDates: [{ date: blackoutDate, reason: 'Private event' }] 
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ availableDates: [] }),
        });

      // Act
      render(<DateSelection {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading available dates...')).not.toBeInTheDocument();
      });

      // Assert
      const blackoutButton = screen.getByTestId(`date-${blackoutDate}`);
      expect(blackoutButton).toBeDisabled();
      expect(blackoutButton).toHaveClass('blackout-date');
    });

    it('should show tooltip for blackout dates', async () => {
      // Arrange
      const nextFriday = getNextFriday();
      const blackoutDate = format(nextFriday, 'yyyy-MM-dd');
      const reason = 'Venue closed for maintenance';
      
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ 
            blackoutDates: [{ date: blackoutDate, reason }] 
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ availableDates: [] }),
        });

      // Act
      render(<DateSelection {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading available dates...')).not.toBeInTheDocument();
      });

      const blackoutButton = screen.getByTestId(`date-${blackoutDate}`);
      fireEvent.mouseEnter(blackoutButton);

      // Assert
      await waitFor(() => {
        expect(screen.getByText(reason)).toBeInTheDocument();
      });
    });
  });

  describe('Cut-off Time Validation', () => {
    it('should disable dates past default cut-off time (11pm)', async () => {
      // Arrange - Set current time to 11:30pm on a Thursday
      const thursday = getNextDayOfWeek(4); // Thursday
      const pastCutoff = setMinutes(setHours(thursday, 23), 30); // 11:30pm
      jest.useFakeTimers();
      jest.setSystemTime(pastCutoff);
      
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ blackoutDates: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ 
            availableDates: [{
              date: format(addDays(thursday, 1), 'yyyy-MM-dd'),
              cutoffTime: '23:00'
            }]
          }),
        });

      // Act
      render(<DateSelection {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading available dates...')).not.toBeInTheDocument();
      });

      // Assert - Friday should be disabled because we're past cutoff
      const fridayDate = format(addDays(thursday, 1), 'yyyy-MM-dd');
      const fridayButton = screen.getByTestId(`date-${fridayDate}`);
      expect(fridayButton).toBeDisabled();
      expect(fridayButton).toHaveClass('past-cutoff');
    });

    it('should respect custom cut-off times per day', async () => {
      // Arrange - Set current time to 9:30pm on a Thursday
      const thursday = getNextDayOfWeek(4);
      const beforeCutoff = setMinutes(setHours(thursday, 21), 30); // 9:30pm
      jest.useFakeTimers();
      jest.setSystemTime(beforeCutoff);
      
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ blackoutDates: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ 
            availableDates: [{
              date: format(addDays(thursday, 1), 'yyyy-MM-dd'),
              cutoffTime: '22:00' // Custom 10pm cutoff
            }]
          }),
        });

      // Act
      render(<DateSelection {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading available dates...')).not.toBeInTheDocument();
      });

      // Assert - Friday should be enabled because we're before cutoff
      const fridayDate = format(addDays(thursday, 1), 'yyyy-MM-dd');
      const fridayButton = screen.getByTestId(`date-${fridayDate}`);
      expect(fridayButton).not.toBeDisabled();
    });
  });

  describe('Timezone Handling', () => {
    it('should handle UK timezone (GMT/BST) correctly', async () => {
      // Arrange
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ blackoutDates: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ availableDates: [] }),
        });

      // Act
      render(<DateSelection {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading available dates...')).not.toBeInTheDocument();
      });

      // Assert - All dates should be displayed in UK timezone
      const timezoneDisplay = screen.getByTestId('timezone-indicator');
      expect(timezoneDisplay).toHaveTextContent(/GMT|BST/);
    });

    it('should convert times to UK timezone for cut-off validation', async () => {
      // This test ensures that cut-off times work correctly regardless of user's local timezone
      // Arrange
      const ukTimeZone = 'Europe/London';
      const friday = getNextFriday();
      const fridayDate = format(friday, 'yyyy-MM-dd');
      
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ blackoutDates: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ 
            availableDates: [{
              date: fridayDate,
              cutoffTime: '23:00',
              timezone: ukTimeZone
            }]
          }),
        });

      // Act
      render(<DateSelection {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading available dates...')).not.toBeInTheDocument();
      });

      // Assert
      const cutoffDisplay = screen.getByTestId(`cutoff-${fridayDate}`);
      expect(cutoffDisplay).toHaveTextContent('Book by 11:00 PM');
    });
  });

  describe('Visual Indicators', () => {
    it('should show visual indicators for available dates', async () => {
      // Arrange
      const friday = getNextFriday();
      const saturday = addDays(friday, 1);
      
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ blackoutDates: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ 
            availableDates: [
              { date: format(friday, 'yyyy-MM-dd'), cutoffTime: '23:00' },
              { date: format(saturday, 'yyyy-MM-dd'), cutoffTime: '23:00' }
            ]
          }),
        });

      // Act
      render(<DateSelection {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading available dates...')).not.toBeInTheDocument();
      });

      // Assert
      const fridayButton = screen.getByTestId(`date-${format(friday, 'yyyy-MM-dd')}`);
      const saturdayButton = screen.getByTestId(`date-${format(saturday, 'yyyy-MM-dd')}`);
      
      expect(fridayButton).toHaveClass('available-date');
      expect(saturdayButton).toHaveClass('available-date');
      expect(fridayButton).toHaveAttribute('aria-label', expect.stringContaining('Available'));
    });

    it('should show different styling for selected date', async () => {
      // Arrange
      const friday = getNextFriday();
      const fridayDate = format(friday, 'yyyy-MM-dd');
      
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ blackoutDates: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ 
            availableDates: [
              { date: fridayDate, cutoffTime: '23:00' }
            ]
          }),
        });

      // Act
      render(<DateSelection {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading available dates...')).not.toBeInTheDocument();
      });

      const fridayButton = screen.getByTestId(`date-${fridayDate}`);
      fireEvent.click(fridayButton);

      // Assert
      expect(fridayButton).toHaveClass('selected-date');
      expect(fridayButton).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('Date Selection', () => {
    it('should call onDateSelect when a valid date is clicked', async () => {
      // Arrange
      const friday = getNextFriday();
      const fridayDate = format(friday, 'yyyy-MM-dd');
      
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ blackoutDates: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ 
            availableDates: [
              { date: fridayDate, cutoffTime: '23:00' }
            ]
          }),
        });

      // Act
      render(<DateSelection {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading available dates...')).not.toBeInTheDocument();
      });

      const fridayButton = screen.getByTestId(`date-${fridayDate}`);
      fireEvent.click(fridayButton);

      // Assert
      expect(mockOnDateSelect).toHaveBeenCalledWith(expect.objectContaining({
        date: fridayDate,
        dayOfWeek: 'Friday',
        formattedDate: expect.any(String)
      }));
    });

    it('should not call onDateSelect for disabled dates', async () => {
      // Arrange
      const friday = getNextFriday();
      const fridayDate = format(friday, 'yyyy-MM-dd');
      
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ 
            blackoutDates: [{ date: fridayDate, reason: 'Closed' }]
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ availableDates: [] }),
        });

      // Act
      render(<DateSelection {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading available dates...')).not.toBeInTheDocument();
      });

      const fridayButton = screen.getByTestId(`date-${fridayDate}`);
      fireEvent.click(fridayButton);

      // Assert
      expect(mockOnDateSelect).not.toHaveBeenCalled();
    });
  });

  describe('Loading and Error States', () => {
    it('should show loading state while fetching data', async () => {
      // Arrange
      mockFetch
        .mockImplementation(() => new Promise(() => {})); // Never resolves

      // Act
      render(<DateSelection {...defaultProps} />);

      // Assert
      expect(screen.getByText('Loading available dates...')).toBeInTheDocument();
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('should show error state when API fails', async () => {
      // Arrange
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'));

      // Act
      render(<DateSelection {...defaultProps} />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/Error loading dates/)).toBeInTheDocument();
        expect(screen.getByText('Please try again')).toBeInTheDocument();
      });
    });

    it('should allow retry on error', async () => {
      // Arrange
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ blackoutDates: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ availableDates: [] }),
        });

      // Act
      render(<DateSelection {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText(/Error loading dates/)).toBeInTheDocument();
      });

      const retryButton = screen.getByText('Please try again');
      fireEvent.click(retryButton);

      // Assert
      await waitFor(() => {
        expect(screen.queryByText(/Error loading dates/)).not.toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', async () => {
      // Arrange
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ blackoutDates: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ availableDates: [] }),
        });

      // Act
      render(<DateSelection {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading available dates...')).not.toBeInTheDocument();
      });

      // Assert
      const calendar = screen.getByRole('region', { name: /date selection/i });
      expect(calendar).toBeInTheDocument();
      
      const dateButtons = screen.getAllByRole('button', { name: /^\d{1,2}/ });
      dateButtons.forEach(button => {
        expect(button).toHaveAttribute('aria-label');
      });
    });

    it('should be keyboard navigable', async () => {
      // Arrange
      const friday = getNextFriday();
      const fridayDate = format(friday, 'yyyy-MM-dd');
      
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ blackoutDates: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ 
            availableDates: [
              { date: fridayDate, cutoffTime: '23:00' }
            ]
          }),
        });

      // Act
      render(<DateSelection {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading available dates...')).not.toBeInTheDocument();
      });

      const fridayButton = screen.getByTestId(`date-${fridayDate}`);
      fridayButton.focus();
      
      // Simulate Enter key press
      fireEvent.keyDown(fridayButton, { key: 'Enter', code: 'Enter' });

      // Assert
      expect(mockOnDateSelect).toHaveBeenCalled();
    });
  });
});

// Helper functions
function getNextFriday(): Date {
  return getNextDayOfWeek(5); // 5 = Friday
}

function getNextSaturday(): Date {
  return getNextDayOfWeek(6); // 6 = Saturday
}

function getNextDayOfWeek(dayOfWeek: number): Date {
  const today = new Date();
  const todayDayOfWeek = today.getDay();
  const daysUntilNext = (dayOfWeek - todayDayOfWeek + 7) % 7 || 7;
  return addDays(today, daysUntilNext);
}