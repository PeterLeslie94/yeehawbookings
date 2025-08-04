import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import LoginPage from '@/app/auth/login/page'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(() => ({
    get: jest.fn()
  }))
}))

// Mock next-auth
jest.mock('next-auth/react', () => ({
  signIn: jest.fn()
}))

describe('Login Page Component', () => {
  const mockPush = jest.fn()
  const mockSignIn = signIn as jest.MockedFunction<typeof signIn>

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush
    })
  })

  it('should render login form', () => {
    // Act
    render(<LoginPage />)

    // Assert
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    expect(screen.getByText(/don't have an account/i)).toBeInTheDocument()
  })

  it('should display validation errors for empty fields', async () => {
    // Arrange
    const user = userEvent.setup()
    render(<LoginPage />)

    // Act
    const submitButton = screen.getByRole('button', { name: /sign in/i })
    await user.click(submitButton)

    // Assert
    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument()
      expect(screen.getByText(/password is required/i)).toBeInTheDocument()
    })
  })

  it('should validate email format', async () => {
    // Arrange
    const user = userEvent.setup()
    render(<LoginPage />)

    // Act
    const emailInput = screen.getByLabelText(/email/i)
    await user.type(emailInput, 'invalid-email')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    // Assert
    await waitFor(() => {
      expect(screen.getByText(/please enter a valid email/i)).toBeInTheDocument()
    })
  })

  it('should call signIn with credentials', async () => {
    // Arrange
    mockSignIn.mockResolvedValueOnce({ ok: true } as any)
    const user = userEvent.setup()
    render(<LoginPage />)

    // Act
    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'Password123!')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    // Assert
    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('credentials', {
        email: 'test@example.com',
        password: 'Password123!',
        redirect: false
      })
    })
  })

  it('should redirect on successful login', async () => {
    // Arrange
    mockSignIn.mockResolvedValueOnce({ ok: true } as any)
    const user = userEvent.setup()
    render(<LoginPage />)

    // Act
    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'Password123!')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    // Assert
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('should redirect to callback URL if provided', async () => {
    // Arrange
    mockSignIn.mockResolvedValueOnce({ ok: true } as any)
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush
    })
    const mockSearchParams = {
      get: jest.fn().mockReturnValue('/booking/new')
    }
    jest.mock('next/navigation', () => ({
      useSearchParams: () => mockSearchParams
    }))

    const user = userEvent.setup()
    render(<LoginPage />)

    // Act
    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'Password123!')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    // Assert
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/booking/new')
    })
  })

  it('should display error message on failed login', async () => {
    // Arrange
    mockSignIn.mockResolvedValueOnce({ 
      ok: false, 
      error: 'Invalid credentials' 
    } as any)
    const user = userEvent.setup()
    render(<LoginPage />)

    // Act
    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'WrongPassword')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    // Assert
    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument()
    })
  })

  it('should show loading state during submission', async () => {
    // Arrange
    mockSignIn.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({ ok: true } as any), 1000))
    )
    const user = userEvent.setup()
    render(<LoginPage />)

    // Act
    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'Password123!')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    // Assert
    expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled()
  })

  it('should toggle password visibility', async () => {
    // Arrange
    const user = userEvent.setup()
    render(<LoginPage />)
    const passwordInput = screen.getByLabelText(/password/i)

    // Assert initial state
    expect(passwordInput).toHaveAttribute('type', 'password')

    // Act
    const toggleButton = screen.getByRole('button', { name: /show password/i })
    await user.click(toggleButton)

    // Assert
    expect(passwordInput).toHaveAttribute('type', 'text')
    expect(screen.getByRole('button', { name: /hide password/i })).toBeInTheDocument()
  })

  it('should navigate to signup page', async () => {
    // Arrange
    const user = userEvent.setup()
    render(<LoginPage />)

    // Act
    const signupLink = screen.getByText(/sign up/i).closest('a')
    await user.click(signupLink!)

    // Assert
    expect(mockPush).toHaveBeenCalledWith('/auth/signup')
  })

  it('should navigate to forgot password page', async () => {
    // Arrange
    const user = userEvent.setup()
    render(<LoginPage />)

    // Act
    const forgotLink = screen.getByText(/forgot password/i)
    await user.click(forgotLink)

    // Assert
    expect(mockPush).toHaveBeenCalledWith('/auth/forgot-password')
  })
})