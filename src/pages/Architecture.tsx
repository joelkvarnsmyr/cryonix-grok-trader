import Layout from '@/components/Layout';
import ProcessFlow from '@/components/ProcessFlow';
import TradingFlowChart from '@/components/TradingFlowChart';

const Architecture = () => {
  return (
    <Layout>
      <div className="space-y-6">
        <ProcessFlow />
        <TradingFlowChart />
      </div>
    </Layout>
  );
};

export default Architecture;