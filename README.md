# BPJS Chatbot: Asisten Virtual BPJS

![BPJS Chatbot Logo/Banner - Add your own image URL here if you have one](https://via.placeholder.com/150x50?text=BPJS+Chatbot)

Selamat datang di **BPJS Chatbot**! Proyek ini bertujuan untuk menyediakan asisten virtual yang interaktif dan informatif terkait layanan BPJS. Chatbot ini dirancang untuk menjawab pertanyaan umum, membantu pencarian informasi, dan memfasilitasi interaksi pengguna dengan data BPJS, baik melalui kueri database maupun dokumen Standar Operasional Prosedur (SOP).

Proyek ini dibangun menggunakan **Create React App** untuk antarmuka pengguna (frontend) dan **Flask** (Python) untuk backend, dilengkapi dengan integrasi basis data MySQL dan pemanfaatan model bahasa besar (LLM) untuk pemrosesan bahasa alami.

## Daftar Isi

1.  [Fitur Utama](#fitur-utama)
2.  [Teknologi Digunakan](#teknologi-digunakan)
3.  [Panduan Memulai Proyek](#panduan-memulai-proyek)
    * [Prasyarat](#prasyarat)
    * [Instalasi](#instalasi)
    * [Konfigurasi Database](#konfigurasi-database)
    * [Menjalankan Aplikasi](#menjalankan-aplikasi)
4.  [Struktur Proyek](#struktur-proyek)
5.  [Script yang Tersedia](#script-yang-tersedia)
6.  [Ejecting (Opsi Lanjutan)](#ejecting-opsi-lanjutan)
7.  [Pelajari Lebih Lanjut](#pelajari-lebih-lanjut)

## Fitur Utama

* **Interaksi Chatbot Dinamis**: Menjawab pertanyaan pengguna secara real-time.
* **Mode Kueri Database (SQL)**: Memungkinkan pencarian data spesifik (misalnya, data pengguna, keluhan, rujukan medis) dengan menerjemahkan pertanyaan bahasa alami ke dalam kueri SQL.
* **Mode Dokumen SOP (PDF)**: Memberikan informasi relevan langsung dari dokumen prosedur BPJS yang diunggah.
* **Manajemen Pengguna**: Sistem registrasi dan login dengan peran `pegawai` dan `admin`.
* **Riwayat Chat**: Menyimpan dan menampilkan riwayat percakapan pengguna.
* **Antarmuka Admin**: Admin dapat mengunggah dokumen PDF baru dan melihat riwayat chat semua pengguna.

## Teknologi Digunakan

* **Frontend**:
    * React (dengan Create React App)
    * Tailwind CSS (untuk styling)
    * Axios (untuk permintaan HTTP)
    * React Router DOM (untuk navigasi)
* **Backend (Flask - Python)**:
    * Flask & Flask-CORS
    * SQLAlchemy (untuk interaksi database MySQL)
    * Langchain (untuk orkestrasi LLM)
    * ChatGroq (LLM untuk kueri SQL)
    * OpenRouter API (untuk LLM pada dokumen PDF, menggunakan model `deepseek/deepseek-r1-0528:free`)
    * PyPDFLoader (untuk memuat dokumen PDF)
    * HuggingFaceEmbeddings (untuk embedding teks)
    * werkzeug.security (untuk hashing password)
* **Database**:
    * MySQL

## Panduan Memulai Proyek

Ikuti langkah-langkah di bawah ini untuk menjalankan proyek secara lokal.

### Prasyarat

Pastikan Anda telah menginstal yang berikut ini:

* Node.js (versi LTS direkomendasikan)
* Python 3.8+
* MySQL Server
* `npm` atau `yarn`

### Instalasi

1.  **Clone repositori:**

    ```bash
    git clone [https://github.com/fayydhr/kp_bpjs.git](https://github.com/fayydhr/kp_bpjs.git)
    cd kp_bpjs/KP_bpjs-14888cc3a797d72a5e3803ce1e3a27c76933cffd
    ```

2.  **Instal dependensi frontend:**

    ```bash
    npm install
    # atau
    yarn install
    ```

3.  **Instal dependensi backend:**

    ```bash
    pip install -r requirements.txt # Pastikan ada file requirements.txt di direktori backend Anda
    ```
    Jika `requirements.txt` tidak ada, buat secara manual dengan isi berikut:
    ```
    Flask
    Flask-Cors
    SQLAlchemy
    langchain-community
    langchain-groq
    langchain-core
    langchain-huggingface
    python-dotenv
    PyMySQL
    openai
    werkzeug
    ```

### Konfigurasi Database

1.  **Buat database MySQL:**
    Buat database baru bernama `bpjs_db`.

    ```sql
    CREATE DATABASE bpjs_db;
    ```

2.  **Buat tabel:**
    Jalankan skrip SQL berikut di database `bpjs_db` Anda untuk membuat tabel yang diperlukan:

    ```sql
    -- Tabel userss (untuk pengguna aplikasi)
    CREATE TABLE userss (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role ENUM('pegawai', 'admin') DEFAULT 'pegawai'
    );

    -- Tabel history (untuk riwayat chat)
    CREATE TABLE history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user VARCHAR(255) NOT NULL,
        bot TEXT NOT NULL,
        user_question TEXT,
        conversation_id VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Contoh tabel untuk kueri SQL (sesuaikan dengan kebutuhan Anda)
    -- Tabel users
    CREATE TABLE users (
        nik VARCHAR(16) PRIMARY KEY,
        nama VARCHAR(255),
        alamat TEXT,
        status_bpjs VARCHAR(50)
    );

    -- Tabel keluhan_masyarakat
    CREATE TABLE keluhan_masyarakat (
        id INT AUTO_INCREMENT PRIMARY KEY,
        topik VARCHAR(255),
        deskripsi TEXT,
        kategori VARCHAR(100),
        status VARCHAR(50)
    );

    -- Tabel rujukan_medis
    CREATE TABLE rujukan_medis (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nama_pasien VARCHAR(255),
        rumah_sakit VARCHAR(255),
        saran_spesialis VARCHAR(255)
    );
    ```

3.  **Variabel Lingkungan (.env):**
    Buat file `.env` di direktori root backend (`app.py`) dan tambahkan kunci API OpenRouter Anda:

    ```
    OPENROUTER_API_KEY=your_openrouter_api_key_here
    ```

### Menjalankan Aplikasi

1.  **Jalankan backend Flask:**
    Buka terminal baru di direktori root proyek (`kp_bpjs-14888cc3a797d72a5e3803ce1e3a27c76933cffd`) dan jalankan:

    ```bash
    python app.py
    ```
    Server backend akan berjalan di `http://localhost:5000`.

2.  **Jalankan frontend React:**
    Buka terminal baru di direktori yang sama dan jalankan:

    ```bash
    npm start
    # atau
    yarn start
    ```
    Aplikasi React akan terbuka di browser Anda secara otomatis di [http://localhost:3000](http://localhost:3000).

## Struktur Proyek
