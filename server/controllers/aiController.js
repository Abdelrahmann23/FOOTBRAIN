const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://127.0.0.1:5000';

export const predictMarketValue = async (req, res) => {
  try {
    const { player } = req.body;

    if (!player) {
      return res.status(400).json({
        error: 'Player data is required'
      });
    }

    const age = player.age ?? player.physical?.age ?? 25;
    const goals = player.stats?.goals ?? 0;
    const assists = player.stats?.assists ?? 0;
    const shots = player.stats?.shots ?? 0;
    const shotsOnTarget = player.stats?.shotsOnTarget ?? 0;

    const pythonRequest = {
      Age: age,
      'Gls+Ast': goals + assists,
      Sh: shots,
      SoT: shotsOnTarget,
      Player: player.name || 'Unknown Player',
      Nation: player.nationality || 'Other',
      Pos: player.position || 'FW',
      Club_x: player.team || 'Unknown Club',
      Leauge: player.comp || 'Unknown League'
    };

    // Call Python API
    let response;
    let pythonResult;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      try {
        response = await fetch(`${PYTHON_API_URL}/predict/market-value`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pythonRequest),
          signal: controller.signal,
        });
        clearTimeout(timeout);
      } catch (fetchError) {
        clearTimeout(timeout);
        if (fetchError.name === 'AbortError') {
          throw new Error('Python API timed out after 10 seconds. The model may be taking too long to process.');
        }
        throw fetchError;
      }
      pythonResult = await response.json().catch(() => ({}));
    } catch (fetchError) {
      const errorCode = fetchError.cause?.code || fetchError.code;
      const isTimeout = fetchError.message?.includes('timed out') || fetchError.name === 'AbortError';
      if (isTimeout) {
        return res.status(504).json({
          error: 'Python API timed out',
          details: 'The prediction took too long. Check if the Python API is running and responding.',
        });
      }
      if (errorCode === 'ECONNREFUSED') {
        return res.status(503).json({
          error: 'Python API is not running',
          details: 'Please start the Python API server: cd server/python-api && python app.py',
        });
      }
      throw new Error(`Cannot connect to Python API at ${PYTHON_API_URL}. Error: ${fetchError.message}`);
    }

    if (!response.ok) {
      const errorMsg = pythonResult?.error || pythonResult?.message || `Python API error: ${response.status} ${response.statusText}`;
      throw new Error(errorMsg);
    }

    if (!pythonResult.success) {
      return res.status(500).json({ error: pythonResult.error || 'Prediction failed' });
    }

    const predictedValue = pythonResult.predictedValue || 0;
    const confidence = 0.85;
    const valueRange = { min: Math.max(0, predictedValue * 0.8), max: predictedValue * 1.2 };

    const valueFactors = [
      { factor: 'Goals', contribution: Math.min(30, (goals / 30) * 30), trend: goals > 15 ? 'up' : goals < 5 ? 'down' : 'stable' },
      { factor: 'Assists', contribution: Math.min(25, (assists / 20) * 25), trend: assists > 10 ? 'up' : assists < 3 ? 'down' : 'stable' },
      { factor: 'Age', contribution: age < 25 ? 20 : age > 30 ? 10 : 15, trend: age < 25 ? 'up' : age > 30 ? 'down' : 'stable' }
    ];

    const totalContribution = valueFactors.reduce((sum, f) => sum + f.contribution, 0);
    valueFactors.forEach(f => { f.contribution = (f.contribution / totalContribution) * 100; });

    const comparablePlayers = [
      { name: 'Similar Player 1', value: predictedValue * (0.9 + Math.random() * 0.2), similarity: 0.75 + Math.random() * 0.15 },
      { name: 'Similar Player 2', value: predictedValue * (0.9 + Math.random() * 0.2), similarity: 0.75 + Math.random() * 0.15 },
      { name: 'Similar Player 3', value: predictedValue * (0.9 + Math.random() * 0.2), similarity: 0.75 + Math.random() * 0.15 }
    ];

    const result = {
      playerId: player.id || 'unknown',
      predictedValue,
      valueRange,
      valueFactors,
      comparablePlayers,
      modelConfidence: confidence,
      timestamp: new Date().toISOString()
    };

    res.json(result);
  } catch (error) {
    console.error('Market value prediction error:', error);
    res.status(500).json({ error: error.message || 'Failed to predict market value', details: 'Make sure the Python API server is running on port 5000' });
  }
};

export const predictInjury = async (req, res) => {
  try {
    const { playerId, physical } = req.body;

    if (!physical) {
      return res.status(400).json({ error: 'Physical attributes are required for injury prediction (age, height, weight, hamstring, sprint_speed, training_hours)' });
    }

    const age = physical.age ?? 25;
    const height = physical.height ?? 180;
    const weight = physical.weight ?? 75;
    const bmi = physical.bmi ?? weight / Math.pow(height / 100, 2);
    const hamstring = physical.hamstring ?? 70;
    const sprint_speed = physical.sprint_speed ?? 30;
    const training_hours = physical.training_hours ?? 15;

    const pythonRequest = { age: Number(age), height: Number(height), weight: Number(weight), bmi: Number(bmi), hamstring: Number(hamstring), sprint_speed: Number(sprint_speed), training_hours: Number(training_hours) };

    let response;
    let pythonResult;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      try {
        response = await fetch(`${PYTHON_API_URL}/predict/injury`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pythonRequest),
          signal: controller.signal
        });
        clearTimeout(timeout);
      } catch (fetchError) {
        clearTimeout(timeout);
        if (fetchError.name === 'AbortError') {
          throw new Error('Python API timed out after 10 seconds.');
        }
        throw fetchError;
      }
      pythonResult = await response.json().catch(() => ({}));
    } catch (fetchError) {
      if (fetchError.message?.includes('timed out') || fetchError.name === 'AbortError') {
        return res.status(504).json({ error: 'Python API timed out', details: 'Start the Python API (e.g. npm run dev:python) and try again.' });
      }
      if (fetchError.cause?.code === 'ECONNREFUSED' || fetchError.code === 'ECONNREFUSED') {
        return res.status(503).json({ error: 'Python API is not running', details: 'Start the Python API: cd server/python-api && node start-api.js' });
      }
      throw fetchError;
    }

    if (!response.ok) {
      return res.status(response.status).json({ error: pythonResult?.error || `Python API error: ${response.status}` });
    }

    if (!pythonResult.success) {
      return res.status(500).json({ error: pythonResult.error || 'Injury prediction failed' });
    }

    const riskLevel = pythonResult.risk_level || 'medium';
    const riskProbability = pythonResult.risk_probability ?? 0.5;
    const topRiskFactors = (pythonResult.top_risk_factors || []).map((f) => ({ factor: f.factor, impact: typeof f.impact === 'number' ? f.impact : 0.2, description: f.description || '' }));

    const recommendations = [];
    if (riskLevel === 'high') {
      recommendations.push('Reduce training load and schedule a medical assessment.');
      recommendations.push('Increase rest days and focus on recovery.');
      recommendations.push('Consider hamstring strengthening and flexibility work.');
    } else if (riskLevel === 'medium') {
      recommendations.push('Monitor training load and ensure adequate recovery.');
      recommendations.push('Maintain hamstring and sprint conditioning.');
    } else {
      recommendations.push('Current physical profile suggests low injury risk.');
      recommendations.push('Maintain current training and recovery habits.');
    }

    const result = { playerId: playerId || 'unknown', riskProbability, riskLevel, topRiskFactors, recommendations, modelConfidence: pythonResult.model_confidence ?? 0.85, timestamp: new Date().toISOString() };

    res.json(result);
  } catch (error) {
    console.error('Injury prediction error:', error);
    res.status(500).json({ error: error.message || 'Failed to predict injury risk', details: 'Ensure the Python API is running and xgb_model.pkl is in server/python-api/models/' });
  }
};

export const health = async (req, res) => {
  try {
    const response = await fetch(`${PYTHON_API_URL}/health`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(503).json({ status: 'error', python_api: 'unavailable', error: error.message });
  }
};