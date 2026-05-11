const Anthropic = require('@anthropic-ai/sdk');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { imageBase64, mediaType, previousResults } = JSON.parse(event.body);

    if (!imageBase64 || !mediaType) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing image data' }) };
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const systemPrompt = `You are a medical lab results analyzer for HEAL Peptides research clients.
Extract biomarkers from blood test images/PDFs and return structured JSON.
Always respond ONLY with valid JSON, no markdown, no explanation.`;

    const userPrompt = previousResults
      ? `Analyze this blood test and compare with the previous results below.
         
Previous results (${previousResults.date}):
${JSON.stringify(previousResults.markers, null, 2)}

For each marker found, calculate the change vs previous result.
Return JSON in this exact format:
{
  "date": "detected date or null",
  "lab": "lab name if visible",  
  "markers": [
    {
      "name": "Marker name",
      "value": 95.2,
      "unit": "mg/dL",
      "reference": "70-100",
      "status": "normal|high|low",
      "previousValue": 110.5,
      "change": -15.3,
      "changePct": -13.9,
      "trend": "improved|worsened|stable"
    }
  ],
  "summary": "2-3 sentence AI summary of overall health trend and what changed"
}`
      : `Extract all biomarkers from this blood test image.
Return JSON in this exact format:
{
  "date": "detected date or null",
  "lab": "lab name if visible",
  "markers": [
    {
      "name": "Marker name",
      "value": 95.2,
      "unit": "mg/dL", 
      "reference": "70-100",
      "status": "normal|high|low"
    }
  ],
  "summary": "2-3 sentence summary of the overall results"
}`;

    const response = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: imageBase64 }
          },
          { type: 'text', text: userPrompt }
        ]
      }]
    });

    const raw = response.content[0].text.trim();
    // Strip markdown code blocks if present
    const clean = raw.replace(/^```json\s*/,'').replace(/^```\s*/,'').replace(/\s*```$/,'');
    const result = JSON.parse(clean);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(result)
    };

  } catch (err) {
    console.error('analyze-labs error:', err);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: err.message || 'Analysis failed' })
    };
  }
};
