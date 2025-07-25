import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const SimpleLayout = ({ children }: { children: React.ReactNode }) => {
  console.log('SimpleLayout: Rendering...');
  
  return (
    <div className="min-h-screen bg-slate-900 text-white p-4">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-white">Cryonix Trading Platform</h1>
          <p className="text-slate-300">Debug Mode - Testing Basic Rendering</p>
        </header>
        <main>
          {children}
        </main>
      </div>
    </div>
  );
};

const TestIndex = () => {
  console.log('TestIndex: Rendering...');
  
  return (
    <SimpleLayout>
      <div className="space-y-6">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">System Test</CardTitle>
            <CardDescription className="text-slate-300">
              Testing basic component rendering
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-white">
                If you can see this, basic React rendering is working.
              </p>
              <Button className="bg-green-600 hover:bg-green-700 text-white">
                Test Button
              </Button>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-700 p-4 rounded">
                  <h3 className="text-white font-medium">Component 1</h3>
                  <p className="text-slate-300 text-sm">Basic card component</p>
                </div>
                <div className="bg-slate-700 p-4 rounded">
                  <h3 className="text-white font-medium">Component 2</h3>
                  <p className="text-slate-300 text-sm">Another test component</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Next Steps</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-slate-300 space-y-2">
              <p>✅ Basic rendering works</p>
              <p>🔄 Will restore authentication next</p>
              <p>🎯 Then restore full functionality</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </SimpleLayout>
  );
};

export default TestIndex;