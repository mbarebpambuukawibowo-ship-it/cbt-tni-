const socket = io();

let currentUser = { role: '', nomor: '', nama: '' };
let questions = [];
let currentQuestionIndex = 0;
let userAnswers = {}; // { qId: answerValue }
let doubtStatus = {}; // { qId: true/false }
let violationsCount = 0;
let isFreeze = false;
let examTimerSeconds = 75 * 60; // 75 Menit
let timerInterval = null;

// --- HANDLE LOGIN 1 ---
function handleLogin1() {
  const role = document.getElementById('roleSelect').value;
  const nomor = document.getElementById('nomorPeserta').value;
  const sandi = document.getElementById('sandi').value;
  const feedback = document.getElementById('login1Feedback');

  if (!nomor || !sandi) {
    feedback.innerHTML = `<div class="icon-error">✖ Nomor & Sandi Harus Diisi!</div>`;
    return;
  }

  feedback.innerHTML = `<div class="icon-success">✔ Login Berhasil!</div>`;
  currentUser.role = role;
  currentUser.nomor = nomor;

  setTimeout(() => {
    document.getElementById('login1Page').classList.add('hidden');
    if (role === 'guru') {
      document.getElementById('teacherPage').classList.remove('hidden');
      loadTeacherDashboard();
    } else {
      document.getElementById('login2Page').classList.remove('hidden');
    }
  }, 1000);
}

// --- HANDLE LOGIN 2 (SISWA) ---
async function handleLogin2() {
  const nama = document.getElementById('namaPeserta').value;
  const tgl = document.getElementById('tglLahir').value;
  const token = document.getElementById('tokenInput').value;
  const feedback = document.getElementById('login2Feedback');

  if (!nama || !tgl || !token) {
    feedback.innerHTML = `<div class="icon-error">✖ Lengkapi semua data!</div>`;
    return;
  }

  const res = await fetch('/api/token');
  const data = await res.json();

  if (token !== data.token) {
    feedback.innerHTML = `<div class="icon-error">✖ Token Salah!</div>`;
    return;
  }

  feedback.innerHTML = `<div class="icon-success">✔ Login berhasil, selamat mengerjakan soal...</div>`;
  currentUser.nama = nama;

  // Hubungkan socket siswa ke server
  socket.emit('registerStudent', { nomor: currentUser.nomor, nama: currentUser.nama });

  setTimeout(async () => {
    document.getElementById('login2Page').classList.add('hidden');
    document.getElementById('examPage').classList.remove('hidden');
    await fetchQuestions();
    startExamTimer();
    renderQuestion();
    renderNavGrid();
  }, 3000);
}

// --- AMBIL SOAL & RENDER ---
async function fetchQuestions() {
  const res = await fetch('/api/questions');
  questions = await res.json();
}

function renderQuestion() {
  const q = questions[currentQuestionIndex];
  document.getElementById('questionSubject').innerText = `Soal ${q.id} - ${q.subject} (${q.type.toUpperCase()})`;
  
  let html = `<p style="margin-bottom:15px; font-size:1.1rem;">${q.question}</p>`;

  if (q.type === 'pg' || q.type === 'gambar') {
    q.options.forEach(opt => {
      const checked = userAnswers[q.id] === opt ? 'checked' : '';
      const displayOpt = q.type === 'gambar' ? `<img src="${opt}" width="100">` : opt;
      html += `<label><input type="radio" name="ans" value="${opt}" ${checked} onchange="saveAnswer('${opt}')"> ${displayOpt}</label>`;
    });
  } else if (q.type === 'bs') {
    ['Benar', 'Salah'].forEach(opt => {
      const checked = userAnswers[q.id] === opt ? 'checked' : '';
      html += `<label><input type="radio" name="ans" value="${opt}" ${checked} onchange="saveAnswer('${opt}')"> ${opt}</label>`;
    });
  } else if (q.type === 'isian') {
    const val = userAnswers[q.id] || '';
    html += `<input type="text" value="${val}" oninput="saveAnswer(this.value)" placeholder="Ketik jawaban..." style="width:100%; padding:8px;">`;
  } else if (q.type === 'mcma') {
    const selected = userAnswers[q.id] || [];
    q.options.forEach(opt => {
      const checked = selected.includes(opt) ? 'checked' : '';
      html += `<label><input type="checkbox" value="${opt}" ${checked} onchange="saveMCMAAnswer('${opt}')"> ${opt}</label>`;
    });
  } else if (q.type === 'listening') {
    html += `<audio controls src="${q.audio}" style="margin-bottom:10px;"></audio><br>`;
    q.options.forEach(opt => {
      const checked = userAnswers[q.id] === opt ? 'checked' : '';
      html += `<label><input type="radio" name="ans" value="${opt}" ${checked} onchange="saveAnswer('${opt}')"> ${opt}</label>`;
    });
  }

  document.getElementById('optionsContainer').innerHTML = html;
  
  // Update Tombol Kanan
  const nextBtn = document.getElementById('btnNext');
  if (currentQuestionIndex === questions.length - 1) {
    nextBtn.innerText = "Kumpulkan";
    nextBtn.onclick = openConfirmModal;
  } else {
    nextBtn.innerText = "Selanjutnya";
    nextBtn.onclick = nextQuestion;
  }
}

function saveAnswer(val) {
  const qId = questions[currentQuestionIndex].id;
  userAnswers[qId] = val;
  updateStudentProgress();
  renderNavGrid();
}

function saveMCMAAnswer(val) {
  const qId = questions[currentQuestionIndex].id;
  let current = userAnswers[qId] || [];
  if (current.includes(val)) {
    current = current.filter(item => item !== val);
  } else {
    current.push(val);
  }
  userAnswers[qId] = current;
  updateStudentProgress();
  renderNavGrid();
}

function toggleDoubt() {
  const qId = questions[currentQuestionIndex].id;
  doubtStatus[qId] = !doubtStatus[qId];
  renderNavGrid();
}

function prevQuestion() {
  if (currentQuestionIndex > 0) { currentQuestionIndex--; renderQuestion(); }
}

function nextQuestion() {
  if (currentQuestionIndex < questions.length - 1) { currentQuestionIndex++; renderQuestion(); }
}

function toggleNavGrid() {
  document.getElementById('navGrid').classList.toggle('hidden');
}

function renderNavGrid() {
  const container = document.getElementById('gridButtons');
  container.innerHTML = '';
  questions.forEach((q, idx) => {
    const btn = document.createElement('button');
    btn.innerText = q.id;
    btn.className = 'grid-btn ';

    if (doubtStatus[q.id]) {
      btn.className += 'doubt';
    } else if (userAnswers[q.id] && userAnswers[q.id].length > 0) {
      btn.className += 'answered';
    } else {
      btn.className += 'unanswered';
    }

    btn.onclick = () => { currentQuestionIndex = idx; renderQuestion(); };
    container.appendChild(btn);
  });
}

function updateStudentProgress() {
  const count = Object.keys(userAnswers).filter(k => userAnswers[k] && userAnswers[k].length > 0).length;
  socket.emit('updateProgress', { answeredCount: count });
}

// --- TIMER 75 MENIT ---
function startExamTimer() {
  timerInterval = setInterval(() => {
    examTimerSeconds--;
    let m = Math.floor(examTimerSeconds / 60);
    let s = examTimerSeconds % 60;
    document.getElementById('timerDisplay').innerText = `${m < 10 ? '0'+m : m}:${s < 10 ? '0'+s : s}`;

    if (examTimerSeconds <= 0) {
      clearInterval(timerInterval);
      finalSubmitExam();
    }
  }, 1000);
}

// --- DETEKSI PELANGGARAN (TAB SWITCH) ---
window.addEventListener('blur', () => {
  if (currentUser.role !== 'siswa' || isFreeze) return;

  violationsCount++;
  socket.emit('reportViolation');
  document.getElementById('warningAudio').play();

  if (violationsCount >= 3) {
    alert("Anda telah melanggar aturan keluar tab sebanyak 3 kali. Sistem mengumpulkan jawaban secara otomatis.");
    finalSubmitExam();
    return;
  }

  isFreeze = true;
  const overlay = document.getElementById('freezeOverlay');
  const timerSpan = document.getElementById('freezeTimer');
  overlay.classList.remove('hidden');

  let timeLeft = 5;
  timerSpan.innerText = timeLeft;

  const freezeInterval = setInterval(() => {
    timeLeft--;
    timerSpan.innerText = timeLeft;
    if (timeLeft <= 0) {
      clearInterval(freezeInterval);
      overlay.classList.add('hidden');
      isFreeze = false;
    }
  }, 1000);
});

// --- KONFIRMASI KUMPULKAN & HITUNG NILAI ---
function openConfirmModal() {
  let hasDoubt = false;
  let hasEmpty = false;

  questions.forEach(q => {
    if (doubtStatus[q.id]) hasDoubt = true;
    if (!userAnswers[q.id] || userAnswers[q.id].length === 0) hasEmpty = true;
  });

  const txt = document.getElementById('confirmWarningText');
  if (hasDoubt) {
    txt.innerText = "Masih ada beberapa soal ragu-ragu, apakah kamu yakin?";
  } else if (hasEmpty) {
    txt.innerText = "Ada soal yang belum dijawab, apakah kamu yakin?";
  } else {
    txt.innerText = "Apakah kamu sudah yakin ingin mengumpulkan?";
  }

  document.getElementById('confirmModal').classList.remove('hidden');
}

function closeConfirmModal() {
  document.getElementById('confirmModal').classList.add('hidden');
}

function toggleSubmitBtn() {
  const chk = document.getElementById('confirmCheck');
  document.getElementById('btnFinalSubmit').disabled = !chk.checked;
}

function finalSubmitExam() {
  clearInterval(timerInterval);
  closeConfirmModal();

  let correct = 0;
  let wrong = 0;
  let empty = 0;

  questions.forEach(q => {
    const ans = userAnswers[q.id];
    if (!ans || ans.length === 0) {
      empty++;
    } else if (Array.isArray(q.answer)) {
      if (Array.isArray(ans) && ans.sort().join(',') === q.answer.sort().join(',')) correct++;
      else wrong++;
    } else if (String(ans).trim().toLowerCase() === String(q.answer).trim().toLowerCase()) {
      correct++;
    } else {
      wrong++;
    }
  });

  const score = correct * 4; // Max 25 soal x 4 = 100 (Dari 30 soal, persentase nilai proporsional)

  document.getElementById('resCorrect').innerText = correct;
  document.getElementById('resWrong').innerText = wrong;
  document.getElementById('resEmpty').innerText = empty;
  document.getElementById('resScore').innerText = score;

  socket.emit('submitExam', { score: score });

  document.getElementById('examPage').classList.add('hidden');
  document.getElementById('resultPage').classList.remove('hidden');
}

// --- LOGIKA DASHBOARD GURU ---
async function loadTeacherDashboard() {
  const res = await fetch('/api/token');
  const data = await res.json();
  document.getElementById('activeTokenDisplay').innerText = data.token;

  socket.on('updateDashboard', (sessions) => {
    const tbody = document.querySelector('#studentTable tbody');
    tbody.innerHTML = '';
    Object.values(sessions).forEach(s => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${s.nomor}</td>
        <td>${s.nama}</td>
        <td>${s.status}</td>
        <td>${s.answeredCount} / 30 Soal</td>
        <td>${s.score}</td>
        <td>${s.violations} Kali</td>
      `;
      tbody.appendChild(tr);
    });
  });
}

async function saveToken() {
  const val = document.getElementById('newTokenInput').value;
  if (!val) return;
  await fetch('/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: val })
  });
  document.getElementById('activeTokenDisplay').innerText = val;
  alert('Token berhasil diubah!');
}