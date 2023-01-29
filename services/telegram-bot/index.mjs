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

import {createClient} from 'redis'
const redisClient = createClient({url: REDIS_HOST})
const redisSubscriber = redisClient.duplicate()
redisClient.on('error', (err) => console.log('Redis Client Error', err))
await redisClient.connect()
redisSubscriber.on('error', (err) => console.log('Redis Subscriber Error', err))
await redisSubscriber.connect()

import {Telegraf} from 'telegraf'
const bot = new Telegraf(TELEGRAM_BOT_TOKEN)

//todo use split() in a new service "decodeVin"

bot.start((ctx) => ctx.reply('Привет, это бот "Что за тачка?"\nДля проверки тачки отправь её номер'))

//todo bot.telegram.sendMessage()
bot.on('text', async (ctx) => {
    const {update} = ctx
    const {message} = update
    const {from, text} = message
    const {is_bot} = from

    if (is_bot) {
        return ctx.reply('Опять бот! А хочется простого человеческого общения...')
    }

    const id = text.toUpperCase()
    const plate = id.split('').map(letter => en2ruMap[letter] || letter).join('')
    const vin = id.split('').map(letter => ru2enMap[letter] || letter).join('')

    if (
        plate.match(/^[АВЕКМНОРСТУХ]\d{3}(?<!000)[АВЕКМНОРСТУХ]{2}\d{2,3}$/ui) //обычный номер
        // || plate.match(/^[АВЕКМНОРСТУХ]{2}\d{3}(?<!000)\d{2,3}$/ui) //такси
        // || plate.match(/^[АВЕКМНОРСТУХ]{2}\d{4}(?<!0000)\d{2,3}$/ui) //прицеп
        // || plate.match(/^\d{4}(?<!0000)[АВЕКМНОРСТУХ]{2}\d{2,3}$/ui) //мотоцикл
        // || plate.match(/^[АВЕКМНОРСТУХ]{2}\d{3}(?<!000)[АВЕКМНОРСТУХ]\d{2,3}$/ui) //транзит
        // || plate.match(/^Т[АВЕКМНОРСТУХ]{2}\d{3}(?<!000)\d{2,3}$/ui) //выездной
    ) {
        const checkRequest = await redisClient.json.get(`tg:${chat_id}-${plate}`)
        if(!checkRequest){
            await redisClient.json.set(`tg:${chat_id}-${plate}`, '$', {})
        }
    } else if (vin.match(/^[A-Z0-9]{17}$/g)) {
        const checkRequest = await redisClient.json.get(`tg:${chat_id}-${vin}`)
        if(!checkRequest){
            await redisClient.json.set(`tg:${chat_id}-${vin}`, '$', {})
        }
    } else {
        ctx.reply('Это не похоже ни на номер, ни на VIN')
    }
})

await bot.launch()
// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))

await redisSubscriber.pSubscribe('__keyevent*__:*', async (key) => {
    // console.time('upsert')
    const [service, id] = key.split(':')
    const value = await redisClient.json.get(key)

    //check if query has been made
    const checkRequest = await redisClient.json.get(`tg:${chat_id}-${id}`)//todo gey chat ids somehow here

    // console.timeEnd('upsert')
})