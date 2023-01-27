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
import {validate as validateVin} from 'vin-decoder'


bot.start((ctx) => ctx.reply('Привет, это бот "Что за тачка?"\nДля проверки тачки отправь её номер или VIN'))
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
            const res = await axios.get(`${WHAT_A_CAR_API_HOST}/api/plates/${plate}`)
            if (!res.data) {
                return ctx.reply('Информация временно недоступна')
            }
            ctx.reply('Вот, что удалось найти:')

            const {sravni, gibdd, autoins} = res.data

            await ctx.reply(`Гос. номер: ${plate}`)
            await ctx.reply(`VIN: ${gibdd.vehicle?.vin}`)
            await ctx.reply(`Название: ${gibdd.vehicle?.model || `${sravni.brand?.name || ''} ${sravni.model?.name || ''}`}`)
            await ctx.reply(`Цвет: ${gibdd.vehicle?.color || ''}`)
            await ctx.reply(`Год выпуска: ${gibdd.vehicle?.year || ''}`)
            await ctx.reply(`Объем двигателя: ${gibdd.vehicle?.engineVolume || ''} куб. см`)
            await ctx.reply(`Мощность: ${gibdd.vehicle?.powerHp || ''} л.с.`)
            await ctx.reply(`Собственников по ПТС: ${gibdd.ownershipPeriods?.length || ''}`)
            gibdd.accidents?.forEach(async accident => {
                await ctx.reply(`${accident.AccidentDateTime}, ${accident.AccidentPlace}, ${accident.AccidentType}, кол-во участников: ${accident.VehicleAmount}`)
            })



            return
        } catch (e) {
            console.log(e.message)
            return ctx.reply('Информация временно недоступна')
        }
    }

    if (validateVin(text)) {
        return ctx.reply('Это валидный VIN: ' + text)
    }

    return ctx.reply('Это не похоже ни на номер, ни на VIN, попробуй еще раз')
})

bot.launch()
// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))