Mantap bro, ini gue bikinin laporan update project siap dikirim ke AI Planner. Formatnya gue bikin rapi: status saat ini, apa yang sudah selesai, validasi, issue yang pernah terjadi, keputusan teknis, dan rencana kerja berikutnya.

Lo bisa langsung copas bagian “LAPORAN UNTUK AI PLANNER” ke AI planner lo.

LAPORAN UNTUK AI PLANNER
Project: Doc to Markdown Converter
Tanggal Update

30 Juli 2026

Status Saat Ini

Project Doc to Markdown Converter sudah mencapai status:

MVP v0.1 Stable


MVP tahap pertama berhasil dibangun dari nol di Windows menggunakan:

Python 3.12.10
Windows PowerShell
Virtual Environment .venv


Aplikasi sudah berhasil melakukan konversi file dokumen teknis dari beberapa format menjadi Markdown .md terstruktur yang siap direview manual.

Format yang sudah berhasil dites:

DOCX -> Markdown
XLSX -> Markdown
PPTX -> Markdown
PDF  -> Markdown


Output sudah menghasilkan:

File .md
Folder images
YAML frontmatter
Conversion Notes / warning
Output folder per file asal

Ringkasan Tujuan Project

Project ini adalah tahap awal dari sistem knowledge-base pribadi atau local RAG assistant.

Namun pada tahap MVP ini, scope dibatasi hanya untuk:

Konversi dokumen berbagai format menjadi Markdown terstruktur.


Belum ada fitur:

AI
LLM
Chat
Embedding
Vector database
RAG
OCR
Web UI
Authentication
Multi-user


Fokus MVP sekarang adalah membuat fondasi ingestion dokumen yang stabil dan modular.

Fitur MVP yang Sudah Selesai
1. CLI Converter

Aplikasi sudah berjalan via CLI dengan command:

$env:PYTHONPATH="src"
.\.venv\Scripts\python.exe -m doc_to_md.main convert input\samples


Aplikasi juga mendukung konversi single file:

.\.venv\Scripts\python.exe -m doc_to_md.main convert input\samples\sample_docx.docx
.\.venv\Scripts\python.exe -m doc_to_md.main convert input\samples\sample_xlsx.xlsx
.\.venv\Scripts\python.exe -m doc_to_md.main convert input\samples\sample_pptx.pptx
.\.venv\Scripts\python.exe -m doc_to_md.main convert input\samples\sample_pdf.pdf

2. Parser per Format

Parser sudah dipisah modular:

src/doc_to_md/parsers/docx_parser.py
src/doc_to_md/parsers/xlsx_parser.py
src/doc_to_md/parsers/pptx_parser.py
src/doc_to_md/parsers/pdf_parser.py


Router sudah mengarahkan file sesuai tipe:

.docx -> DocxParser
.xlsx -> XlsxParser
.pptx -> PptxParser
.pdf  -> PdfParser

3. Output Per File Asal

Output disimpan di:

output/converted/


Contoh hasil validasi:

output/converted/sample_docx
output/converted/sample_pdf
output/converted/sample_pptx
output/converted/sample_xlsx


Contoh isi output:

output/converted/sample_docx/
├── sample_docx.md
└── images/

4. YAML Frontmatter

Setiap file Markdown sudah punya YAML frontmatter:

---
source: sample_docx.docx
converted_at: 2026-07-30T14:00:00+07:00
status: needs_review
---


Field ini penting untuk pipeline lanjutan:

source
converted_at
status

5. Ekstraksi Gambar

Gambar dari dokumen berhasil diekstrak ke folder:

output/converted/{nama_file}/images/


Markdown menyimpan referensi gambar relatif seperti:

./images/docx_image_001.png


Catatan: Untuk MVP ini format referensi gambar masih berupa path relatif. Untuk v0.2 bisa dipoles menjadi Markdown image syntax penuh:

./images/docx_image_001.png

6. Conversion Notes

Setiap hasil konversi dapat menampilkan bagian:

## Conversion Notes


Bagian ini digunakan untuk menyimpan warning eksplisit seperti:

PDF scan belum didukung OCR
PDF heading detection masih heuristic
Tabel kompleks mungkin perlu review manual
SmartArt PowerPoint belum dijamin terbaca sebagai struktur teks
Chart Excel belum dijamin bisa diekstrak sebagai gambar

Struktur Project Saat Ini
doc-to-md-converter/
├── README.md
├── requirements.txt
├── .gitignore
├── gudence.md
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
│       ├── sample_xlsx/
│       ├── sample_pptx/
│       └── sample_pdf/
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

Library yang Digunakan
pdfplumber
pymupdf
openpyxl
python-pptx
python-docx
Pillow
reportlab


Kegunaan:

pdfplumber   -> ekstraksi teks dan tabel PDF
pymupdf      -> ekstraksi gambar PDF
openpyxl     -> baca XLSX
python-pptx  -> baca PPTX
python-docx  -> baca DOCX
Pillow       -> generate sample image
reportlab    -> generate sample PDF

Validasi yang Sudah Dilakukan
1. Generate Sample File

Command berhasil dijalankan:

$env:PYTHONPATH="src"
.\.venv\Scripts\python.exe tests\generate_samples.py


Sample file berhasil dibuat di:

input/samples/


File sample:

sample_docx.docx
sample_xlsx.xlsx
sample_pptx.pptx
sample_pdf.pdf
sample_diagram.png

2. Test Parser Import

Semua parser berhasil diimport:

.\.venv\Scripts\python.exe -c "from doc_to_md.parsers.docx_parser import DocxParser; from doc_to_md.parsers.xlsx_parser import XlsxParser; from doc_to_md.parsers.pptx_parser import PptxParser; from doc_to_md.parsers.pdf_parser import PdfParser; print('all parsers ok')"


Output:

all parsers ok

3. Test DOCX Convert

Command berhasil:

.\.venv\Scripts\python.exe -m doc_to_md.main convert input\samples\sample_docx.docx


Output folder berhasil dibuat:

output/converted/sample_docx/
├── sample_docx.md
└── images/

4. Test Semua Format

Semua format sudah berhasil dites:

DOCX OK
XLSX OK
PPTX OK
PDF  OK


Output final:

Get-ChildItem output\converted


Hasil:

sample_docx
sample_pdf
sample_pptx
sample_xlsx

Masalah yang Pernah Terjadi dan Sudah Diselesaikan
1. Python Global Rusak

Awalnya Python 3.13.1 bermasalah dengan error:

Could not find platform independent libraries <prefix>


Penyebab:

sys.prefix mengarah ke folder project, bukan folder instalasi Python.


Solusi:

Uninstall Python bermasalah
Install ulang Python 3.12.10
Gunakan py -3.12
Buat ulang virtual environment .venv


Status:

Solved

2. PowerShell Execution Policy

PowerShell sempat menolak aktivasi virtual environment.

Solusi:

Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser


Status:

Solved

3. Typo Kode Parser dan Converter

Sempat terjadi error akibat typo seperti:

listinput_path
listextracted
listsections
listblocks
listimages


Solusi:

File diganti ulang secara manual lewat VS Code
Parser dites satu per satu
Compile/import dicek ulang


Status:

Solved

4. File generate_samples.py Belum Ada

Sempat error:

can't open file tests\generate_samples.py


Solusi:

Buat file tests/generate_samples.py
Generate sample berhasil


Status:

Solved

5. convert_file Tidak Terbaca

Sempat error:

DocumentConverter object has no attribute convert_file


Penyebab:

Indentation / file converter.py tidak lengkap


Solusi:

Replace converter.py dengan versi valid
Cek hasattr convert_path dan convert_file


Validasi:

True
True


Status:

Solved

Keputusan Teknis Saat Ini
1. CLI-first

MVP dibuat sebagai CLI dulu, bukan web UI.

Alasan:

Lebih cepat selesai
Lebih mudah dites
Lebih sedikit kompleksitas
Core converter bisa dipakai ulang untuk Web UI nanti

2. Modular Parser

Setiap format punya parser sendiri.

Alasan:

Mudah maintenance
Mudah tambah format baru
Router tetap sederhana
Markdown builder tidak perlu tahu format asal

3. Intermediate Model

Parser menghasilkan struktur internal:

ParsedDocument
DocumentSection
ContentBlock
ExtractedImage
ConversionResult


Alasan:

MarkdownBuilder cukup render object internal
Tidak tergantung langsung ke PDF/XLSX/PPTX/DOCX

4. Output Needs Review

Setiap hasil Markdown diberi status:

status: needs_review


Alasan:

Hasil parsing dokumen teknis tetap harus direview manual sebelum masuk pipeline RAG.

Batasan yang Masih Ada
PDF
PDF scan belum didukung OCR
Heading detection masih heuristic
Tabel kompleks bisa kurang rapi
Multi-column layout belum selalu akurat

XLSX
Formula bisa muncul sebagai formula string
Chart native Excel belum dijamin diekstrak sebagai gambar
Layout sheet kompleks perlu review manual

PPTX
SmartArt belum dijamin terbaca sebagai struktur teks
Shape order bisa berbeda dari urutan baca manusia
Diagram kompleks kemungkinan hanya diekstrak sebagai image

DOCX
Text box belum dijamin terbaca
Floating object belum dijamin terbaca
Header/footer belum difokuskan
Embedded object kompleks perlu review manual

GitHub Status

Project sudah dibuat repo GitHub dan sudah berhasil dipush.

Workflow Git yang digunakan:

git init
git add .
git commit -m "mvp document to markdown converter"
git branch -M main
git remote add origin <github-url>
git push -u origin main


README final juga sedang/akan dipush dengan commit:

git add README.md
git commit -m "polish readme final"
git push

Status Akhir Saat Ini
MVP v0.1 Stable


Checklist:

[x] Python 3.12 environment ready
[x] Virtual environment ready
[x] Dependencies installed
[x] CLI entrypoint ready
[x] DOCX parser ready
[x] XLSX parser ready
[x] PPTX parser ready
[x] PDF parser ready
[x] Markdown builder ready
[x] YAML frontmatter ready
[x] Image extraction ready
[x] Sample generator ready
[x] Batch conversion ready
[x] README final ready
[x] GitHub repo pushed

Rencana Lanjutan yang Direkomendasikan
Phase v0.2: Markdown Output Polish

Prioritas berikutnya adalah memperbaiki kualitas Markdown hasil output agar lebih nyaman direview manual.

Task v0.2.1: Markdown Image Syntax

Saat ini gambar dirender sebagai:

./images/docx_image_001.png


Target:

./images/docx_image_001.png


Benefit:

Markdown preview bisa langsung menampilkan gambar.

Task v0.2.2: Rapikan PPTX Bullet Handling

Saat ini teks PPTX cenderung dirender sebagai bullet list.

Target:

Bedakan title, paragraph biasa, bullet, dan sub-bullet lebih rapi.

Task v0.2.3: Output Summary Polish

Saat ini output CLI sudah berjalan, tetapi bisa dibuat lebih informatif.

Target:

Total files scanned
Total converted
Total failed
Total warnings
Output root


Contoh:

Conversion Summary
==================
Total scanned : 4
Converted     : 4
Failed        : 0
Warnings      : 8
Output root   : output/converted

Task v0.2.4: Add CLI Options

Tambahkan opsi:

--overwrite
--no-images
--clean-output
--verbose


Prioritas awal:

--overwrite
--clean-output

Task v0.2.5: Improve Output Folder Cleanup

Saat testing sempat muncul folder tambahan seperti:

xxxsample_docx


Target:

Tambahkan opsi untuk membersihkan output lama sebelum convert ulang.

Phase v0.3: Testing Automation

Tambahkan automated tests berbasis pytest.

Target test:

test file type detection
test unsupported file type
test frontmatter exists
test markdown output created
test image folder created
test batch conversion
test each parser with generated sample


Usulan struktur:

tests/
├── generate_samples.py
├── test_detector.py
├── test_markdown_builder.py
├── test_docx_conversion.py
├── test_xlsx_conversion.py
├── test_pptx_conversion.py
├── test_pdf_conversion.py
└── test_batch_conversion.py

Phase v0.4: Review Workspace Preparation

Setelah Markdown output stabil, lanjut ke fitur review manual.

Target:

View converted Markdown list
Open Markdown file
Show extracted images
Mark file as reviewed
Update frontmatter status


Possible status:

needs_review
reviewed
approved
rejected

Phase v0.5: Knowledge Base Preparation

Tahap ini mulai mempersiapkan hasil Markdown untuk ingestion knowledge-base.

Target:

Markdown chunking
Metadata enrichment
Document versioning
Import history
Duplicate detection
Basic manifest file per conversion


Contoh manifest:

{
  "source": "sample_docx.docx",
  "markdown": "sample_docx.md",
  "images": 1,
  "warnings": 2,
  "status": "needs_review"
}

Phase v0.6: Local RAG Foundation

Baru setelah Markdown pipeline stabil, mulai masuk ke fitur RAG.

Target:

Embedding
Vector database
Semantic search
Local assistant
Chat interface
Source citation

Rekomendasi Next Immediate Action

Rekomendasi langkah berikutnya:

Lanjut ke Phase v0.2 Markdown Output Polish


Urutan pengerjaan yang disarankan:

1. Patch Markdown image syntax
2. Patch CLI summary output
3. Tambahkan --clean-output
4. Tambahkan --overwrite
5. Tambahkan pytest basic
6. Commit sebagai "v0.2 markdown polish foundation"


Reason:

MVP sudah jalan. Fase berikutnya sebaiknya meningkatkan kualitas output dan developer experience sebelum menambah fitur besar.

Prompt Lanjutan untuk AI Planner

Gunakan prompt ini untuk meminta AI Planner menyiapkan roadmap detail:

Kita sudah menyelesaikan MVP v0.1 Stable untuk project Doc to Markdown Converter.

Status:
- Python 3.12.10 di Windows sudah berjalan dengan .venv.
- CLI converter sudah berjalan.
- Parser DOCX, XLSX, PPTX, dan PDF sudah berhasil dibuat.
- Semua sample format berhasil dikonversi ke Markdown.
- Output disimpan di output/converted/{source_stem}/.
- Setiap output berisi file .md dan folder images.
- YAML frontmatter sudah ada.
- Conversion Notes/warnings sudah ada.
- README final sudah dibuat.
- Repo GitHub sudah dipush.

Tujuan jangka panjang:
Project ini adalah fondasi awal untuk knowledge-base pribadi / local RAG assistant. Namun saat ini belum masuk AI, LLM, embedding, vector database, atau chat.

Tolong susun rencana lanjutan dari MVP v0.1 ke v0.2 dengan fokus:
1. Markdown output polish
2. Image syntax menjadi Markdown image penuh
3. CLI summary output yang lebih rapi
4. CLI option --overwrite dan --clean-output
5. Basic pytest automation
6. Menjaga struktur modular agar siap untuk review workspace dan RAG pipeline di fase berikutnya

Berikan roadmap task per fase, prioritas, acceptance criteria, dan urutan implementasi yang paling aman.

Kesimpulan

Project saat ini sudah berhasil mencapai fondasi yang stabil untuk konversi dokumen teknis ke Markdown.

MVP v0.1 sudah bisa dianggap selesai dan siap dilanjutkan ke fase v0.2 dengan fokus polishing, testing automation, dan persiapan review workflow sebelum masuk ke knowledge-base/RAG.


---

Bro, kalau mau lebih ringkas buat dikirim ke AI Planner, pakai bagian **“Prompt Lanjutan untuk AI Planner”** aja.  
Kalau mau sebagai laporan lengkap, pakai semua dari atas.