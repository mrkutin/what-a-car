const {TELEGRAM_BOT_TOKEN} = process.env
const letterMap = {
    'A': 'А',
    'B': 'В',
    'E': 'Е',
    'K': 'К',
    'M': 'М',
    'H': 'Н',
    'O': 'О',
    'P': 'Р',
    'C': 'С',
    'T': 'Т',
    'Y': 'У',
    'X': 'Х'
}

import {Telegraf} from 'telegraf'

const bot = new Telegraf(TELEGRAM_BOT_TOKEN)

//todo use split() in a new service "decodeVin"
import {validate as validateVin} from 'vin-decoder'


bot.start((ctx) => ctx.reply('Привет, это бот "Что за тачка?"\nДля проверки тачки отправь её номер или VIN'))
bot.on('text', async (ctx) => {
    const {update} = ctx
    const {message} = update
    const {from, text} = message
    const {is_bot} = from

    if (validateVin(text)) {
        return ctx.reply('Это валидный VIN: ' + text)
    }

    const normalizedText = text.toUpperCase().split('').map(letter => letterMap[letter] || letter).join('')

    if (normalizedText.match(/^[АВЕКМНОРСТУХ]\d{3}(?<!000)[АВЕКМНОРСТУХ]{2}\d{2,3}$/ui)) {
        return ctx.reply('Это номер обычного автомобиля: ' + normalizedText)
    }

    if (normalizedText.match(/^[АВЕКМНОРСТУХ]{2}\d{3}(?<!000)\d{2,3}$/ui)) {
        return ctx.reply('Это номер такси: ' + normalizedText)
    }

    if (normalizedText.match(/^[АВЕКМНОРСТУХ]{2}\d{4}(?<!0000)\d{2,3}$/ui)) {
        return ctx.reply('Это номер прицепа: ' + normalizedText)
    }

    if (normalizedText.match(/^\d{4}(?<!0000)[АВЕКМНОРСТУХ]{2}\d{2,3}$/ui)) {
        return ctx.reply('Это номер мотоцикла: ', normalizedText)
    }

    if (normalizedText.match(/^[АВЕКМНОРСТУХ]{2}\d{3}(?<!000)[АВЕКМНОРСТУХ]\d{2,3}$/ui)) {
        return ctx.reply('Это транзитный номер: ' + normalizedText)
    }

    if (normalizedText.match(/^Т[АВЕКМНОРСТУХ]{2}\d{3}(?<!000)\d{2,3}$/ui)) {
        return ctx.reply('Это выездной номер: ' + normalizedText)
    }

    if (is_bot) {
        return ctx.reply('Опять бот! А хочется простого человеческого общения...')
    }

    return ctx.reply('Это не похоже ни на номер, ни на VIN, попробуй еще раз')
})

bot.launch()
// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))