import Layout from '@/components/Layout';
import CryonixBot from '@/components/CryonixBot';

const Index = () => {
  console.log('Index page: Starting render...');
  console.log('Index page: Current URL:', window.location.href);
  
  return (
    <Layout>
      <CryonixBot />
    </Layout>
  );
};

export default Index;