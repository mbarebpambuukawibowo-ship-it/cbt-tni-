const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static('public'));

// Data State In-Memory
let currentToken = "TNI2026";
let studentSessions = {}; 

// Bank Soal 30 Nomor (6 Mat, 6 B.Ind, 6 B.Ing, 6 IPA, 6 IPS)
const questionsData = [
  // --- MATEMATIKA ---
  { id: 1, subject: "Matematika", type: "pg", question: "Nilai dari 2^5 + 3^2 adalah...", options: ["37", "41", "32", "25"], answer: "41" },
  { id: 2, subject: "Matematika", type: "pg", question: "Akar dari 625 adalah...", options: ["15", "25", "35", "45"], answer: "25" },
  { id: 3, subject: "Matematika", type: "isian", question: "Berapakah hasil dari 15 x 12?", answer: "180" },
  { id: 4, subject: "Matematika", type: "bs", question: "Apakah sudut siku-siku memiliki besar 90 derajat?", answer: "Benar" },
  { id: 5, subject: "Matematika", type: "mcma", question: "Pilih bilangan yang merupakan bilangan prima:", options: ["2", "4", "7", "9"], answer: ["2", "7"] },
  { id: 6, subject: "Matematika", type: "gambar", question: "Manakah gambar yang menunjukkan grafik fungsi kuadrat simetris?", options: ["tni1.jpeg", "tni2.jpeg", "tni3.jpeg"], answer: "tni1.jpeg" },

  // --- BAHASA INDONESIA ---
  { id: 7, subject: "B. Indonesia", type: "pg", question: "Ide pokok dalam sebuah paragraf disebut...", options: ["Gagasan utama", "Kalimat penjelas", "Kesimpulan", "Tema"], answer: "Gagasan utama" },
  { id: 8, subject: "B. Indonesia", type: "pg", question: "Persamaan kata dari 'Strategi' adalah...", options: ["Taktik", "Tujuan", "Kendala", "Rencana dasar"], answer: "Taktik" },
  { id: 9, subject: "B. Indonesia", type: "isian", question: "Lawan kata (antonim) dari kata 'Prestatif' adalah...", answer: "Pasif" },
  { id: 10, subject: "B. Indonesia", type: "bs", question: "Puisi lama terikat oleh jumlah bait dan rima.", answer: "Benar" },
  { id: 11, subject: "B. Indonesia", type: "mcma", question: "Manakah yang termasuk kata baku dalam Bahasa Indonesia?", options: ["Apotek", "Apotik", "Kualitas", "Kualitet"], answer: ["Apotek", "Kualitas"] },
  { id: 12, subject: "B. Indonesia", type: "gambar", question: "Pilih gambar logo/lambang yang melambangkan persatuan berikut:", options: ["tni1.jpeg", "tni2.jpeg", "tni3.jpeg"], answer: "tni2.jpeg" },

  // --- BAHASA INGGRIS ---
  { id: 13, subject: "B. Inggris", type: "pg", question: "She ____ to the military academy every morning.", options: ["go", "goes", "went", "gone"], answer: "goes" },
  { id: 14, subject: "B. Inggris", type: "pg", question: "What is the synonym of 'Brave'?", options: ["Fearful", "Courageous", "Coward", "Weak"], answer: "Courageous" },
  { id: 15, subject: "B. Inggris", type: "isian", question: "Complete: 'Action speaks louder than ____.'", answer: "words" },
  { id: 16, subject: "B. Inggris", type: "bs", question: "The past tense of 'run' is 'ran'.", answer: "Benar" },
  { id: 17, subject: "B. Inggris", type: "mcma", question: "Select all pronouns in English:", options: ["He", "Quickly", "They", "Run"], answer: ["He", "They"] },
  { id: 18, subject: "B. Inggris", type: "listening", question: "Dengarkan instruksi berikut dan pilih jawaban tepat:", audio: "sound1.mp3", options: ["Stand At Ease", "Attention", "Dismissed"], answer: "Attention" },

  // --- IPA ---
  { id: 19, subject: "IPA", type: "pg", question: "Organ tubuh manusia yang berfungsi memompa darah adalah...", options: ["Hati", "Paru-paru", "Jantung", "Ginjal"], answer: "Jantung" },
  { id: 20, subject: "IPA", type: "pg", question: "Hukum Newton II berkaitan dengan...", options: ["Inersia", "F = m.a", "Aksi-Reaksi", "Gravitasi Bumi"], answer: "F = m.a" },
  { id: 21, subject: "IPA", type: "isian", question: "Gas yang dihirup manusia saat bernapas adalah...", answer: "Oksigen" },
  { id: 22, subject: "IPA", type: "bs", question: "Kecepatan cahaya lebih cepat daripada kecepatan suara.", answer: "Benar" },
  { id: 23, subject: "IPA", type: "mcma", question: "Pilih zat yang termasuk ke dalam kelompok planet kebumian (Terrestrial):", options: ["Merkurius", "Yupiter", "Mars", "Neptunus"], answer: ["Merkurius", "Mars"] },
  { id: 24, subject: "IPA", type: "gambar", question: "Pilih struktur anatomi fisik terbaik berikut:", options: ["tni1.jpeg", "tni2.jpeg", "tni3.jpeg"], answer: "tni3.jpeg" },

  // --- IPS ---
  { id: 25, subject: "IPS", type: "pg", question: "Hari Kemerdekaan Republik Indonesia diperingati pada tanggal...", options: ["17 Agustus", "1 Juni", "10 November", "28 Oktober"], answer: "17 Agustus" },
  { id: 26, subject: "IPS", type: "pg", question: "Panglima Besar TNI pertama di Indonesia adalah...", options: ["Jenderal Soedirman", "A.H. Nasution", "Gatot Soebroto", "Suharto"], answer: "Jenderal Soedirman" },
  { id: 27, subject: "IPS", type: "isian", question: "Landasan idiil negara Indonesia adalah...", answer: "Pancasila" },
  { id: 28, subject: "IPS", type: "bs", question: "Candi Borobudur merupakan peninggalan agama Hindu.", answer: "Salah" },
  { id: 29, subject: "IPS", type: "mcma", question: "Pilih pahlawan nasional dari Jawa Tengah:", options: ["Pangeran Diponegoro", "Cut Nyak Dien", "Jenderal Soedirman", "Pattimura"], answer: ["Pangeran Diponegoro", "Jenderal Soedirman"] },
  { id: 30, subject: "IPS", type: "gambar", question: "Pilih peta taktis operasional berikut:", options: ["tni1.jpeg", "tni2.jpeg", "tni3.jpeg"], answer: "tni1.jpeg" }
];

// Socket.io Realtime Monitoring
io.on('connection', (socket) => {
  socket.on('registerStudent', (data) => {
    studentSessions[socket.id] = {
      nomor: data.nomor,
      nama: data.nama,
      status: 'Sedang Mengerjakan',
      answeredCount: 0,
      score: 0,
      violations: 0
    };
    io.emit('updateDashboard', studentSessions);
  });

  socket.on('updateProgress', (data) => {
    if (studentSessions[socket.id]) {
      studentSessions[socket.id].answeredCount = data.answeredCount;
      io.emit('updateDashboard', studentSessions);
    }
  });

  socket.on('reportViolation', () => {
    if (studentSessions[socket.id]) {
      studentSessions[socket.id].violations += 1;
      if (studentSessions[socket.id].violations >= 3) {
        studentSessions[socket.id].status = 'Melanggar (Auto-Submit)';
      }
      io.emit('updateDashboard', studentSessions);
    }
  });

  socket.on('submitExam', (data) => {
    if (studentSessions[socket.id]) {
      studentSessions[socket.id].status = 'Selesai';
      studentSessions[socket.id].score = data.score;
      io.emit('updateDashboard', studentSessions);
    }
  });

  socket.on('disconnect', () => {
    delete studentSessions[socket.id];
    io.emit('updateDashboard', studentSessions);
  });
});

// API Endpoint Token & Soal
app.get('/api/token', (req, res) => res.json({ token: currentToken }));
app.post('/api/token', (req, res) => {
  currentToken = req.body.token;
  res.json({ success: true, token: currentToken });
});
app.get('/api/questions', (req, res) => res.json(questionsData));
app.post('/api/questions/update', (req, res) => {
  const { id, question, answer } = req.body;
  const item = questionsData.find(q => q.id === id);
  if (item) {
    item.question = question;
    item.answer = answer;
  }
  res.json({ success: true });
});

const PORT = 3000;
server.listen(PORT, () => console.log(`Server berjalan di http://localhost:${PORT}`));