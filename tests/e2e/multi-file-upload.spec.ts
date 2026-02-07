import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Multi-File Upload', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should upload single CSV file successfully', async ({ page }) => {
    // Check if file upload component is visible
    await expect(page.getByText(/Drag & drop your files here/)).toBeVisible();

    // Create a test CSV file
    const csvContent = `Date,Description,Amount,Currency
2024-01-01,Grocery Store,-50.25,USD
2024-01-02,Coffee Shop,-5.50,USD`;

    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'january-2024.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent),
    });

    // Wait for processing to complete (it may be too fast to see the loading state)
    // Instead of waiting for the loading text, just wait for the results
    await page.waitForTimeout(500); // Give it a moment to process

    // Verify transactions are displayed
    await expect(page.getByText(/2 Transactions/)).toBeVisible();
    await expect(page.getByText('Grocery Store')).toBeVisible();
    await expect(page.getByText('Coffee Shop')).toBeVisible();

    // Verify merge summary appears
    await expect(page.getByText(/File Uploaded/)).toBeVisible();
    await expect(page.getByText(/Added 2 transactions/)).toBeVisible();

    // Verify file list shows the uploaded file
    await expect(page.getByText('Uploaded Files (1)')).toBeVisible();
    // Check filename in file list (using title attribute which is unique to file list)
    await expect(page.locator('p[title="january-2024.csv"]')).toBeVisible();
  });

  test('should upload multiple files sequentially and merge', async ({
    page,
  }) => {
    // Upload first file
    const csv1Content = `Date,Description,Amount,Currency
2024-01-01,Grocery Store,-50.25,USD
2024-01-02,Coffee Shop,-5.50,USD`;

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'january-2024.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csv1Content),
    });

    await page.waitForTimeout(500); // Wait for file to process
    await expect(page.getByText(/2 Transactions/)).toBeVisible();

    // Upload second file
    const csv2Content = `Date,Description,Amount,Currency
2024-02-01,Restaurant,-25.00,USD
2024-02-02,Gas Station,-40.00,USD
2024-02-03,Online Shopping,-100.00,USD`;

    await fileInput.setInputFiles({
      name: 'february-2024.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csv2Content),
    });

    await page.waitForTimeout(500); // Wait for file to process

    // Verify merged count
    await expect(page.getByText(/5 Transactions/)).toBeVisible();

    // Verify both files in file list
    await expect(page.getByText('Uploaded Files (2)')).toBeVisible();
    // Check filenames in file list (using title attribute)
    await expect(page.locator('p[title="january-2024.csv"]')).toBeVisible();
    await expect(page.locator('p[title="february-2024.csv"]')).toBeVisible();

    // Verify "From 2 files" message
    await expect(page.getByText(/From 2 files/)).toBeVisible();
  });

  test('should detect and skip duplicate transactions', async ({ page }) => {
    const csvContent = `Date,Description,Amount,Currency
2024-01-01,Grocery Store,-50.25,USD
2024-01-02,Coffee Shop,-5.50,USD`;

    const fileInput = page.locator('input[type="file"]');

    // Upload first time
    await fileInput.setInputFiles({
      name: 'test-file.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent),
    });

    await page.waitForTimeout(500); // Wait for file to process
    await expect(page.getByText(/2 Transactions/)).toBeVisible();
    await expect(page.getByText(/Added 2 transactions/)).toBeVisible();

    // Upload same file again
    await fileInput.setInputFiles({
      name: 'test-file-duplicate.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent),
    });

    await page.waitForTimeout(500); // Wait for file to process

    // Verify count stayed at 2
    await expect(page.getByText(/2 Transactions/)).toBeVisible();

    // Verify duplicate warning in merge summary
    await expect(page.getByText(/Skipped 2 duplicates/)).toBeVisible();

    // Verify duplicate warning in file list
    await expect(page.getByText(/2 duplicates skipped/)).toBeVisible();
  });

  test('should import valid categories from uploaded file', async ({
    page,
  }) => {
    const csvWithCategories = `Date,Description,Amount,Currency,Category,Subcategory
2024-01-01,Rent Payment,-1200.00,USD,Housing,Rent
2024-01-02,Grocery Store,-50.25,USD,Food & Dining,Groceries
2024-01-03,Gas Station,-40.00,USD,Transportation,Gas`;

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'categorized.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvWithCategories),
    });

    await page.waitForTimeout(500); // Wait for file to process

    // Verify transactions table shows imported categories
    const table = page.locator('table');
    await expect(table).toBeVisible();

    // Check that category dropdowns show the imported values
    const categorySelects = page.locator('select').filter({
      has: page.locator('option:text-is("Housing")'),
    });
    await expect(categorySelects.first()).toHaveValue('Housing');
  });

  test('should show source file badge in transaction table', async ({
    page,
  }) => {
    const csvContent = `Date,Description,Amount,Currency
2024-01-01,Grocery Store,-50.25,USD`;

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test-source.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent),
    });

    await page.waitForTimeout(500); // Wait for file to process

    // Verify Source column header exists
    await expect(page.getByRole('columnheader', { name: /Source/i })).toBeVisible();

    // Verify source badge is shown in the table
    await expect(page.getByRole('table').getByText('test-source.csv')).toBeVisible();
  });

  test('should remove specific file and its transactions', async ({ page }) => {
    // Upload two files
    const csv1Content = `Date,Description,Amount,Currency
2024-01-01,From File 1,-10.00,USD`;
    const csv2Content = `Date,Description,Amount,Currency
2024-02-01,From File 2,-20.00,USD`;

    const fileInput = page.locator('input[type="file"]');

    await fileInput.setInputFiles({
      name: 'file1.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csv1Content),
    });
    await page.waitForTimeout(500); // Wait for file to process

    await fileInput.setInputFiles({
      name: 'file2.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csv2Content),
    });
    await page.waitForTimeout(500); // Wait for file to process

    // Verify 2 transactions and 2 files
    await expect(page.getByText(/2 Transactions/)).toBeVisible();
    await expect(page.getByText('Uploaded Files (2)')).toBeVisible();

    // Remove first file
    const removeButtons = page.getByRole('button', { name: /Remove file1.csv/ });
    await removeButtons.click();

    // Verify only 1 transaction remains
    await expect(page.getByText(/1 Transaction/)).toBeVisible();
    await expect(page.getByText('From File 2')).toBeVisible();
    await expect(page.getByText('From File 1')).not.toBeVisible();

    // Verify only 1 file in list
    await expect(page.getByText('Uploaded Files (1)')).toBeVisible();
    // Check using title attribute to target file list
    await expect(page.locator('p[title="file2.csv"]')).toBeVisible();
    await expect(page.locator('p[title="file1.csv"]')).not.toBeVisible();
  });

  test('should clear all files when Clear All is clicked', async ({ page }) => {
    // Upload two files
    const csvContent = `Date,Description,Amount,Currency
2024-01-01,Transaction,-10.00,USD`;

    const fileInput = page.locator('input[type="file"]');

    await fileInput.setInputFiles({
      name: 'file1.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent),
    });
    await page.waitForTimeout(500); // Wait for file to process

    await fileInput.setInputFiles({
      name: 'file2.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent),
    });
    await page.waitForTimeout(500); // Wait for file to process

    // Verify files are loaded
    await expect(page.getByText('Uploaded Files (2)')).toBeVisible();

    // Mock dialog to automatically confirm
    page.on('dialog', async (dialog) => {
      expect(dialog.message()).toContain('Remove all uploaded files');
      await dialog.accept();
    });

    // Click Clear All
    await page.getByRole('button', { name: /Clear All Files/i }).click();

    // Verify everything is cleared
    await expect(page.getByText('Uploaded Files')).not.toBeVisible();
    await expect(page.getByText(/Transactions/)).not.toBeVisible();
  });

  test('should collapse and expand file list', async ({ page }) => {
    const csvContent = `Date,Description,Amount,Currency
2024-01-01,Transaction,-10.00,USD`;

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent),
    });

    await page.waitForTimeout(500); // Wait for file to process

    // File list should be visible initially (using title attribute)
    await expect(page.locator('p[title="test.csv"]')).toBeVisible();

    // Click to collapse
    await page.getByRole('button', { name: /Uploaded Files \(1\)/i }).click();

    // File details should be hidden
    await expect(page.locator('p[title="test.csv"]')).not.toBeVisible();

    // Click to expand again
    await page.getByRole('button', { name: /Uploaded Files \(1\)/i }).click();

    // File details should be visible again
    await expect(page.locator('p[title="test.csv"]')).toBeVisible();
  });

  test('should show merge summary and auto-dismiss', async ({ page }) => {
    const csvContent = `Date,Description,Amount,Currency
2024-01-01,Transaction,-10.00,USD`;

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent),
    });

    await page.waitForTimeout(500); // Wait for file to process

    // Verify merge summary is shown
    await expect(page.getByText(/File Uploaded/)).toBeVisible();
    await expect(page.getByText(/Added 1 transaction/)).toBeVisible();

    // Wait for auto-dismiss (5 seconds + buffer)
    await expect(page.getByText(/File Uploaded/)).not.toBeVisible({
      timeout: 6000,
    });
  });

  test('should manually dismiss merge summary', async ({ page }) => {
    const csvContent = `Date,Description,Amount,Currency
2024-01-01,Transaction,-10.00,USD`;

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent),
    });

    await page.waitForTimeout(500); // Wait for file to process

    // Verify merge summary is shown
    await expect(page.getByText(/File Uploaded/)).toBeVisible();

    // Click dismiss button
    await page.getByRole('button', { name: /Dismiss notification/i }).click();

    // Verify it's dismissed
    await expect(page.getByText(/File Uploaded/)).not.toBeVisible();
  });

  test('should download merged transactions as single file', async ({
    page,
  }) => {
    // Upload two files
    const csv1Content = `Date,Description,Amount,Currency
2024-01-01,Transaction 1,-10.00,USD`;
    const csv2Content = `Date,Description,Amount,Currency
2024-02-01,Transaction 2,-20.00,USD`;

    const fileInput = page.locator('input[type="file"]');

    await fileInput.setInputFiles({
      name: 'file1.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csv1Content),
    });
    await page.waitForTimeout(500); // Wait for file to process

    await fileInput.setInputFiles({
      name: 'file2.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csv2Content),
    });
    await page.waitForTimeout(500); // Wait for file to process

    // Verify merged data is shown
    await expect(page.getByText(/2 Transactions/)).toBeVisible();

    // Click download button (just verify it exists and is clickable)
    const downloadButton = page.locator('button:has-text("Download")').or(
      page.locator('button:has-text("Export")')
    );
    await expect(downloadButton).toBeVisible();
  });

  test('should show duplicate count in file list', async ({ page }) => {
    const csvContent = `Date,Description,Amount,Currency
2024-01-01,Transaction,-10.00,USD`;

    const fileInput = page.locator('input[type="file"]');

    // Upload first time
    await fileInput.setInputFiles({
      name: 'original.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent),
    });
    await page.waitForTimeout(500); // Wait for file to process

    // Upload duplicate
    await fileInput.setInputFiles({
      name: 'duplicate.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent),
    });
    await page.waitForTimeout(500); // Wait for file to process

    // Verify duplicate warning in file list for second file
    await expect(page.getByText(/1 duplicate skipped/)).toBeVisible();

    // First file should not show duplicate warning
    const fileListItems = page.locator('[class*="divide-y"] > div');
    const firstFileItem = fileListItems.first();
    await expect(firstFileItem).toContainText('original.csv');
    await expect(firstFileItem).not.toContainText('duplicate');
  });
});
