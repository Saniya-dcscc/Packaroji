import os
import io
import fitz  # PyMuPDF
import sqlite3
from flask import Flask, request, render_template_string, send_file, flash, redirect, url_for

app = Flask(__name__)
app.secret_key = "packaroji_secret_key"

# Database Configuration
DB_NAME = "packaroji.db"

def get_db_connection():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS processed_files (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT NOT NULL,
            pages_per_pdf INTEGER NOT NULL,
            total_pages INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

# Initialize DB on start
init_db()

# HTML Template with Dynamic Range Slider
HTML_TEMPLATE = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Packaroji - PDF Splitter</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f4f7f6;
            margin: 0;
            padding: 40px;
            display: flex;
            justify-content: center;
        }
        .container {
            background-color: #fff;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            width: 100%;
            max-width: 500px;
        }
        h2 {
            margin-top: 0;
            color: #333;
            text-align: center;
        }
        .form-group {
            margin-bottom: 20px;
        }
        label {
            display: block;
            margin-bottom: 8px;
            font-weight: bold;
            color: #555;
        }
        input[type="file"] {
            width: 100%;
            padding: 8px;
            box-sizing: border-box;
        }
        .slider-container {
            display: flex;
            align-items: center;
            gap: 15px;
        }
        input[type="range"] {
            flex-grow: 1;
        }
        .slider-value {
            font-weight: bold;
            color: #007bff;
            font-size: 1.1em;
            min-width: 30px;
        }
        button {
            width: 100%;
            background-color: #007bff;
            color: white;
            border: none;
            padding: 12px;
            border-radius: 5px;
            font-size: 16px;
            cursor: pointer;
            transition: background 0.3s;
        }
        button:hover {
            background-color: #0056b3;
        }
        .flash {
            padding: 10px;
            background-color: #f8d7da;
            color: #721c24;
            border-radius: 5px;
            margin-bottom: 15px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h2>Packaroji PDF Splitter</h2>
        
        {% with messages = get_flashed_messages() %}
          {% if messages %}
            {% for message in messages %}
              <div class="flash">{{ message }}</div>
            {% endfor %}
          {% endif %}
        {% endwith %}

        <form action="/" method="post" enctype="multipart/form-data">
            <div class="form-group">
                <label for="pdf_file">Select PDF File:</label>
                <input type="file" name="pdf_file" id="pdf_file" accept=".pdf" required>
            </div>
            
            <div class="form-group">
                <label for="pages_slider">Pages per Split PDF:</label>
                <div class="slider-container">
                    <input type="range" id="pages_slider" name="pages_per_pdf" min="1" max="50" value="1" oninput="updateSliderValue(this.value)">
                    <span id="slider_val" class="slider-value">1</span>
                </div>
            </div>

            <button type="submit">Process & Download</button>
        </form>
    </div>

    <script>
        function updateSliderValue(val) {
            document.getElementById('slider_val').innerText = val;
        }
    </script>
</body>
</html>
"""

@app.route('/', methods=['GET', 'POST'])
def index():
    if request.method == 'POST':
        if 'pdf_file' not in request.files:
            flash('No file part provided.')
            return redirect(request.url)
        
        file = request.files['pdf_file']
        if file.filename == '':
            flash('No file selected.')
            return redirect(request.url)

        # Get pages_per_pdf value from the slider input
        try:
            pages_per_pdf = int(request.form.get('pages_per_pdf', 1))
        except ValueError:
            pages_per_pdf = 1

        if file and file.filename.endswith('.pdf'):
            file_bytes = file.read()
            doc = fitz.open(stream=file_bytes, filetype="pdf")
            total_pages = len(doc)

            if total_pages == 0:
                flash('The uploaded PDF has no pages.')
                return redirect(request.url)

            # Record processing info in Database
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute(
                'INSERT INTO processed_files (filename, pages_per_pdf, total_pages) VALUES (?, ?, ?)',
                (file.filename, pages_per_pdf, total_pages)
            )
            conn.commit()
            conn.close()

            # Process PDF splitting based on slider value
            output_doc = fitz.open()
            for page_num in range(min(pages_per_pdf, total_pages)):
                output_doc.insert_pdf(doc, from_page=page_num, to_page=page_num)

            pdf_stream = io.BytesIO()
            output_doc.save(pdf_stream)
            pdf_stream.seek(0)
            output_doc.close()
            doc.close()

            out_filename = f"split_{pages_per_pdf}pages_{file.filename}"
            return send_file(
                pdf_stream,
                as_attachment=True,
                download_name=out_filename,
                mimetype='application/pdf'
            )

    return render_template_string(HTML_TEMPLATE)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
