const TelegramBot = require("node-telegram-bot-api");
const express = require("express");
const { womenSneakers } = require("./sneakersData");

const app = express();
app.use(express.json());

const TOKEN = process.env.BOT_TOKEN; // Токен из переменной окружения
const WEBHOOK_URL = process.env.WEBHOOK_URL || `https://${process.env.RENDER_EXTERNAL_HOSTNAME}/webhook`;
const PORT = process.env.PORT || 8080;

const bot = new TelegramBot(TOKEN, { polling: false }); // Используем вебхуки
const USER_SUPPORT_ID = 481356531; // Ваш Telegram ID
let userStates = {};

// Эмодзи для удобства
const EMOJI = {
  SNEAKER: "👟",
  CATALOG: "📋",
  CONTACTS: "📲",
  SUPPORT: "💬",
  REVIEW: "📝",
  FAQ: "❓",
  QUIZ: "🎯",
  BACK: "↩️",
  CANCEL: "❌",
  MONEY: "💵",
  PHOTO: "📸",
  RELOAD: "🔄",
  HOME: "🏠",
  TIP: "💡",
  MAIL: "📩",
  PHONE: "📞",
  GLOBE: "🌐",
  STAR: "⭐",
  HEART: "💖",
  CHECK: "✅",
  WARNING: "⚠️"
};

// Главное меню
const mainMenuKeyboard = {
  keyboard: [
    [{ text: `${EMOJI.CATALOG} Каталог`, web_app: { url: "https://sneakerwart.web.app/men" } }],
    [
      { text: `${EMOJI.CONTACTS} Контакты` },
      { text: `${EMOJI.SUPPORT} Поддержка` }
    ],
    [
      { text: `${EMOJI.REVIEW} Отзыв` },
      { text: `${EMOJI.FAQ} Вопросы` }
    ],
    [{ text: `${EMOJI.QUIZ} Подбор кроссовок` }]
  ],
  resize_keyboard: true,
  one_time_keyboard: false
};

// Вопросы для опроса
const questions = [
  {
    question: "Для чего вам нужны кроссовки?",
    options: [
      { text: "Спорт/тренировки", value: "sport", emoji: "🏃‍♂️" },
      { text: "Повседневная носка", value: "casual", emoji: "👖" },
      { text: "Модный образ", value: "fashion", emoji: "👗" },
      { text: "Прогулки/путешествия", value: "travel", emoji: "✈️" }
    ]
  },
  {
    question: "Какой бренд вы предпочитаете?",
    options: [
      { text: "Nike", value: "nike", emoji: "✔️" },
      { text: "Adidas", value: "adidas", emoji: "🔷" },
      { text: "Puma", value: "puma", emoji: "🐆" },
      { text: "New Balance", value: "new balance", emoji: "🔢" },
      { text: "Другой", value: "other", emoji: "❔" }
    ]
  },
  {
    question: "Ваш бюджет на покупку?",
    options: [
      { text: "До 10,000₽", value: "low", emoji: "💰" },
      { text: "10,000-20,000₽", value: "medium", emoji: "💸" },
      { text: "Свыше 20,000₽", value: "high", emoji: "🤑" },
      { text: "Не имеет значения", value: "any", emoji: "∞" }
    ]
  },
  {
    question: "Какой цвет предпочитаете?",
    options: [
      { text: "Черный/белый", value: "monochrome", emoji: "⚫⚪" },
      { text: "Яркие цвета", value: "bright", emoji: "🌈" },
      { text: "Пастельные тона", value: "pastel", emoji: "🎀" },
      { text: "Не важно", value: "any_color", emoji: "🎨" }
    ]
  }
];

// Приветственное сообщение
const welcomeMessage = (firstName) => `
✨ *Добро пожаловать в SneakerWart, ${firstName || 'друг'}!* ✨

${EMOJI.SNEAKER} У нас ты найдешь *идеальную пару* кроссовок для любого стиля и случая.

🔥 *Почему выбирают нас?*
✔️ Оригинальные бренды
✔️ Быстрая доставка
✔️ Гарантия качества
✔️ Индивидуальный подход

Выбери действие из меню ниже 👇
`;

// Настройка вебхука
app.post('/webhook', (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// Установка вебхука
bot.setWebHook(`${WEBHOOK_URL}/webhook`).then(() => {
  console.log(`Webhook set to ${WEBHOOK_URL}/webhook`);
}).catch(err => {
  console.error('Error setting webhook:', err);
});

// Обработчики команд
bot.onText(/\/start/, (msg) => {
  const firstName = msg.from.first_name;
  sendMainMenu(msg.chat.id, firstName);
});

function sendMainMenu(chatId, firstName = '') {
  bot.sendMessage(chatId, welcomeMessage(firstName), {
    reply_markup: mainMenuKeyboard,
    parse_mode: "Markdown"
  });
}

// Подбор кроссовок
bot.onText(new RegExp(`${EMOJI.QUIZ} Подбор кроссовок`), (msg) => startQuiz(msg.chat.id));

function startQuiz(chatId) {
  userStates[chatId] = {
    type: "quiz",
    step: 0,
    answers: [],
    startTime: new Date()
  };
  
  bot.sendMessage(chatId, 
    `${EMOJI.QUIZ} *Подбор идеальных кроссовок*\n\n` +
    `Ответьте на ${questions.length} простых вопроса, и мы подберем для вас лучшие варианты!`, 
    { parse_mode: "Markdown" }
  );
  
  sendQuestion(chatId);
}

function sendQuestion(chatId) {
  const state = userStates[chatId];
  if (!state || state.step >= questions.length) return;
  
  const question = questions[state.step];
  const progress = `${state.step + 1}/${questions.length}`;
  
  const keyboard = {
    keyboard: [
      ...question.options.map(opt => [{ text: `${opt.emoji || ''} ${opt.text}` }]),
      [{ text: `${EMOJI.CANCEL} Отменить подбор` }]
    ],
    resize_keyboard: true,
    one_time_keyboard: true
  };
  
  bot.sendMessage(
    chatId,
    `*Вопрос ${progress}*\n${question.question}`,
    {
      reply_markup: keyboard,
      parse_mode: "Markdown"
    }
  );
}

// Обработка ответов на вопросы
function handleQuiz(chatId, msg, state) {
  const currentQuestion = questions[state.step];
  const userAnswer = currentQuestion.options.find(opt => 
    msg.text.includes(opt.text) || msg.text.includes(opt.emoji)
  );

  if (!userAnswer) {
    return bot.sendMessage(chatId, 
      `${EMOJI.WARNING} Пожалуйста, выберите один из предложенных вариантов.`,
      { reply_markup: { keyboard: currentQuestion.options.map(opt => [{ text: `${opt.emoji} ${opt.text}` }]) } }
    );
  }

  state.answers.push(userAnswer.value);
  state.step++;

  bot.sendMessage(chatId, `${EMOJI.CHECK} Выбрано: ${userAnswer.text}`, {
    reply_markup: { remove_keyboard: true }
  }).then(() => {
    if (state.step < questions.length) {
      setTimeout(() => sendQuestion(chatId), 500);
    } else {
      showResults(chatId, state.answers);
      delete userStates[chatId];
    }
  });
}

// Показ результатов
function showResults(chatId, answers) {
  let filtered = womenSneakers.filter(sneaker => {
    const price = parseInt(sneaker.price.replace(/\D/g, ""));
    const matches = [
      sneaker.type === answers[0],
      answers[1] === 'other' || sneaker.brand.toLowerCase() === answers[1],
      answers[2] === 'any' || checkPrice(price, answers[2]),
      answers[3] === 'any_color' || sneaker.color === answers[3]
    ];
    return matches.every(Boolean);
  });

  if (filtered.length === 0) {
    filtered = womenSneakers.sort(() => 0.5 - Math.random()).slice(0, 5);
    bot.sendMessage(chatId, `${EMOJI.WARNING} По вашим критериям мы не нашли идеальных вариантов, но вот наши рекомендации:`, {
      parse_mode: "Markdown"
    });
  } else {
    bot.sendMessage(chatId, `${EMOJI.STAR} *Мы нашли ${filtered.length} отличных вариантов для вас!*`, {
      parse_mode: "Markdown"
    });
  }

  const message = filtered.map((sneaker, idx) => 
    `*${idx + 1}. ${sneaker.title}*\n` +
    `${EMOJI.MONEY} Цена: ${sneaker.price}\n` +
    `${EMOJI.PHOTO} [Посмотреть](${sneaker.img})`
  ).join("\n\n");

  bot.sendMessage(chatId, message, {
    parse_mode: "Markdown",
    disable_web_page_preview: false,
    reply_markup: {
      inline_keyboard: [
        [
          { text: `${EMOJI.RELOAD} Начать заново`, callback_data: "restart_quiz" },
          { text: `${EMOJI.CATALOG} Весь каталог`, web_app: { url: "https://sneakerwart.web.app/men" } }
        ],
        [
          { text: `${EMOJI.HOME} В меню`, callback_data: "main_menu" }
        ]
      ]
    }
  });
}

function checkPrice(price, range) {
  switch (range) {
    case 'low': return price < 10000;
    case 'medium': return price >= 10000 && price <= 20000;
    case 'high': return price > 20000;
    default: return true;
  }
}

// Поддержка
bot.onText(new RegExp(`${EMOJI.SUPPORT} Поддержка`), (msg) => {
  userStates[msg.chat.id] = { type: "support", step: "awaiting_question" };
  
  bot.sendMessage(msg.chat.id, 
    `${EMOJI.SUPPORT} *Напишите ваш вопрос*\n\n` +
    `Опишите подробно вашу проблему или вопрос, и наша поддержка ответит вам в ближайшее время.`,
    {
      reply_markup: {
        keyboard: [[{ text: `${EMOJI.CANCEL} Отменить` }]],
        resize_keyboard: true,
        one_time_keyboard: true
      },
      parse_mode: "Markdown"
    }
  );
});

function handleSupport(chatId, msg) {
  const question = msg.text;
  
  if (question.length < 10) {
    return bot.sendMessage(chatId, 
      `${EMOJI.WARNING} Пожалуйста, опишите ваш вопрос более подробно (минимум 10 символов).`
    );
  }
  
  bot.sendMessage(
    USER_SUPPORT_ID,
    `🆘 *Новый вопрос от пользователя*\n\n` +
    `👤 Имя: ${msg.from.first_name} ${msg.from.last_name || ''}\n` +
    `🆔 ID: ${chatId}\n\n` +
    `📝 Вопрос:\n${question}\n\n` +
    `Ответьте на это сообщение, чтобы отправить ответ пользователю.`,
    { parse_mode: "Markdown" }
  );
  
  bot.sendMessage(chatId, 
    `${EMOJI.CHECK} Ваш вопрос отправлен в поддержку! Мы ответим вам в ближайшее время.\n\n` +
    `${EMOJI.HEART} Спасибо, что выбрали SneakerWart!`,
    { reply_markup: mainMenuKeyboard }
  );
  
  delete userStates[chatId];
}

// Отзывы
bot.onText(new RegExp(`${EMOJI.REVIEW} Отзыв`), (msg) => {
  userStates[msg.chat.id] = { type: "review", step: "awaiting_review" };
  
  bot.sendMessage(msg.chat.id, 
    `${EMOJI.REVIEW} *Поделитесь вашим мнением*\n\n` +
    `Нам очень важно ваше мнение! Напишите, что вам понравилось или что мы можем улучшить. ` +
    `Лучшие отзывы получают скидки на следующие покупки!`,
    {
      reply_markup: {
        keyboard: [[{ text: `${EMOJI.CANCEL} Отменить` }]],
        resize_keyboard: true,
        one_time_keyboard: true
      },
      parse_mode: "Markdown"
    }
  );
});

function handleReview(chatId, msg) {
  const review = msg.text;
  
  if (review.length < 15) {
    return bot.sendMessage(chatId, 
      `${EMOJI.WARNING} Пожалуйста, напишите более развернутый отзыв (минимум 15 символов).`
    );
  }
  
  const ratingKeyboard = {
    inline_keyboard: [
      [{ text: "⭐", callback_data: "rate_1" }, { text: "⭐⭐", callback_data: "rate_2" }, 
       { text: "⭐⭐⭐", callback_data: "rate_3" }, { text: "⭐⭐⭐⭐", callback_data: "rate_4" }, 
       { text: "⭐⭐⭐⭐⭐", callback_data: "rate_5" }]
    ]
  };
  
  bot.sendMessage(
    USER_SUPPORT_ID,
    `${EMOJI.STAR} *Новый отзыв*\n\n` +
    `👤 От: ${msg.from.first_name} ${msg.from.last_name || ''}\n` +
    `🆔 ID: ${chatId}\n\n` +
    `📝 Отзыв:\n${review}`,
    { 
      parse_mode: "Markdown",
      reply_markup: ratingKeyboard 
    }
  );
  
  bot.sendMessage(chatId, 
    `${EMOJI.HEART} *Спасибо за ваш отзыв!*\n\n` +
    `Ваше мнение очень важно для нас и поможет стать лучше. ` +
    `В благодарность при следующем заказе используйте промокод *THANKS10* для скидки 10%!`,
    {
      reply_markup: mainMenuKeyboard,
      parse_mode: "Markdown"
    }
  );
  
  delete userStates[chatId];
}

// Контакты
bot.onText(new RegExp(`${EMOJI.CONTACTS} Контакты`), (msg) => {
  const contactText = `
${EMOJI.PHONE} *Контакты SneakerWart* ${EMOJI.PHONE}

${EMOJI.SNEAKER} *Адрес магазина:*
г. Москва, ул. Примерная, д. 123, ТЦ "Модный", 2 этаж

${EMOJI.PHONE} *Телефон для связи:*
+7 (999) 123-45-67 (WhatsApp, Telegram)

${EMOJI.MAIL} *Электронная почта:*
support@sneakerwart.ru

${EMOJI.GLOBE} *Наш сайт:*
[sneakerwart.web.app](https://sneakerwart.web.app)

${EMOJI.SUPPORT} *График работы поддержки:*
Пн-Пт: 9:00 - 21:00
Сб-Вс: 10:00 - 18:00

Мы всегда рады помочь вам! ${EMOJI.HEART}
`;
  
  bot.sendMessage(msg.chat.id, contactText, { 
    parse_mode: "Markdown",
    disable_web_page_preview: true
  });
});

// FAQ
bot.onText(new RegExp(`${EMOJI.FAQ} Вопросы`), (msg) => {
  const faq = `
${EMOJI.FAQ} *Часто задаваемые вопросы* ${EMOJI.FAQ}

1️⃣ *Как сделать заказ?*
- Выберите товар в каталоге
- Добавьте в корзину
- Укажите данные для доставки
- Оплатите удобным способом

2️⃣ *Способы оплаты:*
💳 Банковские карты (Visa, Mastercard, МИР)
📱 Apple Pay / Google Pay
🤝 Наложенный платеж (при получении)

3️⃣ *Доставка:*
🚗 По Москве - 1-2 дня (299₽ или бесплатно от 5000₽)
📦 По России - 2-7 дней (от 399₽)

4️⃣ *Возврат и обмен:*
🔄 Возможен в течение 14 дней с момента получения
📦 Товар должен быть в оригинальном состоянии
📝 Необходим чек или номер заказа

5️⃣ *Как отследить заказ?*
📱 После отправки мы пришлем трек-номер
🔍 Отслеживайте на сайте транспортной компании

${EMOJI.SUPPORT} *Остались вопросы?* Напишите в нашу поддержку!
`;
  
  bot.sendMessage(msg.chat.id, faq, { 
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: `${EMOJI.SUPPORT} Написать в поддержку`, callback_data: "contact_support" }]
      ]
    }
  });
});

// Советы дня
bot.onText(new RegExp(`${EMOJI.TIP} Совет дня`), (msg) => {
  const tips = {
    care: [
      "Для чистки белых кроссовок используйте смесь пищевой соды и перекиси водорода",
      "Не сушите кроссовки на батарее - это может деформировать материал",
      "Используйте водоотталкивающие спреи для защиты от влаги и грязи"
    ],
    selection: [
      "Между носком кроссовка и пальцами ноги должно быть около 5 мм свободного пространства",
      "Для бега выбирайте кроссовки на полразмера больше обычного",
      "Кроссовки для зала должны иметь хорошую боковую поддержку"
    ],
    style: [
      "Белые кроссовки универсальны и подходят к любому стилю",
      "Сочетайте цвет кроссовок с аксессуарами (ремень, часы, сумка)",
      "Черные кроссовки визуально уменьшают размер ноги"
    ]
  };
  
  const categories = Object.keys(tips);
  const randomCategory = categories[Math.floor(Math.random() * categories.length)];
  const randomTip = tips[randomCategory][Math.floor(Math.random() * tips[randomCategory].length)];
  
  let categoryEmoji = "💡";
  switch(randomCategory) {
    case 'care': categoryEmoji = "🧼"; break;
    case 'selection': categoryEmoji = "👟"; break;
    case 'style': categoryEmoji = "👔"; break;
  }
  
  bot.sendMessage(
    msg.chat.id,
    `${categoryEmoji} *Совет дня: ${randomCategory === 'care' ? 'Уход' : randomCategory === 'selection' ? 'Выбор' : 'Стиль'}* ${categoryEmoji}\n\n` +
    `${randomTip}\n\n` +
    `#СоветДня #SneakerWart`,
    { parse_mode: "Markdown" }
  );
});

// Обработка всех сообщений
bot.on("message", (msg) => {
  if (!msg.text) return;
  
  const chatId = msg.chat.id;
  const text = msg.text;
  const state = userStates[chatId];
  
  if (text.includes("Отменить") || text.includes(EMOJI.CANCEL)) {
    delete userStates[chatId];
    return sendMainMenu(chatId);
  }
  
  if (!state) return;
  
  switch(state.type) {
    case "quiz": 
      handleQuiz(chatId, msg, state);
      break;
    case "support": 
      handleSupport(chatId, msg);
      break;
    case "review": 
      handleReview(chatId, msg);
      break;
  }
});

// Обработка callback-запросов
bot.on("callback_query", (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;
  
  bot.answerCallbackQuery(query.id);
  
  switch(data) {
    case "restart_quiz":
      startQuiz(chatId);
      break;
    case "main_menu":
      sendMainMenu(chatId);
      break;
    case "contact_support":
      bot.sendMessage(chatId, "Выберите способ связи:", {
        reply_markup: {
          inline_keyboard: [
            [{ text: `${EMOJI.SUPPORT} Написать в Telegram`, url: "https://t.me/sneakerwart_support" }],
            [{ text: `${EMOJI.PHONE} Позвонить`, callback_data: "show_phone" }],
            [{ text: `${EMOJI.MAIL} Написать на email`, callback_data: "show_email" }]
          ]
        }
      });
      break;
    case "show_phone":
      bot.sendMessage(chatId, `☎️ Наш телефон для связи: +7 (999) 123-45-67`);
      break;
    case "show_email":
      bot.sendMessage(chatId, `📩 Наш email: support@sneakerwart.ru`);
      break;
    default:
      if (data.startsWith("rate_")) {
        const rating = data.split("_")[1];
        bot.sendMessage(
          USER_SUPPORT_ID,
          `Пользователь оценил отзыв на ${rating} звезд`,
          { reply_to_message_id: query.message.message_id }
        );
      }
  }
});

// Ответ от поддержки
bot.on("message", (msg) => {
  if (msg.reply_to_message && msg.chat.id === USER_SUPPORT_ID) {
    const replyTo = msg.reply_to_message.text || '';
    const chatIdMatch = replyTo.match(/🆔 ID: (\d+)/);
    
    if (chatIdMatch) {
      const targetChatId = chatIdMatch[1];
      const supportAnswer = msg.text;
      
      bot.sendMessage(
        targetChatId,
        `${EMOJI.SUPPORT} *Ответ от поддержки:*\n\n${supportAnswer}\n\n` +
        `${EMOJI.HEART} Спасибо, что выбрали SneakerWart!`,
        { parse_mode: "Markdown" }
      );
    }
  }
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`${EMOJI.SNEAKER} Бот запущен на порту ${PORT}! ${EMOJI.SNEAKER}`);
});