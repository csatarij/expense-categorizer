import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MLTransparencyTab } from './MLTransparencyTab';
import type { Transaction } from '@/types';
import * as phase3 from '@/ml/phase3';
import userEvent from '@testing-library/user-event';

vi.mock('@/ml/phase3', () => ({
  isModelTrained: vi.fn(),
  getModelMetrics: vi.fn(),
}));

describe('MLTransparencyTab', () => {
  const mockTransactions: Transaction[] = [
    {
      id: '1',
      date: new Date('2024-01-01'),
      entity: 'Test Transaction',
      amount: 50,
      currency: 'CHF',
      category: 'Food & Dining',
      isManuallyEdited: false,
    },
    {
      id: '2',
      date: new Date('2024-01-02'),
      entity: 'Uncategorized',
      amount: 25,
      currency: 'CHF',
      isManuallyEdited: false,
    },
  ];

  it('renders ML Categorization Overview heading', () => {
    vi.mocked(phase3.isModelTrained).mockReturnValue(false);

    render(<MLTransparencyTab transactions={mockTransactions} />);

    expect(
      screen.getByRole('heading', { name: 'ML Categorization Overview' })
    ).toBeInTheDocument();
  });

  it('renders description text', () => {
    vi.mocked(phase3.isModelTrained).mockReturnValue(false);

    render(<MLTransparencyTab transactions={mockTransactions} />);

    expect(
      screen.getByText(/Complete transparency into how our AI categorizes/)
    ).toBeInTheDocument();
  });

  it('displays categorized count in stat card', () => {
    vi.mocked(phase3.isModelTrained).mockReturnValue(false);

    render(<MLTransparencyTab transactions={mockTransactions} />);

    expect(screen.getByText('1/2')).toBeInTheDocument();
    expect(
      screen.getByText('Transactions with categories')
    ).toBeInTheDocument();
  });

  it('shows ML model status as Not Trained', () => {
    vi.mocked(phase3.isModelTrained).mockReturnValue(false);

    render(<MLTransparencyTab transactions={mockTransactions} />);

    expect(screen.getByText('Not Trained')).toBeInTheDocument();
    expect(screen.getByText('Phase 3 classifier status')).toBeInTheDocument();
  });

  it('shows ML model status as Trained when model is trained', () => {
    vi.mocked(phase3.isModelTrained).mockReturnValue(true);
    vi.mocked(phase3.getModelMetrics).mockReturnValue({
      accuracy: 0.85,
      loss: 0.2,
      trainingSamples: 100,
      validationSamples: 20,
    });

    render(<MLTransparencyTab transactions={mockTransactions} />);

    expect(screen.getByText('Trained')).toBeInTheDocument();
  });

  it('shows accuracy when model is trained', () => {
    vi.mocked(phase3.isModelTrained).mockReturnValue(true);
    vi.mocked(phase3.getModelMetrics).mockReturnValue({
      accuracy: 0.85,
      loss: 0.2,
      trainingSamples: 100,
      validationSamples: 20,
    });

    render(<MLTransparencyTab transactions={mockTransactions} />);

    expect(screen.getByText('85.0%')).toBeInTheDocument();
    expect(screen.getByText('Based on 100 samples')).toBeInTheDocument();
  });

  it('renders categorization phases heading', () => {
    vi.mocked(phase3.isModelTrained).mockReturnValue(false);

    render(<MLTransparencyTab transactions={mockTransactions} />);

    expect(
      screen.getByRole('heading', { name: 'Categorization Phases' })
    ).toBeInTheDocument();
  });

  it('renders Phase 1 card', () => {
    vi.mocked(phase3.isModelTrained).mockReturnValue(false);

    render(<MLTransparencyTab transactions={mockTransactions} />);

    expect(screen.getByText('Phase 1: Exact Match')).toBeInTheDocument();
    expect(
      screen.getByText(/Matches transactions exactly with historical data/)
    ).toBeInTheDocument();
  });

  it('renders Phase 2 card', () => {
    vi.mocked(phase3.isModelTrained).mockReturnValue(false);

    render(<MLTransparencyTab transactions={mockTransactions} />);

    expect(screen.getByText('Phase 2: Pattern Matching')).toBeInTheDocument();
    expect(
      screen.getByText(/Uses multiple intelligent techniques/)
    ).toBeInTheDocument();
  });

  it('renders Phase 3 card', () => {
    vi.mocked(phase3.isModelTrained).mockReturnValue(false);

    render(<MLTransparencyTab transactions={mockTransactions} />);

    expect(screen.getByText('Phase 3: ML Classifier')).toBeInTheDocument();
    expect(
      screen.getByText(/Neural network model trained on your data/)
    ).toBeInTheDocument();
  });

  it('expands phase card when clicked', async () => {
    vi.mocked(phase3.isModelTrained).mockReturnValue(false);
    const user = userEvent.setup();

    render(<MLTransparencyTab transactions={mockTransactions} />);

    const phase1Title = screen
      .getByText('Phase 1: Exact Match')
      .closest('button');
    expect(phase1Title).toBeInTheDocument();

    if (phase1Title) {
      await user.click(phase1Title);
    }

    await waitFor(() => {
      expect(screen.getByText(/How It Works/)).toBeInTheDocument();
    });
  });

  it('handles empty transactions', () => {
    vi.mocked(phase3.isModelTrained).mockReturnValue(false);

    render(<MLTransparencyTab transactions={[]} />);

    expect(screen.getByText('0/0')).toBeInTheDocument();
  });

  it('shows all transactions categorized', () => {
    const allCategorized: Transaction[] = [
      {
        id: '1',
        date: new Date('2024-01-01'),
        entity: 'Test 1',
        amount: 50,
        currency: 'CHF',
        category: 'Food',
        isManuallyEdited: false,
      },
      {
        id: '2',
        date: new Date('2024-01-02'),
        entity: 'Test 2',
        amount: 25,
        currency: 'CHF',
        category: 'Shopping',
        isManuallyEdited: false,
      },
      {
        id: '3',
        date: new Date('2024-01-03'),
        entity: 'Test 3',
        amount: 10,
        currency: 'CHF',
        category: 'Entertainment',
        isManuallyEdited: false,
      },
    ];

    vi.mocked(phase3.isModelTrained).mockReturnValue(false);

    render(<MLTransparencyTab transactions={allCategorized} />);

    expect(screen.getByText('3/3')).toBeInTheDocument();
  });
});
