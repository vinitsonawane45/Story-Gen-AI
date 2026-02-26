
import os
import io
import json
from dotenv import load_dotenv
from flask import Flask, render_template,request,jsonify,send_file, make_response
from PIL import Image as PILImage
from werkzeug.security import generate_password_hash,check_password_hash

from agno.agent import Agent
from agno.media import Image
from agno.models.google import Gemini

from fpdf import FPDF
import re
from gtts import gTTS
import time

load_dotenv()

app = Flask(__name__)

#--------Local Data Managment-------
USER_DB = 'users.json'

def load_users():
    if not os.path.exists(USER_DB):
        return{}
    with open(USER_DB,'r') as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return {}


def save_users(users):
    with open(USER_DB, 'w') as f:
        json.dump(users,f,indent=4)


#-------AI Configuration-----
# Using the stable Gemini 2.0 Flash model for better creative performance

model = Gemini(
    id="gemini-3-flash-preview",
    temperature=0.9,
    max_output_tokens=2000
)

story_agent = Agent(
    name="Story Generator",
    role="Analyze the image and write a structured but concise narrative story",
    model=model,
    instructions=[
        "Observe the image carefully and extract key meaningful details.",
        "Write a complete story between 400–600 words.",
        "Structure clearly into: Beginning, Middle, and End.",
        "Use vivid but controlled descriptions (avoid unnecessary repetition).",
        "After the story, add a short section titled 'Closing Reflection'.",
        "In Closing Reflection, include exactly 2 short meaningful quotes inspired by the story.",
        "Return output in this format:",
        "Story:",
        "<Story here>",
        "",
        "Closing Reflection:",
        "1. Quote one",
        "2. Quote two"
    ],
)

title_agent = Agent(
    name="Title Generator",
    role="Generate a short and powerful title for the story",
    model=model,
    instructions=[
        "Read the story carefully.",
        "Generate one concise, emotionally strong title (max 8 words).",
        "Return only the title text."
    ],
)


#------Routes----------

@app.route("/")
def index():
    return render_template("index.html")
@app.route("/signup", methods=["POST"])
def signup():
    data = request.get_json()
    name = data.get("name")
    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"error":"Email and password are required"}),400
    
    users =load_users()
    if email in users:
        return jsonify({"error":"User already exists"}),400
    
    #Initailizing with an empty stories list for the Gallery feature

    users[email] ={
        "name":name,
        "password": generate_password_hash(data.get("password")),
        "joined_on":datetime.now().strftime("%B %Y"),
        "stories":[] 
    }
    save_users(users)

    return jsonify({"message":"Account created successfully!"}),201

@app.route("/login", methods = ["POST"])
def login():
    data = request.get_json()
    email = data.get("email")
    password=data.get("password")

    users = load_users()
    user = users.get(email)

    if user and check_password_hash(user['password'],password):
        return jsonify({
            "message":f"Welcome back, {user['name']}!",
            "user": user['name'],
            "email":email
        }),200
    
    return jsonify({"error":"Invalid email or password"}),401

@app.route("/get_stories",methods=["GET"])
def get_stories():
    email = request.args.get('email')
    if not email:
        return jsonify({"error":"Email is required"}),400
    
    users = load_users()
    user_data = users.get(email,{})
    return jsonify({"stories":user_data.get("stories",[])})

@app.route("/generate", methods =["POST"])
def generate():
    if "image" not in request.files:
        return jsonify({"error":"No image uploaded"}),400
    
    file = request.files["image"]
    user_email = request.form.get("email") #Get the email if the user is logged in

    try:
        img = PILImage.open(file.stream)
        img.thumbnail((1200,1200))

        buffer = io.BytesIO()
        img.save(buffer,format='JPEG', quality=85)
        image_bytes = buffer.getvalue()

        #Genrate Story
        story_response = story_agent.run(
            "Create a long, immersive story inspired by this image.",
            images=[Image(content=image_bytes)],
        )
        story = story_response.content.strip()

        #genrate Title
        title_response = title_agent.run(
            f"Genrate a compelling title for the following story:\n{story}"
        )
        title=title_response.content.strip()

        # Save to Gallery if users is logged in

        if user_email:
            users = load_users()
            if user_email in users:
                if "stories" not in users[user_email]:
                    users[user_email]["stories"]=[]

                users[user_email]["stories"].append({
                    "title":title,
                    "story":story
                })

                save_users(users)
        

        return jsonify({
            "title":title,
            "story":story
        })
    except Exception as e:
        return jsonify({"error": str(e)}),500
    
import unicodedata
from fpdf.enums import XPos, YPos

def normalize_text(text):
    #convert smart qutoes and special unicode into ASCII
    text = unicodedata.normalize("NFKD",text)
    return text.encode("latin-1","ignore").decode("latin-1")

@app.route("/download_pdf", methods=["POST"])
def download_pdf():
    data = request.get_json()
    title = data.get("title", "Untitled Story")
    story = data.get("story", "")

    # Normalize text to avoid Unicode crash
    title = normalize_text(title)
    story = normalize_text(story)

    # Clean filename
    safe_title = re.sub(r'[^a-zA-Z0-9_-]', '_', title)

    pdf = FPDF()
    pdf.add_page()

    # Use core font (no Unicode support)
    pdf.set_font("Helvetica", size=16)
    pdf.set_text_color(99, 102, 241)
    pdf.cell(0, 15, title, align="C",new_x=XPos.LMARGIN,new_y=YPos.NEXT)
    pdf.ln(10)

    pdf.set_font("Helvetica", size=12)
    pdf.set_text_color(33, 37, 41)
    pdf.multi_cell(0, 8, story)

    # Proper PDF output
    pdf_bytes = pdf.output(dest="S")
    pdf_buffer = io.BytesIO(pdf_bytes)

    return send_file(
        pdf_buffer,
        as_attachment=True,
        download_name=f"{safe_title}.pdf",
        mimetype="application/pdf"
    )

@app.route("/update_profile",methods =["POST"])

def update_profile():
    """
    Update the user's display name in the local JSON database.
    """
    data = request.get_json()
    email = data.get("email")
    new_name = data.get("name")

    #1 Validation
    if not email or not new_name:
        return jsonify({"error":"Missing email or new name"}),400
   
    #2 Load the current database
    users = load_users()

    #3 Update the specific user's record
    if email in users:
        users[email]["name"] = new_name
        # 4. save the updated data back to users.json
        save_users(users)

        return jsonify({
            "message":"Profile updated successfully",
            "new_name":new_name
        }),200
    
    #5 Handle user not found
    return jsonify({"error": "User session not found in database"}),404

from datetime import datetime
@app.route("/get_user_stats")
def get_user_stats():
    """
    Featches user data including name,story count, and joining data.
    """
    email = request.args.get('email')
    users = load_users()
    user = users.get(email,{})
    stories = user.get("stories",[])
    count = len(stories)

    #Ranking Logic
    if count < 5:
        rank,color = "Novie Bard", "#94a3b8"
    elif count < 15:
        rank,color ="Artisan Narrator", "#6366f1"
    else:
        rank, color = "Grand Architect", "#fbbf24"
    
    return jsonify({
        "name" : user.get("name","User"),
        "story_count": count,
        "joined_on": user.get("joined_on","N/A"),
        "rank":rank,
        "rank_color": color
    })

    #Calculate stats
    story_list = user.get("stories",[])

    return jsonify({
        "name":user.get("name","User"),
        "story_count":len(story_list),
        "joined_on":users.get("joined_on","N/A"),
        "recent_story":story_list[-1]['title'] if story_list else "None"
    })

@app.route("/generate_audio", methods=["POST"])
def generate_audio():
    data = request.get_json()
    text = data.get("text", "")
    
    if not text:
        return jsonify({"error": "No story text provided"}), 400

    try:
        audio_folder = "static/audio"
        os.makedirs(audio_folder, exist_ok=True)
        
        # Use a unique timestamp to prevent the browser from playing an old cached file
        filename = f"voice_{int(time.time())}.mp3"
        audio_path = os.path.join(audio_folder, filename)
        
        # Ensure we are passing the full text and not a truncated version
        tts = gTTS(text=text, lang='en', slow=False)
        tts.save(audio_path)
        
        return jsonify({"audio_url": f"/static/audio/{filename}"}), 200
    except Exception as e:
        return jsonify({"error": f"Audio Error: {str(e)}"}), 500

from googletrans import Translator
import google.generativeai as genai
import asyncio


async def get_translation(text, dest_lang):
    """Internal helper to wait for the Google API response"""
    translator = Translator()
    # Awaiting here ensures we get the text, not a 'coroutine' object
    result = await translator.translate(text, dest=dest_lang)
    return result.text

@app.route("/translate", methods=["POST"])
def translate_story():
    data = request.get_json()
    text = data.get("text", "")
    target_lang = data.get("lang", "hi") # 'hi' for Hindi, 'mr' for Marathi

    if not text:
        return jsonify({"error": "No text provided"}), 400

    try:
        # Use Gemini to translate while maintaining the "storyteller" tone
        model = genai.GenerativeModel('gemini-3-flash-preview')
        
        prompt = f"""
        Act as a professional translator. Translate the following story into {target_lang}.
        Maintain the creative tone and emotional impact. 
        Only provide the translated text, no other conversation.
        
        Story: {text}
        """
        
        response = model.generate_content(prompt)
        translated_text = response.text.strip()
        
        return jsonify({
            "translated_text": translated_text,
            "language": target_lang
        }), 200

    except Exception as e:
        print(f"Gemini Translation Error: {str(e)}")
        return jsonify({"error": "AI Translation failed. Please try again."}), 500
    
@app.route("/regenrate_variation", methods=["POST"])
def regenerate_variation():
    """
    Tells the Creative Agent to rewrite the story in a new style.
    """
    data = request.get_json()
    #In a real scenario,you would pass the previous prompt + the variation style
    # to your Gemini model here
    return jsonify({"message":"Creative Agent is re-imagining the tale...."})

@app.route('/delete_story', methods=['POST'])
def delete_story():
    data = request.get_json()

    if not data:
        return jsonify({"error": "No JSON received"}), 400

    email = data.get('email')
    title = data.get('title')

    if not email or not title:
        return jsonify({"error": "Missing email or title"}), 400

    users = load_users()

    if email not in users:
        return jsonify({"error": "User not found"}), 404

    stories = users[email].get("stories", [])

    # Filter out the story with matching title
    updated_stories = [s for s in stories if s.get("title") != title]

    if len(updated_stories) == len(stories):
        return jsonify({"error": "Story not found"}), 404

    users[email]["stories"] = updated_stories
    save_users(users)


    return jsonify({"message": "Tale deleted successfully"}), 200

    print("Incoming Json:",data)

@app.route('/char-chat', methods=['POST'])
def char_chat():
    try:
        data = request.json

        user_message = data.get('message', '')
        char_name = data.get('character', 'The Architect')
        history = data.get('history', [])
        current_story = data.get('story', '')   # 🔥 RECEIVE STORY

        model = genai.GenerativeModel('gemini-3-flash-preview')

        # Convert chat history into readable format
        formatted_history = ""
        for item in history:
            formatted_history += f"User: {item.get('user','')}\n"
            formatted_history += f"AI: {item.get('ai','')}\n"

        prompt = f"""
You are "{char_name}", a cyber-noir storytelling AI.

CURRENT STORY CONTEXT:
{current_story}

CONVERSATION HISTORY:
{formatted_history}

SYSTEM RULES:

1. Only respond to questions related to the CURRENT STORY above.
2. If there is NO story provided, reply exactly:
   "There is no active story to reference."
3. If user asks unrelated technical or general knowledge questions, reply exactly:
   "I only answer questions related to the current story."
4. If user asks to:
   - Generate or continue → Continue the SAME story logically.
   - Summarize → Summarize ONLY the existing story.
   - Analyze → Analyze ONLY the existing story.
5. NEVER create a new story unless user explicitly says "generate" or "continue story".
6. Keep responses under 200 words.

USER:
{user_message}
"""

        response = model.generate_content(prompt)
        ai_reply = response.text.strip()

        return jsonify({
            "reply": ai_reply,
            "status": "success"
        })

    except Exception as e:
        print(f"Gemini Error: {e}")
        return jsonify({
            "reply": "System instability detected. Please retry.",
            "error": str(e)
        }), 500

if __name__ == "__main__":
    app.run(debug=True)
