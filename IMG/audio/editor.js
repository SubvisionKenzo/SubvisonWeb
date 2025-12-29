let audioCtx, source, analyser, dataArray, bufferLength, animationId;
let audio = new Audio();
let canvas = document.getElementById('waveform');
let ctx = canvas.getContext('2d');
let playhead = document.getElementById('playhead');
let chrono = document.getElementById('chrono');

canvas.width = canvas.offsetWidth;
canvas.height = canvas.offsetHeight;

document.getElementById('audioUpload').addEventListener('change', function (e) {
    let file = e.target.files[0];
    if (file) {
        audio.src = URL.createObjectURL(file);
        audio.load();
        setupWaveform();
    }
});

function setupWaveform() {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    source = audioCtx.createMediaElementSource(audio);
    analyser = audioCtx.createAnalyser();
    source.connect(analyser);
    analyser.connect(audioCtx.destination);
    analyser.fftSize = 2048;
    bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);
    drawWaveform();
}

function drawWaveform() {
    function draw() {
        animationId = requestAnimationFrame(draw);
        analyser.getByteTimeDomainData(dataArray);
        ctx.fillStyle = '#2c2c2c';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.lineWidth = 2;

        // Analyse moyenne pour déterminer la tonalité
        let avg = dataArray.reduce((a, b) => a + b) / bufferLength;
        let color = '#00ff00'; // vert par défaut

        if (avg < 100) color = '#ff0000'; // grave = rouge
        else if (avg > 150) color = '#00aaff'; // aigu = bleu

        ctx.strokeStyle = color;
        ctx.beginPath();

        let sliceWidth = canvas.width * 1.0 / bufferLength;
        let x = 0;
        for (let i = 0; i < bufferLength; i++) {
            let v = dataArray[i] / 128.0;
            let y = v * canvas.height / 2;
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
            x += sliceWidth;
        }
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();

        let progress = audio.currentTime / audio.duration;
        playhead.style.left = (progress * canvas.width) + 'px';

        updateChrono(audio.currentTime);
    }
    draw();
}

function updateChrono(time) {
    let minutes = Math.floor(time / 60);
    let seconds = Math.floor(time % 60);
    let milliseconds = Math.floor((time % 1) * 1000);
    chrono.textContent = `${pad(minutes)}:${pad(seconds)}.${padMs(milliseconds)}`;
}

function pad(n) {
    return n < 10 ? '0' + n : n;
}

function padMs(ms) {
    return ms < 10 ? '00' + ms : ms < 100 ? '0' + ms : ms;
}

document.getElementById('playBtn').onclick = () => audio.play();
document.getElementById('pauseBtn').onclick = () => audio.pause();
document.getElementById('resetBtn').onclick = () => {
    audio.pause();
    audio.currentTime = 0;
};
document.getElementById('deleteBtn').onclick = () => {
    audio.pause();
    audio.src = '';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    playhead.style.left = '0px';
    chrono.textContent = '00:00.000';
    cancelAnimationFrame(animationId);
};
let mediaRecorder;
let chunks = [];
let gainNode;

navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
    const audioCtx = new AudioContext();
    const source = audioCtx.createMediaStreamSource(stream);
    gainNode = audioCtx.createGain();
    const analyser = audioCtx.createAnalyser();

    source.connect(gainNode).connect(analyser).connect(audioCtx.destination);

    analyser.fftSize = 256;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const canvas = document.getElementById('levelCanvas');
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    function drawLevels() {
        requestAnimationFrame(drawLevels);
        analyser.getByteFrequencyData(dataArray);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (let i = 0; i < dataArray.length; i++) {
            const val = dataArray[i];
            const x = i * (canvas.width / dataArray.length);
            const h = val;
            let color = val < 85 ? 'red' : val < 170 ? 'yellow' : 'lime';
            ctx.fillStyle = color;
            ctx.fillRect(x, canvas.height - h, canvas.width / dataArray.length - 1, h);
        }
    }

    drawLevels();

    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = e => chunks.push(e.data);
    mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'enregistrement.webm';
        a.click();
        chunks = [];
    };
});

document.getElementById('startRec').onclick = () => mediaRecorder.start();
document.getElementById('stopRec').onclick = () => mediaRecorder.stop();

document.getElementById('volumeSlider').oninput = (e) => {
    const vol = parseFloat(e.target.value);
    gainNode.gain.value = vol;
    document.getElementById('volumeLabel').textContent = `Volume: ${Math.round(vol * 100)}%`;
};

const timelineTrack = document.getElementById('timelineTrack');
const mediaName = document.getElementById('mediaName');
const audioUpload = document.getElementById('audioUpload'); // ID modifié ici
const addMedia = document.getElementById('addMedia');
const playBtn = document.getElementById('playBtn');
const stopBtn = document.getElementById('stopBtn');
const timeDisplay = document.getElementById('timeDisplay');
const editModal = document.getElementById('editModal');
const editName = document.getElementById('editName');
const editDuration = document.getElementById('editDuration');
const editAudio = document.getElementById('editAudio');
const saveEdit = document.getElementById('saveEdit');

let playlist = [];
let currentIndex = 0;
let currentAudio = null;
let interval;
let currentBlock = null;

addMedia.onclick = () => {
    const name = mediaName.value.trim();
    const file = audioUpload.files[0]; // ID modifié ici
    if (!name || !file) return;

    const block = document.createElement('div');
    block.className = 'mediaBlock';
    block.textContent = `${name}`;
    block.dataset.name = name;
    block.dataset.duration = 0;
    block.dataset.audio = URL.createObjectURL(file);

    block.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        currentBlock = block;
        editName.value = block.dataset.name;
        editDuration.value = block.dataset.duration;
        editModal.style.display = 'block';
    });

    timelineTrack.appendChild(block);
    playlist.push(block);
    mediaName.value = '';
    audioUpload.value = ''; // ID modifié ici
};

saveEdit.onclick = () => {
    if (currentBlock) {
        currentBlock.dataset.name = editName.value;
        currentBlock.dataset.duration = editDuration.value;
        if (editAudio.files[0]) {
            currentBlock.dataset.audio = URL.createObjectURL(editAudio.files[0]);
        }
        currentBlock.textContent = editName.value;
        editModal.style.display = 'none';
    }
};

playBtn.onclick = () => {
    if (playlist.length === 0) return;
    currentIndex = 0;
    playNext();
};

function playNext() {
    if (currentIndex >= playlist.length) return;

    const block = playlist[currentIndex];
    const audioSrc = block.dataset.audio;
    const duration = parseFloat(block.dataset.duration);

    if (!audioSrc) {
        currentIndex++;
        playNext();
        return;
    }

    currentAudio = new Audio(audioSrc);
    block.classList.add('active');
    currentAudio.play();
    let start = Date.now();

    interval = setInterval(() => {
        const elapsed = (Date.now() - start) / 1000;
        const mins = String(Math.floor(elapsed / 60)).padStart(2, '0');
        const secs = String(Math.floor(elapsed % 60)).padStart(2, '0');
        timeDisplay.textContent = `${mins}:${secs}`;

        if (duration > 0 && elapsed >= duration) {
            currentAudio.pause();
            clearInterval(interval);
            block.classList.remove('active');
            currentIndex++;
            playNext();
        } else if (duration === 0 && currentAudio.ended) {
            clearInterval(interval);
            block.classList.remove('active');
            currentIndex++;
            playNext();
        }
    }, 500);
}

stopBtn.onclick = () => {
    if (currentAudio) currentAudio.pause();
    clearInterval(interval);
    timeDisplay.textContent = '00:00';
    document.querySelectorAll('.mediaBlock').forEach(b => b.classList.remove('active'));
    currentIndex = 0;
};
