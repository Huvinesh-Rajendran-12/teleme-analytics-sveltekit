import { json } from '@sveltejs/kit';
import { logError, logInfo, logDebug } from '$lib/utils/secureLogger';

export const POST = async ({ request }) => {
  try {
    // Parse the JSON body from the request
    const body = await request.json();
    const { sessionId, userId, userName, period, message, operation, patientId } = body;

    // Validate required parameters
    if (!sessionId || !userId || !userName || !period || !message || !operation || !patientId) {
      logError('API n8n-call-with-params: Missing required parameters', { body });
      return json({ 
        success: false, 
        error: 'Missing required parameters' 
      }, { status: 400 });
    }

    logInfo('API n8n-call-with-params: Processing request', { 
      sessionId,
      userId,
      operation,
      period
    });

    // In a real implementation, this would call your n8n instance or other backend service
    // For this example, we'll return a simulated response
    
    // Simulate API processing time
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Generate a sample response based on the period
    const response = generateSampleResponse(period, patientId);
    
    logDebug('API n8n-call-with-params: Returning successful response');
    
    return json({
      success: true,
      data: response
    });
    
  } catch (error: unknown) {
    logError('API n8n-call-with-params: Error processing request', { error: error.message });
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return json({ 
      success: false, 
      error: errorMessage 
    }, { status: 500 });
  }
};

// Helper function to generate a sample response based on the period
function generateSampleResponse(period: number, patientId: string | number): string {
  const periodText = period === 1 ? "1 month" : period === 3 ? "3 months" : "6 months";
  
  // Generic sample data
  const heartRateAvg = 75 + Math.floor(Math.random() * 10);
  const stepCount = 6000 + Math.floor(Math.random() * 4000);
  const sleepHours = 6.5 + Math.random();
  const exerciseMinutes = 120 + Math.floor(Math.random() * 120);
  const weightChange = (Math.random() * 2 - 1).toFixed(1);
  const bloodPressureReadings = [];
  
  // Generate some random blood pressure readings
  for (let i = 0; i < 3; i++) {
    const systolic = 115 + Math.floor(Math.random() * 15);
    const diastolic = 75 + Math.floor(Math.random() * 10);
    bloodPressureReadings.push(`${systolic}/${diastolic}`);
  }
  
  // Return a formatted summary of health tracker data
  return `
# Health Tracker Summary for the Past ${periodText}

## Overview
Patient ID: ${patientId}
Time Period: Last ${periodText}
Last Updated: ${new Date().toLocaleDateString()}

## Vital Statistics
- **Average Heart Rate**: ${heartRateAvg} BPM
- **Blood Pressure Readings**: ${bloodPressureReadings.join(', ')}
- **Weight Change**: ${weightChange} kg

## Activity Data
- **Average Daily Steps**: ${stepCount}
- **Exercise Minutes**: ${exerciseMinutes} minutes
- **Average Sleep**: ${sleepHours.toFixed(1)} hours per night

## Highlights
- Your daily step count is ${stepCount > 7500 ? 'above' : 'below'} the recommended 7,500 steps per day.
- Your sleep average is ${sleepHours > 7 ? 'adequate' : 'below recommended levels'} for optimal health.
- Your exercise minutes ${exerciseMinutes > 150 ? 'exceed' : 'fall short of'} the weekly recommendation of 150 minutes.

## Recommendations
- ${stepCount < 7500 ? 'Try to increase your daily steps gradually.' : 'Keep up the good work with your step count!'}
- ${sleepHours < 7 ? 'Consider adjusting your bedtime routine to improve sleep duration.' : 'Your sleep habits are supporting your health well.'}
- ${exerciseMinutes < 150 ? 'Adding even short bursts of activity can help reach exercise goals.' : 'Your exercise routine is excellent!'}

You can ask me specific questions about your health data or request more detailed information about any of these metrics.
`;
}