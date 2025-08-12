import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PaymentStep } from '../PaymentStep'
import '@testing-library/jest-dom'

// Mock Stripe modules
const mockLoadStripe = jest.fn()
const mockConfirmCardPayment = jest.fn()
const mockGetElement = jest.fn()

jest.mock('@stripe/stripe-js', () => ({
  loadStripe: () => mockLoadStripe(),
}))

jest.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }: any) => <div data-testid="stripe-elements">{children}</div>,
  CardElement: ({ onChange, onReady }: any) => {
    React.useEffect(() => {
      onReady?.()
      onChange?.({ complete: true, error: null })
    }, [onReady, onChange])
    return <div data-testid="card-element">Card Element</div>
  },
  useStripe: () => ({
    confirmCardPayment: mockConfirmCardPayment,
  }),
  useElements: () => ({
    getElement: mockGetElement,
  }),
}))

const mockOnComplete = jest.fn()
const mockOnBack = jest.fn()

const defaultProps = {
  bookingId: 'booking-1',
  totalAmount: 15000,
  currency: 'USD',
  onComplete: mockOnComplete,
  onBack: mockOnBack,
}

describe('PaymentStep', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockLoadStripe.mockResolvedValue({})
    mockGetElement.mockReturnValue({})
    mockConfirmCardPayment.mockResolvedValue({
      paymentIntent: { status: 'succeeded' },
    })
  })

  it('should render payment form with amount', () => {
    render(<PaymentStep {...defaultProps} />)

    expect(screen.getByText('Payment Information')).toBeInTheDocument()
    expect(screen.getByText('Total: $150.00')).toBeInTheDocument()
    expect(screen.getByTestId('card-element')).toBeInTheDocument()
  })

  it('should show loading state while initializing Stripe', () => {
    mockLoadStripe.mockImplementation(() => new Promise(() => {}))
    
    render(<PaymentStep {...defaultProps} />)

    expect(screen.getByText('Loading payment form...')).toBeInTheDocument()
  })

  it('should fetch payment intent on mount', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        clientSecret: 'pi_test_secret',
        amount: 15000,
        currency: 'usd',
      }),
    })

    render(<PaymentStep {...defaultProps} />)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/bookings/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: 'booking-1' }),
      })
    })
  })

  it('should handle payment intent fetch error', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Failed to create payment intent' }),
    })

    render(<PaymentStep {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Failed to load payment form. Please try again.')).toBeInTheDocument()
    })
  })

  it('should process payment when form is submitted', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        clientSecret: 'pi_test_secret',
        amount: 15000,
        currency: 'usd',
      }),
    })

    render(<PaymentStep {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Pay $150.00' })).toBeInTheDocument()
    })

    const payButton = screen.getByRole('button', { name: 'Pay $150.00' })
    await userEvent.click(payButton)

    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalledWith({ paymentIntentId: expect.any(String) })
    })
  })

  it('should show processing state during payment', async () => {
    mockConfirmCardPayment.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({
        paymentIntent: { status: 'succeeded' }
      }), 100))
    )

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        clientSecret: 'pi_test_secret',
        amount: 15000,
        currency: 'usd',
      }),
    })

    render(<PaymentStep {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Pay $150.00' })).toBeInTheDocument()
    })

    const payButton = screen.getByRole('button', { name: 'Pay $150.00' })
    await userEvent.click(payButton)

    expect(screen.getByText('Processing payment...')).toBeInTheDocument()
    expect(payButton).toBeDisabled()
  })

  it('should handle payment errors', async () => {
    mockConfirmCardPayment.mockRejectedValue(
      new Error('Your card was declined')
    )

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        clientSecret: 'pi_test_secret',
        amount: 15000,
        currency: 'usd',
      }),
    })

    render(<PaymentStep {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Pay $150.00' })).toBeInTheDocument()
    })

    const payButton = screen.getByRole('button', { name: 'Pay $150.00' })
    await userEvent.click(payButton)

    await waitFor(() => {
      expect(screen.getByText('Your card was declined')).toBeInTheDocument()
    })
  })

  it('should handle requires_action payment status', async () => {
    mockConfirmCardPayment.mockResolvedValue({
      paymentIntent: { status: 'requires_action' },
    })

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        clientSecret: 'pi_test_secret',
        amount: 15000,
        currency: 'usd',
      }),
    })

    render(<PaymentStep {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Pay $150.00' })).toBeInTheDocument()
    })

    const payButton = screen.getByRole('button', { name: 'Pay $150.00' })
    await userEvent.click(payButton)

    await waitFor(() => {
      expect(screen.getByText('Additional authentication required. Please follow the instructions.')).toBeInTheDocument()
    })
  })

  it('should call onBack when back button is clicked', async () => {
    render(<PaymentStep {...defaultProps} />)

    const backButton = screen.getByRole('button', { name: 'Back' })
    await userEvent.click(backButton)

    expect(mockOnBack).toHaveBeenCalled()
  })

  it('should disable form while card is invalid', async () => {
    // Re-mock CardElement to simulate invalid card
    jest.doMock('@stripe/react-stripe-js', () => ({
      ...jest.requireActual('@stripe/react-stripe-js'),
      CardElement: ({ onChange }: any) => {
        React.useEffect(() => {
          onChange?.({ complete: false, error: { message: 'Invalid card number' } })
        }, [onChange])
        return <div data-testid="card-element">Card Element</div>
      },
    }))

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        clientSecret: 'pi_test_secret',
        amount: 15000,
        currency: 'usd',
      }),
    })

    render(<PaymentStep {...defaultProps} />)

    await waitFor(() => {
      const payButton = screen.getByRole('button', { name: 'Pay $150.00' })
      expect(payButton).toBeDisabled()
    })
  })

  it('should format currency correctly for different amounts', () => {
    const { rerender } = render(<PaymentStep {...defaultProps} totalAmount={9999} />)
    expect(screen.getByText('Total: $99.99')).toBeInTheDocument()

    rerender(<PaymentStep {...defaultProps} totalAmount={100} />)
    expect(screen.getByText('Total: $1.00')).toBeInTheDocument()

    rerender(<PaymentStep {...defaultProps} totalAmount={0} />)
    expect(screen.getByText('Total: $0.00')).toBeInTheDocument()
  })

  it('should show discount information if applicable', () => {
    render(
      <PaymentStep
        {...defaultProps}
        totalAmount={12000}
        originalAmount={15000}
        discountAmount={3000}
        promoCode="SUMMER20"
      />
    )

    expect(screen.getByText('Original: $150.00')).toBeInTheDocument()
    expect(screen.getByText('Discount (SUMMER20): -$30.00')).toBeInTheDocument()
    expect(screen.getByText('Total: $120.00')).toBeInTheDocument()
  })
})