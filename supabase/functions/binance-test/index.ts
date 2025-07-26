import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { crypto } from "https://deno.land/std@0.177.0/crypto/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const apiKey = Deno.env.get('BINANCE_TESTNET_API_KEY')
    const secretKey = Deno.env.get('BINANCE_TESTNET_SECRET_KEY')
    
    if (!apiKey || !secretKey) {
      throw new Error('Binance API keys not configured')
    }

    console.log('Testing Binance API connection...')
    
    // Test 1: Check server time (no signature required)
    const timeResponse = await fetch('https://testnet.binance.vision/api/v3/time')
    const timeData = await timeResponse.json()
    console.log('Server time test:', timeData)
    
    // Test 2: Check exchange info (no signature required)
    const exchangeResponse = await fetch('https://testnet.binance.vision/api/v3/exchangeInfo')
    const exchangeData = await exchangeResponse.json()
    console.log('Exchange info test: OK, symbols count:', exchangeData.symbols?.length)
    
    // Test 3: Test account info (requires signature and IP whitelist)
    const timestamp = Date.now()
    const queryString = `timestamp=${timestamp}`
    
    // Create signature
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secretKey),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    
    const signature = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(queryString)
    )
    
    const signatureHex = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
    
    const accountUrl = `https://testnet.binance.vision/api/v3/account?${queryString}&signature=${signatureHex}`
    
    console.log('Testing account endpoint...')
    const accountResponse = await fetch(accountUrl, {
      headers: {
        'X-MBX-APIKEY': apiKey
      }
    })
    
    if (accountResponse.ok) {
      const accountData = await accountResponse.json()
      console.log('Account test: SUCCESS - Balance count:', accountData.balances?.length)
      
      return new Response(JSON.stringify({
        success: true,
        tests: {
          serverTime: 'OK',
          exchangeInfo: 'OK',
          accountAccess: 'OK',
          message: 'All tests passed! API keys are working and server is whitelisted.'
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
      
    } else {
      const errorText = await accountResponse.text()
      console.error('Account test failed:', accountResponse.status, errorText)
      
      let errorMessage = 'Unknown error'
      if (accountResponse.status === 401) {
        errorMessage = 'API keys are invalid or expired'
      } else if (accountResponse.status === 403) {
        errorMessage = 'IP not whitelisted. Add Supabase edge function IPs to your Binance API whitelist'
      }
      
      return new Response(JSON.stringify({
        success: false,
        tests: {
          serverTime: 'OK',
          exchangeInfo: 'OK',
          accountAccess: 'FAILED',
          error: errorMessage,
          details: errorText
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

  } catch (error) {
    console.error('Binance test error:', error)
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})