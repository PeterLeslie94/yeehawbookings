import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ExtraSelection from '@/app/components/booking/ExtraSelection';
import { Extra, SelectedExtra } from '@/app/types/booking';

// Mock fetch
global.fetch = jest.fn();

describe('ExtraSelection Component', () => {
  const mockOnExtrasSelect = jest.fn();
  const defaultProps = {
    selectedDate: '2024-12-20',
    onExtrasSelect: mockOnExtrasSelect,
  };

  const mockExtrasResponse = {
    extras: [
      {
        id: '1',
        name: 'Premium Champagne Bottle',
        description: 'Dom Perignon',
        price: 350.00,
        isActive: true,
        availability: {
          availableQuantity: 5,
          isAvailable: true,
          totalQuantity: 10,
        },
      },
      {
        id: '2',
        name: 'VIP Bottle Service',
        description: 'Grey Goose with mixers',
        price: 250.00,
        isActive: true,
        availability: {
          availableQuantity: 3,
          isAvailable: true,
          totalQuantity: 5,
        },
      },
      {
        id: '3',
        name: 'Birthday Package',
        description: 'Decorations and cake',
        price: 150.00,
        isActive: true,
        availability: {
          availableQuantity: 0,
          isAvailable: false,
          totalQuantity: 2,
        },
      },
    ],
    date: '2024-12-20',
    timezone: 'Europe/London',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockExtrasResponse,
    });
  });

  describe('Rendering', () => {
    it('should render loading state initially', () => {
      render(<ExtraSelection {...defaultProps} />);
      expect(screen.getByText('Loading available extras...')).toBeInTheDocument();
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('should render extras list after loading', async () => {
      render(<ExtraSelection {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Premium Champagne Bottle')).toBeInTheDocument();
        expect(screen.getByText('VIP Bottle Service')).toBeInTheDocument();
        expect(screen.getByText('Birthday Package')).toBeInTheDocument();
      });
    });

    it('should display prices correctly', async () => {
      render(<ExtraSelection {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('£350.00')).toBeInTheDocument();
        expect(screen.getByText('£250.00')).toBeInTheDocument();
        expect(screen.getByText('£150.00')).toBeInTheDocument();
      });
    });

    it('should display descriptions', async () => {
      render(<ExtraSelection {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Dom Perignon')).toBeInTheDocument();
        expect(screen.getByText('Grey Goose with mixers')).toBeInTheDocument();
        expect(screen.getByText('Decorations and cake')).toBeInTheDocument();
      });
    });

    it('should show availability status', async () => {
      render(<ExtraSelection {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('5 available')).toBeInTheDocument();
        expect(screen.getByText('3 available')).toBeInTheDocument();
        expect(screen.getByText('Out of stock')).toBeInTheDocument();
      });
    });

    it('should show running total', async () => {
      render(<ExtraSelection {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Total: £0.00')).toBeInTheDocument();
      });
    });
  });

  describe('Quantity Controls', () => {
    it('should increment quantity when plus button clicked', async () => {
      const user = userEvent.setup();
      render(<ExtraSelection {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Premium Champagne Bottle')).toBeInTheDocument();
      });

      const plusButton = screen.getAllByRole('button', { name: /increase quantity/i })[0];
      await user.click(plusButton);

      expect(screen.getByTestId('quantity-1')).toHaveTextContent('1');
    });

    it('should decrement quantity when minus button clicked', async () => {
      const user = userEvent.setup();
      render(<ExtraSelection {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Premium Champagne Bottle')).toBeInTheDocument();
      });

      const plusButton = screen.getAllByRole('button', { name: /increase quantity/i })[0];
      const minusButton = screen.getAllByRole('button', { name: /decrease quantity/i })[0];

      await user.click(plusButton);
      await user.click(plusButton);
      expect(screen.getByTestId('quantity-1')).toHaveTextContent('2');

      await user.click(minusButton);
      expect(screen.getByTestId('quantity-1')).toHaveTextContent('1');
    });

    it('should not increment beyond available quantity', async () => {
      const user = userEvent.setup();
      render(<ExtraSelection {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Premium Champagne Bottle')).toBeInTheDocument();
      });

      const plusButton = screen.getAllByRole('button', { name: /increase quantity/i })[0];

      // Click 6 times (availability is 5)
      for (let i = 0; i < 6; i++) {
        await user.click(plusButton);
      }

      expect(screen.getByTestId('quantity-1')).toHaveTextContent('5');
    });

    it('should not decrement below 0', async () => {
      const user = userEvent.setup();
      render(<ExtraSelection {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Premium Champagne Bottle')).toBeInTheDocument();
      });

      const minusButton = screen.getAllByRole('button', { name: /decrease quantity/i })[0];

      await user.click(minusButton);
      expect(screen.getByTestId('quantity-1')).toHaveTextContent('0');
    });

    it('should disable controls for out of stock items', async () => {
      render(<ExtraSelection {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Birthday Package')).toBeInTheDocument();
      });

      const outOfStockItem = screen.getByTestId('extra-item-3');
      const plusButton = within(outOfStockItem).getByRole('button', { name: /increase quantity/i });
      const minusButton = within(outOfStockItem).getByRole('button', { name: /decrease quantity/i });

      expect(plusButton).toBeDisabled();
      expect(minusButton).toBeDisabled();
      expect(within(outOfStockItem).getByTestId('quantity-3')).toHaveTextContent('0');
    });
  });

  describe('Total Calculation', () => {
    it('should update total when quantities change', async () => {
      const user = userEvent.setup();
      render(<ExtraSelection {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Premium Champagne Bottle')).toBeInTheDocument();
      });

      const plusButton1 = screen.getAllByRole('button', { name: /increase quantity/i })[0];
      const plusButton2 = screen.getAllByRole('button', { name: /increase quantity/i })[1];

      await user.click(plusButton1); // 1 * £350
      expect(screen.getByText('Total: £350.00')).toBeInTheDocument();

      await user.click(plusButton2); // + 1 * £250
      expect(screen.getByText('Total: £600.00')).toBeInTheDocument();

      await user.click(plusButton1); // + 1 * £350
      expect(screen.getByText('Total: £950.00')).toBeInTheDocument();
    });

    it('should decrease total when quantities decrease', async () => {
      const user = userEvent.setup();
      render(<ExtraSelection {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Premium Champagne Bottle')).toBeInTheDocument();
      });

      const plusButton = screen.getAllByRole('button', { name: /increase quantity/i })[0];
      const minusButton = screen.getAllByRole('button', { name: /decrease quantity/i })[0];

      await user.click(plusButton);
      await user.click(plusButton);
      expect(screen.getByText('Total: £700.00')).toBeInTheDocument();

      await user.click(minusButton);
      expect(screen.getByText('Total: £350.00')).toBeInTheDocument();
    });
  });

  describe('Callback Function', () => {
    it('should call onExtrasSelect when extras are selected', async () => {
      const user = userEvent.setup();
      render(<ExtraSelection {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Premium Champagne Bottle')).toBeInTheDocument();
      });

      const plusButton = screen.getAllByRole('button', { name: /increase quantity/i })[0];
      await user.click(plusButton);

      await waitFor(() => {
        expect(mockOnExtrasSelect).toHaveBeenCalledWith([
          {
            id: '1',
            name: 'Premium Champagne Bottle',
            price: 350.00,
            quantity: 1,
            totalPrice: 350.00,
          },
        ]);
      });
    });

    it('should update callback when multiple extras selected', async () => {
      const user = userEvent.setup();
      render(<ExtraSelection {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Premium Champagne Bottle')).toBeInTheDocument();
      });

      const plusButton1 = screen.getAllByRole('button', { name: /increase quantity/i })[0];
      const plusButton2 = screen.getAllByRole('button', { name: /increase quantity/i })[1];

      await user.click(plusButton1);
      await user.click(plusButton2);

      await waitFor(() => {
        expect(mockOnExtrasSelect).toHaveBeenLastCalledWith([
          {
            id: '1',
            name: 'Premium Champagne Bottle',
            price: 350.00,
            quantity: 1,
            totalPrice: 350.00,
          },
          {
            id: '2',
            name: 'VIP Bottle Service',
            price: 250.00,
            quantity: 1,
            totalPrice: 250.00,
          },
        ]);
      });
    });

    it('should remove extras from selection when quantity becomes 0', async () => {
      const user = userEvent.setup();
      render(<ExtraSelection {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Premium Champagne Bottle')).toBeInTheDocument();
      });

      const plusButton = screen.getAllByRole('button', { name: /increase quantity/i })[0];
      const minusButton = screen.getAllByRole('button', { name: /decrease quantity/i })[0];

      await user.click(plusButton);
      await user.click(minusButton);

      await waitFor(() => {
        expect(mockOnExtrasSelect).toHaveBeenLastCalledWith([]);
      });
    });
  });

  describe('Initial Extras', () => {
    it('should display initial extras if provided', async () => {
      const initialExtras: SelectedExtra[] = [
        {
          id: '1',
          name: 'Premium Champagne Bottle',
          price: 350.00,
          quantity: 2,
          totalPrice: 700.00,
        },
      ];

      render(<ExtraSelection {...defaultProps} initialExtras={initialExtras} />);

      await waitFor(() => {
        expect(screen.getByTestId('quantity-1')).toHaveTextContent('2');
        expect(screen.getByText('Total: £700.00')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error when API fails', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      render(<ExtraSelection {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/Error loading extras:/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      });
    });

    it('should retry on error', async () => {
      const user = userEvent.setup();
      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockExtrasResponse,
        });

      render(<ExtraSelection {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /try again/i }));

      await waitFor(() => {
        expect(screen.getByText('Premium Champagne Bottle')).toBeInTheDocument();
      });
    });

    it('should handle API error response', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      render(<ExtraSelection {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/Failed to fetch extras/)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', async () => {
      render(<ExtraSelection {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('region', { name: /extra selection/i })).toBeInTheDocument();
        expect(screen.getAllByRole('button', { name: /increase quantity/i })).toHaveLength(3);
        expect(screen.getAllByRole('button', { name: /decrease quantity/i })).toHaveLength(3);
      });
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<ExtraSelection {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Premium Champagne Bottle')).toBeInTheDocument();
      });

      const firstPlusButton = screen.getAllByRole('button', { name: /increase quantity/i })[0];
      firstPlusButton.focus();

      await user.keyboard('{Enter}');
      expect(screen.getByTestId('quantity-1')).toHaveTextContent('1');
    });

    it('should announce changes to screen readers', async () => {
      const user = userEvent.setup();
      render(<ExtraSelection {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Premium Champagne Bottle')).toBeInTheDocument();
      });

      const plusButton = screen.getAllByRole('button', { name: /increase quantity/i })[0];
      await user.click(plusButton);

      const announcement = screen.getByRole('status', { name: /quantity updated/i });
      expect(announcement).toBeInTheDocument();
    });
  });

  describe('CSS Classes', () => {
    it('should apply custom className if provided', async () => {
      render(<ExtraSelection {...defaultProps} className="custom-class" />);

      await waitFor(() => {
        expect(screen.getByRole('region', { name: /extra selection/i })).toHaveClass('custom-class');
      });
    });
  });
});