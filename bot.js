require('dotenv').config();
const TelegramBot = require("node-telegram-bot-api");
const express = require('express'); // Добавляем Express
const { womenSneakers } = require("./sneakersData");

const TOKEN = process.env.BOT_TOKEN;

if (!TOKEN) {
  console.error("🚨 Ошибка: BOT_TOKEN не указан в переменных окружения!");
  process.exit(1);
}

const bot = new TelegramBot(TOKEN, { polling: true });
const USER_SUPPORT_ID = 481356531;
let userStates = {};

// Создаем Express-приложение
const app = express();

// Добавляем эндпоинт для пинга
app.get('/health', (req, res) => {
  res.status(200).send('Bot is alive!');
});

// Запускаем сервер
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
});

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

// Обработчики команд
bot.onText(/\/start/, (msg) => {
  const firstName = msg.from.first_name;
  sendMainMenu(msg.chat.id, firstName);
});

function sendMainMenu(chatId, firstName = '') {
  bot.sendMessage(chatId, welcomeMessage(firstName), {
    reply_markup: mainMenuKeyboard,
    parse_mode: "Markdown"
  }).catch(err => console.error('Ошибка отправки главного меню:', err.message));
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
  ).catch(err => console.error('Ошибка начала опроса:', err.message));

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
  ).catch(err => console.error('Ошибка отправки вопроса:', err.message));
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
    ).catch(err => console.error('Ошибка обработки ответа:', err.message));
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
  }).catch(err => console.error('Ошибка после ответа:', err.message));
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
    }).catch(err => console.error('Ошибка отправки рекомендаций:', err.message));
  } else {
    bot.sendMessage(chatId, `${EMOJI.STAR} *Мы нашли ${filtered.length} отличных вариантов для вас!*`, {
      parse_mode: "Markdown"
    }).catch(err => console.error('Ошибка отправки результатов:', err.message));
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
  }).catch(err => console.error('Ошибка отправки списка кроссовок:', err.message));
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
  ).catch(err => console.error('Ошибка отправки сообщения поддержки:', err.message));
});

function handleSupport(chatId, msg) {
  const question = msg.text;

  if (question.length < 10) {
    return bot.sendMessage(chatId,
      `${EMOJI.WARNING} Пожалуйста, опишите ваш вопрос более подробно (минимум 10 символов).`
    ).catch(err => console.error('Ошибка обработки вопроса поддержки:', err.message));
  }

  bot.sendMessage(
    USER_SUPPORT_ID,
    `🆘 *Новый вопрос от пользователя*\n\n` +
    `👤 Имя: ${msg.from.first_name} ${msg.from.last_name || ''}\n` +
    `🆔 ID: ${chatId}\n\n` +
    `📝 Вопрос:\n${question}\n\n` +
    `Ответьте на это сообщение, чтобы отправить ответ пользователю.`,
    { parse_mode: "Markdown" }
  ).catch(err => console.error('Ошибка отправки вопроса в поддержку:', err.message));

  bot.sendMessage(chatId,
    `${EMOJI.CHECK} Ваш вопрос отправлен в поддержку! Мы ответим вам в ближайшее время.\n\n` +
    `${EMOJI.HEART} Спасибо, что выбрали SneakerWart!`,
    { reply_markup: mainMenuKeyboard }
  ).catch(err => console.error('Ошибка подтверждения вопроса:', err.message));

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
  ).catch(err => console.error('Ошибка отправки запроса отзыва:', err.message));
});

function handleReview(chatId, msg) {
  const review = msg.text;

  if (review.length < 15) {
    return bot.sendMessage(chatId,
      `${EMOJI.WARNING} Пожалуйста, напишите более развернутый отзыв (минимум 15 символов).`
    ).catch(err => console.error('Ошибка обработки отзыва:', err.message));
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
  ).catch(err => console.error('Ошибка отправки отзыва:', err.message));

  bot.sendMessage(chatId,
    `${EMOJI.HEART} *Спасибо за ваш отзыв!*\n\n` +
    `Ваше мнение очень важно для нас и поможет стать лучше. ` +
    `В благодарность при следующем заказе используйте промокод *THANKS10* для скидки 10%!`,
    {
      reply_markup: mainMenuKeyboard,
      parse_mode: "Markdown"
    }
  ).catch(err => console.error('Ошибка подтверждения отзыва:', err.message));

  delete userStates[chatId];
}

// Контакты
bot.onText(new RegExp(`${EMOJI.CONTACTS} Контакты`), (msg) => {
  const contactText = `
${EMOJI.PHONE} *Contacts SneakerWart* ${EMOJI.PHONE}

${EMOJI.SNEAKER} *Shop address:*
Moscow, Primernaya st., 123, "Fashion" mall, 2nd floor

${EMOJI.PHONE} *Contact phone:*
+7 (999) 123-45-67 (WhatsApp, Telegram)

${EMOJI.MAIL} *Email:*
support@sneakerwart.ru

${EMOJI.GLOBE} *Our website:*
[sneakerwart.web.app](https://sneakerwart.web.app)

${EMOJI.SUPPORT} *Support hours:*
Mon-Fri: 9:00 - 21:00
Sat-Sun: 10:00 - 18:00

We're always happy to help! ${EMOJI.HEART}
`;

  bot.sendMessage(msg.chat.id, contactText, {
    parse_mode: "Markdown",
    disable_web_page_preview: true
  }).catch(err => console.error('Ошибка отправки контактов:', err.message));
});

// FAQ
bot.onText(new RegExp(`${EMOJI.FAQ} Вопросы`), (msg) => {
  const faq = `
${EMOJI.FAQ} *Frequently Asked Questions* ${EMOJI.FAQ}

1️⃣ *How to place an order?*
- Choose a product in the catalog
- Add to cart
- Enter delivery details
- Pay using your preferred method

2️⃣ *Payment methods:*
💳 Bank cards (Visa, Mastercard, MIR)
📱 Apple Pay / Google Pay
🤝 Cash on delivery

3️⃣ *Delivery:*
🚗 Moscow - 1-2 days (299₽ or free for orders over 5000₽)
📦 Russia - 2-7 days (from 399₽)

4️⃣ *Returns and exchanges:*
🔄 Possible within 14 days of receipt
📦 Item must be in original condition
📝 Receipt or order number required

5️⃣ *How to track an order?*
📱 We'll send a tracking number after shipping
🔍 Track it on the courier's website

${EMOJI.SUPPORT} *Have more questions?* Contact our support!
`;

  bot.sendMessage(msg.chat.id, faq, {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: `${EMOJI.SUPPORT} Contact support`, callback_data: "contact_support" }]
      ]
    }
  }).catch(err => console.error('Ошибка отправки FAQ:', err.message));
});

// Советы дня
bot.onText(new RegExp(`${EMOJI.TIP} Совет дня`), (msg) => {
  const tips = {
    care: [
      "Use a mix of baking soda and hydrogen peroxide to clean white sneakers",
      "Avoid drying sneakers on a radiator - it can deform the material",
      "Use water-repellent sprays to protect from moisture and dirt"
    ],
    selection: [
      "There should be about 5 mm of free space between the sneaker toe and your toes",
      "Choose sneakers half a size larger for running",
      "Gym sneakers should have good lateral support"
    ],
    style: [
      "White sneakers are versatile and match any style",
      "Match sneaker color with accessories (belt, watch, bag)",
      "Black sneakers visually reduce foot size"
    ]
  };

  const categories = Object.keys(tips);
  const randomCategory = categories[Math.floor(Math.random() * categories.length)];
  const randomTip = tips[randomCategory][Math.floor(Math.random() * tips[randomCategory].length)];

  let categoryEmoji = "💡";
  switch (randomCategory) {
    case 'care': categoryEmoji = "🧼"; break;
    case 'selection': categoryEmoji = "👟"; break;
    case 'style': categoryEmoji = "👔"; break;
  }

  bot.sendMessage(
    msg.chat.id,
    `${categoryEmoji} *Tip of the day: ${randomCategory === 'care' ? 'Care' : randomCategory === 'selection' ? 'Selection' : 'Style'}* ${categoryEmoji}\n\n` +
    `${randomTip}\n\n` +
    `#TipOfTheDay #SneakerWart`,
    { parse_mode: "Markdown" }
  ).catch(err => console.error('Ошибка отправки совета дня:', err.message));
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

  switch (state.type) {
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

  bot.answerCallbackQuery(query.id).catch(err => console.error('Ошибка ответа на callback:', err.message));

  switch (data) {
    case "restart_quiz":
      startQuiz(chatId);
      break;
    case "main_menu":
      sendMainMenu(chatId);
      break;
    case "contact_support":
      bot.sendMessage(chatId, "Choose a contact method:", {
        reply_markup: {
          inline_keyboard: [
            [{ text: `${EMOJI.SUPPORT} Write to Telegram`, url: "https://t.me/sneakerwart_support" }],
            [{ text: `${EMOJI.PHONE} Call`, callback_data: "show_phone" }],
            [{ text: `${EMOJI.MAIL} Email us`, callback_data: "show_email" }]
          ]
        }
      }).catch(err => console.error('Ошибка отправки контактов поддержки:', err.message));
      break;
    case "show_phone":
      bot.sendMessage(chatId, `☎️ Our contact phone: +7 (999) 123-45-67`)
        .catch(err => console.error('Ошибка отправки телефона:', err.message));
      break;
    case "show_email":
      bot.sendMessage(chatId, `📩 Our email: support@sneakerwart.ru`)
        .catch(err => console.error('Ошибка отправки email:', err.message));
      break;
    default:
      if (data.startsWith("rate_")) {
        const rating = data.split("_")[1];
        bot.sendMessage(
          USER_SUPPORT_ID,
          `User rated the review with ${rating} stars`,
          { reply_to_message_id: query.message.message_id }
        ).catch(err => console.error('Ошибка отправки рейтинга:', err.message));
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
        `${EMOJI.SUPPORT} *Response from support:*\n\n${supportAnswer}\n\n` +
        `${EMOJI.HEART} Thank you for choosing SneakerWart!`,
        { parse_mode: "Markdown" }
      ).catch(err => console.error('Ошибка отправки ответа поддержки:', err.message));
    }
  }
});

// Обработка ошибок
bot.on('polling_error', (error) => {
  console.error('Polling error:', error.message);
  if (error.message.includes('409')) {
    console.error('🚨 Polling conflict detected! Exiting to avoid duplication.');
    process.exit(1);
  }
});

// Сообщение о запуске
console.log(`${EMOJI.SNEAKER} Bot started in polling mode! ${EMOJI.SNEAKER}`);