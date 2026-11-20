import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import mammoth from 'mammoth';
import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';
import pdfjs from 'pdfjs-dist/legacy/build/pdf.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const upload = multer({storage:multer.memoryStorage(),limits:{fileSize:20*1024*1024}});
app.use(express.json({limit:'2mb'}));
app.use(express.static(path.join(__dirname,'public')));
app.get('/api/status', (_,res)=>res.json({aiConfigured:Boolean(process.env.GEMINI_API_KEY),model:process.env.GEMINI_MODEL||'gemini-2.5-flash'}));
function allText(node,found=[]){if(node===null||node===undefined)return found;if(typeof node==='string'||typeof node==='number')return found.push(String(node)),found;if(Array.isArray(node)){node.forEach(n=>allText(n,found));return found;}if(typeof node==='object'){for(const [k,v] of Object.entries(node)){if(k==='a:t'||k==='t')allText(v,found);else if(typeof v==='object')allText(v,found);}}return found;}
app.post('/api/extract',upload.single('file'),async(req,res)=>{
 try{
  const f=req.file;if(!f) return res.status(400).json({error:'Pilih file terlebih dahulu.'});
  const ext=path.extname(f.originalname).toLowerCase();let text='';
  if(ext==='.pdf'){
   const doc=await pdfjs.getDocument({data:new Uint8Array(f.buffer),useSystemFonts:true,disableFontFace:true}).promise;
   if(doc.numPages>150)throw new Error('PDF maksimal 150 halaman.');
   const pages=[];for(let p=1;p<=doc.numPages;p++){const page=await doc.getPage(p);const content=await page.getTextContent();pages.push(content.items.map(x=>x.str||'').join(' '));}text=pages.join('\n\n');
  }else if(ext==='.docx'){
   const r=await mammoth.extractRawText({buffer:f.buffer});text=r.value;
  }else if(ext==='.pptx'){
   const zip=await JSZip.loadAsync(f.buffer);const slides=Object.keys(zip.files).filter(x=>/^ppt\/slides\/slide\d+\.xml$/.test(x)).sort((a,b)=>Number(a.match(/slide(\d+)/)[1])-Number(b.match(/slide(\d+)/)[1]));
   const parser=new XMLParser({ignoreAttributes:false,removeNSPrefix:false});
   for(const s of slides){const xml=parser.parse(await zip.file(s).async('string'));text+=allText(xml).join(' ')+'\n\n';}
  }else if(ext==='.txt'){text=f.buffer.toString('utf8');}
  else return res.status(400).json({error:'Format yang didukung: PDF, DOCX, PPTX, TXT. Untuk .doc atau .ppt lama, simpan ulang sebagai .docx atau .pptx.'});
  text=text.replace(/\u0000/g,'').replace(/[ \t]{3,}/g,' ').trim();
  if(text.length<20)return res.status(422).json({error:'Teks tidak ditemukan. PDF hasil scan/gambar mungkin memerlukan OCR. Coba file berbasis teks atau tempel teks secara manual.'});
  res.json({text:text.slice(0,80000),characters:text.length,truncated:text.length>80000,name:f.originalname});
 }catch(e){res.status(422).json({error:'Gagal membaca dokumen: '+e.message});}
});

function sentences(text){return (text.match(/[^.!?\n]+[.!?]?/g)||[]).map(s=>s.trim()).filter(s=>s.length>35).slice(0,100);}
function demo(mode,material,date,count){
 const s=sentences(material);const lines=(s.length?s:[material]).slice(0,Math.min(8,s.length||1));
 if(mode==='summary')return {title:'Ringkasan materi (demo)',summary:lines.slice(0,5).join(' '),points:lines.slice(0,8),keywords:[...new Set((material.match(/\b[A-Za-zÀ-ÿ]{6,}\b/g)||[]).map(w=>w.toLowerCase()))].slice(0,6)};
 if(mode==='explain')return {title:'Penjelasan sederhana (demo)',explanation:'Materi ini membahas: '+lines.slice(0,3).join(' ')+'\n\nPelajari setiap gagasan utama satu per satu, kemudian jelaskan kembali dengan kata-kata Anda sendiri.',terms:lines.slice(0,4).map((x,i)=>({term:'Gagasan '+(i+1),meaning:x}))};
 if(mode==='quiz'){
  const pool=lines.length?lines:[material.slice(0,150)];const quizzes=Array.from({length:count},(_,i)=>{const correct=pool[i%pool.length].slice(0,160);const choices=[correct,'Pernyataan tersebut tidak berkaitan dengan materi.','Semua konsep dalam materi selalu memiliki arti yang sama.','Materi tidak memberikan informasi mengenai topik ini.'];const shift=i%4;return {question:'Manakah pernyataan yang sesuai dengan materi? (Soal '+(i+1)+')',options:choices.slice(shift).concat(choices.slice(0,shift)),answer:(4-shift)%4,explanation:'Pernyataan tersebut tercantum dalam materi: '+correct};});return {title:'Kuis latihan (demo)',questions:quizzes};
 }
 if(mode==='plan'){
  const today=new Date();today.setHours(12,0,0,0);const end=new Date(date+'T12:00:00');const days=Math.max(1,Math.min(30,Math.ceil((end-today)/86400000)));const tasks=['Baca dan tandai konsep inti','Buat ringkasan singkat','Pelajari istilah sulit','Latihan soal pilihan ganda','Evaluasi kesalahan jawaban','Ulangi materi dengan teknik menjelaskan','Simulasi ujian dan revisi'];
  return {title:'Rencana belajar (demo)',tips:'Sisihkan 30–60 menit per hari; gunakan teknik belajar aktif.',schedule:Array.from({length:days},(_,i)=>{const d=new Date(today.getTime()+i*86400000);return {date:d.toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'}),topic:'Sesi '+(i+1),task:tasks[i%tasks.length],duration:'45 menit'};})};
 }
}
function promptFor(mode, material, date,count){
 const base=`Kamu adalah StudyBuddy AI, tutor mahasiswa berbahasa Indonesia. Gunakan HANYA materi sumber. Jangan membuat fakta tambahan. Jika materi kurang lengkap, katakan keterbatasannya. Jawab sebagai JSON valid tanpa Markdown, dalam struktur tepat sesuai instruksi. Materi:\n${material}`;
 if(mode==='summary')return base+'\nTugas: ringkas. JSON: {"title":"judul","summary":"paragraf singkat","points":["poin penting"],"keywords":["istilah"]}. Beri 4-8 poin.';
 if(mode==='explain')return base+'\nTugas: jelaskan dengan bahasa sederhana, beri analogi hanya jika ditandai sebagai analogi, tidak mengubah fakta. JSON: {"title":"judul","explanation":"uraian jelas","terms":[{"term":"istilah","meaning":"makna sederhana"}]}. Maks 8 istilah.';
 if(mode==='quiz')return base+`\nBuat persis ${count} soal pilihan ganda yang relevan, tingkat kesulitan bervariasi, masing-masing 4 opsi masuk akal dengan hanya 1 jawaban benar. JSON: {"title":"judul","questions":[{"question":"pertanyaan","options":["A","B","C","D"],"answer":0,"explanation":"pembahasan mengapa benar"}]}. answer adalah indeks berbasis nol 0..3. Jangan memasukkan jawaban di teks soal.`;
 if(mode==='plan')return base+`\nTanggal ujian: ${date}. Tanggal saat ini: ${new Date().toISOString().slice(0,10)}. Susun jadwal belajar harian dari sekarang hingga maksimal 30 hari sebelum ujian, atau minimal satu sesi jika tanggal sangat dekat. Rincian bersandar pada topik dalam materi. JSON: {"title":"judul","tips":"saran","schedule":[{"date":"YYYY-MM-DD","topic":"topik","task":"aktivitas spesifik","duration":"45 menit"}]}.`;
}
function normalize(mode,obj,count){
 if(!obj||typeof obj!=='object')throw new Error('Respons AI kosong.');
 if(mode==='quiz'){
  if(!Array.isArray(obj.questions)||!obj.questions.length)throw new Error('Format kuis tidak valid.');
  obj.questions=obj.questions.slice(0,count).map(q=>({question:String(q.question||''),options:Array.isArray(q.options)?q.options.slice(0,4).map(String):[],answer:Number(q.answer),explanation:String(q.explanation||'')}));
  if(obj.questions.some(q=>q.options.length!==4||!Number.isInteger(q.answer)||q.answer<0||q.answer>3))throw new Error('Pilihan atau kunci jawaban AI tidak valid. Coba kembali.');
 }
 if(mode==='plan'&&!Array.isArray(obj.schedule))throw new Error('Format jadwal tidak valid.');
 if(mode==='summary'&&!Array.isArray(obj.points))throw new Error('Format ringkasan tidak valid.');
 if(mode==='explain'&&!Array.isArray(obj.terms))throw new Error('Format penjelasan tidak valid.');
 return obj;
}
app.post('/api/generate',async(req,res)=>{
 try{
  const {mode,material,date}=req.body||{};const count=[5,10].includes(Number(req.body?.count))?Number(req.body.count):5;
  if(!['summary','quiz','explain','plan'].includes(mode))return res.status(400).json({error:'Fitur tidak dikenali.'});
  if(typeof material!=='string'||material.trim().length<40)return res.status(400).json({error:'Materi minimal 40 karakter.'});
  if(mode==='plan'&&(!/^\d{4}-\d{2}-\d{2}$/.test(date||'')||new Date(date+'T12:00:00')<new Date(new Date().toISOString().slice(0,10)+'T00:00:00')))return res.status(400).json({error:'Masukkan tanggal ujian hari ini atau setelahnya.'});
  const text=material.slice(0,60000);
  if(!process.env.GEMINI_API_KEY)return res.json({data:demo(mode,text,date,count),demo:true});
  const model=process.env.GEMINI_MODEL||'gemini-2.5-flash';
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),60000);
  let result;try{result=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,{
   method:'POST',signal:controller.signal,headers:{'Content-Type':'application/json','x-goog-api-key':process.env.GEMINI_API_KEY},body:JSON.stringify({contents:[{parts:[{text:promptFor(mode,text,date,count)}]}],generationConfig:{responseMimeType:'application/json',temperature:0.35,maxOutputTokens:6000}})});
  }finally{clearTimeout(timer);}
  const raw=await result.json().catch(()=>({}));
  if(!result.ok)throw new Error(raw.error?.message||`Gemini API mengembalikan HTTP ${result.status}`);
  const answer=raw.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('');
  if(!answer)throw new Error('Gemini tidak menghasilkan jawaban. Coba materi lain.');
  const parsed=JSON.parse(answer.replace(/^```(?:json)?\s*|\s*```$/g,''));
  res.json({data:normalize(mode,parsed,count),demo:false});
 }catch(e){res.status(502).json({error:e.name==='AbortError'?'Koneksi ke AI terlalu lama. Coba lagi.':e.message});}
});
app.use((err,req,res,next)=>res.status(400).json({error:err.code==='LIMIT_FILE_SIZE'?'Ukuran file maksimal 20 MB.':err.message}));
app.listen(PORT,'0.0.0.0',()=>console.log(`StudyBuddy AI siap di http://localhost:${PORT}`));
