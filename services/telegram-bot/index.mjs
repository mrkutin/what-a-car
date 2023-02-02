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
    await redisSub.xgroup('CREATE', 'stream:plate_resolved', 'telegram', '$', 'MKSTREAM')
} catch (e) {
    console.log('Group "telegram" already exists, skipping')
}
try {
    await redisSub.xgroup('CREATE', 'stream:vin_resolved', 'telegram', '$', 'MKSTREAM')
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
        await redisPub.xadd('stream:plate_requested', '*', 'plate', plate, 'chat_id', chat_id, 'user_id', id, 'user_name', username, 'user_first_name', first_name, 'user_last_name', last_name, 'user_language_code', language_code)

    } else if (vin.match(/^[A-Z0-9]{17}$/g)) {
        await redisPub.xadd('stream:vin_requested', '*', 'vin', vin, 'chat_id', chat_id, 'user_id', id, 'user_name', username, 'user_first_name', first_name, 'user_last_name', last_name, 'user_language_code', language_code)

    } else {
        ctx.reply('Это не похоже на номер')
    }
})

bot.launch()
// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))

async function listenForMessages() {
    const results = await redisSub.xreadgroup('GROUP', 'telegram', makeId(7), 'BLOCK', '0', 'COUNT', '10', 'STREAMS', 'stream:plate_resolved', 'stream:vin_resolved', '>', '>')

    const flatMessages = results.reduce((acc, result) => {
        return acc.concat(result[1])//messages
    }, [])

    const promises = flatMessages.map(async message => {
        const {key, chat_id} = flatArrayToObject(message[1])
        const [service, plate] = key.split(':')
        let serviceObj = JSON.parse(await redisPub.call('JSON.GET', key))
        switch (service) {
            case 'sravni':
                if(serviceObj.carDocument){
                    await bot.telegram.sendMessage(chat_id, '<b>СТС</b>', {parse_mode: 'HTML'})
                    await bot.telegram.sendMessage(chat_id, `${serviceObj.carDocument.series || ''} ${serviceObj.carDocument.number || ''}${serviceObj.carDocument.date ? ` от ${serviceObj.carDocument.date?.substring(0, 10)}` : ''}`)
                    // await bot.telegram.sendMessage(chat_id, `Название: ${serviceObj?.brand?.name} ${serviceObj?.model?.name}`)
                    // await bot.telegram.sendMessage(chat_id, `Год выпуска: ${serviceObj?.year}`)
                    // await bot.telegram.sendMessage(chat_id, `Мощность: ${serviceObj?.power} л.с.`)
                    // await bot.telegram.sendMessage(chat_id, `VIN: ${serviceObj?.vin}`)
                }
                break
            case 'autoins':
                if(serviceObj.policyId){
                    await bot.telegram.sendMessage(chat_id, '<b>ОСАГО</b>', {parse_mode: 'HTML'})
                    await bot.telegram.sendMessage(chat_id, `Номер: ${serviceObj.licensePlate}`)
                    await bot.telegram.sendMessage(chat_id, `VIN: ${serviceObj.vin}`)
                    await bot.telegram.sendMessage(chat_id, `Автомобиль: ${serviceObj.makeAndModel}`)
                    await bot.telegram.sendMessage(chat_id, `Мощность: ${serviceObj.powerHp} л.с.`)
                    await bot.telegram.sendMessage(chat_id, `Полис ОСАГО: ${serviceObj.policyId} ${serviceObj.company} ${serviceObj.status}`)
                    await bot.telegram.sendMessage(chat_id, `Цель использования: ${serviceObj.usingPurpose}`)
                    await bot.telegram.sendMessage(chat_id, `${serviceObj.hasRestrictions}`)
                    await bot.telegram.sendMessage(chat_id, `Собственник: ${serviceObj.vehicleOwner}`)
                    await bot.telegram.sendMessage(chat_id, `Страхователь: ${serviceObj.policyHolder}`)
                    await bot.telegram.sendMessage(chat_id, `КБМ: ${serviceObj.KBM}`)
                    await bot.telegram.sendMessage(chat_id, `Регион: ${serviceObj.region}`)
                    await bot.telegram.sendMessage(chat_id, `Страховая премия: ${serviceObj.premium}`)
                }
                break
            case 'gibdd':
                if(serviceObj.vehicle){
                    await bot.telegram.sendMessage(chat_id, '<b>АВТОМОБИЛЬ</b>', {parse_mode: 'HTML'})
                    await bot.telegram.sendMessage(chat_id, `VIN: ${serviceObj.vehicle.vin}`)
                    await bot.telegram.sendMessage(chat_id, `Название: ${serviceObj.vehicle.model}`)
                    await bot.telegram.sendMessage(chat_id, `Категория: ${serviceObj.vehicle.category}`)
                    await bot.telegram.sendMessage(chat_id, `Цвет: ${serviceObj.vehicle.color}`)
                    await bot.telegram.sendMessage(chat_id, `Год: ${serviceObj.vehicle.year}`)
                    await bot.telegram.sendMessage(chat_id, `Объем двигателя: ${serviceObj.vehicle.engineVolume}`)
                    await bot.telegram.sendMessage(chat_id, `Номер кузова: ${serviceObj.vehicle.bodyNumber}`)
                    await bot.telegram.sendMessage(chat_id, `Номер двигателя: ${serviceObj.vehicle.engineNumber}`)
                    await bot.telegram.sendMessage(chat_id, `Мощность двигателя: ${serviceObj.vehicle.powerHp} л.с.`)
                }

                if(serviceObj.ownershipPeriods?.length){
                    await bot.telegram.sendMessage(chat_id, '<b>РЕГИСТРАЦИОННЫЕ ДЕЙСТВИЯ</b>', {parse_mode: 'HTML'})
                    for(const period of serviceObj.ownershipPeriods){
                        await bot.telegram.sendMessage(chat_id, `С ${period.from} по ${period.to || 'настоящее время'}: ${period.ownerType}, ${period.operation}`)
                    }
                }

                if(serviceObj.accidents?.length){
                    await bot.telegram.sendMessage(chat_id, '<b>УЧАСТИЕ в ДТП</b>', {parse_mode: 'HTML'})
                    for(const accident of serviceObj.accidents){
                        await bot.telegram.sendMessage(chat_id, `${accident.AccidentDateTime} ${accident.AccidentPlace}, ${accident.AccidentType.toLowerCase()}, количество участников: ${accident.VehicleAmount}${accident?.DamagePoints?.length ? `, повреждения: ${accident?.DamagePoints.join(', ')}` : ''}`)
                    }
                }
                break
        }
    })
    await Promise.all(promises)
    await listenForMessages(/*messages[messages.length - 1][0]*/)
}

listenForMessages()