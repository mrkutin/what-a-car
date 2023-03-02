const REDIS_HOST = process.env.REDIS_HOST || 'redis://0.0.0.0:6379'
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const HEARTBEAT_INTERVAL_MS = parseInt(process.env.HEARTBEAT_INTERVAL_MS || 1000)

const ADMIN_IDS = [172353063]

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
    await redisSub.xgroup('CREATE', 'stream:sravni:resolved', 'telegram', '$', 'MKSTREAM')
} catch (e) {
    console.log('Group "telegram" already exists in stream:sravni:resolved, skipping')
}
try {
    await redisSub.xgroup('CREATE', 'stream:ingos:resolved', 'telegram', '$', 'MKSTREAM')
} catch (e) {
    console.log('Group "telegram" already exists in stream:ingos:resolved, skipping')
}
try {
    await redisSub.xgroup('CREATE', 'stream:mosreg:resolved', 'telegram', '$', 'MKSTREAM')
} catch (e) {
    console.log('Group "telegram" already exists in stream:mosreg:resolved, skipping')
}
try {
    await redisSub.xgroup('CREATE', 'stream:gibdd:history:resolved', 'telegram', '$', 'MKSTREAM')
} catch (e) {
    console.log('Group "telegram" already exists in stream:gibdd:history:resolved, skipping')
}
try {
    await redisSub.xgroup('CREATE', 'stream:gibdd:accidents:resolved', 'telegram', '$', 'MKSTREAM')
} catch (e) {
    console.log('Group "telegram" already exists in stream:gibdd:accidents:resolved, skipping')
}
try {
    await redisSub.xgroup('CREATE', 'stream:gibdd:restrictions:resolved', 'telegram', '$', 'MKSTREAM')
} catch (e) {
    console.log('Group "telegram" already exists in stream:gibdd:restrictions:resolved, skipping')
}
try {
    await redisSub.xgroup('CREATE', 'stream:gibdd:diagnostic-cards:resolved', 'telegram', '$', 'MKSTREAM')
} catch (e) {
    console.log('Group "telegram" already exists in stream:gibdd:diagnostic-cards:resolved, skipping')
}
try {
    await redisSub.xgroup('CREATE', 'stream:gibdd:wanted:resolved', 'telegram', '$', 'MKSTREAM')
} catch (e) {
    console.log('Group "telegram" already exists in stream:gibdd:wanted:resolved, skipping')
}
try {
    await redisSub.xgroup('CREATE', 'stream:gibdd:fines:resolved', 'telegram', '$', 'MKSTREAM')
} catch (e) {
    console.log('Group "telegram" already exists in stream:gibdd:fines:resolved, skipping')
}


import {Telegraf} from 'telegraf'
import {message} from 'telegraf/filters'

const bot = new Telegraf(TELEGRAM_BOT_TOKEN)

const flatArrayToObject = arr => {
    const obj = {}
    for (let i = 0; i < arr.length; i += 2) {
        obj[arr[i]] = arr[i + 1] || null
    }
    return obj
}

bot.start((ctx) => ctx.reply('Привет, это бот "Что за тачка?"\nДля проверки тачки отправь её номер'))

bot.command('unblock', async ctx => {
    if (!ADMIN_IDS.includes(ctx.update.message.from.id)) {
        return
    }

    const {update} = ctx
    const {message} = update
    const {text} = message
    const [, user_id] = text.split(' ')
    await redisPub.call('DEL', `block:${user_id}`)
    await ctx.reply(`user ${user_id} has been unblocked!`)
})

bot.command('block', async ctx => {
    if (!ADMIN_IDS.includes(ctx.update.message.from.id)) {
        return
    }

    const {update} = ctx
    const {message} = update
    const {text} = message
    const [, user_id, ttl] = text.split(' ')
    if(ttl){
        await redisPub.call('SET', `block:${user_id}`, 1, 'EX', parseInt(ttl))
        await ctx.reply(`user ${user_id} has been blocked for ${new Date(parseInt(ttl) * 1000).toISOString().substring(11, 19)}!`)
    } else {
        await redisPub.call('SET', `block:${user_id}`, 1)
        await ctx.reply(`user ${user_id} has been blocked!`)
    }
})

bot.command('cache', async ctx => {
    if (!ADMIN_IDS.includes(ctx.update.message.from.id)) {
        return
    }

    const {update} = ctx
    const {message} = update
    const {text, chat} = message
    const param = text.split(' ')[1]

    if(!param){
        const value = JSON.parse(await redisPub.call('JSON.GET', `chat:${chat.id}`))
        return await ctx.reply(`Cache is ${value.cache ? 'on' : 'off'}`)
    }

    const cache = ['on', 'true', '1', 'yes', 'enable'].includes(param.toLowerCase())
    await redisPub.call('JSON.SET', `chat:${chat.id}`, '$', JSON.stringify({cache}))
    if (cache) {
        await ctx.reply('Cache has been enabled')
    } else {
        await ctx.reply('Cache has been disabled')
    }
})

bot.command('health', async ctx => {
    if (!ADMIN_IDS.includes(ctx.update.message.from.id)) {
        return
    }

    const keys = await redisPub.keys('heartbeat:*')

    const groupedKeys = keys.reduce((acc, key) => {
        const [, service, host] = key.split(':')
        if (!acc[service]) {
            acc[service] = [host]
        } else {
            acc[service].push(host)
        }
        return acc
    }, {})

    for (const service in groupedKeys) {
        await ctx.reply(`${service}: ${groupedKeys[service].length} OK`)
    }
})

bot.on(message('text'), async ctx => {
    const {update} = ctx
    const {message} = update
    const {from, text, chat} = message
    const {is_bot} = from
    const {id: chat_id} = chat
    const {id, username, first_name, last_name, language_code} = from

    if (is_bot) {
        return ctx.reply('Опять бот! А хочется простого человеческого общения...')
    }

    const ttl = await redisPub.call('TTL', `block:${id}`)
    if(ttl === -1){
        return ctx.reply('Ваш аккаунт заблокирован')
    } else if (ttl > 0){
        return ctx.reply(`Ваш аккаунт заблокирован до ${new Date(Date.now() + ttl * 1000)}`)
    }

    if (!ADMIN_IDS.includes(id)) {
        await bot.telegram.sendMessage(ADMIN_IDS[0], `Пользователь: ${id} ${username} ${first_name} ${last_name} сделал запрос: ${text}`)
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
        await redisPub.xadd('stream:plate:requested', '*', 'plate', plate, 'chat_id', chat_id, 'user_id', id, 'user_name', username, 'user_first_name', first_name, 'user_last_name', last_name, 'user_language_code', language_code)

    } else if (vin.match(/^[A-Z0-9]{17}$/g)) {
    } else {
        ctx.reply('Это не похоже на номер')
    }
})

bot.launch()
// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))

async function listenForMessages() {
    await redisPub.set(`heartbeat:telegram:single`, 1, 'PX', 2 * HEARTBEAT_INTERVAL_MS)

    const results = await redisSub.xreadgroup(
        'GROUP',
        'telegram',
        'single',
        'BLOCK',
        HEARTBEAT_INTERVAL_MS,
        'COUNT',
        100,
        'STREAMS',
        'stream:sravni:resolved',
        'stream:ingos:resolved',
        'stream:mosreg:resolved',
        'stream:gibdd:history:resolved',
        'stream:gibdd:accidents:resolved',
        'stream:gibdd:restrictions:resolved',
        'stream:gibdd:diagnostic-cards:resolved',
        'stream:gibdd:wanted:resolved',
        'stream:gibdd:fines:resolved',
        '>',
        '>',
        '>',
        '>',
        '>',
        '>',
        '>',
        '>',
        '>'
    )

    if(results?.length){
        const flatMessages = results.reduce((acc, result) => {
            return acc.concat(result[1])//messages
        }, [])

        for (const message of flatMessages) {
            const {key, chat_id} = flatArrayToObject(message[1])

            const keyParts = key.split(':')
            const service = keyParts.length > 2 ? `${keyParts[0]}:${keyParts[1]}` : keyParts[0]

            let serviceObj = JSON.parse(await redisPub.call('JSON.GET', key))
            switch (service) {
                case 'sravni':
                    if (serviceObj?.carDocument?.series && serviceObj?.carDocument?.number) {
                        await bot.telegram.sendMessage(chat_id, '<b>СТС</b>', {parse_mode: 'HTML'})
                        await bot.telegram.sendMessage(chat_id, `${serviceObj.carDocument.series || ''} ${serviceObj.carDocument.number || ''}${serviceObj.carDocument.date ? ` от ${serviceObj.carDocument.date?.substring(0, 10)}` : ''}`)
                        // await bot.telegram.sendMessage(chat_id, `Название: ${serviceObj?.brand?.name} ${serviceObj?.model?.name}`)
                        // await bot.telegram.sendMessage(chat_id, `Год выпуска: ${serviceObj?.year}`)
                        // await bot.telegram.sendMessage(chat_id, `Мощность: ${serviceObj?.power} л.с.`)
                        // await bot.telegram.sendMessage(chat_id, `VIN: ${serviceObj?.vin}`)
                    }
                    break
                // case 'autoins':
                //     await bot.telegram.sendMessage(chat_id, '<b>ПОЛИСЫ ОСАГО</b>', {parse_mode: 'HTML'})
                //     if (serviceObj?.length) {
                //         await bot.telegram.sendMessage(chat_id, `(Всего <b>${serviceObj.length}</b>)`, {parse_mode: 'HTML'})
                //         for (const policy of serviceObj) {
                //             policy.licensePlate && await bot.telegram.sendMessage(chat_id, `Номер: ${policy.licensePlate}`)
                //             policy.vin && await bot.telegram.sendMessage(chat_id, `VIN: ${policy.vin}`)
                //             policy.body && await bot.telegram.sendMessage(chat_id, `Номер кузова: ${policy.body}`)
                //             policy.chassis && await bot.telegram.sendMessage(chat_id, `Номер шасси: ${policy.chassis}`)
                //             policy.makeAndModel && await bot.telegram.sendMessage(chat_id, `Автомобиль: ${policy.makeAndModel}`)
                //             policy.powerHp && await bot.telegram.sendMessage(chat_id, `Мощность: ${policy.powerHp} л.с.`)
                //             policy.policyId && await bot.telegram.sendMessage(chat_id, `Полис: ${policy.policyId}`)
                //             policy.company && await bot.telegram.sendMessage(chat_id, `Компания: ${policy.company}`)
                //             policy.status && await bot.telegram.sendMessage(chat_id, `Статус: ${policy.status}`)
                //             policy.usingPurpose && await bot.telegram.sendMessage(chat_id, `Цель использования: ${policy.usingPurpose}`)
                //             policy.hasRestrictions && await bot.telegram.sendMessage(chat_id, `${policy.hasRestrictions}`)
                //             policy.vehicleOwner && await bot.telegram.sendMessage(chat_id, `Собственник: ${policy.vehicleOwner}`)
                //             policy.policyHolder && await bot.telegram.sendMessage(chat_id, `Страхователь: ${policy.policyHolder}`)
                //             policy.KBM && await bot.telegram.sendMessage(chat_id, `КБМ: ${policy.KBM}`)
                //             policy.region && await bot.telegram.sendMessage(chat_id, `Регион: ${policy.region}`)
                //             policy.premium && await bot.telegram.sendMessage(chat_id, `Страховая премия: ${policy.premium}`)
                //         }
                //     } else {
                //         await bot.telegram.sendMessage(chat_id, 'не обнаружены')
                //     }
                //     break
                case 'gibdd:history':
                    if (serviceObj?.vehicle) {
                        await bot.telegram.sendMessage(chat_id, '<b>АВТОМОБИЛЬ</b>', {parse_mode: 'HTML'})
                        await bot.telegram.sendMessage(chat_id, `VIN: ${serviceObj.vehicle.vin || ''}`)
                        await bot.telegram.sendMessage(chat_id, `Название: ${serviceObj.vehicle.model || ''}`)
                        await bot.telegram.sendMessage(chat_id, `Категория: ${serviceObj.vehicle.category || ''}`)
                        await bot.telegram.sendMessage(chat_id, `Цвет: ${serviceObj.vehicle.color || ''}`)
                        await bot.telegram.sendMessage(chat_id, `Год: ${serviceObj.vehicle.year || ''}`)
                        await bot.telegram.sendMessage(chat_id, `Объем двигателя: ${serviceObj.vehicle.engineVolume || ''}`)
                        await bot.telegram.sendMessage(chat_id, `Номер кузова: ${serviceObj.vehicle.bodyNumber || ''}`)
                        await bot.telegram.sendMessage(chat_id, `Номер двигателя: ${serviceObj.vehicle.engineNumber || ''}`)
                        await bot.telegram.sendMessage(chat_id, `Мощность двигателя: ${serviceObj.vehicle.powerHp ? `${serviceObj.vehicle.powerHp} л.с.` : ''}`)
                    }

                    if (serviceObj?.ownershipPeriods?.length) {
                        await bot.telegram.sendMessage(chat_id, '<b>РЕГИСТРАЦИОННЫЕ ДЕЙСТВИЯ</b>', {parse_mode: 'HTML'})
                        await bot.telegram.sendMessage(chat_id, `(Всего <b>${serviceObj.ownershipPeriods.length}</b>)`, {parse_mode: 'HTML'})
                        for (const period of serviceObj.ownershipPeriods) {
                            await bot.telegram.sendMessage(chat_id, `${period.to ? `С ${period.from} по ${period.to}` : `${period.from}`}: ${period.ownerType}, ${period.operation}`)
                        }
                    }
                    break
                case 'gibdd:accidents':
                    await bot.telegram.sendMessage(chat_id, '<b>УЧАСТИЕ В ДТП</b>', {parse_mode: 'HTML'})
                    if (serviceObj?.length) {
                        await bot.telegram.sendMessage(chat_id, `(Всего <b>${serviceObj.length}</b>)`, {parse_mode: 'HTML'})
                        for (const accident of serviceObj) {
                            await bot.telegram.sendMessage(chat_id, `${accident.AccidentDateTime || ''} ${accident.AccidentPlace || ''}, ${accident.AccidentType ? accident.AccidentType.toLowerCase() : ''}, количество участников: ${accident.VehicleAmount || ''}${accident?.DamagePoints?.length ? `, повреждения: ${accident?.DamagePoints.join(', ')}` : ''}`)
                        }
                    } else {
                        await bot.telegram.sendMessage(chat_id, 'не зафиксировано')
                    }
                    break
                case 'gibdd:restrictions':
                    await bot.telegram.sendMessage(chat_id, '<b>ОГРАНИЧЕНИЯ</b>', {parse_mode: 'HTML'})
                    if (serviceObj?.length) {
                        await bot.telegram.sendMessage(chat_id, `(Всего <b>${serviceObj.length}</b>)`, {parse_mode: 'HTML'})
                        for (const restriction of serviceObj) {
                            await bot.telegram.sendMessage(chat_id, `${restriction.ogrkod || ''}, ${restriction.divtype || ''}${restriction.dateogr ? `, с ${restriction.dateogr}` : ''}${restriction.osnOgr ? `, основание: ${restriction.osnOgr}` : ''}${restriction.phone ? `, телефон инициатора: ${restriction.phone}` : ''}${restriction.gid ? `, ключ ГИБДД: ${restriction.gid}` : ''}`)
                        }
                    } else {
                        await bot.telegram.sendMessage(chat_id, 'не обнаружены')
                    }
                    break
                case 'gibdd:diagnostic-cards':
                    await bot.telegram.sendMessage(chat_id, '<b>ДИАГНОСТИЧЕСКИЕ КАРТЫ</b>', {parse_mode: 'HTML'})
                    if (serviceObj?.length) {
                        for (const record of serviceObj) {
                            const entries = []
                            record.dcNumber && entries.push(`№${record.dcNumber}`)
                            record.dcDate && entries.push(`от ${record.dcDate}`)
                            record.dcExpirationDate && entries.push(`до ${record.dcExpirationDate}`)
                            record.odometerValue && entries.push(`показания одометра ${record.odometerValue}`)
                            record.pointAddress && entries.push(`адрес пункта ТО: ${record.pointAddress}`)
                            await bot.telegram.sendMessage(chat_id, entries.join(', '), {parse_mode: 'HTML'})
                            if (record.previousDcs) {
                                for (const subRecord of record.previousDcs) {
                                    const entries = []
                                    subRecord.dcNumber && entries.push(`№${subRecord.dcNumber}`)
                                    subRecord.dcDate && entries.push(`от ${subRecord.dcDate}`)
                                    subRecord.dcExpirationDate && entries.push(`до ${subRecord.dcExpirationDate}`)
                                    subRecord.odometerValue && entries.push(`показания одометра ${subRecord.odometerValue}`)
                                    record.pointAddress && entries.push(`адрес пункта ТО: ${record.pointAddress}`)
                                    await bot.telegram.sendMessage(chat_id, entries.join(', '), {parse_mode: 'HTML'})
                                }
                            }
                        }
                    } else {
                        await bot.telegram.sendMessage(chat_id, 'не обнаружены')
                    }
                    break
                case 'gibdd:wanted':
                    await bot.telegram.sendMessage(chat_id, '<b>НАХОЖДЕНИЕ В РОЗЫСКЕ</b>', {parse_mode: 'HTML'})
                    if (serviceObj?.length) {
                        await bot.telegram.sendMessage(chat_id, `(Всего <b>${serviceObj.length}</b>)`, {parse_mode: 'HTML'})
                        for (const record of serviceObj) {
                            await bot.telegram.sendMessage(chat_id, `${record.w_model ? `Автомобиль ${record.w_model}` : ''}${record.w_god_vyp ? ` ${record.w_god_vyp} года выпуска` : ''}${record.w_reg_zn ? `, гос. номер ${record.w_reg_zn}` : ''}${record.w_vin ? `, VIN ${record.w_vin}` : ''}${record.w_kuzov ? `, номер кузова ${record.w_kuzov}` : ''}${record.w_shassi ? `, номер шасси ${record.w_shassi}` : ''}${record.w_dvig ? `, номер двигателя ${record.w_dvig}` : ''}${record.w_data_pu ? `, дата постоянного учета в розыке: ${record.w_data_pu}` : ''}${record.w_reg_inic ? `, регион инициатора розыска: ${record.w_reg_inic}` : ''}`)
                        }
                    } else {
                        await bot.telegram.sendMessage(chat_id, 'не обнаружено')
                    }
                    break
                case 'gibdd:fines':
                    await bot.telegram.sendMessage(chat_id, '<b>ШТРАФЫ</b>', {parse_mode: 'HTML'})
                    if (serviceObj?.length) {
                        await bot.telegram.sendMessage(chat_id, `(Всего <b>${serviceObj.length}</b> на сумму <b>${serviceObj.reduce((acc, fine) => acc + (isNaN(parseInt(fine.Summa)) ? 0 : parseInt(fine.Summa)), 0)}</b> руб.)`, {parse_mode: 'HTML'})
                        for (const fine of serviceObj) {
                            await bot.telegram.sendMessage(chat_id, `${fine.DateDecis || ''} <b>${fine.Summa || 0} руб.</b>${fine.enableDiscount ? ` (можно оплатить со скидкой до ${fine.DateDiscount})` : ''}, ${fine.KoAPcode || ''}, ${fine.KoAPtext || ''}, ${fine.division?.name ? `${fine.division.name}` : ''}${fine.division?.fulladdr ? `, ${fine.division.fulladdr}` : ''}`, {parse_mode: 'HTML'})
                        }
                    } else {
                        await bot.telegram.sendMessage(chat_id, 'не зафиксированы')
                    }
                    break
                case 'ingos':
                    if (serviceObj?.documents?.length || serviceObj?.identifiers?.length) {
                        await bot.telegram.sendMessage(chat_id, '<b>ДОКУМЕНТЫ</b>', {parse_mode: 'HTML'})
                    }
                    if (serviceObj?.documents?.length) {
                        for (const document of serviceObj.documents) {
                            await bot.telegram.sendMessage(chat_id, `${document.type.name || ''}: ${document.number || ''} ${document.date?.length ? `от ${document.date.substring(0, 10)}` : ''}`)
                        }
                    }
                    if (serviceObj?.identifiers?.length) {
                        for (const identifier of serviceObj.identifiers) {
                            await bot.telegram.sendMessage(chat_id, `${identifier.type.name || ''}: ${identifier.number || ''}`)
                        }
                    }
                    break
                case 'mosreg':
                    if (serviceObj?.length) {
                        await bot.telegram.sendMessage(chat_id, '<b>ТАКСИ</b>', {parse_mode: 'HTML'})
                        for (const record of serviceObj) {
                            const entries = []
                            record.info?.regNumber && entries.push(`Разрешение №${record.info.regNumber}`)
                            record.info?.startDate && entries.push(`с ${record.info.startDate}`)
                            record.info?.expireDate && entries.push(`по ${record.info.expireDate}`)
                            record.info?.status && entries.push(`<b>${record.info.status.toLowerCase()}</b>`)
                            record.ownerInfo?.name && entries.push(`${record.ownerInfo.name}`)
                            record.ownerInfo?.inn && entries.push(`ИНН ${record.ownerInfo.inn}`)
                            record.ownerInfo?.ogrn && entries.push(`ОГРН ${record.ownerInfo.ogrn}`)
                            record.ownerInfo?.addInfo && entries.push(`${record.ownerInfo.addInfo.replace(/<[^>]*>/g, '')}`)
                            await bot.telegram.sendMessage(chat_id, entries.join(', '), {parse_mode: 'HTML'})
                        }
                    }
                    break
            }
        }
    }

    await listenForMessages()
}

listenForMessages()