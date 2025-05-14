import { json } from '@sveltejs/kit';
import { logError, logInfo, logDebug } from '$lib/utils/secureLogger';

export const POST = async ({ request }) => {
  try {
    // Parse the JSON body from the request
    const body = await request.json();
    const { sessionId, userId, message, operation, patientId } = body;

    // Validate required parameters
    if (!sessionId || !userId || !message || !operation || !patientId) {
      logError('API n8n-send-message: Missing required parameters', { body });
      return json({ 
        success: false, 
        error: 'Missing required parameters' 
      }, { status: 400 });
    }

    logInfo('API n8n-send-message: Processing question', { 
      sessionId,
      userId,
      operation,
      messagePreview: message.substring(0, 50)
    });

    // In a real implementation, this would call your n8n instance or other backend service
    // For this example, we'll return a simulated response based on the question
    
    // Simulate API processing time
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Generate a response based on the question
    const response = generateQuestionResponse(message, patientId);
    
    logDebug('API n8n-send-message: Returning successful response');
    
    return json({
      success: true,
      data: response
    });
    
  } catch (error: unknown) {
    logError('API n8n-send-message: Error processing request', { error });
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return json({ 
      success: false, 
      error: errorMessage 
    }, { status: 500 });
  }
};

// Helper function to generate a response based on the question
function generateQuestionResponse(question: string, _patientId: string | number): string {
  // Convert question to lowercase for easier matching
  const q = question.toLowerCase();
  
  // Check for common question patterns and provide appropriate responses
  if (q.includes('blood pressure') || q.includes('bp')) {
    return `
Your blood pressure readings over the last period have been generally stable, with an average of 120/78 mmHg.

Your most recent readings were:
- Yesterday: 118/76 mmHg
- 3 days ago: 122/80 mmHg  
- 1 week ago: 117/75 mmHg

These readings are within the normal range. Would you like recommendations for maintaining healthy blood pressure?
    `;
  }
  
  if (q.includes('heart rate') || q.includes('pulse') || q.includes('bpm')) {
    return `
Your average resting heart rate has been 72 BPM. Your heart rate typically ranges from 65-80 BPM during rest and increases appropriately during exercise.

During your recorded exercise sessions, your heart rate reached:
- Low intensity: 95-110 BPM
- Medium intensity: 110-130 BPM
- High intensity: 130-155 BPM

This pattern is consistent with healthy cardiovascular function for your age and activity level.
    `;
  }
  
  if (q.includes('step') || q.includes('walk')) {
    return `
Your step count data shows:

- Daily average: 7,834 steps
- Highest day: 12,456 steps (last Saturday)
- Lowest day: 3,217 steps (last Tuesday)

You've exceeded 10,000 steps on 5 days in the last month. Your activity tends to be higher on weekends and lower on Tuesdays and Thursdays.

Would you like suggestions for increasing your daily step count or setting up a walking schedule?
    `;
  }
  
  if (q.includes('sleep') || q.includes('slept')) {
    return `
Your sleep data indicates:

- Average sleep duration: 6.8 hours per night
- Sleep quality score: 72/100
- Best sleep night: Last Friday (8.2 hours, 89% quality)
- Challenging sleep night: Monday (5.4 hours, 58% quality)

Your REM sleep averages 1.5 hours per night, which is within normal ranges. Your deep sleep averages 1.2 hours, which is slightly below the recommended amount for optimal recovery.

Would you like some suggestions for improving your sleep quality?
    `;
  }
  
  if (q.includes('weight') || q.includes('kg') || q.includes('pound') || q.includes('lb')) {
    return `
Your weight has remained relatively stable over the past period:

- Current weight: 68.5 kg
- Change from previous period: -0.3 kg
- Overall trend: Slight downward trend (0.1 kg per week)

Your weight fluctuates within a 1.2 kg range throughout each week, which is normal and typically related to water retention and food intake timing.
    `;
  }
  
  if (q.includes('exercise') || q.includes('workout') || q.includes('activity')) {
    return `
Your exercise data shows you've been active for approximately 185 minutes over the past week:

- Cardio/Walking: 120 minutes
- Strength Training: 45 minutes
- Flexibility/Yoga: 20 minutes

Your activity intensity has been moderate overall. According to your heart rate during exercise, you're typically working at 60-70% of your maximum heart rate, which is ideal for cardiovascular health and fat burning.

Would you like recommendations for optimizing your workout routine?
    `;
  }
  
  // Default response for other questions
  return `
Based on your health tracker data, I can provide information about several health metrics including steps, sleep, heart rate, blood pressure, exercise, and weight changes.

Your overall health trends have been stable, with some positive improvements in activity levels compared to previous periods.

Could you please specify which aspect of your health data you'd like to learn more about? For example, you can ask about:
- Sleep patterns
- Step count and activity
- Heart rate trends
- Blood pressure readings
- Exercise summary
- Weight changes
  `;
}