import axios from "axios";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const WHAT_A_CAR_API_HOST = process.env.WHAT_A_CAR_API_HOST || 'http://0.0.0.0:3000'
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

bot.start((ctx) => ctx.reply('Привет, это бот "Что за тачка?"\nДля проверки тачки отправь её номер'))
bot.on('text', async (ctx) => {
    const {update} = ctx
    const {message} = update
    const {from, text} = message
    const {is_bot} = from

    if (is_bot) {
        return ctx.reply('Опять бот! А хочется простого человеческого общения...')
    }

    const plate = text.toUpperCase().split('').map(letter => letterMap[letter] || letter).join('')

    if (
        plate.match(/^[АВЕКМНОРСТУХ]\d{3}(?<!000)[АВЕКМНОРСТУХ]{2}\d{2,3}$/ui)
        || plate.match(/^[АВЕКМНОРСТУХ]{2}\d{3}(?<!000)\d{2,3}$/ui) //такси
        || plate.match(/^[АВЕКМНОРСТУХ]{2}\d{4}(?<!0000)\d{2,3}$/ui) //прицеп
        || plate.match(/^\d{4}(?<!0000)[АВЕКМНОРСТУХ]{2}\d{2,3}$/ui) //мотоцикл
        || plate.match(/^[АВЕКМНОРСТУХ]{2}\d{3}(?<!000)[АВЕКМНОРСТУХ]\d{2,3}$/ui) //транзит
        || plate.match(/^Т[АВЕКМНОРСТУХ]{2}\d{3}(?<!000)\d{2,3}$/ui) //выездной
    ) {
        try {
            const res = await axios.get(`${WHAT_A_CAR_API_HOST}/api/${plate}`)
            if (!res.data) {
                return ctx.reply('Информация не найдена')
            }

            for (const line of res.data){
                await ctx.reply(line)
            }

            return
        } catch (e) {
            console.log(e.message)
            return ctx.reply('Информация временно недоступна')
        }
    }

    if (validateVin(text)) {
        return ctx.reply('Это валидный VIN: ' + text)
    }

    return ctx.reply('Это не похоже на номер')
})

bot.launch()
// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))