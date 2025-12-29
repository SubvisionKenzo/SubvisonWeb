const chatBox = document.getElementById("chat-box");
const userInput = document.getElementById("user-input");
const welcome = document.getElementById("welcome");
const imageUpload = document.getElementById("image-upload");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let username = localStorage.getItem("kenzoBotUser") || prompt("Quel est ton nom ?");
localStorage.setItem("kenzoBotUser", username);
welcome.textContent = `Bienvenue ${username} `;

let brain = JSON.parse(localStorage.getItem("kenzoBotBrain")) || {
    "bonjour": `Salut ${username}  ! Comment tu vas ?`,
    "windows": "Windows 11 ou 12 ? Je suis ton copilote",
    "minecraft": "Java ou Bedrock ? Je suis prêt à miner"
};

let learningMode = false;
let lastInput = "";

function sendMessage() {
    const inputRaw = userInput.value.trim();
    if (inputRaw === "") return;

    const input = inputRaw.toLowerCase();
    appendMessage("User", inputRaw);
    userInput.value = "";

    if (learningMode) {
        learnResponse(inputRaw);
        return;
    }

    let response = brain[input];
    if (!response) {
        const closest = findClosestMatch(input);
        if (closest) {
            response = `Tu voulais dire "${closest}" ? Voici ma réponse : ${brain[closest]}`;
        } else {
            response = "Je ne connais pas encore cette phrase. Que dois-je répondre ?";
            learningMode = true;
            lastInput = input;
        }
    }

    appendMessage("#", response);
}

function appendMessage(sender, text) {
    const msg = document.createElement("div");
    msg.innerHTML = `<strong>${sender}</strong>: ${text}`;
    chatBox.appendChild(msg);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function learnResponse(newResponse) {
    brain[lastInput] = newResponse;
    localStorage.setItem("kenzoBotBrain", JSON.stringify(brain));
    appendMessage("#", "Merci ! J'ai appris cette nouvelle réponse");
    learningMode = false;
}

function findClosestMatch(input) {
    let bestMatch = null;
    let highestScore = 0;

    for (let key in brain) {
        let score = similarityScore(input, key);
        if (score > highestScore) {
            highestScore = score;
            bestMatch = key;
        }
    }

    return highestScore > 0.7 ? bestMatch : null;
}

function similarityScore(a, b) {
    a = a.toLowerCase();
    b = b.toLowerCase();
    let matches = 0;
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
        if (a[i] === b[i]) matches++;
    }
    return matches / Math.max(a.length, b.length);
}

// Image upload + affichage sur canvas
imageUpload.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (evt) {
        const img = new Image();
        img.onload = function () {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        };
        img.src = evt.target.result;
    };
    reader.readAsDataURL(file);
});
