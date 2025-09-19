
// Test OAuth token retrieval (supports client_credentials and password grants)
router.post('/test-oauth-token', async (req, res) => {
  try {
    const axios = require('axios');
    const {
      clientId,
      clientSecret,
      tokenUrl,
      scope,
      grantType = 'client_credentials',
      username,
      password
    } = req.body;

    if (!clientId || !clientSecret || !tokenUrl) {
      return res.status(400).json({
        success: false,
        message: 'clientId, clientSecret and tokenUrl are required'
      });
    }

    if (grantType === 'password' && (!username || !password)) {
      return res.status(400).json({
        success: false,
        message: 'username and password are required for password grant'
      });
    }

    const form = new URLSearchParams();
    form.append('client_id', clientId);
    form.append('client_secret', clientSecret);
    form.append('grant_type', grantType);
    if (scope) form.append('scope', scope);
    if (grantType === 'password') {
      form.append('username', username);
      form.append('password', password);
    }

    try {
      const response = await axios.post(tokenUrl, form.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        timeout: 15000
      });

      const data = response.data || {};
      if (data.access_token) {
        return res.json({
          success: true,
          message: 'OAuth token retrieved successfully',
          token: data.access_token,
          tokenType: data.token_type || 'Bearer',
          expiresIn: data.expires_in,
          scope: data.scope
        });
      }

      return res.json({
        success: false,
        message: 'Token retrieval failed - no access_token in response',
        details: data
      });
    } catch (err) {
      const status = err.response?.status;
      const details = err.response?.data || err.message;
      console.error('OAuth token fetch error:', details);
      return res.status(status || 500).json({
        success: false,
        message: 'Failed to retrieve OAuth token',
        error: details
      });
    }
  } catch (error) {
    console.error('Error in /test-oauth-token:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
});

