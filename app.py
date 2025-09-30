from flask import Flask, request, jsonify, send_from_directory
import openai
import os
from flask_cors import CORS
import json

app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)

# Set your OpenAI API key
openai.api_key = os.environ.get('OPENAI_API_KEY')


@app.route('/')
def serve_index():
    return send_from_directory('.', 'index.html')


@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('.', path)


@app.route('/chat', methods=['POST'])
def chat():
    try:
        # Get the data from the request
        data = request.json
        user_message = data.get('message', '')
        data_summary = data.get('data_summary', '')

        if not user_message:
            return jsonify({'error': 'No message provided'}), 400

        # Create the system message
        system_message = f"""You are SmartBot, an AI assistant for HR Analytics Dashboard. You have access to the following employee data summary:
        
{data_summary}

Your task is to answer questions about this HR data, provide insights, and help with general HR-related inquiries. Be professional, concise, and helpful. If you don't know the answer or the information is not available in the data, say so clearly.

Important: Format your responses in markdown for better readability."""

        # Call the OpenAI API
        response = openai.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": user_message}
            ],
            max_tokens=1000,
            temperature=0.5
        )

        # Extract the response
        bot_response = response.choices[0].message.content

        return jsonify({
            'response': bot_response
        })

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({'error': 'An error occurred while processing your request'}), 500


if __name__ == '__main__':
    app.run(debug=False, host='0.0.0.0', port=5000)
