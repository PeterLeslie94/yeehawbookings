import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import SignupPage from '@/app/auth/signup/page'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn()
}))

// Mock fetch for API calls
global.fetch = jest.fn()

describe('Signup Page Component', () => {
  const mockPush = jest.fn()
  const mockFetch = fetch as jest.MockedFunction<typeof fetch>

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush
    })
  })

  it('should render signup form', () => {
    // Act
    render(<SignupPage />)

    // Assert
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
    expect(screen.getByText(/already have an account/i)).toBeInTheDocument()
  })

  it('should validate required fields', async () => {
    // Arrange
    const user = userEvent.setup()
    render(<SignupPage />)

    // Act
    await user.click(screen.getByRole('button', { name: /create account/i }))

    // Assert
    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument()
      expect(screen.getByText(/password is required/i)).toBeInTheDocument()
    })
  })

  it('should validate email format', async () => {
    // Arrange
    const user = userEvent.setup()
    render(<SignupPage />)

    // Act
    await user.type(screen.getByLabelText(/email/i), 'invalid-email')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    // Assert
    await waitFor(() => {
      expect(screen.getByText(/please enter a valid email/i)).toBeInTheDocument()
    })
  })

  it('should validate password requirements', async () => {
    // Arrange
    const user = userEvent.setup()
    render(<SignupPage />)

    // Act
    await user.type(screen.getByLabelText(/^password/i), 'weak')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    // Assert
    await waitFor(() => {
      expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument()
    })
  })

  it('should validate password match', async () => {
    // Arrange
    const user = userEvent.setup()
    render(<SignupPage />)

    // Act
    await user.type(screen.getByLabelText(/^password/i), 'Password123!')
    await user.type(screen.getByLabelText(/confirm password/i), 'Different123!')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    // Assert
    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument()
    })
  })

  it('should show password strength indicator', async () => {
    // Arrange
    const user = userEvent.setup()
    render(<SignupPage />)
    const passwordInput = screen.getByLabelText(/^password/i)

    // Act & Assert - Weak password
    await user.type(passwordInput, 'weak')
    expect(screen.getByText(/weak/i)).toBeInTheDocument()
    expect(screen.getByText(/weak/i)).toHaveClass('text-red-500')

    // Act & Assert - Medium password
    await user.clear(passwordInput)
    await user.type(passwordInput, 'Medium123')
    expect(screen.getByText(/medium/i)).toBeInTheDocument()
    expect(screen.getByText(/medium/i)).toHaveClass('text-yellow-500')

    // Act & Assert - Strong password
    await user.clear(passwordInput)
    await user.type(passwordInput, 'Strong123!@#')
    expect(screen.getByText(/strong/i)).toBeInTheDocument()
    expect(screen.getByText(/strong/i)).toHaveClass('text-green-500')
  })

  it('should successfully create account', async () => {
    // Arrange
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ 
        user: { id: '123', email: 'test@example.com' } 
      })
    } as Response)

    const user = userEvent.setup()
    render(<SignupPage />)

    // Act
    await user.type(screen.getByLabelText(/name/i), 'Test User')
    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/^password/i), 'Password123!')
    await user.type(screen.getByLabelText(/confirm password/i), 'Password123!')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    // Assert
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test User',
          email: 'test@example.com',
          password: 'Password123!'
        })
      })
      expect(mockPush).toHaveBeenCalledWith('/auth/login?registered=true')
    })
  })

  it('should display error for duplicate email', async () => {
    // Arrange
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({ 
        error: 'Email already exists' 
      })
    } as Response)

    const user = userEvent.setup()
    render(<SignupPage />)

    // Act
    await user.type(screen.getByLabelText(/email/i), 'existing@example.com')
    await user.type(screen.getByLabelText(/^password/i), 'Password123!')
    await user.type(screen.getByLabelText(/confirm password/i), 'Password123!')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    // Assert
    await waitFor(() => {
      expect(screen.getByText(/email already exists/i)).toBeInTheDocument()
    })
  })

  it('should show loading state during submission', async () => {
    // Arrange
    mockFetch.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: async () => ({ user: {} })
      } as Response), 1000))
    )

    const user = userEvent.setup()
    render(<SignupPage />)

    // Act
    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/^password/i), 'Password123!')
    await user.type(screen.getByLabelText(/confirm password/i), 'Password123!')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    // Assert
    expect(screen.getByRole('button', { name: /creating account/i })).toBeDisabled()
  })

  it('should toggle password visibility', async () => {
    // Arrange
    const user = userEvent.setup()
    render(<SignupPage />)
    const passwordInput = screen.getByLabelText(/^password/i)
    const confirmInput = screen.getByLabelText(/confirm password/i)

    // Assert initial state
    expect(passwordInput).toHaveAttribute('type', 'password')
    expect(confirmInput).toHaveAttribute('type', 'password')

    // Act
    const toggleButtons = screen.getAllByRole('button', { name: /show password/i })
    await user.click(toggleButtons[0])

    // Assert
    expect(passwordInput).toHaveAttribute('type', 'text')
    expect(confirmInput).toHaveAttribute('type', 'password')
  })

  it('should navigate to login page', async () => {
    // Arrange
    const user = userEvent.setup()
    render(<SignupPage />)

    // Act
    const loginLink = screen.getByText(/sign in/i).closest('a')
    await user.click(loginLink!)

    // Assert
    expect(mockPush).toHaveBeenCalledWith('/auth/login')
  })

  it('should show terms and conditions checkbox', () => {
    // Act
    render(<SignupPage />)

    // Assert
    expect(screen.getByRole('checkbox', { name: /terms and conditions/i })).toBeInTheDocument()
    expect(screen.getByText(/i agree to the/i)).toBeInTheDocument()
  })

  it('should require terms acceptance', async () => {
    // Arrange
    const user = userEvent.setup()
    render(<SignupPage />)

    // Act - Fill form but don't check terms
    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/^password/i), 'Password123!')
    await user.type(screen.getByLabelText(/confirm password/i), 'Password123!')
    await user.click(screen.getByRole('button', { name: /create account/i }))

    // Assert
    await waitFor(() => {
      expect(screen.getByText(/you must agree to the terms/i)).toBeInTheDocument()
    })
  })
})