"""
============================================================
 MemeForge AI — Python Flask Backend
 Proxies all external API calls (Imgflip, Gemini AI, Giphy)
 and keeps API keys secure on the server.
============================================================
"""

import os
import json
import requests
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv

# ─── Load environment variables ───────────────────────────────
load_dotenv()

GEMINI_API_KEY    = os.getenv('GEMINI_API_KEY', '')
GIPHY_API_KEY     = os.getenv('GIPHY_API_KEY', '')
IMGFLIP_USERNAME  = os.getenv('IMGFLIP_USERNAME', '')
IMGFLIP_PASSWORD  = os.getenv('IMGFLIP_PASSWORD', '')

# ─── Flask App ────────────────────────────────────────────────
app = Flask(__name__, static_folder='../frontend', static_url_path='')
CORS(app)


# ═══════════════════════════════════════════════════════════════
#  ROUTE: Serve Frontend
# ═══════════════════════════════════════════════════════════════
@app.route('/')
def serve_frontend():
    """Serve the frontend index.html"""
    return send_from_directory(app.static_folder, 'index.html')


# ═══════════════════════════════════════════════════════════════
#  ROUTE: Health Check
# ═══════════════════════════════════════════════════════════════
@app.route('/api/health')
def health():
    """Health check endpoint — also reports which API keys are configured."""
    return jsonify({
        'status': 'ok',
        'service': 'MemeForge AI Backend',
        'apis': {
            'gemini':  bool(GEMINI_API_KEY),
            'giphy':   bool(GIPHY_API_KEY),
            'imgflip': bool(IMGFLIP_USERNAME and IMGFLIP_PASSWORD),
        }
    })


# ═══════════════════════════════════════════════════════════════
#  ROUTE: Get Meme Templates (Imgflip)
# ═══════════════════════════════════════════════════════════════
@app.route('/api/memes')
def get_memes():
    """Proxy the Imgflip get_memes API."""
    try:
        res = requests.get('https://api.imgflip.com/get_memes', timeout=10)
        data = res.json()
        return jsonify(data)
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ═══════════════════════════════════════════════════════════════
#  ROUTE: Caption / Forge a Meme (Imgflip)
# ═══════════════════════════════════════════════════════════════
@app.route('/api/caption', methods=['POST'])
def caption_meme():
    """
    Proxy the Imgflip caption_image API.
    Expects JSON body with: template_id, boxes (array), font, color
    Server injects stored Imgflip credentials.
    """
    try:
        body = request.get_json(force=True)
        template_id = body.get('template_id', '')
        boxes       = body.get('boxes', [])
        font        = body.get('font', 'Impact')

        if not template_id:
            return jsonify({'success': False, 'error': 'Missing template_id'}), 400

        # Build form data for Imgflip API
        form = {
            'template_id': template_id,
            'username':    IMGFLIP_USERNAME,
            'password':    IMGFLIP_PASSWORD,
            'font':        font,
        }

        for i, box in enumerate(boxes):
            form[f'boxes[{i}][text]']          = box.get('text', '')
            form[f'boxes[{i}][color]']         = box.get('color', '#ffffff')
            form[f'boxes[{i}][outline_color]'] = box.get('outline_color', '#000000')

        res = requests.post('https://api.imgflip.com/caption_image', data=form, timeout=15)
        data = res.json()
        return jsonify(data)

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ═══════════════════════════════════════════════════════════════
#  ROUTE: AI Text Analysis (Gemini)
# ═══════════════════════════════════════════════════════════════
@app.route('/api/ai/analyze', methods=['POST'])
def ai_analyze():
    """
    Send text to Gemini AI for meme analysis.
    Expects JSON body with: text
    Returns: emotion, category, template_suggestion, top_text, bottom_text
    """
    if not GEMINI_API_KEY:
        return jsonify({'success': False, 'error': 'Gemini API key not configured'}), 503

    try:
        body = request.get_json(force=True)
        text = body.get('text', '').strip()

        if not text:
            return jsonify({'success': False, 'error': 'Missing text'}), 400

        prompt = f'''You are a meme generation AI. Analyze this text and return ONLY valid JSON (no markdown, no code fences):
"{text}"

Return JSON with these exact keys:
{{
  "emotion": "<detected emotion with emoji prefix, e.g. 😂 funny>",
  "category": "<meme category, e.g. student life, coding, daily struggle>",
  "template_suggestion": "<name of a popular meme template from imgflip like: Drake Hotline Bling, Third World Skeptical Kid, Star Wars Yoda, Look At Me, Grant Gustin over grave, Change My Mind, Two Buttons, Panik Kalm Panik, etc.>",
  "top_text": "<short meme top text, max 10 words>",
  "bottom_text": "<short meme bottom text, max 12 words>"
}}
Keep captions concise, humorous, and relatable. Use well-known meme templates only.'''

        gemini_url = f'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}'

        res = requests.post(gemini_url, json={
            'contents': [{'parts': [{'text': prompt}]}]
        }, timeout=30)

        data = res.json()

        if 'error' in data:
            return jsonify({'success': False, 'error': data['error'].get('message', 'Gemini API error')}), 500

        raw = data.get('candidates', [{}])[0].get('content', {}).get('parts', [{}])[0].get('text', '')
        # Strip markdown fences if present
        raw = raw.replace('```json', '').replace('```', '').strip()
        result = json.loads(raw)

        return jsonify({'success': True, 'data': result})

    except json.JSONDecodeError:
        return jsonify({'success': False, 'error': 'Failed to parse Gemini response'}), 500
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ═══════════════════════════════════════════════════════════════
#  ROUTE: AI Vision Scan (Gemini Vision)
# ═══════════════════════════════════════════════════════════════
@app.route('/api/ai/vision', methods=['POST'])
def ai_vision():
    """
    Send an image URL to Gemini Vision for caption suggestions.
    Expects JSON body with: image_url, template_name
    The server fetches the image, converts to base64, and sends to Gemini.
    """
    if not GEMINI_API_KEY:
        return jsonify({'success': False, 'error': 'Gemini API key not configured'}), 503

    try:
        body = request.get_json(force=True)
        image_url     = body.get('image_url', '').strip()
        template_name = body.get('template_name', 'Unknown')

        if not image_url:
            return jsonify({'success': False, 'error': 'Missing image_url'}), 400

        # Fetch the image from URL
        img_res = requests.get(image_url, timeout=15)
        img_res.raise_for_status()

        import base64
        img_base64 = base64.b64encode(img_res.content).decode('utf-8')
        mime_type = img_res.headers.get('Content-Type', 'image/jpeg')

        prompt = '''You are a world-class meme expert and viral content creator. Analyze this meme template image very carefully.

STEP 1 — IDENTIFY THE TEMPLATE:
- Recognize this meme template (e.g. "Drake Hotline Bling", "Distracted Boyfriend", "Two Buttons", "Expanding Brain", etc.)
- If you recognize it, use your knowledge of how this template is used worldwide on Reddit, Instagram, Twitter/X, and TikTok
- Note the characters, their expressions, body language, the scene layout, and the panel structure

STEP 2 — DESCRIBE WHAT YOU SEE:
- Write a 1-2 sentence description of the image (who/what is shown, expressions, context)
- If you recognize the template, mention its real name

STEP 3 — GENERATE 6 WORLDWIDE VIRAL CAPTION PAIRS:
Create exactly 6 caption pairs (top_text and bottom_text) that could go viral globally. These should be:
- Inspired by the MOST POPULAR and TRENDING ways this template is used worldwide
- The kind of captions that get millions of likes on meme pages globally
- Universally funny — not region-specific, understandable by anyone worldwide
- Covering diverse topics: tech/coding, student life, work life, relationships, daily struggles, internet culture
- Short and punchy (max 8 words per line for maximum impact)
- Each caption should have a different vibe: funny, savage, relatable, wholesome, sarcastic, dark

IMPORTANT: Think about what makes memes go viral — surprise, irony, relatability, exaggeration. Use those principles.

Return ONLY valid JSON (no markdown, no code fences):
{
  "image_description": "<what you see + template name if recognized>",
  "suggestions": [
    { "top": "<top text>", "bottom": "<bottom text>", "vibe": "funny" },
    { "top": "<top text>", "bottom": "<bottom text>", "vibe": "savage" },
    { "top": "<top text>", "bottom": "<bottom text>", "vibe": "relatable" },
    { "top": "<top text>", "bottom": "<bottom text>", "vibe": "wholesome" },
    { "top": "<top text>", "bottom": "<bottom text>", "vibe": "sarcastic" },
    { "top": "<top text>", "bottom": "<bottom text>", "vibe": "dark" }
  ]
}'''

        gemini_url = f'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}'

        res = requests.post(gemini_url, json={
            'contents': [{
                'parts': [
                    {
                        'inline_data': {
                            'mime_type': mime_type,
                            'data': img_base64,
                        }
                    },
                    {'text': prompt}
                ]
            }]
        }, timeout=45)

        data = res.json()

        if 'error' in data:
            return jsonify({'success': False, 'error': data['error'].get('message', 'Gemini Vision error')}), 500

        raw = data.get('candidates', [{}])[0].get('content', {}).get('parts', [{}])[0].get('text', '')
        raw = raw.replace('```json', '').replace('```', '').strip()
        result = json.loads(raw)

        return jsonify({'success': True, 'data': result})

    except json.JSONDecodeError:
        return jsonify({'success': False, 'error': 'Failed to parse Gemini Vision response'}), 500
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ═══════════════════════════════════════════════════════════════
#  ROUTE: GIF Search (Giphy)
# ═══════════════════════════════════════════════════════════════
@app.route('/api/gifs/search')
def gif_search():
    """
    Proxy the Giphy search API.
    Query params: q, limit, offset, rating
    """
    if not GIPHY_API_KEY:
        return jsonify({'success': False, 'error': 'Giphy API key not configured'}), 503

    try:
        q      = request.args.get('q', 'trending memes')
        limit  = request.args.get('limit', '20')
        offset = request.args.get('offset', '0')
        rating = request.args.get('rating', 'pg-13')

        url = (
            f'https://api.giphy.com/v1/gifs/search'
            f'?api_key={GIPHY_API_KEY}'
            f'&q={q}'
            f'&limit={limit}'
            f'&offset={offset}'
            f'&rating={rating}'
            f'&lang=en'
        )

        res = requests.get(url, timeout=10)
        data = res.json()
        return jsonify(data)

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ═══════════════════════════════════════════════════════════════
#  Main
# ═══════════════════════════════════════════════════════════════
if __name__ == '__main__':
    print('\n[BRAIN] MemeForge AI Backend starting...')
    print(f'   Gemini API:  {"[OK] configured" if GEMINI_API_KEY else "[X] missing"}')
    print(f'   Giphy API:   {"[OK] configured" if GIPHY_API_KEY else "[X] missing"}')
    print(f'   Imgflip:     {"[OK] configured" if IMGFLIP_USERNAME else "[X] missing"}')
    print(f'\n[GO] Server running at http://localhost:5000')
    print(f'   Frontend:    http://localhost:5000/')
    print(f'   API Health:  http://localhost:5000/api/health\n')

    app.run(debug=True, port=5000)
