export default function LoadingSpinner() {
  return (
    <div data-testid="loading-spinner" className="flex items-center justify-center p-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );
}