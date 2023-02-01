const REDIS_HOST = process.env.REDIS_HOST || 'redis://0.0.0.0:6379'
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const en2ruMap = {
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
const ru2enMap = {
    'А': 'A',
    'В': 'B',
    'Е': 'E',
    'К': 'K',
    'М': 'M',
    'Н': 'H',
    'О': 'O',
    'Р': 'P',
    'С': 'C',
    'Т': 'T',
    'У': 'Y',
    'Х': 'X'
}

import Redis from 'ioredis'

const redisPub = new Redis(REDIS_HOST)
const redisSub = new Redis(REDIS_HOST)
try {
    await redisSub.xgroup('CREATE', 'plate_resolved', 'telegram', '$', 'MKSTREAM')
} catch (e) {
    console.log('Group "telegram" already exists, skipping')
}

import {Telegraf} from 'telegraf'

const bot = new Telegraf(TELEGRAM_BOT_TOKEN)

const makeId = length => {
    let result = ''
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    const charactersLength = characters.length
    let counter = 0
    while (counter < length) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength))
        counter += 1
    }
    return result
}

const flatArrayToObject = arr => {
    const obj = {}
    for (let i = 0; i < arr.length; i += 2) {
        obj[arr[i]] = arr[i + 1] || null
    }
    return obj
}

bot.start((ctx) => ctx.reply('Привет, это бот "Что за тачка?"\nДля проверки тачки отправь её номер'))

bot.on('text', async (ctx) => {
    const {update} = ctx
    const {message} = update
    const {from, text, chat} = message
    const {is_bot} = from
    const {id: chat_id} = chat
    const {id, username, first_name, last_name, language_code} = from

    if (is_bot) {
        return ctx.reply('Опять бот! А хочется простого человеческого общения...')
    }

    const textInCaps = text.toUpperCase()
    const plate = textInCaps.split('').map(letter => en2ruMap[letter] || letter).join('')
    const vin = textInCaps.split('').map(letter => ru2enMap[letter] || letter).join('')

    if (
        plate.match(/^[АВЕКМНОРСТУХ]\d{3}(?<!000)[АВЕКМНОРСТУХ]{2}\d{2,3}$/ui) //обычный номер
        // || plate.match(/^[АВЕКМНОРСТУХ]{2}\d{3}(?<!000)\d{2,3}$/ui) //такси
        // || plate.match(/^[АВЕКМНОРСТУХ]{2}\d{4}(?<!0000)\d{2,3}$/ui) //прицеп
        // || plate.match(/^\d{4}(?<!0000)[АВЕКМНОРСТУХ]{2}\d{2,3}$/ui) //мотоцикл
        // || plate.match(/^[АВЕКМНОРСТУХ]{2}\d{3}(?<!000)[АВЕКМНОРСТУХ]\d{2,3}$/ui) //транзит
        // || plate.match(/^Т[АВЕКМНОРСТУХ]{2}\d{3}(?<!000)\d{2,3}$/ui) //выездной
    ) {
        await redisPub.xadd('plate_requested', '*', 'plate', plate, 'chat_id', chat_id, 'user_id', id, 'user_name', username, 'user_first_name', first_name, 'user_last_name', last_name, 'user_language_code', language_code)

    } else if (vin.match(/^[A-Z0-9]{17}$/g)) {
        await redisPub.xadd('vin_requested', '*', 'vin', vin, 'chat_id', chat_id, 'user_id', id, 'user_name', username, 'user_first_name', first_name, 'user_last_name', last_name, 'user_language_code', language_code)

    } else {
        ctx.reply('Это не похоже ни на номер, ни на VIN')
    }
})

bot.launch()
// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))

async function listenForMessages() {
    const results = await redisSub.xreadgroup('GROUP', 'telegram', makeId(7), 'BLOCK', '0', 'COUNT', '10', 'STREAMS', 'plate_resolved', '>')
    const [key, messages] = results[0]; // `key` equals to 'plate_resolved'

    const promises = messages.map(async message => {
        const {key, chat_id} = flatArrayToObject(message[1])
        const [service, plate] = key.split(':')
        let serviceObj = JSON.parse(await redisPub.call('JSON.GET', key))
        switch (service) {
            case 'sravni':
                await bot.telegram.sendMessage(chat_id, `Название: ${serviceObj?.brand?.name} ${serviceObj?.model?.name}`)
                await bot.telegram.sendMessage(chat_id, `VIN: ${serviceObj?.vin}`)
                await bot.telegram.sendMessage(chat_id, `Год выпуска: ${serviceObj?.year}`)
                await bot.telegram.sendMessage(chat_id, `Мощность: ${serviceObj?.power} л.с.`)
                serviceObj.carDocument && await bot.telegram.sendMessage(chat_id, `СТС: ${serviceObj.carDocument.series} ${serviceObj.carDocument.number} от ${serviceObj.carDocument.date.substring(0, 10)}`)
        }
    })
    await Promise.all(promises)
    await listenForMessages(/*messages[messages.length - 1][0]*/)
}

listenForMessages()