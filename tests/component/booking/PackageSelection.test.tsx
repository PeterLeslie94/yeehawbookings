import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import PackageSelection from '../../../src/components/booking/PackageSelection';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

// Mock next-auth
jest.mock('next-auth/react', () => ({
  useSession: () => ({ data: null, status: 'unauthenticated' })
}));

// Mock fetch globally
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

describe('PackageSelection', () => {
  const mockOnNext = jest.fn();
  const mockOnBack = jest.fn();
  const selectedDate = '2024-06-15';
  const maxGuests = 50;

  const mockPackages = [
    {
      id: 1,
      name: 'Boots & BBQ Package',
      description: 'Full BBQ dinner with entertainment',
      defaultPrice: 75.00,
      maxGuests: 100,
      inclusions: ['BBQ Dinner', 'Line Dancing', 'Live Music'],
      isActive: true
    },
    {
      id: 2,
      name: 'Just Dancin Package',
      description: 'Dance floor access and light refreshments',
      defaultPrice: 35.00,
      maxGuests: 150,
      inclusions: ['Dance Floor Access', 'Refreshments', 'DJ'],
      isActive: true
    },
    {
      id: 3,
      name: 'VIP Ranch Experience',
      description: 'Premium all-inclusive experience',
      defaultPrice: 125.00,
      maxGuests: 50,
      inclusions: ['Premium Dinner', 'Private Area', 'Photo Booth', 'Gift Bag'],
      isActive: true
    }
  ];

  const mockPricing = [
    { packageId: 1, date: selectedDate, price: 85.00 },
    { packageId: 2, date: selectedDate, price: 35.00 },
    { packageId: 3, date: selectedDate, price: 150.00 }
  ];

  const mockAvailability = [
    { packageId: 1, date: selectedDate, spotsAvailable: 75, totalSpots: 100 },
    { packageId: 2, date: selectedDate, spotsAvailable: 120, totalSpots: 150 },
    { packageId: 3, date: selectedDate, spotsAvailable: 5, totalSpots: 50 }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.MockedFunction<typeof fetch>).mockImplementation((url) => {
      if (typeof url === 'string' && url.includes('/api/packages') && !url.includes('availability') && !url.includes('pricing')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ packages: mockPackages })
        } as Response);
      }
      if (typeof url === 'string' && url.includes('/api/packages/pricing')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ pricing: mockPricing })
        } as Response);
      }
      if (typeof url === 'string' && url.includes('/api/packages/availability')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ availability: mockAvailability })
        } as Response);
      }
      return Promise.reject(new Error('Unknown API endpoint'));
    });
  });

  describe('Rendering', () => {
    it('renders the component with heading and description', async () => {
      render(
        <PackageSelection
          selectedDate={selectedDate}
          maxGuests={maxGuests}
          onNext={mockOnNext}
          onBack={mockOnBack}
        />
      );

      expect(screen.getByRole('heading', { name: /select your package/i })).toBeInTheDocument();
      expect(screen.getByText(/choose the perfect package for your group/i)).toBeInTheDocument();
    });

    it('displays loading state while fetching data', () => {
      render(
        <PackageSelection
          selectedDate={selectedDate}
          maxGuests={maxGuests}
          onNext={mockOnNext}
          onBack={mockOnBack}
        />
      );

      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText(/loading packages/i)).toBeInTheDocument();
    });

    it('displays all available packages after loading', async () => {
      render(
        <PackageSelection
          selectedDate={selectedDate}
          maxGuests={maxGuests}
          onNext={mockOnNext}
          onBack={mockOnBack}
        />
      );

      await waitFor(() => {
        mockPackages.forEach(pkg => {
          expect(screen.getByText(pkg.name)).toBeInTheDocument();
          expect(screen.getByText(pkg.description)).toBeInTheDocument();
        });
      });
    });

    it('displays package inclusions', async () => {
      render(
        <PackageSelection
          selectedDate={selectedDate}
          maxGuests={maxGuests}
          onNext={mockOnNext}
          onBack={mockOnBack}
        />
      );

      await waitFor(() => {
        // Check first package inclusions
        expect(screen.getByText('BBQ Dinner')).toBeInTheDocument();
        expect(screen.getByText('Line Dancing')).toBeInTheDocument();
        expect(screen.getByText('Live Music')).toBeInTheDocument();
      });
    });

    it('shows navigation buttons', async () => {
      render(
        <PackageSelection
          selectedDate={selectedDate}
          maxGuests={maxGuests}
          onNext={mockOnNext}
          onBack={mockOnBack}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
      });
    });
  });

  describe('Pricing Display', () => {
    it('displays day-specific pricing for each package', async () => {
      render(
        <PackageSelection
          selectedDate={selectedDate}
          maxGuests={maxGuests}
          onNext={mockOnNext}
          onBack={mockOnBack}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('$85.00')).toBeInTheDocument(); // Boots & BBQ
        expect(screen.getByText('$35.00')).toBeInTheDocument(); // Just Dancin
        expect(screen.getByText('$150.00')).toBeInTheDocument(); // VIP Ranch
      });
    });

    it('shows per person pricing label', async () => {
      render(
        <PackageSelection
          selectedDate={selectedDate}
          maxGuests={maxGuests}
          onNext={mockOnNext}
          onBack={mockOnBack}
        />
      );

      await waitFor(() => {
        const perPersonLabels = screen.getAllByText(/per person/i);
        expect(perPersonLabels).toHaveLength(3);
      });
    });

    it('falls back to default pricing if no day-specific pricing', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockImplementation((url) => {
        if (typeof url === 'string' && url.includes('/api/packages/pricing')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ pricing: [] }) // No day-specific pricing
          } as Response);
        }
        if (typeof url === 'string' && url.includes('/api/packages') && !url.includes('availability')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ packages: mockPackages })
          } as Response);
        }
        if (typeof url === 'string' && url.includes('/api/packages/availability')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ availability: mockAvailability })
          } as Response);
        }
        return Promise.reject(new Error('Unknown API endpoint'));
      });

      render(
        <PackageSelection
          selectedDate={selectedDate}
          maxGuests={maxGuests}
          onNext={mockOnNext}
          onBack={mockOnBack}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('$75.00')).toBeInTheDocument(); // Default price
        expect(screen.getByText('$35.00')).toBeInTheDocument();
        expect(screen.getByText('$125.00')).toBeInTheDocument();
      });
    });
  });

  describe('Availability Display', () => {
    it('shows real-time availability for each package', async () => {
      render(
        <PackageSelection
          selectedDate={selectedDate}
          maxGuests={maxGuests}
          onNext={mockOnNext}
          onBack={mockOnBack}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('75 spots available')).toBeInTheDocument();
        expect(screen.getByText('120 spots available')).toBeInTheDocument();
        expect(screen.getByText('5 spots available')).toBeInTheDocument();
      });
    });

    it('shows limited availability warning when spots are low', async () => {
      render(
        <PackageSelection
          selectedDate={selectedDate}
          maxGuests={maxGuests}
          onNext={mockOnNext}
          onBack={mockOnBack}
        />
      );

      await waitFor(() => {
        const vipPackage = screen.getByText('VIP Ranch Experience').closest('[role="article"]');
        expect(within(vipPackage!).getByText(/limited availability/i)).toBeInTheDocument();
      });
    });

    it('disables package selection when sold out', async () => {
      const soldOutAvailability = [
        { packageId: 1, date: selectedDate, spotsAvailable: 0, totalSpots: 100 },
        { packageId: 2, date: selectedDate, spotsAvailable: 120, totalSpots: 150 },
        { packageId: 3, date: selectedDate, spotsAvailable: 5, totalSpots: 50 }
      ];

      (global.fetch as jest.MockedFunction<typeof fetch>).mockImplementation((url) => {
        if (typeof url === 'string' && url.includes('/api/packages/availability')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ availability: soldOutAvailability })
          } as Response);
        }
        if (typeof url === 'string' && url.includes('/api/packages') && !url.includes('pricing')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ packages: mockPackages })
          } as Response);
        }
        if (typeof url === 'string' && url.includes('/api/packages/pricing')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ pricing: mockPricing })
          } as Response);
        }
        return Promise.reject(new Error('Unknown API endpoint'));
      });

      render(
        <PackageSelection
          selectedDate={selectedDate}
          maxGuests={maxGuests}
          onNext={mockOnNext}
          onBack={mockOnBack}
        />
      );

      await waitFor(() => {
        const bbqPackage = screen.getByText('Boots & BBQ Package').closest('[role="article"]');
        expect(within(bbqPackage!).getByText(/sold out/i)).toBeInTheDocument();
        expect(within(bbqPackage!).getByRole('button', { name: /\+/i })).toBeDisabled();
      });
    });
  });

  describe('Quantity Selection', () => {
    it('displays quantity selector for each package', async () => {
      render(
        <PackageSelection
          selectedDate={selectedDate}
          maxGuests={maxGuests}
          onNext={mockOnNext}
          onBack={mockOnBack}
        />
      );

      await waitFor(() => {
        const incrementButtons = screen.getAllByRole('button', { name: /\+/i });
        const decrementButtons = screen.getAllByRole('button', { name: /-/i });
        const quantityInputs = screen.getAllByRole('spinbutton');

        expect(incrementButtons).toHaveLength(3);
        expect(decrementButtons).toHaveLength(3);
        expect(quantityInputs).toHaveLength(3);
      });
    });

    it('increments quantity when plus button clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <PackageSelection
          selectedDate={selectedDate}
          maxGuests={maxGuests}
          onNext={mockOnNext}
          onBack={mockOnBack}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Boots & BBQ Package')).toBeInTheDocument();
      });

      const bbqPackage = screen.getByText('Boots & BBQ Package').closest('[role="article"]');
      const incrementButton = within(bbqPackage!).getByRole('button', { name: /\+/i });
      const quantityInput = within(bbqPackage!).getByRole('spinbutton');

      expect(quantityInput).toHaveValue(0);

      await user.click(incrementButton);
      expect(quantityInput).toHaveValue(1);

      await user.click(incrementButton);
      expect(quantityInput).toHaveValue(2);
    });

    it('decrements quantity when minus button clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <PackageSelection
          selectedDate={selectedDate}
          maxGuests={maxGuests}
          onNext={mockOnNext}
          onBack={mockOnBack}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Boots & BBQ Package')).toBeInTheDocument();
      });

      const bbqPackage = screen.getByText('Boots & BBQ Package').closest('[role="article"]');
      const incrementButton = within(bbqPackage!).getByRole('button', { name: /\+/i });
      const decrementButton = within(bbqPackage!).getByRole('button', { name: /-/i });
      const quantityInput = within(bbqPackage!).getByRole('spinbutton');

      // First increment to 2
      await user.click(incrementButton);
      await user.click(incrementButton);
      expect(quantityInput).toHaveValue(2);

      // Then decrement
      await user.click(decrementButton);
      expect(quantityInput).toHaveValue(1);
    });

    it('prevents quantity from going below 0', async () => {
      const user = userEvent.setup();
      
      render(
        <PackageSelection
          selectedDate={selectedDate}
          maxGuests={maxGuests}
          onNext={mockOnNext}
          onBack={mockOnBack}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Boots & BBQ Package')).toBeInTheDocument();
      });

      const bbqPackage = screen.getByText('Boots & BBQ Package').closest('[role="article"]');
      const decrementButton = within(bbqPackage!).getByRole('button', { name: /-/i });
      const quantityInput = within(bbqPackage!).getByRole('spinbutton');

      expect(quantityInput).toHaveValue(0);
      expect(decrementButton).toBeDisabled();

      await user.click(decrementButton);
      expect(quantityInput).toHaveValue(0);
    });

    it('limits quantity to available spots', async () => {
      const user = userEvent.setup();
      
      render(
        <PackageSelection
          selectedDate={selectedDate}
          maxGuests={maxGuests}
          onNext={mockOnNext}
          onBack={mockOnBack}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('VIP Ranch Experience')).toBeInTheDocument();
      });

      const vipPackage = screen.getByText('VIP Ranch Experience').closest('[role="article"]');
      const incrementButton = within(vipPackage!).getByRole('button', { name: /\+/i });
      const quantityInput = within(vipPackage!).getByRole('spinbutton');

      // VIP has only 5 spots available
      for (let i = 0; i < 10; i++) {
        await user.click(incrementButton);
      }

      expect(quantityInput).toHaveValue(5); // Should not exceed available spots
    });

    it('limits total quantity across all packages to maxGuests', async () => {
      const user = userEvent.setup();
      
      render(
        <PackageSelection
          selectedDate={selectedDate}
          maxGuests={20} // Lower limit for testing
          onNext={mockOnNext}
          onBack={mockOnBack}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Boots & BBQ Package')).toBeInTheDocument();
      });

      const bbqPackage = screen.getByText('Boots & BBQ Package').closest('[role="article"]');
      const dancingPackage = screen.getByText('Just Dancin Package').closest('[role="article"]');
      
      const bbqIncrement = within(bbqPackage!).getByRole('button', { name: /\+/i });
      const dancingIncrement = within(dancingPackage!).getByRole('button', { name: /\+/i });

      // Add 15 to BBQ
      for (let i = 0; i < 15; i++) {
        await user.click(bbqIncrement);
      }

      // Try to add 10 more to Dancing (should only allow 5)
      for (let i = 0; i < 10; i++) {
        await user.click(dancingIncrement);
      }

      const bbqQuantity = within(bbqPackage!).getByRole('spinbutton');
      const dancingQuantity = within(dancingPackage!).getByRole('spinbutton');

      expect(bbqQuantity).toHaveValue(15);
      expect(dancingQuantity).toHaveValue(5); // Total should not exceed 20
    });

    it('allows direct input of quantity', async () => {
      const user = userEvent.setup();
      
      render(
        <PackageSelection
          selectedDate={selectedDate}
          maxGuests={maxGuests}
          onNext={mockOnNext}
          onBack={mockOnBack}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Boots & BBQ Package')).toBeInTheDocument();
      });

      const bbqPackage = screen.getByText('Boots & BBQ Package').closest('[role="article"]');
      const quantityInput = within(bbqPackage!).getByRole('spinbutton');

      await user.clear(quantityInput);
      await user.type(quantityInput, '25');

      expect(quantityInput).toHaveValue(25);
    });
  });

  describe('Package Details Modal', () => {
    it('opens modal when "View Details" is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <PackageSelection
          selectedDate={selectedDate}
          maxGuests={maxGuests}
          onNext={mockOnNext}
          onBack={mockOnBack}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Boots & BBQ Package')).toBeInTheDocument();
      });

      const bbqPackage = screen.getByText('Boots & BBQ Package').closest('[role="article"]');
      const detailsButton = within(bbqPackage!).getByRole('button', { name: /view details/i });

      await user.click(detailsButton);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Boots & BBQ Package' })).toBeInTheDocument();
    });

    it('displays full package information in modal', async () => {
      const user = userEvent.setup();
      
      render(
        <PackageSelection
          selectedDate={selectedDate}
          maxGuests={maxGuests}
          onNext={mockOnNext}
          onBack={mockOnBack}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Boots & BBQ Package')).toBeInTheDocument();
      });

      const bbqPackage = screen.getByText('Boots & BBQ Package').closest('[role="article"]');
      const detailsButton = within(bbqPackage!).getByRole('button', { name: /view details/i });

      await user.click(detailsButton);

      const modal = screen.getByRole('dialog');
      expect(within(modal).getByText('Full BBQ dinner with entertainment')).toBeInTheDocument();
      expect(within(modal).getByText(/\$85\.00 per person/i)).toBeInTheDocument();
      expect(within(modal).getByText('BBQ Dinner')).toBeInTheDocument();
      expect(within(modal).getByText('Line Dancing')).toBeInTheDocument();
      expect(within(modal).getByText('Live Music')).toBeInTheDocument();
    });

    it('closes modal when close button clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <PackageSelection
          selectedDate={selectedDate}
          maxGuests={maxGuests}
          onNext={mockOnNext}
          onBack={mockOnBack}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Boots & BBQ Package')).toBeInTheDocument();
      });

      const bbqPackage = screen.getByText('Boots & BBQ Package').closest('[role="article"]');
      const detailsButton = within(bbqPackage!).getByRole('button', { name: /view details/i });

      await user.click(detailsButton);
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('closes modal when clicking outside', async () => {
      const user = userEvent.setup();
      
      render(
        <PackageSelection
          selectedDate={selectedDate}
          maxGuests={maxGuests}
          onNext={mockOnNext}
          onBack={mockOnBack}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Boots & BBQ Package')).toBeInTheDocument();
      });

      const bbqPackage = screen.getByText('Boots & BBQ Package').closest('[role="article"]');
      const detailsButton = within(bbqPackage!).getByRole('button', { name: /view details/i });

      await user.click(detailsButton);
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // Click on overlay
      const overlay = screen.getByRole('dialog').parentElement;
      await user.click(overlay!);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });
  });

  describe('Total Calculation', () => {
    it('displays running total of selected packages', async () => {
      const user = userEvent.setup();
      
      render(
        <PackageSelection
          selectedDate={selectedDate}
          maxGuests={maxGuests}
          onNext={mockOnNext}
          onBack={mockOnBack}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Boots & BBQ Package')).toBeInTheDocument();
      });

      expect(screen.getByText(/total: \$0\.00/i)).toBeInTheDocument();

      const bbqPackage = screen.getByText('Boots & BBQ Package').closest('[role="article"]');
      const bbqIncrement = within(bbqPackage!).getByRole('button', { name: /\+/i });

      await user.click(bbqIncrement);
      await user.click(bbqIncrement);

      expect(screen.getByText(/total: \$170\.00/i)).toBeInTheDocument(); // 2 × $85
    });

    it('updates total when quantities change', async () => {
      const user = userEvent.setup();
      
      render(
        <PackageSelection
          selectedDate={selectedDate}
          maxGuests={maxGuests}
          onNext={mockOnNext}
          onBack={mockOnBack}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Boots & BBQ Package')).toBeInTheDocument();
      });

      const bbqPackage = screen.getByText('Boots & BBQ Package').closest('[role="article"]');
      const dancingPackage = screen.getByText('Just Dancin Package').closest('[role="article"]');
      
      const bbqIncrement = within(bbqPackage!).getByRole('button', { name: /\+/i });
      const dancingIncrement = within(dancingPackage!).getByRole('button', { name: /\+/i });

      // Add 2 BBQ ($85 each)
      await user.click(bbqIncrement);
      await user.click(bbqIncrement);

      // Add 3 Dancing ($35 each)
      await user.click(dancingIncrement);
      await user.click(dancingIncrement);
      await user.click(dancingIncrement);

      expect(screen.getByText(/total: \$275\.00/i)).toBeInTheDocument(); // (2×85) + (3×35)
    });

    it('shows guest count summary', async () => {
      const user = userEvent.setup();
      
      render(
        <PackageSelection
          selectedDate={selectedDate}
          maxGuests={maxGuests}
          onNext={mockOnNext}
          onBack={mockOnBack}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Boots & BBQ Package')).toBeInTheDocument();
      });

      expect(screen.getByText(/0 \/ 50 guests selected/i)).toBeInTheDocument();

      const bbqPackage = screen.getByText('Boots & BBQ Package').closest('[role="article"]');
      const bbqIncrement = within(bbqPackage!).getByRole('button', { name: /\+/i });

      await user.click(bbqIncrement);
      await user.click(bbqIncrement);
      await user.click(bbqIncrement);

      expect(screen.getByText(/3 \/ 50 guests selected/i)).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('disables continue button when no packages selected', async () => {
      render(
        <PackageSelection
          selectedDate={selectedDate}
          maxGuests={maxGuests}
          onNext={mockOnNext}
          onBack={mockOnBack}
        />
      );

      await waitFor(() => {
        const continueButton = screen.getByRole('button', { name: /continue/i });
        expect(continueButton).toBeDisabled();
      });
    });

    it('enables continue button when at least one package is selected', async () => {
      const user = userEvent.setup();
      
      render(
        <PackageSelection
          selectedDate={selectedDate}
          maxGuests={maxGuests}
          onNext={mockOnNext}
          onBack={mockOnBack}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Boots & BBQ Package')).toBeInTheDocument();
      });

      const continueButton = screen.getByRole('button', { name: /continue/i });
      expect(continueButton).toBeDisabled();

      const bbqPackage = screen.getByText('Boots & BBQ Package').closest('[role="article"]');
      const bbqIncrement = within(bbqPackage!).getByRole('button', { name: /\+/i });

      await user.click(bbqIncrement);

      expect(continueButton).toBeEnabled();
    });

    it('shows error when trying to continue without selection', async () => {
      const user = userEvent.setup();
      
      render(
        <PackageSelection
          selectedDate={selectedDate}
          maxGuests={maxGuests}
          onNext={mockOnNext}
          onBack={mockOnBack}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Boots & BBQ Package')).toBeInTheDocument();
      });

      // Force enable the button for testing
      const continueButton = screen.getByRole('button', { name: /continue/i });
      fireEvent.click(continueButton);

      expect(screen.getByText(/please select at least one package/i)).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('calls onBack when back button clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <PackageSelection
          selectedDate={selectedDate}
          maxGuests={maxGuests}
          onNext={mockOnNext}
          onBack={mockOnBack}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Boots & BBQ Package')).toBeInTheDocument();
      });

      const backButton = screen.getByRole('button', { name: /back/i });
      await user.click(backButton);

      expect(mockOnBack).toHaveBeenCalledTimes(1);
    });

    it('calls onNext with selected packages when continue clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <PackageSelection
          selectedDate={selectedDate}
          maxGuests={maxGuests}
          onNext={mockOnNext}
          onBack={mockOnBack}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Boots & BBQ Package')).toBeInTheDocument();
      });

      const bbqPackage = screen.getByText('Boots & BBQ Package').closest('[role="article"]');
      const dancingPackage = screen.getByText('Just Dancin Package').closest('[role="article"]');
      
      const bbqIncrement = within(bbqPackage!).getByRole('button', { name: /\+/i });
      const dancingIncrement = within(dancingPackage!).getByRole('button', { name: /\+/i });

      await user.click(bbqIncrement);
      await user.click(bbqIncrement);
      await user.click(dancingIncrement);

      const continueButton = screen.getByRole('button', { name: /continue/i });
      await user.click(continueButton);

      expect(mockOnNext).toHaveBeenCalledWith([
        { packageId: 1, quantity: 2, price: 85.00 },
        { packageId: 2, quantity: 1, price: 35.00 }
      ]);
    });
  });

  describe('Error Handling', () => {
    it('displays error message when package fetch fails', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(
        new Error('Network error')
      );

      render(
        <PackageSelection
          selectedDate={selectedDate}
          maxGuests={maxGuests}
          onNext={mockOnNext}
          onBack={mockOnBack}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/failed to load packages/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });

    it('retries fetch when retry button clicked', async () => {
      const user = userEvent.setup();
      
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockImplementation((url) => {
          if (typeof url === 'string' && url.includes('/api/packages') && !url.includes('availability') && !url.includes('pricing')) {
            return Promise.resolve({
              ok: true,
              json: async () => ({ packages: mockPackages })
            } as Response);
          }
          if (typeof url === 'string' && url.includes('/api/packages/pricing')) {
            return Promise.resolve({
              ok: true,
              json: async () => ({ pricing: mockPricing })
            } as Response);
          }
          if (typeof url === 'string' && url.includes('/api/packages/availability')) {
            return Promise.resolve({
              ok: true,
              json: async () => ({ availability: mockAvailability })
            } as Response);
          }
          return Promise.reject(new Error('Unknown API endpoint'));
        });

      render(
        <PackageSelection
          selectedDate={selectedDate}
          maxGuests={maxGuests}
          onNext={mockOnNext}
          onBack={mockOnBack}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/failed to load packages/i)).toBeInTheDocument();
      });

      const retryButton = screen.getByRole('button', { name: /retry/i });
      await user.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('Boots & BBQ Package')).toBeInTheDocument();
      });
    });

    it('handles pricing API failure gracefully', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockImplementation((url) => {
        if (typeof url === 'string' && url.includes('/api/packages/pricing')) {
          return Promise.reject(new Error('Pricing API error'));
        }
        if (typeof url === 'string' && url.includes('/api/packages') && !url.includes('availability')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ packages: mockPackages })
          } as Response);
        }
        if (typeof url === 'string' && url.includes('/api/packages/availability')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ availability: mockAvailability })
          } as Response);
        }
        return Promise.reject(new Error('Unknown API endpoint'));
      });

      render(
        <PackageSelection
          selectedDate={selectedDate}
          maxGuests={maxGuests}
          onNext={mockOnNext}
          onBack={mockOnBack}
        />
      );

      await waitFor(() => {
        // Should still show packages with default pricing
        expect(screen.getByText('Boots & BBQ Package')).toBeInTheDocument();
        expect(screen.getByText('$75.00')).toBeInTheDocument(); // Default price
      });
    });

    it('handles availability API failure gracefully', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockImplementation((url) => {
        if (typeof url === 'string' && url.includes('/api/packages/availability')) {
          return Promise.reject(new Error('Availability API error'));
        }
        if (typeof url === 'string' && url.includes('/api/packages') && !url.includes('pricing')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ packages: mockPackages })
          } as Response);
        }
        if (typeof url === 'string' && url.includes('/api/packages/pricing')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ pricing: mockPricing })
          } as Response);
        }
        return Promise.reject(new Error('Unknown API endpoint'));
      });

      render(
        <PackageSelection
          selectedDate={selectedDate}
          maxGuests={maxGuests}
          onNext={mockOnNext}
          onBack={mockOnBack}
        />
      );

      await waitFor(() => {
        // Should still show packages without availability info
        expect(screen.getByText('Boots & BBQ Package')).toBeInTheDocument();
        expect(screen.queryByText(/spots available/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for quantity controls', async () => {
      render(
        <PackageSelection
          selectedDate={selectedDate}
          maxGuests={maxGuests}
          onNext={mockOnNext}
          onBack={mockOnBack}
        />
      );

      await waitFor(() => {
        const spinbuttons = screen.getAllByRole('spinbutton');
        spinbuttons.forEach((input, index) => {
          expect(input).toHaveAttribute('aria-label', expect.stringContaining('Quantity for'));
        });
      });
    });

    it('announces availability status to screen readers', async () => {
      render(
        <PackageSelection
          selectedDate={selectedDate}
          maxGuests={maxGuests}
          onNext={mockOnNext}
          onBack={mockOnBack}
        />
      );

      await waitFor(() => {
        const availabilityTexts = screen.getAllByText(/spots available/i);
        availabilityTexts.forEach(text => {
          expect(text).toHaveAttribute('aria-live', 'polite');
        });
      });
    });

    it('has proper focus management for modal', async () => {
      const user = userEvent.setup();
      
      render(
        <PackageSelection
          selectedDate={selectedDate}
          maxGuests={maxGuests}
          onNext={mockOnNext}
          onBack={mockOnBack}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Boots & BBQ Package')).toBeInTheDocument();
      });

      const bbqPackage = screen.getByText('Boots & BBQ Package').closest('[role="article"]');
      const detailsButton = within(bbqPackage!).getByRole('button', { name: /view details/i });

      await user.click(detailsButton);

      const modal = screen.getByRole('dialog');
      expect(modal).toHaveFocus();
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      
      render(
        <PackageSelection
          selectedDate={selectedDate}
          maxGuests={maxGuests}
          onNext={mockOnNext}
          onBack={mockOnBack}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Boots & BBQ Package')).toBeInTheDocument();
      });

      const bbqPackage = screen.getByText('Boots & BBQ Package').closest('[role="article"]');
      const quantityInput = within(bbqPackage!).getByRole('spinbutton');

      await user.click(quantityInput);
      await user.keyboard('{ArrowUp}');
      expect(quantityInput).toHaveValue(1);

      await user.keyboard('{ArrowUp}');
      expect(quantityInput).toHaveValue(2);

      await user.keyboard('{ArrowDown}');
      expect(quantityInput).toHaveValue(1);
    });

    it('provides clear error messages for screen readers', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(
        new Error('Network error')
      );

      render(
        <PackageSelection
          selectedDate={selectedDate}
          maxGuests={maxGuests}
          onNext={mockOnNext}
          onBack={mockOnBack}
        />
      );

      await waitFor(() => {
        const errorMessage = screen.getByText(/failed to load packages/i);
        expect(errorMessage).toHaveAttribute('role', 'alert');
      });
    });
  });

  describe('Performance', () => {
    it('debounces quantity input changes', async () => {
      const user = userEvent.setup();
      
      render(
        <PackageSelection
          selectedDate={selectedDate}
          maxGuests={maxGuests}
          onNext={mockOnNext}
          onBack={mockOnBack}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Boots & BBQ Package')).toBeInTheDocument();
      });

      const bbqPackage = screen.getByText('Boots & BBQ Package').closest('[role="article"]');
      const quantityInput = within(bbqPackage!).getByRole('spinbutton');

      // Rapidly type multiple values
      await user.clear(quantityInput);
      await user.type(quantityInput, '12345');

      // Should only show the final value
      expect(quantityInput).toHaveValue(50); // Limited to maxGuests
    });

    it('caches package data to avoid redundant fetches', async () => {
      const { rerender } = render(
        <PackageSelection
          selectedDate={selectedDate}
          maxGuests={maxGuests}
          onNext={mockOnNext}
          onBack={mockOnBack}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Boots & BBQ Package')).toBeInTheDocument();
      });

      const initialFetchCount = (global.fetch as jest.MockedFunction<typeof fetch>).mock.calls.length;

      // Re-render with same props
      rerender(
        <PackageSelection
          selectedDate={selectedDate}
          maxGuests={maxGuests}
          onNext={mockOnNext}
          onBack={mockOnBack}
        />
      );

      // Should not trigger additional fetches
      expect((global.fetch as jest.MockedFunction<typeof fetch>).mock.calls.length).toBe(initialFetchCount);
    });
  });

  describe('Edge Cases', () => {
    it('handles empty package list', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockImplementation((url) => {
        if (typeof url === 'string' && url.includes('/api/packages') && !url.includes('availability') && !url.includes('pricing')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ packages: [] })
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ pricing: [], availability: [] })
        } as Response);
      });

      render(
        <PackageSelection
          selectedDate={selectedDate}
          maxGuests={maxGuests}
          onNext={mockOnNext}
          onBack={mockOnBack}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/no packages available/i)).toBeInTheDocument();
      });
    });

    it('handles malformed API responses', async () => {
      (global.fetch as jest.MockedFunction<typeof fetch>).mockImplementation((url) => {
        if (typeof url === 'string' && url.includes('/api/packages')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ invalid: 'response' })
          } as Response);
        }
        return Promise.reject(new Error('Unknown API endpoint'));
      });

      render(
        <PackageSelection
          selectedDate={selectedDate}
          maxGuests={maxGuests}
          onNext={mockOnNext}
          onBack={mockOnBack}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/error loading packages/i)).toBeInTheDocument();
      });
    });

    it('handles missing required props gracefully', () => {
      // @ts-expect-error Testing missing props
      render(<PackageSelection />);

      expect(screen.getByText(/invalid configuration/i)).toBeInTheDocument();
    });

    it('handles extremely large guest counts', async () => {
      const user = userEvent.setup();
      
      render(
        <PackageSelection
          selectedDate={selectedDate}
          maxGuests={10000}
          onNext={mockOnNext}
          onBack={mockOnBack}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Boots & BBQ Package')).toBeInTheDocument();
      });

      const bbqPackage = screen.getByText('Boots & BBQ Package').closest('[role="article"]');
      const quantityInput = within(bbqPackage!).getByRole('spinbutton');

      await user.clear(quantityInput);
      await user.type(quantityInput, '99999');

      // Should be limited to available spots (75 for BBQ package)
      expect(quantityInput).toHaveValue(75);
    });
  });
});