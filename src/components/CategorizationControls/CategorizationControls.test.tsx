/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
import { render, screen, within } from '@testing-library/react';
import { describe, it, vi, beforeEach, expect } from 'vitest';
import userEvent from '@testing-library/user-event';
import { CategorizationControls } from './CategorizationControls';
import type { Transaction } from '@/types';

const mockTransactions: Transaction[] = [
  {
    id: '1',
    date: new Date('2024-01-15'),
    description: 'Test Transaction 1',
    amount: -50,
    currency: 'USD',
    category: 'Food & Dining',
    subcategory: 'Restaurants',
    confidence: 0.95,
    isManuallyEdited: false,
  },
  {
    id: '2',
    date: new Date('2024-01-16'),
    description: 'Test Transaction 2',
    amount: 100,
    currency: 'USD',
    isManuallyEdited: false,
  },
];

describe('CategorizationControls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render categorization controls section', () => {
    const onCategorize = vi.fn();
    render(
      <CategorizationControls transactions={[]} onCategorize={onCategorize} />
    );

    expect(screen.getByText('AI Categorization')).toBeInTheDocument();
  });

  it('should display phase 1 toggle', () => {
    const onCategorize = vi.fn();
    render(
      <CategorizationControls transactions={[]} onCategorize={onCategorize} />
    );

    expect(
      screen.getByRole('checkbox', { name: /phase 1: exact match/i })
    ).toBeInTheDocument();
  });

  it('should display phase 2 toggle', () => {
    const onCategorize = vi.fn();
    render(
      <CategorizationControls transactions={[]} onCategorize={onCategorize} />
    );

    expect(
      screen.getByRole('checkbox', { name: /phase 2: pattern matching/i })
    ).toBeInTheDocument();
  });

  it('should display phase 3 toggle', () => {
    const onCategorize = vi.fn();
    render(
      <CategorizationControls transactions={[]} onCategorize={onCategorize} />
    );

    expect(
      screen.getByRole('checkbox', { name: /phase 3: ml model/i })
    ).toBeInTheDocument();
  });

  it('should toggle phase 1 when checkbox is clicked', async () => {
    const user = userEvent.setup();
    const onCategorize = vi.fn();
    render(
      <CategorizationControls transactions={[]} onCategorize={onCategorize} />
    );

    const phase1Checkbox = screen.getByRole('checkbox', {
      name: /phase 1: exact match/i,
    }) as HTMLInputElement;

    expect(phase1Checkbox.checked).toBe(false);

    await user.click(phase1Checkbox);

    expect(phase1Checkbox.checked).toBe(true);
  });

  it('should toggle phase 2 when checkbox is clicked', async () => {
    const user = userEvent.setup();
    const onCategorize = vi.fn();
    render(
      <CategorizationControls transactions={[]} onCategorize={onCategorize} />
    );

    const phase2Checkbox = screen.getByRole('checkbox', {
      name: /phase 2: pattern matching/i,
    }) as HTMLInputElement;

    expect(phase2Checkbox.checked).toBe(false);

    await user.click(phase2Checkbox);

    expect(phase2Checkbox.checked).toBe(true);
  });

  it('should toggle phase 3 when checkbox is clicked', async () => {
    const user = userEvent.setup();
    const onCategorize = vi.fn();
    render(
      <CategorizationControls transactions={[]} onCategorize={onCategorize} />
    );

    const phase3Checkbox = screen.getByRole('checkbox', {
      name: /phase 3: ml model/i,
    }) as HTMLInputElement;

    expect(phase3Checkbox.checked).toBe(false);

    await user.click(phase3Checkbox);

    expect(phase3Checkbox.checked).toBe(true);
  });

  it('should show phase 2 methods when phase 2 is selected', async () => {
    const user = userEvent.setup();
    const onCategorize = vi.fn();
    render(
      <CategorizationControls transactions={[]} onCategorize={onCategorize} />
    );

    expect(screen.queryByText('Phase 2 Methods:')).not.toBeInTheDocument();

    const phase2Checkbox = screen.getByRole('checkbox', {
      name: /phase 2: pattern matching/i,
    });

    await user.click(phase2Checkbox);

    expect(screen.getByText('Phase 2 Methods:')).toBeInTheDocument();
  });

  it('should display phase 2 method toggles', async () => {
    const user = userEvent.setup();
    const onCategorize = vi.fn();
    render(
      <CategorizationControls transactions={[]} onCategorize={onCategorize} />
    );

    const phase2Checkbox = screen.getByRole('checkbox', {
      name: /phase 2: pattern matching/i,
    });

    await user.click(phase2Checkbox);

    expect(
      screen.getByRole('checkbox', { name: /keyword rules/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('checkbox', { name: /fuzzy matching/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('checkbox', { name: /tf-idf similarity/i })
    ).toBeInTheDocument();
  });

  it('should disable categorize button by default', () => {
    const onCategorize = vi.fn();
    render(
      <CategorizationControls transactions={[]} onCategorize={onCategorize} />
    );

    const categorizeButton = screen.getByRole('button', {
      name: 'Categorize Now',
    });

    expect(categorizeButton).toBeDisabled();
  });

  it('should enable categorize button when phases are selected', async () => {
    const user = userEvent.setup();
    const onCategorize = vi.fn();
    render(
      <CategorizationControls transactions={[]} onCategorize={onCategorize} />
    );

    const phase1Checkbox = screen.getByRole('checkbox', {
      name: /phase 1: exact match/i,
    });

    await user.click(phase1Checkbox);

    const categorizeButton = screen.getByRole('button', {
      name: 'Categorize Now',
    });

    expect(categorizeButton).not.toBeDisabled();
  });

  it('should call onCategorize when categorize button is clicked', async () => {
    const user = userEvent.setup();
    const onCategorize = vi.fn();
    render(
      <CategorizationControls
        transactions={mockTransactions}
        onCategorize={onCategorize}
      />
    );

    const phase1Checkbox = screen.getByRole('checkbox', {
      name: /phase 1: exact match/i,
    });

    await user.click(phase1Checkbox);

    const categorizeButton = screen.getByRole('button', {
      name: 'Categorize Now',
    });

    await user.click(categorizeButton);

    expect(onCategorize).toHaveBeenCalled();
  });

  it('should display train phase 3 model button', () => {
    const onCategorize = vi.fn();
    render(
      <CategorizationControls transactions={[]} onCategorize={onCategorize} />
    );

    const trainButton = screen.getByRole('button', {
      name: 'Train Phase 3 Model',
    });

    expect(trainButton).toBeInTheDocument();
    expect(trainButton).not.toBeDisabled();
  });

  it('should toggle phase 2 methods independently', async () => {
    const user = userEvent.setup();
    const onCategorize = vi.fn();
    render(
      <CategorizationControls transactions={[]} onCategorize={onCategorize} />
    );

    const phase2Checkbox = screen.getByRole('checkbox', {
      name: /phase 2: pattern matching/i,
    });

    await user.click(phase2Checkbox);

    const keywordCheckbox = screen.getByRole('checkbox', {
      name: /keyword rules/i,
    }) as HTMLInputElement;

    const fuzzyCheckbox = screen.getByRole('checkbox', {
      name: /fuzzy matching/i,
    }) as HTMLInputElement;

    const tfidfCheckbox = screen.getByRole('checkbox', {
      name: /tf-idf similarity/i,
    }) as HTMLInputElement;

    expect(keywordCheckbox.checked).toBe(true);
    expect(fuzzyCheckbox.checked).toBe(true);
    expect(tfidfCheckbox.checked).toBe(true);

    await user.click(keywordCheckbox);

    expect(keywordCheckbox.checked).toBe(false);
    expect(fuzzyCheckbox.checked).toBe(true);
    expect(tfidfCheckbox.checked).toBe(true);

    await user.click(keywordCheckbox);

    expect(keywordCheckbox.checked).toBe(true);
  });

  it('should show not trained status when Phase 3 is not trained', () => {
    const onCategorize = vi.fn();
    vi.mock('@/ml/phase3', () => ({
      isModelTrained: vi.fn(() => false),
    }));

    render(
      <CategorizationControls transactions={[]} onCategorize={onCategorize} />
    );

    const phase3Label = screen.getByText(/phase 3: ml model/i);
    expect(within(phase3Label).getByText('(Not trained)')).toBeInTheDocument();
  });

  it('should display note about categorization behavior', () => {
    const onCategorize = vi.fn();
    render(
      <CategorizationControls transactions={[]} onCategorize={onCategorize} />
    );

    expect(
      screen.getByText(
        /Note: Categorization will be applied to uncategorized transactions only/i
      )
    ).toBeInTheDocument();
  });
});
