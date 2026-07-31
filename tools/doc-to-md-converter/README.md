# Doc to Markdown Converter

Doc to Markdown Converter adalah aplikasi CLI berbasis Python untuk mengonversi dokumen teknis dari format PDF, XLSX, PPTX, dan DOCX menjadi file Markdown `.md` yang terstruktur dan siap direview manual.

Project ini dibuat sebagai tahap awal dari sistem knowledge-base pribadi atau local RAG assistant. Pada tahap MVP ini, aplikasi hanya fokus pada proses parsing dan konversi dokumen ke Markdown. Belum ada fitur AI, LLM, embedding, vector database, atau chat.

---

## Status Project

**MVP v0.1 Stable**

Fitur utama sudah berhasil dites pada Windows menggunakan Python 3.12 dan virtual environment.

Format yang sudah berhasil dikonversi:

- DOCX ke Markdown
- XLSX ke Markdown
- PPTX ke Markdown
- PDF ke Markdown

Output sudah menghasilkan:

- File `.md`
- Folder `images`
- YAML frontmatter
- Conversion notes / warning
- Struktur output per file asal

---

## Tujuan MVP

Tujuan MVP ini adalah menyediakan fondasi awal untuk ingestion dokumen teknis ke format Markdown yang lebih mudah direview, dibersihkan, dan nantinya bisa dipakai sebagai input untuk pipeline knowledge-base atau RAG.

Pada tahap ini aplikasi tidak melakukan pemahaman konten. Semua proses masih murni parsing dokumen dan transformasi struktur ke Markdown.

---

## Fitur Utama

### 1. Konversi Multi-format

Aplikasi mendukung input file:

- `.pdf`
- `.xlsx`
- `.pptx`
- `.docx`

Setiap file akan diarahkan otomatis ke parser yang sesuai berdasarkan ekstensi file.

---

### 2. Output Markdown Terstruktur

Setiap file input akan dikonversi menjadi file Markdown `.md`.

Contoh output:

```text
output/converted/sample_docx/
├── sample_docx.md
└── images/
    └── docx_image_001.png

3. YAML Frontmatter

Setiap file Markdown selalu diawali dengan YAML frontmatter:

---
source: sample_docx.docx
converted_at: 2026-07-30T14:00:00+07:00
status: needs_review
---


Field yang tersedia:

source: nama file asli
converted_at: waktu konversi
status: status review manual, default needs_review
4. Ekstraksi Gambar

Gambar atau diagram dari dokumen akan diekstrak ke folder:

output/converted/{nama_file}/images/


Markdown akan menyimpan referensi relatif ke gambar, contoh:

./images/docx_image_001.png

5. Conversion Notes

Setiap hasil konversi dapat memiliki bagian:

## Conversion Notes


Bagian ini berisi catatan limitasi parsing, misalnya:

PDF hasil scan belum didukung OCR
Tabel kompleks mungkin perlu review manual
SmartArt PowerPoint mungkin tidak terbaca sebagai struktur teks
Chart Excel belum dijamin bisa diekstrak sebagai gambar
Struktur Project
doc-to-md-converter/
├── README.md
├── requirements.txt
├── .gitignore
│
├── input/
│   └── samples/
│       ├── sample_docx.docx
│       ├── sample_xlsx.xlsx
│       ├── sample_pptx.pptx
│       ├── sample_pdf.pdf
│       └── sample_diagram.png
│
├── output/
│   └── converted/
│       ├── sample_docx/
│       │   ├── sample_docx.md
│       │   └── images/
│       ├── sample_xlsx/
│       │   ├── sample_xlsx.md
│       │   └── images/
│       ├── sample_pptx/
│       │   ├── sample_pptx.md
│       │   └── images/
│       └── sample_pdf/
│           ├── sample_pdf.md
│           └── images/
│
├── src/
│   └── doc_to_md/
│       ├── __init__.py
│       ├── config.py
│       ├── main.py
│       │
│       ├── core/
│       │   ├── __init__.py
│       │   ├── converter.py
│       │   ├── detector.py
│       │   ├── models.py
│       │   ├── output_writer.py
│       │   └── router.py
│       │
│       ├── parsers/
│       │   ├── __init__.py
│       │   ├── base_parser.py
│       │   ├── docx_parser.py
│       │   ├── xlsx_parser.py
│       │   ├── pptx_parser.py
│       │   └── pdf_parser.py
│       │
│       ├── markdown/
│       │   ├── __init__.py
│       │   ├── builder.py
│       │   ├── frontmatter.py
│       │   ├── sanitizer.py
│       │   └── tables.py
│       │
│       ├── assets/
│       │   ├── __init__.py
│       │   └── naming.py
│       │
│       └── utils/
│           ├── __init__.py
│           ├── dates.py
│           ├── filesystem.py
│           └── logger.py
│
└── tests/
    └── generate_samples.py

Tech Stack

Project ini menggunakan Python karena ekosistem library parsing dokumen di Python cukup lengkap.

Library utama:

pdfplumber untuk ekstraksi teks dan tabel PDF
pymupdf untuk ekstraksi gambar dari PDF
openpyxl untuk membaca file Excel XLSX
python-pptx untuk membaca file PowerPoint PPTX
python-docx untuk membaca file Word DOCX
Pillow untuk membuat dan memproses sample image
reportlab untuk membuat sample PDF
Requirement

Disarankan menggunakan:

Python 3.12.x


Project ini sudah berhasil dites menggunakan:

Python 3.12.10
Windows PowerShell
Virtual environment .venv

Installation
1. Clone repository
git clone https://github.com/USERNAME/doc-to-md-converter.git
cd doc-to-md-converter


Ganti USERNAME dengan username GitHub masing-masing.

2. Buat virtual environment
py -3.12 -m venv .venv

3. Aktifkan virtual environment
.\.venv\Scripts\Activate.ps1


Jika PowerShell menolak menjalankan script, jalankan:

Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser


Lalu aktifkan ulang:

.\.venv\Scripts\Activate.ps1

4. Install dependency
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -r requirements.txt

Generate Sample Files

Untuk membuat sample file otomatis:

$env:PYTHONPATH="src"
.\.venv\Scripts\python.exe tests\generate_samples.py


Command ini akan membuat file sample di:

input/samples/


File yang dibuat:

sample_docx.docx
sample_xlsx.xlsx
sample_pptx.pptx
sample_pdf.pdf
sample_diagram.png

Cara Menjalankan Converter

Sebelum menjalankan converter, set PYTHONPATH dulu:

$env:PYTHONPATH="src"

Convert single file DOCX
.\.venv\Scripts\python.exe -m doc_to_md.main convert input\samples\sample_docx.docx

Convert single file XLSX
.\.venv\Scripts\python.exe -m doc_to_md.main convert input\samples\sample_xlsx.xlsx

Convert single file PPTX
.\.venv\Scripts\python.exe -m doc_to_md.main convert input\samples\sample_pptx.pptx

Convert single file PDF
.\.venv\Scripts\python.exe -m doc_to_md.main convert input\samples\sample_pdf.pdf

Convert semua file dalam folder
.\.venv\Scripts\python.exe -m doc_to_md.main convert input\samples

Contoh Output CLI
Conversion Summary
==================
[OK] sample_docx.docx
  Markdown : output\converted\sample_docx\sample_docx.md
  Images   : 1
  Warnings : 2

Output Folder

Setiap file input akan memiliki folder output sendiri.

Contoh:

output/converted/sample_docx/
├── sample_docx.md
└── images/
    └── docx_image_001.png


Untuk batch conversion:

output/converted/
├── sample_docx/
├── sample_xlsx/
├── sample_pptx/
└── sample_pdf/

Validasi MVP

Project ini dianggap valid jika command berikut berhasil dijalankan tanpa error:

$env:PYTHONPATH="src"
.\.venv\Scripts\python.exe -m compileall src tests


Lalu:

.\.venv\Scripts\python.exe tests\generate_samples.py


Lalu:

.\.venv\Scripts\python.exe -m doc_to_md.main convert input\samples


Expected output folder:

output/converted/sample_docx
output/converted/sample_xlsx
output/converted/sample_pptx
output/converted/sample_pdf

Parser Behavior
DOCX Parser

Mendukung:

Heading
Paragraph
Bullet list
Numbered list
Table
Embedded images

Limitasi:

Text box mungkin tidak terbaca
Floating object mungkin tidak terbaca
Header/footer belum menjadi fokus MVP
Embedded object kompleks perlu review manual
XLSX Parser

Mendukung:

Sheet menjadi section Markdown
Data sheet menjadi Markdown table
Embedded image dicoba diekstrak

Limitasi:

Formula bisa muncul sebagai formula string jika cached value tidak tersedia
Chart native Excel belum dijamin bisa diekstrak sebagai gambar
Sheet layout kompleks perlu review manual
PPTX Parser

Mendukung:

Setiap slide menjadi section Markdown
Judul slide menjadi heading
Text/bullet menjadi list
Table shape menjadi Markdown table
Picture shape diekstrak ke images
Speaker notes menjadi blockquote

Limitasi:

SmartArt dan diagram kompleks mungkin tidak terbaca sebagai struktur teks
Shape order bisa berbeda dari urutan baca manusia
Layout visual kompleks perlu review manual
PDF Parser

Mendukung:

Text extraction per page
Table extraction
Image extraction
Heading heuristic sederhana

Limitasi:

PDF hasil scan belum didukung OCR
Heading detection menggunakan heuristic, tidak 100% akurat
Table kompleks, merged cell, dan multi-column layout bisa perlu review manual
PDF image-only kemungkinan menghasilkan sedikit atau tidak ada teks
Out of Scope MVP

Fitur berikut sengaja belum dibuat:

Chat AI
LLM integration
Embedding
Vector database
RAG pipeline
OCR
Web UI
Authentication
Multi-user
Document review dashboard
Roadmap Berikutnya

Kemungkinan pengembangan berikutnya:

v0.2 Markdown Polish
Render image dengan format Markdown penuh
Rapikan bullet PPTX
Tambahkan opsi --overwrite
Tambahkan opsi --no-images
Tambahkan summary output yang lebih detail
v0.3 Review Workspace
UI sederhana untuk melihat file Markdown hasil konversi
Mark status review
Edit Markdown manual
v0.4 Knowledge Base Preparation
Markdown chunking
Metadata enrichment
Import history
Document versioning
v0.5 Local RAG Foundation
Embedding
Vector database
Semantic search
Local assistant
Git Workflow

Untuk menyimpan perubahan:

git status
git add .
git commit -m "update readme final"
git push


Untuk update berikutnya:

git add .
git commit -m "update converter"
git push

Development Notes

Project ini menggunakan pendekatan modular:

Detector → Router → Parser → ParsedDocument → MarkdownBuilder → OutputWriter


Dengan desain ini, penambahan format baru bisa dilakukan dengan membuat parser baru di folder:

src/doc_to_md/parsers/


Lalu parser tersebut didaftarkan di:

src/doc_to_md/core/router.py

License

Belum ditentukan.

Author

Created as MVP document conversion foundation for a local personal knowledge-base / RAG assistant project.


Setelah README diganti, commit:

```powershell
git add README.md
git commit -m "polish readme final"
git push
