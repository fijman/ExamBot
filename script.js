document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('loginBtn').addEventListener('click', login);
  document.getElementById('submitBtn').addEventListener('click', submitExam);
});

const questionsCount = {
  advocate: 10,
  senior_advocate: 15,
  zpka: 20
};

const thresholds = {
  advocate: 40,
  senior_advocate: 60,
  zpka: 75
};

let currentQuestions = [];
let currentRole = '';

async function login() {
  const codeInput = document.getElementById('password').value.trim();
  const response = await fetch('code.json');
  const data = await response.json();
  const validCodes = data.codes.filter(c => c.valid).map(c => c.code);

  if (validCodes.includes(codeInput)) {
    document.getElementById('auth-container').classList.add('hidden');
    document.getElementById('roleSelection').classList.remove('hidden');
  } else {
    alert('Неверный код');
  }
}

async function startTest(role) {
  const count = questionsCount[role];
  const response = await fetch(`${role}.json`);
  const questions = await response.json();

  currentQuestions = selectByPoints(shuffle(questions), count);
  currentRole = role;

  renderQuestions(currentQuestions);
  document.getElementById('roleSelection').classList.add('hidden');
  document.getElementById('examPanel').classList.remove('hidden');
}

function shuffle(array) {
  return [...array].sort(() => Math.random() - 0.5);
}

function selectByPoints(pool, count) {
  const one = Math.floor(count * 0.4);
  const two = Math.floor(count * 0.3);
  const three = count - one - two;

  const byPoints = p => pool.filter(q => q.points === p);
  return [
    ...byPoints(1).slice(0, one),
    ...byPoints(2).slice(0, two),
    ...byPoints(3).slice(0, three)
  ];
}

function renderQuestions(questions) {
  const container = document.getElementById('questions');
  container.innerHTML = '';

  questions.forEach((q, i) => {
    const div = document.createElement('div');
    div.className = 'question';

    // Форматируем текст вопроса, заменяя \n на <br> для абзацев
    const formattedQuestion = q.text.replace(/\n/g, '<br>');

    // Форматируем пояснение, заменяя \n на <br> для абзацев
    const formattedExplanation = q.explanation ? q.explanation.replace(/\n/g, '<br>') : '';

    div.innerHTML = `
      <p><strong>${i + 1}. ${formattedQuestion}</strong></p>
      <div class="answer-group">
        <input type="radio" id="q${i}-true" name="q${i}" value="Верно">
        <label for="q${i}-true">Верно</label>
        <input type="radio" id="q${i}-false" name="q${i}" value="Неверно">
        <label for="q${i}-false">Неверно</label>
      </div>
      <p class="explanation">${formattedExplanation}</p>
    `;
    container.appendChild(div);
  });
}


async function submitExam() {
  let score = 0;
  let total = 0;

  // Собираем данные о экзаменуемом и экзаменаторе
  const examineeName = document.getElementById('examineeName').value.trim();
  const examinerName = document.getElementById('examinerName').value.trim();

  // Если одно из полей пустое, выводим предупреждение
  if (!examineeName || !examinerName) {
    alert('Пожалуйста, введите имя экзаменуемого и экзаменатора.');
    return;
  }

  // Подсчитываем баллы
  currentQuestions.forEach((q, i) => {
    const answer = document.querySelector(`input[name="q${i}"]:checked`);
    total += q.points;
    if (answer && answer.value === 'Верно') {
      score += q.points;
    }
  });

  const percent = (score / total) * 100;
  const passed = percent >= thresholds[currentRole];
  document.getElementById('result').innerHTML =
    `Набрано ${score} из ${total} баллов (${percent.toFixed(1)}%). ${passed ? 'Тест пройден ✅' : 'Тест не пройден ❌'}`;

  // Отправляем результат на вебхук
  sendToWebhook(score, total, percent, passed, examineeName, examinerName);

  setTimeout(() => {
    document.getElementById('examPanel').classList.add('hidden');
    document.getElementById('roleSelection').classList.remove('hidden');
  }, 3000);
}

function sendToWebhook(score, total, percent, passed, examineeName, examinerName) {
  const webhookUrl = 'https://discord.com/api/webhooks/1330638239391813825/pPLjWkUZZ-ORmNAEsuAKX3b0uvglA4uHx_og9QbKbf61Cl66Y0Uf1KOC6d71uoChuYRa';
  const payload = {
    username: "Секретарь адвокатуры",
    avatar_url: "https://cdn.discordapp.com/attachments/1302639052008456258/1330636354131988501/statue-of-liberty.png",
    content: `**<@${examineeName}>**`,
    embeds: [
      {
        title: 'Результаты экзамена',
        description: `
          Экзаменуемый: **<@${examineeName}>**
          Экзаменатор: **<@${examinerName}>**
          Баллы: **${score}** из **${total}**
          Процент: **${percent.toFixed(1)}%**
        `,
        color: passed ? 65280 : 16711680,
        footer: {
          text: "by Walter Heisenberg"
      },
      thumbnail: {
          url: "https://cdn.discordapp.com/attachments/1303450766236979252/1303454138801324134/undefined_-_Imgur_5.png"
      },
      image: {
          url: "https://cdn.discordapp.com/attachments/1301258252427989133/1301266881419804762/55f758f4c4b08c0e.png"
      }
      }
    ]
  };

  fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

