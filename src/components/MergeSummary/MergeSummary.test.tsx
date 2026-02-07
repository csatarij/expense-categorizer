import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MergeSummary } from './MergeSummary';

describe('MergeSummary', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render with file name and counts', () => {
    const onDismiss = vi.fn();
    render(
      <MergeSummary
        fileName="january-2024.csv"
        addedCount={45}
        duplicateCount={3}
        onDismiss={onDismiss}
      />
    );

    expect(screen.getByText('File Uploaded')).toBeInTheDocument();
    expect(screen.getByText('january-2024.csv')).toBeInTheDocument();
    expect(screen.getByText(/Added/)).toBeInTheDocument();
    expect(screen.getByText('45')).toBeInTheDocument();
    expect(screen.getByText(/Skipped/)).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('should show singular form for single transaction', () => {
    const onDismiss = vi.fn();
    render(
      <MergeSummary
        fileName="test.csv"
        addedCount={1}
        duplicateCount={0}
        onDismiss={onDismiss}
      />
    );

    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText(/transaction$/)).toBeInTheDocument();
  });

  it('should show plural form for multiple transactions', () => {
    const onDismiss = vi.fn();
    render(
      <MergeSummary
        fileName="test.csv"
        addedCount={5}
        duplicateCount={0}
        onDismiss={onDismiss}
      />
    );

    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText(/transactions$/)).toBeInTheDocument();
  });

  it('should not show duplicate count when zero', () => {
    const onDismiss = vi.fn();
    render(
      <MergeSummary
        fileName="test.csv"
        addedCount={10}
        duplicateCount={0}
        onDismiss={onDismiss}
      />
    );

    expect(screen.queryByText(/Skipped/)).not.toBeInTheDocument();
  });

  it('should show singular form for single duplicate', () => {
    const onDismiss = vi.fn();
    render(
      <MergeSummary
        fileName="test.csv"
        addedCount={10}
        duplicateCount={1}
        onDismiss={onDismiss}
      />
    );

    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText(/duplicate$/)).toBeInTheDocument();
  });

  it('should show plural form for multiple duplicates', () => {
    const onDismiss = vi.fn();
    render(
      <MergeSummary
        fileName="test.csv"
        addedCount={10}
        duplicateCount={5}
        onDismiss={onDismiss}
      />
    );

    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText(/duplicates$/)).toBeInTheDocument();
  });

  it('should call onDismiss when dismiss button is clicked', async () => {
    vi.useRealTimers(); // Use real timers for this test to avoid issues with userEvent
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(
      <MergeSummary
        fileName="test.csv"
        addedCount={10}
        duplicateCount={0}
        onDismiss={onDismiss}
      />
    );

    const dismissButton = screen.getByRole('button', {
      name: /dismiss notification/i,
    });
    await user.click(dismissButton);

    expect(onDismiss).toHaveBeenCalledTimes(1);
    vi.useFakeTimers(); // Restore fake timers for other tests
  });

  it('should auto-dismiss after 5 seconds', () => {
    const onDismiss = vi.fn();
    render(
      <MergeSummary
        fileName="test.csv"
        addedCount={10}
        duplicateCount={0}
        onDismiss={onDismiss}
      />
    );

    expect(onDismiss).not.toHaveBeenCalled();

    // Fast-forward time by 5 seconds
    vi.advanceTimersByTime(5000);

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('should clear timer on unmount', () => {
    const onDismiss = vi.fn();
    const { unmount } = render(
      <MergeSummary
        fileName="test.csv"
        addedCount={10}
        duplicateCount={0}
        onDismiss={onDismiss}
      />
    );

    unmount();

    // Fast-forward time
    vi.advanceTimersByTime(10000);

    // onDismiss should not be called because component was unmounted
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('should have accessible dismiss button', () => {
    const onDismiss = vi.fn();
    render(
      <MergeSummary
        fileName="test.csv"
        addedCount={10}
        duplicateCount={0}
        onDismiss={onDismiss}
      />
    );

    const dismissButton = screen.getByRole('button', {
      name: /dismiss notification/i,
    });
    expect(dismissButton).toBeInTheDocument();
  });

  it('should display success icon', () => {
    const onDismiss = vi.fn();
    const { container } = render(
      <MergeSummary
        fileName="test.csv"
        addedCount={10}
        duplicateCount={0}
        onDismiss={onDismiss}
      />
    );

    // Check for success icon (SVG with checkmark)
    const successIcon = container.querySelector('svg.text-green-600');
    expect(successIcon).toBeInTheDocument();
  });

  it('should handle zero added transactions', () => {
    const onDismiss = vi.fn();
    render(
      <MergeSummary
        fileName="duplicate-file.csv"
        addedCount={0}
        duplicateCount={10}
        onDismiss={onDismiss}
      />
    );

    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText(/Added/)).toBeInTheDocument();
    expect(screen.getByText(/transactions/)).toBeInTheDocument();
    expect(screen.getByText(/Skipped/)).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText(/duplicates/)).toBeInTheDocument();
  });
});
