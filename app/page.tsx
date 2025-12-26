import { AIInterviewSimulator } from '@/components/AIInterviewSimulator';
import { PerformanceMonitor } from '@/components/PerformanceMonitor';
import ErrorBoundary from '@/components/ErrorBoundary';

export default function Home() {
  return (
    <ErrorBoundary>
      <main className="min-h-screen bg-background">
        <div className="container mx-auto py-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-center mb-2">AIcruit</h1>
            <p className="text-muted-foreground text-center">
              Practice your interview skills with AI-powered adaptive questions and real-time feedback
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <ErrorBoundary>
                <AIInterviewSimulator />
              </ErrorBoundary>
            </div>
            
            <div className="lg:col-span-1">
              <ErrorBoundary>
                <PerformanceMonitor />
              </ErrorBoundary>
            </div>
          </div>
        </div>
      </main>
    </ErrorBoundary>
  );
}
