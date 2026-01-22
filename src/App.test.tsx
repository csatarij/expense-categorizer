import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('renders the header', () => {
    render(<App />);
    expect(
      screen.getByRole('heading', { name: 'Expense Categorizer' })
    ).toBeInTheDocument();
  });

  it('renders the welcome message', () => {
    render(<App />);
    expect(
      screen.getByText(/Welcome to Expense Categorizer/)
    ).toBeInTheDocument();
  });

  it('displays description text', () => {
    render(<App />);
    expect(
      screen.getByText(/Upload your bank statements/)
    ).toBeInTheDocument();
  });
});
