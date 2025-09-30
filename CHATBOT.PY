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
CORS(app)  # Enable CORS for all routes

# Use environment variable for API key (set this in Render Dashboard)
openai.api_key = os.getenv("OPENAI_API_KEY")

# In-memory storage for conversation sessions
conversation_sessions = {}


@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok'})


@app.route('/chat', methods=['POST'])
def chat():
    try:
        data = request.json
        user_message = data.get('message', '')
        data_summary = data.get('data_summary', '')
        conversation_history = data.get('conversation_history', [])
        session_id = data.get('session_id', 'default')

        if not user_message:
            return jsonify({'error': 'No message provided'}), 400

        # Parse data summary
        try:
            summary_data = json.loads(data_summary)
        except:
            summary_data = {}

        # Manage conversation session
        if session_id not in conversation_sessions:
            conversation_sessions[session_id] = {
                'history': [],
                'data_context': summary_data,
                'created_at': datetime.now().isoformat()
            }
        else:
            if summary_data:
                conversation_sessions[session_id]['data_context'] = summary_data

        session = conversation_sessions[session_id]
        session['history'].append({"role": "user", "content": user_message})

        # Build system message
        system_message = f"""
        You are SmartBot, an advanced AI assistant for HR Analytics Dashboard.

        Data Context:
        {json.dumps(summary_data, indent=2)}

        Guidelines:
        - Base answers on the provided data context
        - Use markdown for formatting
        - Include numbers and stats when available
        - Be professional, concise, and helpful
        """

        # OpenAI Chat API
        response = openai.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": system_message},
                *session['history']
            ],
            max_tokens=1500,
            temperature=0.3,
            top_p=0.9
        )

        bot_response = response.choices[0].message.content
        bot_response = enhance_response_formatting(bot_response, summary_data)

        session['history'].append({"role": "assistant", "content": bot_response})

        return jsonify({
            'response': bot_response,
            'conversation_history': session['history']
        })

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({'error': str(e)}), 500


def enhance_response_formatting(response, data):
    """Enhance response formatting with extra stats"""

    if "salary" in response.lower() and data.get('salaryStats'):
        salary_stats = data['salaryStats']
        response += f"\n\n**Salary Statistics:**\n- Mean: RM{salary_stats['mean']:,.2f}\n- Median: RM{salary_stats['median']:,.2f}\n- Range: RM{salary_stats['min']:,.2f} - RM{salary_stats['max']:,.2f}"

    if "gender" in response.lower() and data.get('genderDistribution'):
        gender_dist = data['genderDistribution']
        total = sum(gender_dist.values())
        response += f"\n\n**Gender Distribution:**\n- Male: {gender_dist['male']} ({gender_dist['male']/total*100:.1f}%)\n- Female: {gender_dist['female']} ({gender_dist['female']/total*100:.1f}%)"
        if gender_dist.get('other'):
            response += f"\n- Other: {gender_dist['other']} ({gender_dist['other']/total*100:.1f}%)"

    if ("turnover" in response.lower() or "exit" in response.lower()) and data.get('exitedEmployees') and data.get('totalEmployees'):
        exit_rate = data['exitedEmployees'] / data['totalEmployees'] * 100
        response += f"\n\n**Turnover Insights:**\n- Overall exit rate: {exit_rate:.1f}%\n- Exited employees: {data['exitedEmployees']}\n- Active employees: {data['activeEmployees']}"

    response = re.sub(r'(\d)(?=(\d{3})+(?!\d))', r'\1,', response)
    return response


if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=True, host='0.0.0.0', port=port)
