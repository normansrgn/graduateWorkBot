const TelegramBot = require('node-telegram-bot-api');
const TOKEN = "7443316446:AAEHZogMIImcurhV6eweMVXyK7_dtjjnO4c";
const { womenSneakers } = require('./sneakersData');

const bot = new TelegramBot(TOKEN, { polling: true });
let userStates = {};

const mainMenuKeyboard = {
  keyboard: [
    [{ text: "👟Каталог", web_app: { url: "https://sneakerwart.web.app/men" } }],
    [{ text: "📲Контакты" }, { text: "💬Поддержка" }],
    [{ text: "🎯 Подбор кроссовок" }, { text: "❓Часто задаваемые вопросы" }],
    [{ text: "📝Оставить отзыв" }, { text: "💡Совет дня" }]
  ],
  resize_keyboard: true
};

const questions = [
  {
    question: "Для чего вам нужны кроссовки?",
    options: [
      { text: "Для спорта/бега", value: "sport" },
      { text: "Для повседневной носки", value: "casual" },
      { text: "Для особого стиля", value: "fashion" }
    ]
  },
  {
    question: "Какой бренд вы предпочитаете?",
    options: [
      { text: "Nike", value: "nike" },
      { text: "Adidas", value: "adidas" },
      { text: "Dior", value: "dior" },
      { text: "Zara", value: "zara" }
    ]
  },
  {
    question: "Какой ценовой диапазон?",
    options: [
      { text: "До 10,000₽", value: "low" },
      { text: "10,000-15,000₽", value: "medium" },
      { text: "15,000-20,000₽", value: "high" }
    ]
  }
];

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "Добро пожаловать в SneakerWart!", {
    reply_markup: mainMenuKeyboard
  });
});

bot.onText(/🎯 Подбор кроссовок/, (msg) => {
  startQuiz(msg.chat.id);
});

function startQuiz(chatId) {
  userStates[chatId] = { step: 0, answers: [] };
  sendQuestion(chatId);
}

function sendQuestion(chatId) {
  const state = userStates[chatId];
  const question = questions[state.step];
  
  const options = {
    reply_markup: {
      keyboard: [
        question.options.map(opt => ({ text: opt.text })),
        [{ text: "❌ Отменить опрос" }]
      ],
      resize_keyboard: true
    }
  };
  
  bot.sendMessage(chatId, `Вопрос ${state.step + 1}/${questions.length}\n\n${question.question}`, options);
}

bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (!userStates[chatId]) return;

  if (text === "❌ Отменить опрос") {
    delete userStates[chatId];
    bot.sendMessage(chatId, "Опрос отменен", { reply_markup: mainMenuKeyboard });
    return;
  }

  const state = userStates[chatId];
  const currentQuestion = questions[state.step];
  const selectedOption = currentQuestion.options.find(opt => opt.text === text);

  if (!selectedOption) {
    bot.sendMessage(chatId, "Пожалуйста, выберите вариант из предложенных!");
    return;
  }

  state.answers.push(selectedOption.value);
  state.step++;

  if (state.step === questions.length) {
    showResults(chatId, state.answers);
    delete userStates[chatId];
  } else {
    sendQuestion(chatId);
  }
});

function showResults(chatId, answers) {
  let filtered = womenSneakers.filter(sneaker => {
    const matchesType = sneaker.type === answers[0];
    const matchesBrand = sneaker.brand === answers[1];
    const price = parseInt(sneaker.price.replace(/[^0-9]/g, ''));
    
    let matchesPrice = true;
    switch(answers[2]) {
      case 'low': matchesPrice = price < 10000; break;
      case 'medium': matchesPrice = price >= 10000 && price <= 15000; break;
      case 'high': matchesPrice = price > 15000; break;
    }
    
    return matchesType && matchesBrand && matchesPrice;
  });

  if (filtered.length === 0) filtered = womenSneakers.slice(0, 3);

  const resultMessage = `👟 *Мы подобрали для вас:*\n\n${filtered.map((sneaker, index) => 
    `${index + 1}. *${sneaker.title}*\n💵 Цена: ${sneaker.price}₽\n📸 [Фото](${sneaker.img})`
  ).join('\n\n')}`;

  bot.sendMessage(chatId, resultMessage, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [[
        { text: "🔄 Пройти заново", callback_data: "restart_quiz" },
        { text: "📖 Главное меню", callback_data: "main_menu" }
      ]]
    }
  });
}

bot.on('callback_query', (query) => {
  const chatId = query.message.chat.id;
  
  if (query.data === "restart_quiz") {
    startQuiz(chatId);
  } else if (query.data === "main_menu") {
    bot.sendMessage(chatId, "Выберите действие:", { reply_markup: mainMenuKeyboard });
  }
  
  bot.answerCallbackQuery(query.id);
});

console.log('Бот успешно запущен!');