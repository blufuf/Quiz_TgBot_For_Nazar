const config = require('./config');
const sqlite3 = require('sqlite3').verbose();

const token = config.BOT_TOKEN;
const ADMIN_IDS = config.ADMIN_IDS;
const SUPPORT_CHAT_ID = config.SUPPORT_CHAT_ID;
const db = new sqlite3.Database(config.DB_PATH);
const showImages = config.SHOW_IMAGES;

const quizNames = {
    'sub_btn1_1': 'The Big Bang Theory - Заполни пропуск',
    'sub_btn1_2': 'The Big Bang Theory - Трансформации',
    'sub_btn1_3': 'The Big Bang Theory - Лексико-стилистические приемы',
    'sub_btn1_4': 'The Big Bang Theory - Сопоставление предложений',
    'sub_btn1_5': 'The Big Bang Theory - Правда/Ложь',
    'sub_btn1_6': 'The Big Bang Theory - Идентификация приемов',

    'sub_btn2_1': 'The Simpsons - Заполни пропуск',
    'sub_btn2_2': 'The Simpsons - Трансформации',
    'sub_btn2_3': 'The Simpsons - Лексико-стилистические приемы',
    'sub_btn2_4': 'The Simpsons - Сопоставление предложений',
    'sub_btn2_5': 'The Simpsons - Правда/Ложь',
    'sub_btn2_6': 'The Simpsons - Идентификация приемов',

    'sub_btn3_1': '13 Reasons Why - Заполни пропуск',
    'sub_btn3_2': '13 Reasons Why - Трансформации',
    'sub_btn3_3': '13 Reasons Why - Лексико-стилистические приемы',
    'sub_btn3_4': '13 Reasons Why - Сопоставление предложений',
    'sub_btn3_5': '13 Reasons Why - Правда/Ложь',
    'sub_btn3_6': '13 Reasons Why - Идентификация приемов',

    'sub_btn4_1': 'Friends - Заполни пропуск',
    'sub_btn4_2': 'Friends - Трансформации',
    'sub_btn4_3': 'Friends - Лексико-стилистические приемы',
    'sub_btn4_4': 'Friends - Сопоставление предложений',
    'sub_btn4_5': 'Friends - Правда/Ложь',
    'sub_btn4_6': 'Friends - Идентификация приемов',

    'sub_btn5_1': 'Sherlock - Заполни пропуск',
    'sub_btn5_2': 'Sherlock - Трансформации',
    'sub_btn5_3': 'Sherlock - Лексико-стилистические приемы',
    'sub_btn5_4': 'Sherlock - Сопоставление предложений',
    'sub_btn5_5': 'Sherlock - Правда/Ложь',
    'sub_btn5_6': 'Sherlock - Идентификация приемов',

    'sub_btn6_1': 'Marvel - Заполни пропуск',
    'sub_btn6_2': 'Marvel - Трансформации',
    'sub_btn6_3': 'Marvel - Лексико-стилистические приемы',
    'sub_btn6_4': 'Marvel - Сопоставление предложений',
    'sub_btn6_5': 'Marvel - Правда/Ложь',
    'sub_btn6_6': 'Marvel - Идентификация приемов'
};

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS user_stats (
                                                      id INTEGER PRIMARY KEY AUTOINCREMENT,
                                                      user_id INTEGER,
                                                      username TEXT,
                                                      first_name TEXT,
                                                      last_name TEXT,
                                                      quiz_type TEXT,
                                                      score INTEGER,
                                                      total_questions INTEGER,
                                                      percentage REAL,
                                                      attempt_date DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

    db.run(`CREATE TABLE IF NOT EXISTS bot_ratings (
                                                       id INTEGER PRIMARY KEY AUTOINCREMENT,
                                                       user_id INTEGER,
                                                       rating INTEGER,
                                                       rating_date DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);
});

const TelegramBot = require('node-telegram-bot-api')

const { questions, taskDescriptions } = require('./quizData');

const bot = new TelegramBot(token, {polling: true});
const userStates = {};
const feedbackStates = {};

const showTaskDescription = (chatId, quizType, messageId = null) => {
    const description = taskDescriptions[quizType];
    const keyboard = {
        inline_keyboard: [
            [{ text: "Начать тест", callback_data: `start_${quizType}` }],
            [{ text: "Назад", callback_data: getBackButtonData(quizType) }]
        ]
    };

    if (messageId) {
        bot.editMessageText(description, {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: keyboard
        });
    } else {
        bot.sendMessage(chatId, description, {
            reply_markup: keyboard
        }).then(msg => {
            // Сохраняем ID сообщения с заданием
            if (!userStates[chatId]) userStates[chatId] = {};
            userStates[chatId].taskMessageId = msg.message_id;
        });
    }
};
const getBackButtonData = (quizType) => {
    const prefix = quizType.split('_')[1];
    return `back_to_${prefix}`;
};

bot.setMyCommands([
    { command: '/start', description: '🏠 Главное меню' },
    { command: '/support', description: '🆘 Поддержка' },
    { command: '/instructions', description: '📚 Инструкции' }
]);

const showMainMenu = (chatId) => {
    const inlineKeyboard = {
        inline_keyboard: [
            [{text:"The Big Bang Theory", callback_data:"btn1"}],
            [{text:"The Simpsons", callback_data:"btn2"}],
            [{text:"13 Reasons Why", callback_data:"btn3"}],
            [{text:"Friends", callback_data:"btn4"}],
            [{text:"Sherlock", callback_data:"btn5"}],
            [{text:"Marvel Cinematic Universe Films", callback_data:"btn6"}],
        ]
    };
    const messageText = '🔥How do I work?🔥\n\n' +
        '1️⃣ Choose your TV product 🧐\n\n' +
        '2️⃣ Get your question about lexico-stylistic adaptation 😝\n\n' +
        '3️⃣ Answer your questions 🤩\n\n' +
        '4️⃣ Get the results 🥸\n\n\n' +
        '❓ If you have any problems, you can contact support:\n' +
        ' /support\n\n' +
        '❓ If you want to receive additional instructions you can use:\n' +
        '/instructions\n\n'+
        'Now choose TV production:';
    bot.sendPhoto(chatId, showImages.main, {
        caption: messageText,
        reply_markup: inlineKeyboard
    });
};

const startQuiz = (chatId, quizType) => {
    if (quizType.includes('_4')) {
        userStates[chatId] = {
            quizType: quizType,
            pairs: [...questions[quizType].pairs],
            options: [...questions[quizType].shuffledOptions],
            currentPair: 0,
            score: 0,
            lastMessageId: null,
            correctAnswers: 0,          // Добавляем счетчик правильных ответов
            motivationShown: false
        };
        showMatchingQuestion(chatId);
    } else {
        const quizQuestions = [...questions[quizType]].sort(() => Math.random() - 0.5);
        userStates[chatId] = {
            questions: quizQuestions,
            currentQuestion: 0,
            score: 0,
            quizType: quizType,
            lastMessageId: null,
            correctAnswers: 0,          // Добавляем счетчик правильных ответов
            motivationShown: false
        };
        showQuestion(chatId);
    }
};

const showMatchingQuestion = (chatId) => {
    const userState = userStates[chatId];
    const currentPair = userState.pairs[userState.currentPair];

    if (userState.lastMessageId) {
        bot.deleteMessage(chatId, userState.lastMessageId).catch(console.error);
    }

    const options = userState.options.map(option => ({
        text: option,
        callback_data: `match_${option.split(')')[0].trim()}`
    }));

    const keyboard = {
        inline_keyboard: userState.quizType === 'sub_btn5_4'
            ? [
                [options[0], options[1]],
                [options[2], options[3]],
                ...(options[4] ? [[options[4]]] : []),
                [{ text: "Отменить тест", callback_data: "cancel_quiz" }]
            ].filter(Boolean)
            : [
                [options[0], options[1]],
                [options[2], options[3]],
                ...(options[4] && options[5] ? [[options[4], options[5]]] : []),
                ...(options[6] && options[7] ? [[options[6], options[7]]] : []),
                [{ text: "Отменить тест", callback_data: "cancel_quiz" }]
            ].filter(Boolean)
    };

    bot.sendMessage(chatId, `Сопоставьте:\n\n${currentPair.left}`, {
        reply_markup: keyboard
    }).then(msg => {
        userState.lastMessageId = msg.message_id;
    });
};

const showQuestion = (chatId) => {
    const userState = userStates[chatId];
    const question = userState.questions[userState.currentQuestion];

    const options = question.options.map(option => ({
        text: option[0],
        callback_data: `answer_${option[0].charAt(0)}`
    }));

    const keyboard = userState.quizType === 'sub_btn1_5' || userState.quizType === 'sub_btn1_6' || userState.quizType === 'sub_btn2_5' || userState.quizType === 'sub_btn2_6' || userState.quizType === 'sub_btn3_5' || userState.quizType === 'sub_btn3_6' || userState.quizType === 'sub_btn4_5' || userState.quizType === 'sub_btn4_6' || userState.quizType === 'sub_btn5_1' || userState.quizType === 'sub_btn5_5' || userState.quizType === 'sub_btn5_6' || userState.quizType === 'sub_btn6_1' || userState.quizType === 'sub_btn6_5' || userState.quizType === 'sub_btn6_6'
        ? {
            inline_keyboard: [
                [options[0]],
                [options[1]],
                [{ text: "Отменить тест", callback_data: "cancel_quiz" }]
            ]
        }
        : {
            inline_keyboard: [
                [options[0]],
                [options[1]],
                [options[2]],
                [{ text: "Отменить тест", callback_data: "cancel_quiz" }]
            ]
        };

    if (userState.lastMessageId) {
        bot.deleteMessage(chatId, userState.lastMessageId).catch(console.error);
    }

    bot.sendMessage(chatId, question.question, {
        reply_markup: keyboard
    }).then(msg => {
        userState.lastMessageId = msg.message_id; // Обновляем ID последнего сообщения
    });
};

const handleMatchingAnswer = (chatId, answer, messageId) => {
    const userState = userStates[chatId];
    const currentPair = userState.pairs[userState.currentPair];

    const isCorrect = answer === currentPair.right.split(')')[0].trim();
    if (isCorrect) {
        userState.score++;
        userState.correctAnswers++;  // Увеличиваем счетчик правильных ответов

        // Проверяем условия для показа мотивации
        if (!userState.motivationShown && userState.correctAnswers >= 3 && Math.random() > 0.5) {
            userState.motivationShown = true;
            showMotivation(chatId);
            return; // Прерываем дальнейшие действия
        }

        bot.answerCallbackQuery(messageId, { text: "✅ Правильно!", show_alert: false });
    } else {
        bot.answerCallbackQuery(messageId, {
            text: `❌ Неправильно!`,
            show_alert: false
        });
    }

    userState.currentPair++;
    if (userState.currentPair < userState.pairs.length) {
        showMatchingQuestion(chatId);
    } else {
        showResults(chatId);
    }
};

const handleAnswer = (chatId, answer, messageId) => {
    const userState = userStates[chatId];
    if (!userState || !userState.questions) return;
    const currentQuestion = userState.questions[userState.currentQuestion];

    const isCorrect = answer === currentQuestion.correct;
    if (isCorrect) {
        userState.score++;
        userState.correctAnswers++;  // Увеличиваем счетчик правильных ответов

        // Проверяем условия для показа мотивации
        if (!userState.motivationShown && userState.correctAnswers >= 3 && Math.random() > 0.5) {
            userState.motivationShown = true;
            showMotivation(chatId);
            return; // Прерываем дальнейшие действия
        }

        bot.answerCallbackQuery(messageId, { text: "✅ Правильно!", show_alert: false });
    } else {
        bot.answerCallbackQuery(messageId, {
            text: `❌ Неправильно!`,
            show_alert: false
        });
    }

    userState.currentQuestion++;
    if (userState.currentQuestion < userState.questions.length) {
        bot.deleteMessage(chatId, messageId - 1).catch(console.error);
        showQuestion(chatId);
    } else {
        showResults(chatId);
    }
};

const showMotivation = (chatId) => {
    const userState = userStates[chatId];
    const texts = [
        "Ты молодец! Так держать!",
        "Отличный результат! Продолжай в том же духе!",
        "Вау! Ты действительно знаешь материал!",
        "Идеально! Ты на верном пути!",
        "Прекрасная работа! Так держать!"
    ];
    const randomText = texts[Math.floor(Math.random() * texts.length)];

    // Удаляем предыдущее сообщение с вопросом
    if (userState.lastMessageId) {
        bot.deleteMessage(chatId, userState.lastMessageId).catch(console.error);
    }

    bot.sendPhoto(chatId, 'https://imgur.com/a/srez-SSauCnh', {
        caption: randomText
    }).then(msg => {
        // Удаляем через 5 секунд
        setTimeout(() => {
            bot.deleteMessage(chatId, msg.message_id).catch(console.error);

            // Показываем "Погнали дальше"
            bot.sendPhoto(chatId, 'https://imgur.com/a/FG2gsWv', {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "Продолжить", callback_data: "continue_quiz" }]
                    ]
                }
            }).then(continueMsg => {
                userState.lastMessageId = continueMsg.message_id;
            });
        }, 5000);
    });
};

const showResults = (chatId) => {
    const userState = userStates[chatId];
    if (!userState) return; // Защита от отсутствия состояния

    // Определяем общее количество вопросов
    const totalQuestions = userState.quizType.includes('_4')
        ? userState.pairs.length
        : userState.questions.length;

    // Защищенный расчет процента (с проверкой деления на ноль и ограничением 100%)
    const percentage = totalQuestions > 0
        ? Math.min(Math.round((userState.score / totalQuestions) * 100), 100)
        : 0;

    // Форматируем текст результата
    const resultText = `📊 ${userState.quizType.includes('_4') ? 'Результаты сопоставления' : 'Ваш результат'}:\n\n` +
        `✅ Правильных: ${userState.score} из ${totalQuestions}\n` +
        `📈 Процент: ${percentage}%`;

    // Сохраняем в базу данных с проверками
    bot.getChat(chatId).then(chat => {
        db.run(
            `INSERT INTO user_stats (user_id, username, first_name, last_name, quiz_type, score, total_questions, percentage)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                chat.id,
                chat.username || 'unknown',
                chat.first_name || 'Unknown',
                chat.last_name || '',
                userState.quizType,
                userState.score,
                totalQuestions,
                percentage // Используем уже проверенное значение
            ],
            (err) => {
                if (err) console.error('Ошибка сохранения статистики:', err);
            }
        );
    }).catch(err => {
        console.error('Ошибка получения информации о чате:', err);
    });

    // Удаляем предыдущее сообщение (если есть)
    if (userState.lastMessageId) {
        bot.deleteMessage(chatId, userState.lastMessageId).catch(console.error);
    }

    // Отправляем результат с кнопкой продолжения
    bot.sendMessage(chatId, resultText, {
        reply_markup: {
            inline_keyboard: [
                [{ text: "Вернуться в меню", callback_data: "back_to_main_with_rating" }]
            ]
        }
    });

    delete userStates[chatId]; // Очищаем состояние
};

// Функция для запроса оценки бота
const askForRating = (chatId) => {
    const ratingKeyboard = {
        inline_keyboard: [
            [{ text: "1 ⭐", callback_data: "rate_1" }, { text: "2 ⭐", callback_data: "rate_2" }],
            [{ text: "3 ⭐", callback_data: "rate_3" }, { text: "4 ⭐", callback_data: "rate_4" }],
            [{ text: "5 ⭐", callback_data: "rate_5" }],
            [{ text: "Пропустить", callback_data: "rate_skip" }]
        ]
    };

    bot.sendPhoto(chatId, showImages.rating, {
        caption: "Пожалуйста, оцените нашего бота от 1 до 5 звезд:",
        reply_markup: ratingKeyboard
    }).then(msg => {
        // Сохраняем ID сообщения с оценкой
        if (!userStates[chatId]) userStates[chatId] = {};
        userStates[chatId].ratingMessageId = msg.message_id;
    });
};

// Обработчик оценок бота
const handleRating = (chatId, rating, messageId) => {
    // Удаляем сообщение с запросом оценки ("Пожалуйста, оцените...")
    bot.deleteMessage(chatId, messageId - 1).catch(console.error);

    if (rating === 'skip') {
        bot.answerCallbackQuery(messageId, {
            text: "Спасибо за прохождение теста!",
            show_alert: false
        });
        bot.deleteMessage(chatId, messageId).catch(console.error); // Удаляем сообщение с кнопками
        showMainMenu(chatId);
        return;
    }

    const ratingValue = parseInt(rating);

    bot.getChat(chatId).then(chat => {
        db.run(
            `INSERT INTO bot_ratings (user_id, rating) VALUES (?, ?)`,
            [chat.id, ratingValue],
            (err) => {
                if (err) {
                    console.error('Ошибка сохранения оценки:', err);
                    bot.answerCallbackQuery(messageId, {
                        text: "Ошибка сохранения оценки",
                        show_alert: false
                    });
                } else {
                    bot.answerCallbackQuery(messageId, {
                        text: `Спасибо за ${ratingValue} звезд!`,
                        show_alert: false
                    });
                    bot.deleteMessage(chatId, messageId).catch(console.error); // Удаляем сообщение с кнопками
                    showMainMenu(chatId);
                }
            }
        );
    }).catch(err => {
        console.error('Ошибка получения информации о чате:', err);
        bot.answerCallbackQuery(messageId, {
            text: "Произошла ошибка",
            show_alert: false
        });
    });
};

function getCategoryName(categoryCode) {
    const categoryNames = {
        'btn1': 'The Big Bang Theory',
        'btn2': 'The Simpsons',
        'btn3': '13 Reasons Why',
        'btn4': 'Friends',
        'btn5': 'Sherlock',
        'btn6': 'Marvel Cinematic Universe Films'
    };
    return categoryNames[categoryCode] || categoryCode;
}

const ShowBtn1Menu = (chatId, messageId) => {
    const inlineKeyboard = {
        inline_keyboard: [
            [{text:"Заполни пропуск", callback_data:"sub_btn1_1"}],
            [{text:"Определи переводческую трансформацию", callback_data:"sub_btn1_2"}],
            [{text:"Определи лексико-стилистический прием", callback_data:"sub_btn1_3"}],
            [{text:"Соедини предложения", callback_data:"sub_btn1_4"}],
            [{text:"Правда или ложь", callback_data:"sub_btn1_5"}],
            [{text:"Определи где лексико-стилистический приём", callback_data:"sub_btn1_6"}],
            [{text:"Назад", callback_data: "back_to_main"}],
        ]
    };

    if (messageId) {
        bot.deleteMessage(chatId, messageId).catch(console.error);
    }

    bot.sendPhoto(chatId, showImages.btn1, {
        caption: 'Choose the task for The Big Bang Theory',
        reply_markup: inlineKeyboard
    });
};

const ShowBtn2Menu = (chatId, messageId) => {
    const inlineKeyboard = {
        inline_keyboard: [
            [{text:"Заполни пропуск", callback_data:"sub_btn2_1"}],
            [{text:"Определи переводческую трансформацию", callback_data:"sub_btn2_2"}],
            [{text:"Определи лексико-стилистический прием", callback_data:"sub_btn2_3"}],
            [{text:"Соедини предложения", callback_data:"sub_btn2_4"}],
            [{text:"Правда или ложь", callback_data:"sub_btn2_5"}],
            [{text:"Определи где лексико-стилистический приём", callback_data:"sub_btn2_6"}],
            [{text:"Назад", callback_data: "back_to_main"}],
        ]
    };

    if (messageId) {
        bot.deleteMessage(chatId, messageId).catch(console.error);
    }
    bot.sendPhoto(chatId, showImages.btn2, {
        caption: 'Choose the task for The Simpsons',
        reply_markup: inlineKeyboard
    });
};

const ShowBtn3Menu = (chatId, messageId) => {
    const inlineKeyboard = {
        inline_keyboard: [
            [{text:"Заполни пропуск", callback_data:"sub_btn3_1"}],
            [{text:"Определи переводческую трансформацию", callback_data:"sub_btn3_2"}],
            [{text:"Определи лексико-стилистический прием", callback_data:"sub_btn3_3"}],
            [{text:"Соедини предложения", callback_data:"sub_btn3_4"}],
            [{text:"Правда или ложь", callback_data:"sub_btn3_5"}],
            [{text:"Определи где лексико-стилистический приём", callback_data:"sub_btn3_6"}],
            [{text:"Назад", callback_data: "back_to_main"}],
        ]
    };

    if (messageId) {
        bot.deleteMessage(chatId, messageId).catch(console.error);
    }
    bot.sendPhoto(chatId, showImages.btn3, {
        caption: 'Choose the task for 13 Reasons Why',
        reply_markup: inlineKeyboard
    });
};

const ShowBtn4Menu = (chatId, messageId) => {
    const inlineKeyboard = {
        inline_keyboard: [
            [{text:"Заполни пропуск", callback_data:"sub_btn4_1"}],
            [{text:"Определи переводческую трансформацию", callback_data:"sub_btn4_2"}],
            [{text:"Определи лексико-стилистический прием", callback_data:"sub_btn4_3"}],
            [{text:"Соедини предложения", callback_data:"sub_btn4_4"}],
            [{text:"Правда или ложь", callback_data:"sub_btn4_5"}],
            [{text:"Определи где лексико-стилистический приём", callback_data:"sub_btn4_6"}],
            [{text:"Назад", callback_data: "back_to_main"}],
        ]
    };

    if (messageId) {
        bot.deleteMessage(chatId, messageId).catch(console.error);
    }
    bot.sendPhoto(chatId, showImages.btn4, {
        caption: 'Choose the task for Friends',
        reply_markup: inlineKeyboard
    });
};

const ShowBtn5Menu = (chatId, messageId) => {
    const inlineKeyboard = {
        inline_keyboard: [
            [{text:"Заполни пропуск", callback_data:"sub_btn5_1"}],
            [{text:"Определи переводческую трансформацию", callback_data:"sub_btn5_2"}],
            [{text:"Определи лексико-стилистический прием", callback_data:"sub_btn5_3"}],
            [{text:"Соедини предложения", callback_data:"sub_btn5_4"}],
            [{text:"Правда или ложь", callback_data:"sub_btn5_5"}],
            [{text:"Определи где лексико-стилистический приём", callback_data:"sub_btn5_6"}],
            [{text:"Назад", callback_data: "back_to_main"}],
        ]
    };

    if (messageId) {
        bot.deleteMessage(chatId, messageId).catch(console.error);
    }
    bot.sendPhoto(chatId, showImages.btn5, {
        caption: 'Choose the task for Sherlock',
        reply_markup: inlineKeyboard
    });
};

const ShowBtn6Menu = (chatId, messageId) => {
    const inlineKeyboard = {
        inline_keyboard: [
            [{text:"Заполни пропуск", callback_data:"sub_btn6_1"}],
            [{text:"Определи переводческую трансформацию", callback_data:"sub_btn6_2"}],
            [{text:"Определи лексико-стилистический прием", callback_data:"sub_btn6_3"}],
            [{text:"Соедини предложения", callback_data:"sub_btn6_4"}],
            [{text:"Правда или ложь", callback_data:"sub_btn6_5"}],
            [{text:"Определи где лексико-стилистический приём", callback_data:"sub_btn6_6"}],
            [{text:"Назад", callback_data: "back_to_main"}],
        ]
    };

    if (messageId) {
        bot.deleteMessage(chatId, messageId).catch(console.error);
    }
    bot.sendPhoto(chatId, showImages.btn6, {
        caption: 'Choose the task for Marvel Cinematic Universe Films',
        reply_markup: inlineKeyboard
    });
};

bot.onText(/\/users_stats/, (msg) => {
    if (!ADMIN_IDS.includes(msg.from.id)) {
        return bot.sendMessage(msg.chat.id, "⛔ У вас нет прав доступа к этой команде");
    }

    db.get("SELECT COUNT(DISTINCT user_id) as total_users FROM user_stats", (err, totalRow) => {
        if (err) {
            return bot.sendMessage(msg.chat.id, "❌ Ошибка при получении статистики пользователей");
        }

        db.get(`
            SELECT COUNT(DISTINCT user_id) as active_users
            FROM user_stats
            WHERE attempt_date >= datetime('now', '-7 days')
        `, (err, activeRow) => {
            if (err) {
                return bot.sendMessage(msg.chat.id, "❌ Ошибка при получении статистики активных пользователей");
            }

            const message = `📊 Статистика пользователей бота:\n\n` +
                `👥 Всего пользователей: <b>${totalRow.total_users}</b>\n` +
                `🔥 Активных за последние 7 дней: <b>${activeRow.active_users}</b>\n\n` +
                `*Активным считается пользователь, который прошел хотя бы один тест за указанный период`;

            bot.sendMessage(msg.chat.id, message, { parse_mode: 'HTML' });
        });
    });
});

bot.onText(/\/instructions/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, "📚 Instructions 📚\n\n" +
        "1. Choose a TV show from the main menu\n" +
        "2. Select a quiz type (fill in the gap, identify transformations, etc.)\n" +
        "3. Read each question carefully and select your answer\n" +
        "4. Complete all questions to see your results\n" +
        "5. You can cancel any quiz and return to the main menu\n\n" +
        "Tip: Some quizzes have time limits, so answer promptly!");
});

// В разделе статистики (/stats) измените запрос к базе данных и форматирование вывода:

bot.onText(/\/stats/, (msg) => {
    if (!ADMIN_IDS.includes(msg.from.id)) {
        return bot.sendMessage(msg.chat.id, "⛔ У вас нет прав доступа к этой команде");
    }

    // 1. Получаем статистику оценок
    db.all(`
        SELECT
            rating,
            COUNT(*) as count
        FROM bot_ratings
        WHERE rating BETWEEN 1 AND 5
        GROUP BY rating
        ORDER BY rating
    `, (err, ratingRows) => {
        if (err) {
            console.error('Ошибка при получении статистики оценок:', err);
            return bot.sendMessage(msg.chat.id, "❌ Ошибка при загрузке оценок");
        }

        // 2. Формируем текст с оценками
        let ratingStats = "⭐ Статистика оценок бота:\n";
        if (ratingRows?.length > 0) {
            ratingRows.forEach(row => {
                ratingStats += `${'★'.repeat(row.rating)}${'☆'.repeat(5-row.rating)}: ${row.count} оценок\n`;
            });
        } else {
            ratingStats += "Нет данных об оценках\n";
        }

        // 3. Получаем список всех пользователей
        db.all(`
            SELECT DISTINCT user_id, username, first_name, last_name
            FROM user_stats
            ORDER BY last_name, first_name
        `, (err, users) => {
            if (err) {
                console.error('Ошибка при получении списка пользователей:', err);
                return bot.sendMessage(msg.chat.id, "❌ Ошибка при загрузке списка пользователей");
            }

            if (!users?.length) {
                return bot.sendMessage(msg.chat.id, `${ratingStats}\n\nНет данных о пользователях`);
            }

            // 4. Отправляем статистику оценок
            bot.sendMessage(msg.chat.id, ratingStats);

            // 5. Для каждого пользователя получаем детальную статистику
            users.forEach(user => {
                db.all(`
                    SELECT 
                        quiz_type,
                        score,
                        total_questions,
                        percentage,
                        datetime(attempt_date) as attempt_date
                    FROM user_stats
                    WHERE user_id = ?
                    ORDER BY attempt_date DESC
                `, [user.user_id], (err, attempts) => {
                    if (err) {
                        console.error('Ошибка при получении статистики пользователя:', err);
                        return;
                    }

                    if (!attempts?.length) return;

                    // Формируем сообщение с информацией о пользователе
                    let message = `👤 <b>${user.first_name} ${user.last_name || ''} ${user.username ? `(@${user.username})` : ''}</b>\n`;
                    message += `🆔 ID: ${user.user_id}\n\n`;

                    // Группируем попытки по категориям тестов
                    const categories = attempts.reduce((acc, attempt) => {
                        const category = attempt.quiz_type.split('_')[1];
                        if (!acc[category]) acc[category] = [];
                        acc[category].push(attempt);
                        return acc;
                    }, {});

                    // Добавляем информацию по каждой категории
                    Object.entries(categories).forEach(([category, attempts]) => {
                        message += `📺 <b>${getCategoryName(category)}</b>\n`;

                        // Группируем по типам тестов внутри категории
                        const quizTypes = attempts.reduce((acc, attempt) => {
                            if (!acc[attempt.quiz_type]) acc[attempt.quiz_type] = [];
                            acc[attempt.quiz_type].push(attempt);
                            return acc;
                        }, {});

                        Object.entries(quizTypes).forEach(([quizType, quizAttempts]) => {
                            const quizName = quizNames[quizType]?.split(' - ')[1] || quizType;
                            const bestAttempt = quizAttempts.reduce((best, current) =>
                                current.percentage > best.percentage ? current : best);
                            const worstAttempt = quizAttempts.reduce((worst, current) =>
                                current.percentage < worst.percentage ? current : worst);
                            const avgPercentage = quizAttempts.reduce((sum, a) => sum + a.percentage, 0) / quizAttempts.length;

                            message += `   🎯 <u>${quizName}</u>:\n`;
                            message += `      📊 Средний результат: <b>${avgPercentage.toFixed(1)}%</b>\n`;
                            message += `      🏆 Лучший результат: <b>${bestAttempt.percentage}%</b> (${formatDate(bestAttempt.attempt_date)})\n`;
                            message += `      ⚠️ Худший результат: <b>${worstAttempt.percentage}%</b> (${formatDate(worstAttempt.attempt_date)})\n`;
                            message += `      🔢 Всего попыток: <b>${quizAttempts.length}</b>\n\n`;

                            // Добавляем все даты прохождения
                            message += `      📅 Даты прохождения:\n`;
                            quizAttempts.forEach(attempt => {
                                message += `         • ${formatDate(attempt.attempt_date)} - ${attempt.percentage}% (${attempt.score}/${attempt.total_questions})\n`;
                            });
                            message += `\n`;
                        });
                    });

                    // Отправляем сообщение
                    bot.sendMessage(msg.chat.id, message, {
                        parse_mode: 'HTML',
                        disable_web_page_preview: true
                    });
                });
            });
        });
    });
});


function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

bot.onText(/\/test_(\d{2})\.(\d{2})\.(\d{4})/, (msg, match) => {
    if (!ADMIN_IDS.includes(msg.from.id)) {
        return bot.sendMessage(msg.chat.id, "⛔ У вас нет прав доступа к этой команде");
    }

    const day = match[1];
    const month = match[2];
    const year = match[3];

    // Формируем дату в формате YYYY-MM-DD
    const targetDate = `${year}-${month}-${day}`;

    // Для отладки выведем запрос
    console.log(`Searching for date: ${targetDate}`);

    db.all(`
        SELECT
            us.user_id,
            us.username,
            us.first_name,
            us.last_name,
            us.quiz_type,
            us.score,
            us.total_questions,
            us.percentage,
            strftime('%d.%m.%Y %H:%M', us.attempt_date) as formatted_date
        FROM user_stats us
        WHERE date(us.attempt_date) = ?
        ORDER BY us.attempt_date DESC
    `, [targetDate], (err, attempts) => {
        if (err) {
            console.error('DB Error:', err);
            return bot.sendMessage(msg.chat.id, "❌ Ошибка базы данных");
        }

        console.log(`Found ${attempts.length} attempts for ${targetDate}`);

        if (!attempts.length) {
            return bot.sendMessage(msg.chat.id,
                `📭 Нет данных за ${day}.${month}.${year}\n` +
                `Проверьте правильность даты и наличие данных`);
        }

        // Формируем сообщение
        let message = `📊 Статистика за ${day}.${month}.${year}\n\n`;
        message += `Всего прохождений: ${attempts.length}\n\n`;

        // Группируем по пользователям
        const usersStats = attempts.reduce((acc, attempt) => {
            if (!acc[attempt.user_id]) {
                acc[attempt.user_id] = {
                    userInfo: `${attempt.first_name} ${attempt.last_name || ''} ${attempt.username ? `(@${attempt.username})` : ''}`,
                    attempts: []
                };
            }
            acc[attempt.user_id].attempts.push(attempt);
            return acc;
        }, {});

        // Добавляем информацию по каждому пользователю
        Object.entries(usersStats).forEach(([userId, userData]) => {
            message += `👤 <b>${userData.userInfo}</b> (ID: ${userId})\n`;

            userData.attempts.forEach(attempt => {
                const quizName = quizNames[attempt.quiz_type] || attempt.quiz_type;
                const time = attempt.formatted_date.split(' ')[1];
                message += `   🕒 ${time} - ${quizName}: ` +
                    `<b>${attempt.percentage}%</b> (${attempt.score}/${attempt.total_questions})\n`;
            });

            message += `\n`;
        });

        bot.sendMessage(msg.chat.id, message, {
            parse_mode: 'HTML',
            disable_web_page_preview: true
        });
    });
});

// Добавим также команду /stats_dates для просмотра дат, за которые есть статистика
bot.onText(/\/tests_dates/, (msg) => {
    if (!ADMIN_IDS.includes(msg.from.id)) {
        return bot.sendMessage(msg.chat.id, "⛔ У вас нет прав доступа к этой команде");
    }

    db.all(`
        SELECT DISTINCT date(attempt_date) as stat_date
        FROM user_stats
        ORDER BY stat_date DESC
            LIMIT 30
    `, (err, dates) => {
        if (err) {
            console.error('Ошибка при получении дат:', err);
            return bot.sendMessage(msg.chat.id, "❌ Ошибка при загрузке дат");
        }

        if (!dates?.length) {
            return bot.sendMessage(msg.chat.id, "Нет данных о прохождениях");
        }

        let message = "📅 <b>Доступные даты статистики</b>\n\n";
        message += "Используйте команду /test_DD.MM.YYYY для просмотра\n\n";

        dates.forEach(date => {
            const formattedDate = new Date(date.stat_date).toLocaleDateString('ru-RU');
            message += `• ${formattedDate}\n`;
        });

        bot.sendMessage(msg.chat.id, message, {
            parse_mode: 'HTML',
            disable_web_page_preview: true
        });
    });
});

bot.onText(/\/feedback/, (msg) => {
    const chatId = msg.chat.id;
    feedbackStates[chatId] = { waitingForFeedback: true };

    bot.sendMessage(chatId, "✍️ Пожалуйста, напишите ваш отзыв или жалобу. Мы постараемся ответить как можно скорее.\n\n" +
        "Чтобы отменить отправку, используйте команду /cancel", {
        reply_markup: {
            keyboard: [[{ text: "❌ Отменить отправку" }]],
            resize_keyboard: true,
            one_time_keyboard: true
        }
    });
});

bot.onText(/\/cancel/, (msg) => {
    const chatId = msg.chat.id;
    if (feedbackStates[chatId]) {
        delete feedbackStates[chatId];
        bot.sendMessage(chatId, "❌ Отправка отменена", {
            reply_markup: { remove_keyboard: true }
        });
        showMainMenu(chatId);
    }
});

bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (feedbackStates[chatId] && feedbackStates[chatId].waitingForFeedback && text !== "❌ Отменить отправку") {
        const userInfo = `👤 Пользователь: ${msg.from.first_name} ${msg.from.last_name || ''} 
        (@${msg.from.username || 'нет username'}) 
        ID: ${msg.from.id}`;

        const supportMessage = `✉️ НОВОЕ ОБРАЩЕНИЕ\n\n${userInfo}\n\n📄 Сообщение:\n${text}`;

        try {
            bot.sendMessage(SUPPORT_CHAT_ID, supportMessage, {
                reply_markup: {
                    inline_keyboard: [[
                        {
                            text: "Ответить пользователю",
                            url: `tg://user?id=${msg.from.id}`
                        }
                    ]]
                }
            });

            const ticketId = 'TKT-' + Math.random().toString(36).substr(2, 6).toUpperCase();
            bot.sendMessage(chatId, `✅ Ваше сообщение отправлено в поддержку!\n\nНомер обращения: ${ticketId}\nМы ответим вам в ближайшее время.`, {
                reply_markup: { remove_keyboard: true }
            });

        } catch (error) {
            console.error('Ошибка отправки в поддержку:', error);
            bot.sendMessage(chatId, "❌ Произошла ошибка при отправке сообщения. Пожалуйста, попробуйте позже.");
        }

        delete feedbackStates[chatId];
        showMainMenu(chatId);
    }

    if (text === "❌ Отменить отправку") {
        delete feedbackStates[chatId];
        bot.sendMessage(chatId, "❌ Отправка отменена", {
            reply_markup: { remove_keyboard: true }
        });
        showMainMenu(chatId);
    }
});

bot.onText(/\/support/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, "🛟 Support Information 🛟\n\n" +
        "Если у вас возникли проблемы:\n\n" +
        "1. Нажмите кнопку ниже, чтобы написать сообщение в поддержку\n", {
        reply_markup: {
            inline_keyboard: [
                [{ text: "✍️ Написать в поддержку", callback_data: "send_feedback" }]
            ]
        }
    });
});

bot.on('callback_query', (query) => {
    if (query.data === 'send_feedback') {
        bot.answerCallbackQuery(query.id);
        feedbackStates[query.message.chat.id] = { waitingForFeedback: true };
        bot.sendMessage(query.message.chat.id, "✍️ Пожалуйста, напишите ваш вопрос или проблему. Мы ответим как можно скорее.\n\n" +
            "Для отмены используйте /cancel или кнопку ниже.", {
            reply_markup: {
                keyboard: [[{ text: "❌ Отменить отправку" }]],
                resize_keyboard: true
            }
        });
    }
});

bot.onText(/\/clear_stats/, (msg) => {
    if (!ADMIN_IDS.includes(msg.from.id)) {
        return bot.sendMessage(msg.chat.id, "⛔ У вас нет прав доступа к этой команде");
    }

    // Сбрасываем обе таблицы
    db.serialize(() => {
        db.run("DELETE FROM user_stats", function(err) {
            if (err) {
                return bot.sendMessage(msg.chat.id, "❌ Ошибка при очистке статистики: " + err.message);
            }

            db.run("DELETE FROM bot_ratings", function(err) {
                if (err) {
                    bot.sendMessage(msg.chat.id, "❌ Ошибка при очистке оценок: " + err.message);
                } else {
                    bot.sendMessage(msg.chat.id, `✅ Данные полностью очищены. Удалено: 
                    • ${this.changes} записей статистики
                    • ${this.changes} оценок`);
                }
            });
        });
    });
});

bot.onText(/\/start/, (msg) => {
    showMainMenu(msg.chat.id);
});


bot.on('callback_query', (query) => {
    const chatId = query.message.chat.id;
    const messageId = query.message.message_id;
    const data = query.data;

    // Обработка кнопок главного меню
    if (data.startsWith('btn')) {
        const btnNumber = data.replace('btn', '');
        switch (btnNumber) {
            case '1': ShowBtn1Menu(chatId, messageId); break;
            case '2': ShowBtn2Menu(chatId, messageId); break;
            case '3': ShowBtn3Menu(chatId, messageId); break;
            case '4': ShowBtn4Menu(chatId, messageId); break;
            case '5': ShowBtn5Menu(chatId, messageId); break;
            case '6': ShowBtn6Menu(chatId, messageId); break;
        }
        return;
    }

    if (data.startsWith('back_to_')) {
        const target = data.replace('back_to_', '');
        bot.deleteMessage(chatId, messageId).catch(console.error);
        if (target === 'main') {
            bot.deleteMessage(chatId, messageId).catch(() => {});
            showMainMenu(chatId);
        } else if (target === 'main_with_rating') {
            bot.deleteMessage(chatId, messageId).catch(() => {});
            askForRating(chatId);
        } else {
            const showMenuFunc = {
                'btn1': ShowBtn1Menu,
                'btn2': ShowBtn2Menu,
                'btn3': ShowBtn3Menu,
                'btn4': ShowBtn4Menu,
                'btn5': ShowBtn5Menu,
                'btn6': ShowBtn6Menu
            }[target];

            if (showMenuFunc) {
                showMenuFunc(chatId, messageId);
            }
        }
        return;
    }

    if (data.startsWith('sub_')) {
        bot.deleteMessage(chatId, messageId).catch(console.error);
        showTaskDescription(chatId, data);
        return;
    }

    if (data.startsWith('start_')) {
        const quizType = data.replace('start_', '');

        // Удаляем ТОЛЬКО сообщение с заданием ("Начать тест/Назад")
        bot.deleteMessage(chatId, messageId).catch(console.error);

        startQuiz(chatId, quizType);
        return;
    }

    if (data.startsWith('answer_')) {
        const answer = data.split('_')[1];
        handleAnswer(chatId, answer, query.id);
    } else if (data.startsWith('match_')) {
        const answer = data.split('_')[1];
        handleMatchingAnswer(chatId, answer, query.id);
    }

    if (data === 'cancel_quiz') {
        if (userStates[chatId]?.lastMessageId) {
            bot.deleteMessage(chatId, userStates[chatId].lastMessageId).catch(console.error);
        }
        delete userStates[chatId];
        bot.answerCallbackQuery(query.id, { text: "Тест отменен", show_alert: false });
        showMainMenu(chatId);
    }

    // Обработка оценок бота
    if (data.startsWith('rate_')) {
        const rating = data.split('_')[1];
        bot.deleteMessage(chatId, messageId).catch(() => {});
        handleRating(chatId, rating, query.id);
    }

    if (query.data === 'continue_quiz') {
        const chatId = query.message.chat.id;
        const userState = userStates[chatId];

        // Удаляем сообщение с кнопкой "Продолжить"
        bot.deleteMessage(chatId, query.message.message_id).catch(console.error);

        // Продолжаем тест
        if (userState.questions) {
            showQuestion(chatId);
        } else if (userState.pairs) {
            showMatchingQuestion(chatId);
        }
    }
});