import Layout from '@/components/Layout';
import TradingDashboard from '@/components/TradingDashboard';

const Index = () => {
  console.log('Index.tsx: Rendering Index component...');
  
  return (
    <Layout>
      <TradingDashboard />
    </Layout>
  );
};

export default Index;