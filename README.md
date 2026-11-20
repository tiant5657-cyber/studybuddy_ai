# StudyBuddy AI — Website UTS

Website sesuai dokumen **Konsep UTS StudyBuddy AI**: ringkasan materi, kuis 5–10 soal pilihan ganda beserta kunci/pembahasan, penjelasan sederhana, perencana belajar berdasarkan tanggal ujian, dan riwayat belajar. Mendukung unggah **PDF, DOCX, PPTX, TXT** serta input teks manual.

## Cara menjalankan

1. Instal **Node.js versi 20 atau lebih baru** dari https://nodejs.org/
2. Ekstrak ZIP ini, lalu buka terminal di folder `studybuddy-ai`.
3. Jalankan `npm install`.
4. Salin `.env.example` menjadi `.env`.
5. Untuk menggunakan AI asli, isi `GEMINI_API_KEY` di `.env` dengan API key dari https://aistudio.google.com/apikey. `GEMINI_MODEL` dapat diganti jika model bawaan tidak tersedia untuk akun Anda.
6. Jalankan `npm start`.
7. Buka **http://localhost:3000**.

Tanpa API key, web tetap dapat berjalan dalam **mode demo**: ringkasan dan latihan sederhana dibuat dari potongan materi, tetapi bukan keluaran model AI. Mode demo hanya untuk menguji antarmuka dan alur aplikasi; untuk kualitas hasil pembelajaran sesuai konsep, aktifkan Gemini.

## Fitur

- PDF: ekstraksi teks dari PDF berbasis teks. PDF scan/foto tidak otomatis dapat dibaca karena tidak ada OCR.
- Word: `.docx` (bukan `.doc` lama).
- PowerPoint: `.pptx` (bukan `.ppt` lama).
- Batas unggahan: 20 MB. Materi dipotong hingga 80.000 karakter untuk antarmuka dan 60.000 karakter saat dikirim ke AI.
- Kuis: jawab pertanyaan, lihat skor dan pembahasan setelah dikoreksi.
- Riwayat: disimpan di `localStorage` browser pada perangkat yang digunakan (bukan sinkronisasi antarperangkat).

## Publikasi untuk link web

Unggah folder project ke GitHub, lalu deploy sebagai **Node.js Web Service** pada Render, Railway, atau hosting Node.js lain. Atur perintah build `npm install`, start `npm start`, dan environment variable `GEMINI_API_KEY`, `GEMINI_MODEL`. Setelah berhasil deploy, hosting akan memberikan link publik HTTPS. **Jangan unggah `.env` atau memasukkan API key ke file JavaScript browser.**

## Keamanan dan batasan

API key hanya dibaca di server. Materi yang dikirim untuk fitur AI diteruskan ke Gemini API. Hindari mengirim dokumen rahasia yang tidak diizinkan. Keluaran AI dapat mengandung kesalahan dan harus diverifikasi. Jika dokumen besar atau kuota API habis, permintaan mungkin gagal.

## Publikasi cepat dengan Render

File `render.yaml` sudah disertakan untuk layanan Web Service Node.js (plan free jika tersedia). Buka `PANDUAN_LINK_PUBLIK.txt` untuk langkah mengunggah folder ke GitHub dan menghubungkannya ke Render. Tambahkan `GEMINI_API_KEY` hanya melalui Environment Variables hosting, bukan ke source code.
