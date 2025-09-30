from flask import Flask, request, jsonify
import openai
import os
import json
import pandas as pd
import numpy as np
from flask_cors import CORS
from datetime import datetime
import re

app = Flask(__name__)
CORS(app) # Enable CORS for all routes

# Set your OpenAI API key
openai.api_key = "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" # Replace with your actual API key

# In-memory storage for conversation sessions
conversation_sessions = {}


@app.route('/health', methods=['GET'])
def health_check():
return jsonify({'status': 'ok'})


@app.route('/chat', methods=['POST'])
def chat():
try:
# Get the data from the request
data = request.json
user_message = data.get('message', '')
data_summary = data.get('data_summary', '')
conversation_history = data.get('conversation_history', [])
session_id = data.get('session_id', '')

if not user_message:
return jsonify({'error': 'No message provided'}), 400

# Parse data summary
try:
summary_data = json.loads(data_summary)
except:
summary_data = {}

# Get or create conversation session
if session_id not in conversation_sessions:
conversation_sessions[session_id] = {
'history': [],
'data_context': summary_data,
'created_at': datetime.now().isoformat()
}
else:
# Update data context if new data is provided
if summary_data:
conversation_sessions[session_id]['data_context'] = summary_data

session = conversation_sessions[session_id]

# Add current message to history
session['history'].append({"role": "user", "content": user_message})

# Create the system message with enhanced instructions
system_message = f"""You are SmartBot, an advanced AI assistant for HR Analytics Dashboard. You have access to comprehensive employee data and analytics capabilities.

Your capabilities include:
1. Data Analysis: Perform statistical analysis on HR metrics
2. Trend Identification: Identify patterns in employee data
3. Insights Generation: Provide actionable HR insights
4. Visualization Suggestions: Recommend appropriate charts for data
5. Predictive Analysis: Identify potential HR trends and risks

Data Context:
{json.dumps(summary_data, indent=2)}

Guidelines:
- Base your answers on the provided data context
- Use markdown formatting for better readability
- Include specific numbers and statistics from the data
- For complex queries, break down your analysis step by step
- If data is insufficient, clearly state what information is missing
- Provide actionable recommendations when appropriate
- Be professional, concise, and helpful

Example responses:
- For salary queries: "The average salary is RMX with a range from RMY to RMZ. Department A has the highest average salary at RMA."
- For diversity queries: "The gender distribution is X% male, Y% female, and Z% other. Department B has the most diverse workforce."
- For turnover queries: "The overall turnover rate is X%. Department C has the highest turnover at Y%, which is above the company average."

Current conversation history:
{json.dumps(conversation_history, indent=2)}"""

# Call the OpenAI API
response = openai.chat.completions.create(
model="gpt-4", # Use GPT-4 for better analysis
messages=[
{"role": "system", "content": system_message},
*session['history']
],
max_tokens=1500, # Increased token limit for detailed responses
temperature=0.3, # Lower temperature for more factual responses
top_p=0.9
)

# Extract the response
bot_response = response.choices[0].message.content

# Post-process the response to enhance formatting
bot_response = enhance_response_formatting(bot_response, summary_data)

# Add the bot response to history
session['history'].append(
{"role": "assistant", "content": bot_response})

return jsonify({
'response': bot_response,
'conversation_history': session['history']
})

except Exception as e:
print(f"Error: {e}")
return jsonify({'error': 'An error occurred while processing your request'}), 500


def enhance_response_formatting(response, data):
"""Enhance the response formatting with additional data insights"""

# Add data-driven insights if relevant
if "salary" in response.lower() and data.get('salaryStats'):
salary_stats = data['salaryStats']
response += f"\n\n**Salary Statistics:**\n- Mean: RM{salary_stats['mean']:,.2f}\n- Median: RM{salary_stats['median']:,.2f}\n- Range: RM{salary_stats['min']:,.2f} - RM{salary_stats['max']:,.2f}"

if "gender" in response.lower() and data.get('genderDistribution'):
gender_dist = data['genderDistribution']
total = sum(gender_dist.values())
response += f"\n\n**Gender Distribution:**\n- Male: {gender_dist['male']} ({gender_dist['male']/total*100:.1f}%)\n- Female: {gender_dist['female']} ({gender_dist['female']/total*100:.1f}%)"
if gender_dist.get('other'):
response += f"\n- Other: {gender_dist['other']} ({gender_dist['other']/total*100:.1f}%)"

if "turnover" in response.lower() or "exit" in response.lower():
if data.get('exitedEmployees') and data.get('totalEmployees'):
exit_rate = data['exitedEmployees'] / data['totalEmployees'] * 100
response += f"\n\n**Turnover Insights:**\n- Overall exit rate: {exit_rate:.1f}%\n- Exited employees: {data['exitedEmployees']}\n- Active employees: {data['activeEmployees']}"

# Format numbers with commas
response = re.sub(r'(\d)(?=(\d{3})+(?!\d))', r'\1,', response)

return response


if __name__ == '__main__':
app.run(debug=True, host='0.0.0.0', port=5000)
