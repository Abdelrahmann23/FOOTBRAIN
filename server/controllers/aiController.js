import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
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
    const goals = Number(player.stats?.goals ?? 0);
    const assists = Number(player.stats?.assists ?? 0);
    // Fallbacks prevent zeroed predictions when shot stats were never entered.
    const shotsRaw = Number(player.stats?.shots ?? 0);
    const shotsOnTargetRaw = Number(player.stats?.shotsOnTarget ?? 0);
    const shots = shotsRaw > 0 ? shotsRaw : Math.max(1, goals * 3 + assists * 2);
    const shotsOnTarget = shotsOnTargetRaw > 0 ? shotsOnTargetRaw : Math.max(1, goals + assists);
    const minutesPlayed = player.stats?.minutesPlayed ?? 0;
    const tackles = player.stats?.tackles ?? player.stats?.tackle ?? 0;
    const interceptions = player.stats?.interceptions ?? player.stats?.interception ?? 0;

    const pythonRequest = {
      Age: age,
      'Gls+Ast': goals + assists,
      Sh: shots,
      SoT: shotsOnTarget,
      Player: player.name || 'Unknown Player',
      Nation: player.nationality || 'Other',
      Pos: player.position || 'FW',
      Club_x: player.team || 'Unknown Club',
      Leauge: player.comp || 'Unknown League',
      Minutes_Played: minutesPlayed,
      Tackles: tackles,
      Interception: interceptions,
      Goals: goals,
      Assists: assists,
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

    const predictedValue =
      typeof pythonResult.predictedValue === 'number'
        ? pythonResult.predictedValue
        : typeof pythonResult.predictedValueEuros === 'number'
        ? pythonResult.predictedValueEuros / 1_000_000
        : 0;
    const confidence = 0.85;
    const valueRange = { min: Math.max(0, predictedValue * 0.8), max: predictedValue * 1.2 };

    const isDefender = String(player.position || '').toLowerCase().includes('def');
    const valueFactors = isDefender
      ? [
          { factor: 'Tackles', contribution: Math.min(35, (tackles / 120) * 35), trend: tackles > 70 ? 'up' : tackles < 25 ? 'down' : 'stable' },
          { factor: 'Interceptions', contribution: Math.min(30, (interceptions / 100) * 30), trend: interceptions > 55 ? 'up' : interceptions < 20 ? 'down' : 'stable' },
          { factor: 'Minutes', contribution: Math.min(20, (minutesPlayed / 1800) * 20), trend: minutesPlayed > 900 ? 'up' : 'stable' },
          { factor: 'Age', contribution: age < 25 ? 15 : age > 31 ? 8 : 12, trend: age < 25 ? 'up' : age > 31 ? 'down' : 'stable' },
        ]
      : [
          { factor: 'Goals', contribution: Math.min(30, (goals / 30) * 30), trend: goals > 15 ? 'up' : goals < 5 ? 'down' : 'stable' },
          { factor: 'Assists', contribution: Math.min(25, (assists / 20) * 25), trend: assists > 10 ? 'up' : assists < 3 ? 'down' : 'stable' },
          { factor: 'Age', contribution: age < 25 ? 20 : age > 30 ? 10 : 15, trend: age < 25 ? 'up' : age > 30 ? 'down' : 'stable' },
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
      inputStats: pythonResult.input || {
        Age: age,
        Minutes_Played: minutesPlayed,
        Tackles: tackles,
        Interception: interceptions,
        Goals: goals,
        Assists: assists,
        Pos: player.position || 'Unknown',
      },
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
      return res.status(400).json({ error: 'Physical attributes are required for injury prediction (age, height, weight, minutes_played, distance_covered_km, max_speed_kmh, sprint_count, hsr_m)' });
    }

    const age = physical.age ?? 25;
    const height = physical.height ?? 180;
    const weight = physical.weight ?? 75;
    const minutes_played = physical.minutes_played ?? 90;
    const distance_covered_km = physical.distance_covered_km ?? 10;
    const max_speed_kmh = physical.max_speed_kmh ?? 34;
    const sprint_count = physical.sprint_count ?? 250;
    const hsr_m = physical.hsr_m ?? 8000;

    const pythonRequest = {
      age: Number(age),
      height: Number(height),
      weight: Number(weight),
      minutes_played: Number(minutes_played),
      distance_covered_km: Number(distance_covered_km),
      max_speed_kmh: Number(max_speed_kmh),
      sprint_count: Number(sprint_count),
      hsr_m: Number(hsr_m),
    };

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

export const analyzeVideo = async (req, res) => {
  try {
    const rawPath = req.file?.path || req.body?.videoPath;
    const videoPath = rawPath ? path.resolve(rawPath) : null;
    if (!videoPath) {
      return res.status(400).json({
        error: 'No video provided',
        details: 'Upload a file with field name "video" (multipart/form-data) or send JSON { "videoPath": "absolute/path" }.'
      });
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 300000);
    let response;
    try {
      response = await fetch(`${PYTHON_API_URL}/analyze-video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoPath }),
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeout);
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return res.status(response.status).json(data);
    }
    res.json(data);
  } catch (fetchError) {
    if (fetchError.name === 'AbortError') {
      return res.status(504).json({ error: 'Video analysis timed out', details: 'Try a shorter clip or ensure Python API is running.' });
    }
    if (fetchError.cause?.code === 'ECONNREFUSED' || fetchError.code === 'ECONNREFUSED') {
      return res.status(503).json({ error: 'Python API is not running', details: 'Start the Python API: npm run dev:python' });
    }
    console.error('Video analysis error:', fetchError);
    res.status(500).json({ error: fetchError.message || 'Video analysis failed' });
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