import React from 'react';
import { render, screen } from '@testing-library/react';
import Footer from '@/app/components/navigation/Footer';

// Mock next/link
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

describe('Footer', () => {
  describe('Rendering', () => {
    it('should render all footer sections', () => {
      render(<Footer />);
      
      // Company info section
      expect(screen.getByText('Country Days')).toBeInTheDocument();
      expect(screen.getByText(/premium nightclub experience/i)).toBeInTheDocument();
      
      // Quick links section
      expect(screen.getByText('Quick Links')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /about us/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /book now/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /packages/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /contact/i })).toBeInTheDocument();
      
      // Legal section
      expect(screen.getByText('Legal')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /privacy policy/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /terms of service/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /refund policy/i })).toBeInTheDocument();
      
      // Contact section
      expect(screen.getByText('Contact')).toBeInTheDocument();
      expect(screen.getByText(/123 Night Street/i)).toBeInTheDocument();
      expect(screen.getByText(/London, UK/i)).toBeInTheDocument();
      expect(screen.getByText(/info@countrydays.com/i)).toBeInTheDocument();
      expect(screen.getByText(/\+44 20 1234 5678/i)).toBeInTheDocument();
    });

    it('should render social media links', () => {
      render(<Footer />);
      
      expect(screen.getByRole('link', { name: /facebook/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /instagram/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /twitter/i })).toBeInTheDocument();
    });

    it('should render copyright notice with current year', () => {
      render(<Footer />);
      
      const currentYear = new Date().getFullYear();
      expect(screen.getByText(new RegExp(`${currentYear} Country Days`))).toBeInTheDocument();
      expect(screen.getByText(/all rights reserved/i)).toBeInTheDocument();
    });
  });

  describe('Layout and Styling', () => {
    it('should have proper footer structure', () => {
      const { container } = render(<Footer />);
      
      const footer = container.querySelector('footer');
      expect(footer).toBeInTheDocument();
      expect(footer).toHaveClass('bg-gray-900');
      expect(footer).toHaveClass('text-white');
    });

    it('should have responsive grid layout', () => {
      const { container } = render(<Footer />);
      
      const footerGrid = container.querySelector('.footer-grid');
      expect(footerGrid).toHaveClass('grid');
      expect(footerGrid).toHaveClass('grid-cols-1');
      expect(footerGrid).toHaveClass('md:grid-cols-4');
      expect(footerGrid).toHaveClass('gap-8');
    });

    it('should have proper spacing', () => {
      const { container } = render(<Footer />);
      
      const footerContent = container.querySelector('.footer-content');
      expect(footerContent).toHaveClass('py-12');
      expect(footerContent).toHaveClass('px-4');
      expect(footerContent).toHaveClass('sm:px-6');
      expect(footerContent).toHaveClass('lg:px-8');
    });
  });

  describe('Links', () => {
    it('should have correct href attributes for navigation links', () => {
      render(<Footer />);
      
      expect(screen.getByRole('link', { name: /about us/i })).toHaveAttribute('href', '/about');
      expect(screen.getByRole('link', { name: /book now/i })).toHaveAttribute('href', '/booking');
      expect(screen.getByRole('link', { name: /packages/i })).toHaveAttribute('href', '/packages');
      expect(screen.getByRole('link', { name: /contact/i })).toHaveAttribute('href', '/contact');
    });

    it('should have correct href attributes for legal links', () => {
      render(<Footer />);
      
      expect(screen.getByRole('link', { name: /privacy policy/i })).toHaveAttribute('href', '/privacy');
      expect(screen.getByRole('link', { name: /terms of service/i })).toHaveAttribute('href', '/terms');
      expect(screen.getByRole('link', { name: /refund policy/i })).toHaveAttribute('href', '/refund-policy');
    });

    it('should open social media links in new tab', () => {
      render(<Footer />);
      
      const facebookLink = screen.getByRole('link', { name: /facebook/i });
      const instagramLink = screen.getByRole('link', { name: /instagram/i });
      const twitterLink = screen.getByRole('link', { name: /twitter/i });
      
      expect(facebookLink).toHaveAttribute('target', '_blank');
      expect(facebookLink).toHaveAttribute('rel', 'noopener noreferrer');
      expect(instagramLink).toHaveAttribute('target', '_blank');
      expect(instagramLink).toHaveAttribute('rel', 'noopener noreferrer');
      expect(twitterLink).toHaveAttribute('target', '_blank');
      expect(twitterLink).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  describe('Contact Information', () => {
    it('should make email clickable', () => {
      render(<Footer />);
      
      const emailLink = screen.getByRole('link', { name: /info@countrydays.com/i });
      expect(emailLink).toHaveAttribute('href', 'mailto:info@countrydays.com');
    });

    it('should make phone number clickable', () => {
      render(<Footer />);
      
      const phoneLink = screen.getByRole('link', { name: /\+44 20 1234 5678/i });
      expect(phoneLink).toHaveAttribute('href', 'tel:+442012345678');
    });
  });

  describe('Accessibility', () => {
    it('should have proper footer landmark', () => {
      const { container } = render(<Footer />);
      
      const footer = container.querySelector('footer');
      expect(footer).toHaveAttribute('role', 'contentinfo');
    });

    it('should have proper heading hierarchy', () => {
      render(<Footer />);
      
      const headings = screen.getAllByRole('heading', { level: 3 });
      expect(headings).toHaveLength(4); // Company, Quick Links, Legal, Contact
    });

    it('should have accessible social media links', () => {
      render(<Footer />);
      
      const facebookLink = screen.getByRole('link', { name: /facebook/i });
      expect(facebookLink).toHaveAttribute('aria-label', 'Visit our Facebook page');
      
      const instagramLink = screen.getByRole('link', { name: /instagram/i });
      expect(instagramLink).toHaveAttribute('aria-label', 'Visit our Instagram page');
      
      const twitterLink = screen.getByRole('link', { name: /twitter/i });
      expect(twitterLink).toHaveAttribute('aria-label', 'Visit our Twitter page');
    });
  });

  describe('Newsletter Subscription', () => {
    it('should render newsletter subscription form', () => {
      render(<Footer />);
      
      expect(screen.getByText(/stay updated/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/enter your email/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /subscribe/i })).toBeInTheDocument();
    });

    it('should have proper form structure', () => {
      const { container } = render(<Footer />);
      
      const form = container.querySelector('form[aria-label="Newsletter subscription"]');
      expect(form).toBeInTheDocument();
      
      const emailInput = screen.getByPlaceholderText(/enter your email/i);
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toHaveAttribute('required');
    });
  });
});