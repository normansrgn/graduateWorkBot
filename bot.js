const TelegramBot = require("node-telegram-bot-api");
const TOKEN = "7443316446:AAEHZogMIImcurhV6eweMVXyK7_dtjjnO4c";
const bot = new TelegramBot(TOKEN, { polling: true });

const USER_SUPPORT_ID = 481356531; // ID поддержки
let userQuestions = {};
let userState = {};
let questionIdCounter = 57869;

const motivationalQuotes = [
  "Только ты можешь изменить свою жизнь. Никто не сделает этого за тебя.",
  "Не останавливайся, даже если тебе тяжело. Будь лучше, чем вчера.",
  "Каждый день - это новый шанс стать лучше.",
  "Не бойся делать ошибки. Учись на них и двигайся дальше.",
  "Успех — это не случайность, это результат упорного труда.",
];

// Приветствие в зависимости от времени суток
function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Доброе утро!";
  if (hour < 18) return "Добрый день!";
  return "Добрый вечер!";
}

bot.onText(/\/start/, async (msg) => {
  const userId = msg.from.id;
  userState[userId] = null;

  const startParameter = msg.text.split(" ")[1];
  if (startParameter) {
    console.log(`Параметр команды /start: ${startParameter}`);
  }

  const userName = msg.from.first_name;
  const greeting = getGreeting();
  const responseText = `
${greeting} ${userName}!

🔥 Давно хочешь найти свою идеальную пару?  

Переходи в наш каталог и выбери то, что сделает твой стиль уникальным.И не забудь, у нас всегда есть что-то особенное для тебя!
  `;

  const options = {
    reply_markup: {
      keyboard: [
        [
          {
            text: "👟Каталог",
            web_app: { url: "https://sneakerwart.web.app/men" },
          },
          // { text: '🛒Корзина' },
        ],
        [{ text: "📲Контакты" }, { text: "💬Поддержка" }],
        [
          { text: "❓Часто задаваемые вопросы" },

          { text: "📝Оставить отзыв" },
        ],
      ],
      resize_keyboard: true,
    },
  };

  await bot.sendMessage(userId, responseText, options);
});

// Кнопка Совета дня
bot.onText(/💡Совет дня/, async (msg) => {
  const userId = msg.from.id;
  const randomQuote =
    motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];
  await bot.sendMessage(userId, randomQuote);
});

// Кнопка оставить отзыв
bot.onText(/📝Оставить отзыв/, async (msg) => {
  const userId = msg.from.id;
  await bot.sendMessage(
    userId,
    "Пожалуйста, напишите ваш отзыв о товарах или услугах."
  );
  userState[userId] = "leaving_review";
});

// Обработка отзывов
bot.on("message", async (msg) => {
  const userId = msg.from.id;

  if (userState[userId] === "leaving_review") {
    const review = msg.text;
    await bot.sendMessage(
      USER_SUPPORT_ID,
      `Пользователь ${msg.from.first_name} (ID: ${userId}) оставил отзыв: ${review}`
    );
    await bot.sendMessage(
      userId,
      "Ваш отзыв отправлен в поддержку. Спасибо за ваше мнение!"
    );
    userState[userId] = null;
  }

  // Обработка FAQ
  if (msg.text === "❓Часто задаваемые вопросы") {
    const faqText = `
💬 *Часто задаваемые вопросы*:

1️⃣ *Как сделать заказ?*

- Для того чтобы сделать заказ, просто выберите товар в каталоге и добавьте его в корзину.

2️⃣ *Какие способы оплаты доступны?*

- Мы принимаем оплату через карты Visa, MasterCard и электронные кошельки.

3️⃣ *Как можно вернуть товар?*

- Вы можете вернуть товар в течение 14 дней, если он не был в использовании.

4️⃣ *Как узнать статус своего заказа?*

- Вы получите уведомление на email о статусе вашего заказа, а также сможете отслеживать его через личный кабинет.

5️⃣ *Могу ли я изменить свой заказ после оформления?*

- Если заказ еще не был отправлен, вы можете изменить его, обратившись в нашу службу поддержки.
    `;
    await bot.sendMessage(userId, faqText);
  }

  // Статистика корзины
  if (msg.text === "📊Статистика") {
    // Имитация статистики (например, кол-во товаров в корзине)
    const cartItemCount = 5; // Здесь можно использовать реальную логику для подсчета товаров в корзине
    await bot.sendMessage(
      userId,
      `📊 Ваша корзина содержит ${cartItemCount} товаров.`
    );
  }
});

bot.onText(
  /(🛒Корзина|📲Контакты|💬Поддержка|❓Часто задаваемые вопросы)/,
  async (msg) => {
    const userId = msg.from.id;

    if (msg.text === "🛒Корзина") {
      await bot.sendMessage(userId, "Ваша корзина пока пуста.");
      userState[userId] = null;
    } else if (msg.text === "📲Контакты") {
      await bot.sendMessage(
        userId,
        "Свяжитесь с нами по телефону: +77777777777"
      );
      userState[userId] = null;
    } else if (msg.text === "💬Поддержка") {
      await bot.sendMessage(
        userId,
        "Пожалуйста, напишите свой вопрос. Мы свяжемся с вами как можно скорее."
      );

      userQuestions[userId] = {
        name: msg.from.first_name,
        question: null,
        questionId: questionIdCounter,
      };
      userState[userId] = "support";
      questionIdCounter += 1;
    } else if (msg.text === "💡Совет дня") {
      const randomQuote =
        motivationalQuotes[
          Math.floor(Math.random() * motivationalQuotes.length)
        ];
      await bot.sendMessage(userId, randomQuote);
    }
  }
);
