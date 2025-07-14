import os
import re
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from dotenv import load_dotenv
from sqlalchemy import text, create_engine
from langchain_community.utilities import SQLDatabase
from langchain_groq import ChatGroq
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import PromptTemplate, ChatPromptTemplate, MessagesPlaceholder, FewShotChatMessagePromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain.chains import create_sql_query_chain
from langchain_community.document_loaders import PyPDFLoader
from langchain_core.messages import HumanMessage
from langchain_community.chat_message_histories import ChatMessageHistory
from langchain_core.vectorstores import InMemoryVectorStore
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_core.example_selectors import SemanticSimilarityExampleSelector
from openai import OpenAI as OpenAIClient
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename

app = Flask(__name__)
CORS(app)

# === Konfigurasi Upload PDF ===
UPLOAD_FOLDER = os.path.join(os.getcwd(), "uploads")
ALLOWED_EXTENSIONS = {"pdf"}
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

load_dotenv()
history = ChatMessageHistory() # Ini mungkin perlu disesuaikan jika ingin stateful history per sesi/user

# === Database SQLAlchemy ===
db = SQLDatabase.from_uri("mysql+pymysql://root:@localhost:3306/bpjs_db")
db_engine = create_engine("mysql+pymysql://root:@localhost:3306/bpjs_db") # Corrected: pymymysql to pymysql

# === LLM untuk SQL ===
llm = ChatGroq(
    model="llama3-8b-8192",
    temperature=0,
    max_tokens=300,
    timeout=10,
    max_retries=2
)

# === LLM untuk PDF (via OpenRouter) ===
client_openrouter = OpenAIClient(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.getenv("OPENROUTER_API_KEY")
)

def call_openrouter_llm(question):
    try:
        completion = client_openrouter.chat.completions.create(
            extra_headers={
                "HTTP-Referer": "https://yourdomain.com",
                "X-Title": "BPJS Chatbot",
            },
            model="deepseek/deepseek-r1-0528:free",
            messages=[{
                "role": "user",
                "content": question
            }]
        )
        return completion.choices[0].message.content
    except Exception as e:
        return f"[OpenRouter Error] {str(e)}"

def execute_query(query):
    engine = getattr(db, "_engine", None)
    if engine is None:
        raise AttributeError("Engine not available.")
    cleaned_query = re.sub(r"[\\]", "", query)
    cleaned_query = re.sub(r"^SQLQuery:\s*", "", cleaned_query).strip()
    try:
        with engine.connect() as conn:
            result = conn.execute(text(cleaned_query))
            rows = result.fetchall()
            return [dict(row._mapping) for row in rows]
    except Exception:
        return None

# === Few-shot Prompting SQL ===
examples = [
    {
        "input": "Tampilkan data user dengan NIK 1234567890123456",
        "query": "SELECT * FROM users WHERE nik = '1234567890123456';"
    },
    {
        "input": "Berikan semua keluhan dengan kategori admin",
        "query": "SELECT * FROM keluhan_masyarakat WHERE kategori = 'admin';"
    },
    {
        "input": "Sebutkan rumah sakit untuk pasien anak",
        "query": "SELECT rumah_sakit FROM rujukan_medis WHERE saran_spesialis = 'Spesialis Anak';"
    }
]

embedding_model = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")

example_selector = SemanticSimilarityExampleSelector.from_examples(
    examples,
    embedding_model,
    InMemoryVectorStore(embedding=embedding_model),
    k=2,
    input_keys=["input"]
)

example_prompt = ChatPromptTemplate.from_messages([
    ("human", "{input}\nSQLQuery:"),
    ("ai", "{query}")
])

few_shot_prompt = FewShotChatMessagePromptTemplate(
    example_prompt=example_prompt,
    example_selector=example_selector,
    input_variables=["input", "top_k"]
)

final_prompt = ChatPromptTemplate.from_messages([
    ("system",
     "Kamu adalah pakar MySQL. Berdasarkan pertanyaan, buat query SQL valid. Jangan pernah menghapus atau mengubah data.\n\n"
     "Tabel: {table_info}\n\nContoh:"),
    few_shot_prompt,
    MessagesPlaceholder(variable_name="messages"),
    ("human", "{input}")
])

rephrase_template = PromptTemplate.from_template("""
Jawab pertanyaan berdasarkan hasil query berikut.
Jawaban harus pakai Bahasa Indonesia, tanpa penjelasan tambahan.

Pertanyaan: {question}
Query SQL: {query}
Hasil SQL: {result}

Jika hasil kosong, balas: 'Mohon maaf kami tidak memiliki data tersebut untuk menjawab pertanyaan Anda.'
""")

rephrase_chain = rephrase_template | llm | StrOutputParser()
generate_query_chain = create_sql_query_chain(llm, db, final_prompt)

sql_chain = (
    RunnablePassthrough.assign(query=generate_query_chain)
    .assign(result=lambda inputs: execute_query(inputs["query"]))
    | rephrase_chain
)

# === PDF Setup (Initial Load) ===
try:
    # Memastikan folder 'uploads' ada
    if not os.path.exists(app.config["UPLOAD_FOLDER"]):
        os.makedirs(app.config["UPLOAD_FOLDER"])
    
    pdf_path = os.path.join(app.config["UPLOAD_FOLDER"], "sop_bpjs.pdf")
    if os.path.exists(pdf_path):
        loader = PyPDFLoader(pdf_path)
        pages = loader.load()
        if pages:
            pdf_vector = InMemoryVectorStore.from_documents(pages, embedding=embedding_model)
            pdf_loaded = True
        else:
            pdf_loaded = False
    else:
        pdf_loaded = False
except Exception as e:
    pdf_loaded = False
    print(f"PDF loading error: {e}")

def get_answer_from_pdf_openrouter(question):
    if not pdf_loaded:
        return "Dokumen PDF tidak tersedia atau gagal dimuat."
    
    docs = pdf_vector.similarity_search(question, k=3)
    if docs:
        formatted = "\n\n".join(
            [f"[Page {doc.metadata['page']}]: {doc.page_content[:600]}" for doc in docs]
        )
        content = (
            f"Jawablah pertanyaan hanya berdasarkan informasi berikut. Jangan menambahkan atau mengarang jawaban di luar teks ini.\n\n"
            f"Informasi:\n{formatted}\n\n"
            f"Pertanyaan: {question}\n"
            f"Jika informasi tidak ditemukan, cukup jawab: 'Tidak ditemukan informasi terkait.'"
        )
        return call_openrouter_llm(content)
    return "Tidak ditemukan informasi terkait."

def get_answer(command_text):
    if command_text.startswith("/sql "):
        question = command_text[len("/sql "):]
        try:
            # Note: history.messages is global, consider handling per-user/per-conversation history
            result = sql_chain.invoke({"question": question, "messages": history.messages}) 
            history.add_user_message(question) # This adds to global history
            history.add_ai_message(result) # This adds to global history
            return result
        except Exception as e:
            return f"Gagal menjawab dari database: {str(e)}"

    elif command_text.startswith("/pdf "):
        question = command_text[len("/pdf "):]
        return get_answer_from_pdf_openrouter(question)

    else:
        return "Gunakan format perintah:\n/sql <pertanyaan>\n/pdf <pertanyaan>"

# === ROUTES ===
@app.route("/")
def index():
    return render_template("index.html")

@app.route("/chat", methods=["POST"])
def chat():
    try:
        data = request.get_json()
        command = data.get("command", "")
        username = data.get("username", "")  # ambil username dari frontend
        conversation_id = data.get("conversation_id", "") # Ambil conversation_id dari frontend

        if not command or not username or not conversation_id:
            return jsonify({"error": "Command, username, dan conversation_id wajib dikirim"}), 400

        user_question = command[len("/sql "):] if command.startswith("/sql ") else \
                        (command[len("/pdf "):] if command.startswith("/pdf ") else command)
        
        response = get_answer(command)

        with db_engine.begin() as conn: # Use a transaction for consistency
            conn.execute(
                text("INSERT INTO history (user, bot, conversation_id, user_question) VALUES (:user, :bot, :conversation_id, :user_question)"),
                {
                    "user": username,
                    "bot": response,
                    "conversation_id": conversation_id,
                    "user_question": user_question # Save user's question explicitly
                }
            )

        return jsonify({"response": response})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/history", methods=["GET", "POST"])
def chatbot_history():
    if request.method == "POST":
        try:
            data = request.get_json()
            user_msg = data.get("user")
            bot_msg = data.get("bot")
            # conversation_id is not expected here for this generic history endpoint
            if not user_msg or not bot_msg:
                return jsonify({"error": "Isi user dan bot wajib diisi."}), 400

            with db_engine.begin() as conn:
                # This insert does not include conversation_id or user_question,
                # which might lead to inconsistencies if this endpoint is still used for new messages.
                # Consider updating this if it's meant to be used.
                conn.execute(
                    text("INSERT INTO history (user, bot) VALUES (:user, :bot)"),
                    {"user": user_msg, "bot": bot_msg}
                )
            return jsonify({"message": "Riwayat berhasil disimpan."}), 201
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    elif request.method == "GET":
        try:
            with db_engine.connect() as conn:
                result = conn.execute(text("SELECT user, bot, created_at FROM history ORDER BY created_at DESC"))
                rows = [dict(row._mapping) for row in result]
            return jsonify(rows)
        except Exception as e:
            return jsonify({"error": str(e)}), 500

@app.route("/history/user/<username>", methods=["GET"])
def get_user_history(username):
    try:
        with db_engine.connect() as conn:
            # Modified query to get the first message of each conversation grouped by conversation_id
            # This assumes the 'user_question' column is present and accurately stores the user's initial question
            result = conn.execute(
                text("""
                    SELECT
                        h.conversation_id,
                        h.user_question AS first_message_snippet,
                        h.created_at,
                        h.user
                    FROM history h
                    WHERE h.user = :username AND h.user_question IS NOT NULL
                    GROUP BY h.conversation_id, h.user_question, h.created_at, h.user
                    ORDER BY h.created_at DESC
                """),
                {"username": username}
            )
            rows = [dict(row._mapping) for row in result]
        return jsonify(rows)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/chat/conversation/<conversation_id>", methods=["GET"])
def get_conversation_details(conversation_id):
    """
    New endpoint to fetch all messages for a specific conversation_id.
    """
    try:
        with db_engine.connect() as conn:
            result = conn.execute(
                text("SELECT user, bot, user_question, created_at FROM history WHERE conversation_id = :conversation_id ORDER BY created_at ASC"),
                {"conversation_id": conversation_id}
            )
            rows = [dict(row._mapping) for row in result]
        return jsonify(rows)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/admin/history", methods=["GET"])
def admin_history():
    role = request.args.get("role")
    if role != "admin":
        return jsonify({"error": "Unauthorized"}), 403

    try:
        with db_engine.connect() as conn:
            result = conn.execute(
                text("SELECT user, bot, created_at, conversation_id, user_question FROM history ORDER BY created_at DESC")
            )
            history = [
                {
                    "user_id": row.user,
                    "role": "unknown",
                    "message": row.bot,
                    "timestamp": row.created_at,
                    "conversation_id": row.conversation_id, # Include conversation ID
                    "user_question": row.user_question # Include user's question
                }
                for row in result
            ]
        return jsonify({"history": history})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/register", methods=["POST"])
def register():
    try:
        data = request.get_json()
        username = data.get("username")
        password = data.get("password")
        role = data.get("role", "pegawai")

        if not username or not password:
            return jsonify({"error": "Username dan password wajib diisi"}), 400

        hashed = generate_password_hash(password)

        with db_engine.begin() as conn:
            conn.execute(
                text("INSERT INTO userss (username, password, role) VALUES (:username, :password, :role)"),
                {"username": username, "password": hashed, "role": role}
            )

        return jsonify({"message": "Registrasi berhasil!"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/login", methods=["POST"])
def login():
    try:
        data = request.get_json()
        username = data.get("username")
        password = data.get("password")

        if not username or not password:
            return jsonify({"error": "Username dan password wajib diisi"}), 400

        with db_engine.connect() as conn:
            result = conn.execute(
                text("SELECT * FROM userss WHERE username = :username"),
                {"username": username}
            ).fetchone()

        if result and check_password_hash(result.password, password):
            return jsonify({
                "message": "Login berhasil",
                "user": {
                    "username": result.username,
                    "role": result.role
                }
            }), 200
        else:
            return jsonify({"error": "Username atau password salah"}), 401
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/tables", methods=["GET"])
def get_tables():
    try:
        tables = db.get_usable_table_names()
        return jsonify({"tables": tables})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/upload_pdf", methods=["POST"])
def upload_pdf():
    if "file" not in request.files:
        return jsonify({"error": "Tidak ada file PDF di request"}), 400
    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "Nama file kosong"}), 400
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config["UPLOAD_FOLDER"], filename)
        file.save(filepath)
        # Reload vector
        try:
            loader = PyPDFLoader(filepath)
            pages = loader.load()
            global pdf_vector, pdf_loaded
            pdf_vector = InMemoryVectorStore.from_documents(pages, embedding=embedding_model)
            pdf_loaded = True
            return jsonify({"message": "PDF berhasil diunggah dan dimuat ulang.", "filename": filename}), 200
        except Exception as e:
            return jsonify({"error": f"Gagal memuat PDF: {str(e)}"}), 500
    else:
        return jsonify({"error": "File harus berformat PDF"}), 400

if __name__ == "__main__":
    print("🤖 BPJS Chatbot Web Server starting...")
    # This part might need adjustment if db.get_usable_table_names() fails before PDF is loaded
    try:
        print("📦 Available tables:", db.get_usable_table_names())
    except Exception as e:
        print(f"Failed to fetch available tables: {e}")
    print("📄 PDF Status:", "Loaded" if pdf_loaded else "Not loaded")
    print("🌐 Server running on http://localhost:5000")
    app.run(debug=True, host="0.0.0.0", port=5000)