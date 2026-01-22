function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-primary-600 text-white shadow-lg">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <h1 className="text-3xl font-bold">Expense Categorizer</h1>
          <p className="mt-1 text-primary-100">
            AI-powered expense tracking with progressive ML categorization
          </p>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-semibold text-gray-800">
            Welcome to Expense Categorizer
          </h2>
          <p className="text-gray-600">
            Upload your bank statements to automatically categorize expenses
            using machine learning.
          </p>
        </div>
      </main>
    </div>
  );
}

export default App;
