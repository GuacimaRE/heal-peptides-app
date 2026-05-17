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

    const systemPrompt = `You are a blood test biomarker extractor for HEAL Peptides.
Your job is to extract and categorize lab markers from blood test images or PDFs.
Return structured JSON only — no markdown, no explanation outside the JSON.

CRITICAL RULES — follow strictly:
1. NEVER mention specific peptide names (e.g. Tirzepatide, BPC-157, Semaglutide, GHK-Cu, Epitalon, NAD+, etc.)
2. NEVER suggest a specific compound, supplement, or treatment for any marker.
3. ONLY use general research category labels (e.g. "metabolic regulation", "GH-axis support", "cellular energy", "longevity compounds").
4. The "summary" field must ALWAYS end with: "Discuss these results with your healthcare provider before making any protocol changes."
5. If a marker is out of range, describe it objectively — do NOT imply a cause or cure.
6. You are providing educational data extraction only, not medical advice.`;

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
      "trend": "improved|worsened|stable",
      "researchCategory": "general research category if out of range, or null if normal"
    }
  ],
  "summary": "2-3 sentence objective summary of overall health trend and what changed. End with: Discuss these results with your healthcare provider before making any protocol changes."
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
      "status": "normal|high|low",
      "researchCategory": "general research category if out of range, or null if normal"
    }
  ],
  "summary": "2-3 sentence objective summary of the overall results. End with: Discuss these results with your healthcare provider before making any protocol changes."
}`;

    // PDFs use 'document' type; images use 'image' type
    const isPdf = mediaType === 'application/pdf';
    const contentBlock = isPdf
      ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: imageBase64 } }
      : { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } };

    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: [
          contentBlock,
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
