'use client'

import React, { useState, useEffect } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'

interface PaymentStepProps {
  bookingId: string
  totalAmount: number
  currency: string
  originalAmount?: number
  discountAmount?: number
  promoCode?: string
  onComplete: (data: { paymentIntentId: string }) => void
  onBack: () => void
}

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

function PaymentForm({
  bookingId,
  totalAmount,
  currency,
  originalAmount,
  discountAmount,
  promoCode,
  onComplete,
  onBack,
}: PaymentStepProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [cardComplete, setCardComplete] = useState(false)

  useEffect(() => {
    // Fetch payment intent
    fetch('/api/bookings/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Failed to create payment intent')
        }
        return res.json()
      })
      .then((data) => {
        setClientSecret(data.clientSecret)
      })
      .catch((err) => {
        setError('Failed to load payment form. Please try again.')
      })
  }, [bookingId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements || !clientSecret) {
      return
    }

    setProcessing(true)
    setError(null)

    const card = elements.getElement(CardElement)
    if (!card) {
      setProcessing(false)
      return
    }

    try {
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card,
        },
      })

      if (result.error) {
        throw new Error(result.error.message)
      }

      if (result.paymentIntent) {
        if (result.paymentIntent.status === 'succeeded') {
          onComplete({ paymentIntentId: result.paymentIntent.id })
        } else if (result.paymentIntent.status === 'requires_action') {
          setError('Additional authentication required. Please follow the instructions.')
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed')
    } finally {
      setProcessing(false)
    }
  }

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Payment Information</h2>
        
        {originalAmount && discountAmount && (
          <div className="bg-green-50 p-4 rounded-lg mb-4">
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span>Original:</span>
                <span>{formatAmount(originalAmount)}</span>
              </div>
              <div className="flex justify-between text-green-600">
                <span>Discount {promoCode && `(${promoCode})`}:</span>
                <span>-{formatAmount(discountAmount)}</span>
              </div>
            </div>
          </div>
        )}

        <div className="mb-4">
          <p className="text-lg font-medium">Total: {formatAmount(totalAmount)}</p>
        </div>

        <div className="border rounded-lg p-4">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#424770',
                  '::placeholder': {
                    color: '#aab7c4',
                  },
                },
                invalid: {
                  color: '#9e2146',
                },
              },
            }}
            onChange={(e) => {
              setCardComplete(e.complete)
              if (e.error) {
                setError(e.error.message)
              } else {
                setError(null)
              }
            }}
            onReady={() => {
              // Card element is ready
            }}
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-4">
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          disabled={processing}
        >
          Back
        </button>
        <button
          type="submit"
          disabled={!stripe || !cardComplete || processing || !clientSecret}
          className="flex-1 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {processing ? 'Processing payment...' : `Pay ${formatAmount(totalAmount)}`}
        </button>
      </div>
    </form>
  )
}

export function PaymentStep(props: PaymentStepProps) {
  if (!stripePromise) {
    return <div>Loading payment form...</div>
  }

  return (
    <Elements stripe={stripePromise}>
      <PaymentForm {...props} />
    </Elements>
  )
}