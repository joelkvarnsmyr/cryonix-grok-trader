import { supabase } from "@/integrations/supabase/client";

class TradingLoopService {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  async startLoop(intervalMinutes: number = 5) {
    console.log('Starting trading loop service...');
    
    try {
      // Start the autonomous loop
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase.functions.invoke('autonomous-trading-loop', {
        body: { action: 'start', interval: intervalMinutes },
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`
        }
      });

      if (error) {
        console.error('Error starting autonomous loop:', error);
        throw error;
      }

      console.log('Autonomous loop started:', data);
      this.isRunning = true;

      // Start periodic cycle triggering
      this.scheduleRecurringCycles(intervalMinutes);
      
      return data;
    } catch (error) {
      console.error('Failed to start trading loop:', error);
      throw error;
    }
  }

  async stopLoop() {
    console.log('Stopping trading loop service...');
    
    try {
      const { data, error } = await supabase.functions.invoke('autonomous-trading-loop', {
        body: { action: 'stop' }
      });

      if (error) {
        console.error('Error stopping autonomous loop:', error);
        throw error;
      }

      this.isRunning = false;
      
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }

      console.log('Autonomous loop stopped:', data);
      return data;
    } catch (error) {
      console.error('Failed to stop trading loop:', error);
      throw error;
    }
  }

  async runCycle() {
    console.log('Running trading cycle...');
    
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session?.user) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase.functions.invoke('autonomous-trading-loop', {
        body: { 
          action: 'run_cycle',
          userId: sessionData.session.user.id
        }
      });

      if (error) {
        console.error('Error running cycle:', error);
        throw error;
      }

      console.log('Trading cycle completed:', data);
      return data;
    } catch (error) {
      console.error('Failed to run trading cycle:', error);
      throw error;
    }
  }

  async checkStatus() {
    try {
      const { data, error } = await supabase.functions.invoke('autonomous-trading-loop', {
        body: { action: 'check_status' }
      });

      if (error) {
        console.error('Error checking status:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Failed to check status:', error);
      throw error;
    }
  }

  private scheduleRecurringCycles(intervalMinutes: number) {
    // Clear any existing interval
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    // Schedule recurring cycles
    this.intervalId = setInterval(async () => {
      if (this.isRunning) {
        try {
          await this.runCycle();
        } catch (error) {
          console.error('Error in scheduled cycle:', error);
          // Don't stop the interval on error, just log it
        }
      }
    }, intervalMinutes * 60 * 1000);

    console.log(`Scheduled recurring cycles every ${intervalMinutes} minutes`);
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      hasInterval: !!this.intervalId
    };
  }
}

export const tradingLoopService = new TradingLoopService();